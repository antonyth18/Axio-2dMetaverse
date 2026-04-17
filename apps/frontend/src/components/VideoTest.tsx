import React, { useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  RemoteTrack,
  Track,
  createLocalVideoTrack,
  createLocalAudioTrack,
  ConnectionState,
} from 'livekit-client';

const LIVEKIT_URL = 'ws://localhost:7880';
const TOKEN_URL = 'http://localhost:8082/get-token?room=office&user=user1';

type Status = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export const VideoTest: React.FC = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteContainerRef = useRef<HTMLDivElement>(null);
  const publishedRef = useRef(false); // guard: publish only once

  useEffect(() => {
    let cancelled = false;

    const connect = async () => {
      try {
        setStatus('connecting');
        setError(null);

        // 1. Fetch token
        const res = await fetch(TOKEN_URL);
        if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
        const token = await res.text();
        console.log('[LiveKit] Token received');

        if (cancelled) return;

        // 2. Build room
        const room = new Room({
          adaptiveStream: false,
          dynacast: false,
          reconnectPolicy: { nextRetryDelayInMs: () => null }, // no auto-reconnect loops
          rtcConfig: {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            iceTransportPolicy: 'all',
          },
        });
        roomRef.current = room;

        // 3. Connection lifecycle events
        room.on(RoomEvent.Connected, () => {
          console.log('[LiveKit] Connected to room:', room.name);
          setStatus('connected');
        });

        room.on(RoomEvent.Reconnecting, () => {
          console.warn('[LiveKit] Reconnecting...');
          setStatus('reconnecting');
        });

        room.on(RoomEvent.Reconnected, () => {
          console.log('[LiveKit] Reconnected');
          setStatus('connected');
        });

        room.on(RoomEvent.Disconnected, (reason) => {
          console.warn('[LiveKit] Disconnected. Reason:', reason);
          setStatus('disconnected');
          publishedRef.current = false;
        });

        // 4. Remote track handling
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Video) {
            console.log('[LiveKit] Remote video subscribed');
            const el = track.attach() as HTMLVideoElement;
            el.style.cssText = 'width:300px;height:200px;margin:8px;border:2px solid #22c55e;background:#000;';
            remoteContainerRef.current?.appendChild(el);
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          console.log('[LiveKit] Remote track unsubscribed');
          track.detach();
        });

        // 5. Connect
        await room.connect(LIVEKIT_URL, token);
        if (cancelled) {
          room.disconnect();
          return;
        }

        // 6. Publish local media — only once
        if (!publishedRef.current) {
          publishedRef.current = true;
          console.log('[LiveKit] Publishing local media...');

          const [videoTrack, audioTrack] = await Promise.all([
            createLocalVideoTrack({ resolution: { width: 640, height: 480 } }),
            createLocalAudioTrack(),
          ]);

          // Show local video in DOM (muted, never echoes)
          if (localVideoRef.current) {
            videoTrack.attach(localVideoRef.current);
          }

          await room.localParticipant.publishTrack(videoTrack);
          await room.localParticipant.publishTrack(audioTrack);
          console.log('[LiveKit] Local tracks published');
        }

      } catch (err: any) {
        if (!cancelled) {
          console.error('[LiveKit] Fatal error:', err);
          setStatus('error');
          setError(err?.message ?? 'Unknown error');
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (roomRef.current && roomRef.current.state !== ConnectionState.Disconnected) {
        console.log('[LiveKit] Cleaning up — disconnecting');
        roomRef.current.disconnect();
      }
      roomRef.current = null;
      publishedRef.current = false;
    };
  }, []);

  const statusColor: Record<Status, string> = {
    idle: '#9ca3af',
    connecting: '#f59e0b',
    connected: '#22c55e',
    reconnecting: '#f59e0b',
    disconnected: '#ef4444',
    error: '#ef4444',
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '900px' }}>
      <h1 style={{ marginBottom: '8px' }}>LiveKit Video Test</h1>

      {/* Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: statusColor[status], flexShrink: 0,
        }} />
        <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '13px', color: statusColor[status] }}>
          {status}
        </span>
        {error && (
          <span style={{ marginLeft: '8px', color: '#ef4444', fontSize: '13px' }}>
            — {error}
          </span>
        )}
      </div>

      {/* Local video */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '8px' }}>Local (you)</h3>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '300px', height: '200px',
            border: '2px solid #3b82f6', background: '#000', display: 'block',
          }}
        />
      </div>

      {/* Remote videos */}
      <div>
        <h3 style={{ marginBottom: '8px' }}>Remote participants</h3>
        <div ref={remoteContainerRef} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }} />
      </div>
    </div>
  );
};

export default VideoTest;
