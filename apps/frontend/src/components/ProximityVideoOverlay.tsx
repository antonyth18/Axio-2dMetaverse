import React, { useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  RemoteTrack,
  RemoteParticipant,
  Track,
  LocalVideoTrack,
  ConnectionState,
} from 'livekit-client';
import { UserState } from '@/types';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

// ─── Config ──────────────────────────────────────────────────────────────────
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880';
const TOKEN_BASE  = import.meta.env.VITE_GO_URL       || 'http://localhost:8082';
const THRESHOLD   = 5;    // grid units
const LEAVE_DELAY = 1500; // ms out-of-range before auto-disconnect

// ─── Helpers ─────────────────────────────────────────────────────────────────
function distance(a: UserState, b: UserState) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ─── VideoTile ───────────────────────────────────────────────────────────────
const VideoTile = React.memo(({
  track, muted = false, label,
}: {
  track: RemoteTrack | LocalVideoTrack;
  muted?: boolean;
  label: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    track.attach(el);
    return () => { track.detach(el); };
  }, [track]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <video
        ref={videoRef}
        autoPlay playsInline muted={muted}
        style={{
          width: '160px', height: '120px', borderRadius: '8px',
          border: muted ? '2px solid #3b82f6' : '2px solid #22c55e',
          background: '#000', objectFit: 'cover', display: 'block',
        }}
      />
      <span style={{
        fontSize: '10px', color: '#d1d5db', fontFamily: 'monospace',
        background: 'rgba(0,0,0,0.6)', padding: '1px 6px', borderRadius: '4px',
      }}>
        {label}
      </span>
    </div>
  );
});

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  selfId:   string | null;
  players:  Record<string, UserState>;
  roomCode: string | null;
  userId:   string;
}

interface RemoteStream {
  participantId: string;
  track: RemoteTrack;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const ProximityVideoOverlay: React.FC<Props> = ({
  selfId, players, roomCode, userId,
}) => {
  const [isNearby,   setIsNearby]   = useState(false);
  const [isJoining,  setIsJoining]  = useState(false); // button loading state
  const [isConnected, setIsConnected] = useState(false);
  const [isCameraOn,  setIsCameraOn]  = useState(true);
  const [isMicOn,     setIsMicOn]     = useState(true);
  const [localTrack,  setLocalTrack]  = useState<LocalVideoTrack | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);

