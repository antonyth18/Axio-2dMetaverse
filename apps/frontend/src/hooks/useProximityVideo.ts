import { useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  RemoteTrack,
  Track,
  createLocalVideoTrack,
  createLocalAudioTrack,
  ConnectionState,
} from 'livekit-client';
import { UserState } from '@/types';

import { GO_API_URL, LIVEKIT_URL } from '../config/api';

const LIVEKIT_URL_VAL = LIVEKIT_URL;
const TOKEN_BASE_URL = GO_API_URL;
const PROXIMITY_THRESHOLD = 5; // grid units (~100 px at CELL_SIZE=20)

// --- Pure helpers ---

function euclidean(a: UserState, b: UserState): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function hasNearbyPlayer(
  self: UserState,
  others: UserState[],
  threshold: number
): boolean {
  return others.some((p) => euclidean(self, p) <= threshold);
}

// --- Hook ---

interface ProximityVideoOptions {
  /** The local player's socket/session ID */
  selfId: string | null;
  /** All players in the room (including self) */
  players: Record<string, UserState>;
  /** LiveKit room name to join (usually the arena code) */
  roomCode: string | null;
  /** JWT auth token — used to identify the user to the token server */
  userId: string;
  /** Called when a remote video track arrives so the caller can attach it */
  onRemoteTrack?: (track: RemoteTrack, participantId: string) => void;
  onRemoteTrackRemoved?: (track: RemoteTrack) => void;
}

interface ProximityVideoState {
  isConnected: boolean;
  nearbyCount: number;
}

export function useProximityVideo({
  selfId,
  players,
  roomCode,
  userId,
  onRemoteTrack,
  onRemoteTrackRemoved,
}: ProximityVideoOptions): ProximityVideoState {
  const roomRef = useRef<Room | null>(null);
  const publishedRef = useRef(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [nearbyCount, setNearbyCount] = useState(0);

  // ── Step 1: Keep a local video element alive (headless, for internal use only) ──
  useEffect(() => {
    const el = document.createElement('video');
    el.muted = true;
    el.autoplay = true;
    el.playsInline = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    localVideoRef.current = el;

    return () => {
      el.remove();
      localVideoRef.current = null;
    };
  }, []);

  // ── Step 2: Proximity check → join / leave ──
  useEffect(() => {
    if (!selfId || !roomCode) return;

    const self = players[selfId];
    if (!self) return;

    const others = Object.values(players).filter((p) => p.id !== selfId);
    const nearby = others.filter((p) => euclidean(self, p) <= PROXIMITY_THRESHOLD);
    setNearbyCount(nearby.length);

    const shouldBeConnected = nearby.length > 0;
    const currentlyConnected =
      roomRef.current !== null &&
      roomRef.current.state !== ConnectionState.Disconnected;

    // ── Join ──
    if (shouldBeConnected && !currentlyConnected) {
      const joinRoom = async () => {
        try {
          const url = `${TOKEN_BASE_URL}/get-token?room=${roomCode}&user=${userId}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Token error: ${res.status}`);
          const token = await res.text();

          const room = new Room({
            adaptiveStream: false,
            dynacast: false,
            reconnectPolicy: { nextRetryDelayInMs: () => null },
            rtcConfig: {
              iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
              iceTransportPolicy: 'all',
            },
          });
          roomRef.current = room;

          room.on(RoomEvent.Connected, () => {
            console.log('[ProximityVideo] Connected to', roomCode);
            setIsConnected(true);
          });

          room.on(RoomEvent.Disconnected, () => {
            console.log('[ProximityVideo] Disconnected');
            setIsConnected(false);
            publishedRef.current = false;
          });

          room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub, participant) => {
            console.log(`[ProximityVideo] Remote track from ${participant.identity}`);
            onRemoteTrack?.(track, participant.identity);
          });

          room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
            onRemoteTrackRemoved?.(track);
            track.detach();
          });

          await room.connect(LIVEKIT_URL_VAL, token);

          // Publish local media only once per connection
          if (!publishedRef.current) {
            publishedRef.current = true;
            const [video, audio] = await Promise.all([
              createLocalVideoTrack({ resolution: { width: 640, height: 480 } }),
              createLocalAudioTrack(),
            ]);

            if (localVideoRef.current) video.attach(localVideoRef.current);

            await room.localParticipant.publishTrack(video);
            await room.localParticipant.publishTrack(audio);
            console.log('[ProximityVideo] Local tracks published');
          }
        } catch (err) {
          console.error('[ProximityVideo] Join failed:', err);
          roomRef.current = null;
        }
      };

      joinRoom();
    }

    // ── Leave ──
    if (!shouldBeConnected && currentlyConnected) {
      console.log('[ProximityVideo] No nearby players — disconnecting');
      roomRef.current?.disconnect();
      roomRef.current = null;
      publishedRef.current = false;
      setIsConnected(false);
    }
  }, [players, selfId, roomCode, userId, onRemoteTrack, onRemoteTrackRemoved]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (roomRef.current?.state !== ConnectionState.Disconnected) {
        roomRef.current?.disconnect();
      }
      roomRef.current = null;
      publishedRef.current = false;
    };
  }, []);

  return { isConnected, nearbyCount };
}