  const roomRef      = useRef<Room | null>(null);
  const publishedRef = useRef(false);
  const leaveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 1. Proximity detection only — no auto-join ──────────────────────────
  useEffect(() => {
    // ── DEBUG: log everything so both clients are comparable ──────────────
    console.group('[Proximity] Recalculating…');
    console.log('  selfId      :', selfId);
    console.log('  roomCode    :', roomCode);
    console.log('  players map :', players);

    if (!selfId || !roomCode) {
      console.warn('  ⚠ selfId or roomCode is null — skipping');
      console.groupEnd();
      return;
    }

    const self = players[selfId];
    if (!self) {
      console.warn(`  ⚠ players[${selfId}] is undefined — selfId not in map yet`);
      console.log('  known IDs:', Object.keys(players));
      console.groupEnd();
      return;
    }

    const others = Object.values(players).filter(p => p.id !== selfId);
    console.log(`  self pos    : (${self.x}, ${self.y})`);
    others.forEach(p => {
      const d = distance(self, p);
      console.log(`  → ${p.id} at (${p.x},${p.y})  dist=${d.toFixed(2)}  nearby=${d <= THRESHOLD}`);
    });

    const nearby = others.some(p => distance(self, p) <= THRESHOLD);
    console.log('  isNearby    :', nearby);
    console.groupEnd();
    // ── END DEBUG ─────────────────────────────────────────────────────────

    setIsNearby(nearby);

    if (!nearby && isConnected) {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
      leaveTimer.current = setTimeout(() => {
        console.log('[Proximity] Left range — disconnecting');
        leaveRoom();
      }, LEAVE_DELAY);
    } else if (nearby && leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }, [players, selfId, roomCode, isConnected]);


  // ── 2. joinRoom — only called on button click ────────────────────────────
  const joinRoom = async () => {
    if (isJoining || isConnected) return;
    if (roomRef.current?.state !== ConnectionState.Disconnected && roomRef.current !== null) return;

    setIsJoining(true);
    console.log(`[Proximity] Joining room as ${userId}`);

    let room: Room | null = null;

    try {
      // ── Step 1: fetch token ──────────────────────────────────────────────
      // Use a shared room name (e.g. "office") as requested to ensure multiple users land together
      const sharedRoomName = "office";
      const url = `${TOKEN_BASE}/get-token?room=${sharedRoomName}&user=${userId}`;
      console.log(`[Proximity] Fetching token for shared room '${sharedRoomName}'...`);
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Token error: ${res.status}`);
      const token = await res.text();

      // ── Step 2: create room ──────────────────────────────────────────────
      room = new Room({
        adaptiveStream: false,
        dynacast:       false,
        reconnectPolicy: { nextRetryDelayInMs: () => null },
        // Publish timeout — default is 10s which can be tight on localhost
        publishDefaults: { simulcast: false },
        rtcConfig: {
          iceServers:         [{ urls: 'stun:stun.l.google.com:19302' }],
          iceTransportPolicy: 'all',
        },
      });
      roomRef.current = room;

      room.on(RoomEvent.Connected, () => {
        console.log('[Proximity] Connected to room');
        setIsConnected(true);
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('[Proximity] Room disconnected');
        setIsConnected(false);
        setLocalTrack(null);
        setRemoteStreams([]);
        publishedRef.current = false;
        roomRef.current      = null;
      });

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub, participant: RemoteParticipant) => {
        console.log(`[Proximity] Track subscribed! Type: ${track.kind}, from user: ${participant.identity}`);
        
        if (track.kind === Track.Kind.Audio) {
          // Explicitly handle audio track: attach to DOM directly
          const audioEl = track.attach();
          audioEl.autoplay = true;
          audioEl.id = `audio-${track.sid}`;
          document.body.appendChild(audioEl);
          console.log(`[Proximity] Audio element attached to DOM for ${participant.identity}`);
          return;
        }

        if (track.kind === Track.Kind.Video) {
          setRemoteStreams(prev =>
            prev.some(s => s.track === track) ? prev
              : [...prev, { participantId: participant.identity, track }]
          );
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        console.log(`[Proximity] Track unsubscribed! Type: ${track.kind}`);
        if (track.kind === Track.Kind.Video) {
          setRemoteStreams(prev => prev.filter(s => s.track !== track));
        } else if (track.kind === Track.Kind.Audio) {
          track.detach().forEach(el => el.remove());
        }
      });

      // ── Step 3: connect (signal + ICE) ───────────────────────────────────
      await room.connect(LIVEKIT_URL, token);
      console.log('[Proximity] Signal connected, publishing media…');

      // ── Step 4: publish media — isolated try/catch so a publish failure
      //   does NOT kill an otherwise healthy room connection ────────────────
      if (!publishedRef.current) {
        publishedRef.current = true;
        try {
          // High-level API: handles ICE negotiation + retry internally
          const [camPub, micPub] = await Promise.all([
            room.localParticipant.setCameraEnabled(isCameraOn),
            room.localParticipant.setMicrophoneEnabled(isMicOn),
          ]);
          console.log(`[Proximity] Audio published successfully? ${!!micPub} / Camera published? ${!!camPub}`);

          // Grab local video track for the preview tile
          const videoTrack = camPub?.track as LocalVideoTrack | undefined;
          if (videoTrack) {
            setLocalTrack(videoTrack);
          }
          console.log(`[Proximity] Local tracks published (Cam: ${isCameraOn ? 'ON' : 'OFF'}, Mic: ${isMicOn ? 'ON' : 'OFF'}) ✓`);
        } catch (publishErr) {
          // Log but stay connected — we can still receive remote video
          console.warn('[Proximity] Could not publish local tracks (staying in room):', publishErr);
          publishedRef.current = false; // allow retry on next join
        }
      }
    } catch (err) {
      // Only reaches here if token fetch or room.connect() failed
      console.error('[Proximity] Connection failed (silent failure caught):', err);
      room?.disconnect();
      roomRef.current      = null;
      publishedRef.current = false;
      setIsConnected(false);
      setLocalTrack(null);
    } finally {
      setIsJoining(false);
    }
  };

  // ── 3. Toggles and Leave ──────────────────────────────────────────────────
  const toggleCamera = async () => {
    if (!roomRef.current) {
        setIsCameraOn(prev => !prev);
        return;
    }
    const nextState = !isCameraOn;
    console.log(`[Proximity] Toggling camera: ${nextState ? 'ON' : 'OFF'}`);
    try {
      await roomRef.current.localParticipant.setCameraEnabled(nextState);
      setIsCameraOn(nextState);
      // Grab track if enabled so we can render local preview
      const pub = roomRef.current.localParticipant.getTrackPublication(Track.Source.Camera);
      setLocalTrack(nextState && pub?.track ? (pub.track as LocalVideoTrack) : null);
    } catch (err) {
      console.error('[Proximity] Failed to toggle camera:', err);
    }
  };

  const toggleMic = async () => {
    if (!roomRef.current) {
        setIsMicOn(prev => !prev);
        return;
    }
    const nextState = !isMicOn;
    console.log(`[Proximity] Toggling microphone: ${nextState ? 'ON' : 'OFF'}`);
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(nextState);
      setIsMicOn(nextState);
    } catch (err) {
      console.error('[Proximity] Failed to toggle microphone:', err);
    }
  };                                                            

  const leaveRoom = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    if (!roomRef.current) return;
    if (roomRef.current.state !== ConnectionState.Disconnected) {
      roomRef.current.disconnect();
    }
  };

  // Cleanup on unmount
  useEffect(() => () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    roomRef.current?.disconnect();
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  // "Join" prompt — only visible when nearby but not yet in call
  const showJoinPrompt = isNearby && !isConnected;

  return (
    <>
      {/* Join call button */}
      {showJoinPrompt && (
        <div style={{
          position:    'fixed',
          bottom:      '80px',
          left:        '50%',
          transform:   'translateX(-50%)',
          zIndex:      9999,
          background:  'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          borderRadius: '12px',
          padding:     '10px 16px',
          display:     'flex',
          alignItems:  'center',
          gap:         '10px',
          boxShadow:   '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          <span style={{ color: '#d1d5db', fontSize: '13px' }}>
            👥 Someone is nearby
          </span>
          <button
            onClick={joinRoom}
            disabled={isJoining}
            style={{
              background:    isJoining ? '#4b5563' : '#22c55e',
              color:         '#fff',
              border:        'none',
              borderRadius:  '8px',
              padding:       '6px 14px',
              fontWeight:    700,
              fontSize:      '13px',
              cursor:        isJoining ? 'not-allowed' : 'pointer',
              transition:    'background 0.2s',
            }}
          >
            {isJoining ? 'Connecting…' : '📹 Join Video Call'}
          </button>
        </div>
      )}

      {/* Active call panel */}
      {isConnected && (
        <div style={{
          position:       'fixed',
          bottom:         '80px',
          right:          '16px',
          zIndex:         9999,
          display:        'flex',
          flexDirection:  'column',
          gap:            '8px',
          padding:        '8px',
          background:     'rgba(0,0,0,0.55)',
          borderRadius:   '12px',
          backdropFilter: 'blur(6px)',
        }}>
          {localTrack && isCameraOn && <VideoTile track={localTrack} muted label="You" />}
          {remoteStreams.map(({ participantId, track }) => (
            <VideoTile key={participantId} track={track} label={participantId} />
          ))}
        </div>
      )}

      {/* Floating Control Bar at Bottom Center */}
      {isConnected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center justify-center gap-4 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-2xl">
          {/* Mic Toggle */}
          <button
            onClick={toggleMic}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
              isMicOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'
            }`}
            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
          </button>
          
          {/* Camera Toggle */}
          <button
            onClick={toggleCamera}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
              isCameraOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'
            }`}
            title={isCameraOn ? "Turn off Camera" : "Turn on Camera"}
          >
            {isCameraOn ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-white" />}
          </button>

          {/* Leave Call */}
          <button
            onClick={leaveRoom}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 transition-all ml-2"
            title="Leave Call"
          >
            <PhoneOff className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </>
  );
};

export default ProximityVideoOverlay;
