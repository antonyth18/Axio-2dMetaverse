import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GameCanvas } from './game/GameCanvas';
import { Login } from './pages/auth/Login';
import { HomePage } from './pages/home/HomePage';
import { Profile } from './pages/user/Profile';
import { UserDashboard } from './pages/user/UserDashboard';
import { Navbar } from './components/layout/Navbar';
import { VideoTest } from './components/VideoTest';

// Admin imports
import { AdminDashboard } from './pages/admin/Dashboard';
import { SpaceCreator } from './pages/admin/SpaceCreator';
import { AvatarsPage as AvatarManager } from './pages/admin/Avatar';
import { MapList as Maps } from './pages/admin/MapList';
import { CanvasEditor as MapEditor } from './pages/admin/MapEditor';
import { BackgroundsPage as Backgrounds } from './pages/admin/Background';
import { ElementsPage as Elements } from './pages/admin/Elements';
import './App.css';

// A simple wrapper to check if the user is logged in
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const token = localStorage.getItem("authToken");
    if (!token) return <Navigate to="/login" replace />;
    return <>{children}</>;
};

import { useSocket } from './hooks/useSocket';
import { ProximityVideoOverlay } from './components/ProximityVideoOverlay';
import { useState } from 'react';
import { WS_URL } from './config/api';

const SPACE_OPTIONS = [
    {
        key: 'office',
        label: 'Office',
        description: 'Indoor co-working office space',
        thumbnail: '/PNGS/backgrounds/office.png',
        width: 577,
        height: 433,
    },
    {
        key: 'public',
        label: 'Public Plaza',
        description: 'Open outdoor public area',
        thumbnail: '/PNGS/backgrounds/public.png',
        width: 1280,
        height: 723,
    },
];

const GameView = () => {
    const token = localStorage.getItem("authToken");
    const [chatInput, setChatInput] = useState('');
    const [showSpacePicker, setShowSpacePicker] = useState(false);
    const chatHistoryRef = React.useRef<HTMLDivElement | null>(null);
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const urlCode = params.get('code');

    const searchParams = new URLSearchParams(window.location.search);
    const storedSpaceId = localStorage.getItem("spaceId");
    const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(
        searchParams.get("code") || storedSpaceId || null
    );

    const joinMetadata = React.useMemo(() => {
        const backgroundUrl = localStorage.getItem('spaceBackground');
        const width = Number(localStorage.getItem('spaceWidth'));
        const height = Number(localStorage.getItem('spaceHeight'));

        if (!backgroundUrl || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
            return null;
        }

        return { backgroundUrl, width, height };
    }, [location.pathname, location.search]);

    const handleRoomCreated = React.useCallback((code: string) => {
        console.log(`[APP] Successfully created room: ${code}`);
        setCurrentRoomCode(code);
    }, []);

    const effectiveRoomCode = urlCode || currentRoomCode || null;

    const {
        isConnected: connected,
        players: users,
        movePlayer: moveUser,
        sendAction,
        sendMessage,
        chatMessages,
        roomMetadata,
        createRoom: triggerCreateRoom,
        selfId: socketSelfId,
    } = useSocket({
        url: WS_URL,
        token: token || "",
        roomCode: effectiveRoomCode,
        joinMetadata,
        onRoomCreated: handleRoomCreated
    });

    // selfId MUST be the socket.id — the users map is keyed by socket.id.
    // Using the JWT userId would never match any key, blocking avatar spawn.
    const selfId = socketSelfId;
    const error = null;

    const handlePickSpace = (spaceKey: string, width: number, height: number) => {
        localStorage.setItem('spaceBackground', spaceKey);
        localStorage.setItem('spaceWidth', String(width));
        localStorage.setItem('spaceHeight', String(height));
        setShowSpacePicker(false);
        triggerCreateRoom({ backgroundUrl: spaceKey, width, height });
    };

    const createRoom = React.useCallback(() => {
        console.log("[APP] Triggering room creation...");
        triggerCreateRoom();
    }, [triggerCreateRoom]);

    React.useEffect(() => {
        if (urlCode && !currentRoomCode) {
            setCurrentRoomCode(urlCode);
        }
    }, [urlCode, currentRoomCode]);

    React.useEffect(() => {
        if (chatHistoryRef.current) {
            chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const handleChatSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim()) {
            sendMessage(chatInput);
            sendAction("stop-typing");
            setChatInput('');
        }
    };

    const handleChatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setChatInput(e.target.value);
        if (e.target.value.trim() !== '') {
            sendAction("typing");
        } else {
            sendAction("stop-typing");
        }
    };

    return (
        <div className="pt-24 min-h-screen bg-white text-black flex flex-col items-center">

            {/* Space Picker Modal */}
            {showSpacePicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                    <div className="bg-white border-4 border-black shadow-[12px_12px_0_0_#000000] rounded p-8 max-w-xl w-full mx-4">
                        <h2 className="text-2xl font-black uppercase mb-1 text-black">Choose Your Arena Map</h2>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-6">Select the space where your private arena will take place</p>
                        <div className="flex gap-4 mb-6">
                            {SPACE_OPTIONS.map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => handlePickSpace(opt.key, opt.width, opt.height)}
                                    className="flex-1 border-4 border-black rounded overflow-hidden shadow-[4px_4px_0_0_#000000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000000] transition-all group text-left"
                                >
                                    <div className="h-36 overflow-hidden border-b-4 border-black">
                                        <img
                                            src={opt.thumbnail}
                                            alt={opt.label}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => { e.currentTarget.style.background = '#ccc'; }}
                                        />
                                    </div>
                                    <div className="p-3 bg-white">
                                        <p className="font-black uppercase text-sm">{opt.label}</p>
                                        <p className="text-xs text-gray-500">{opt.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowSpacePicker(false)}
                            className="w-full py-2 border-4 border-black font-black uppercase text-sm hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <header className="mb-4 text-center">
                <h1 className="text-3xl font-black mb-1 text-black uppercase">AxioVerse Arena</h1>
                <p className="mb-2 font-medium uppercase tracking-wider text-xs">
                    {error ? (
                        <span className="text-red-500 font-bold">Error: {error}</span>
                    ) : connected ? (
                        <span className="text-green-600 font-bold">Connected {currentRoomCode ? `| Arena: ${currentRoomCode}` : ""}</span>
                    ) : (
                        <span className="text-gray-500 animate-pulse">Establishing secure connection...</span>
                    )}
                </p>
                <div className="flex gap-2 items-center justify-center mb-4">
                    <button
                        className="px-4 py-2 bg-black text-white font-bold rounded hover:bg-gray-800 transition-all uppercase text-xs shadow-[2px_2px_0_0_#000000]"
                        onClick={() => window.location.href = "/dashboard"}
                    >
                        Dashboard
                    </button>
                    {!currentRoomCode && (
                        <button
                            className="px-4 py-2 bg-lime-500 text-black font-bold rounded hover:bg-lime-400 transition-all uppercase text-xs shadow-[2px_2px_0_0_#000000] border-2 border-black"
                            onClick={() => setShowSpacePicker(true)}
                        >
                            Create Arena
                        </button>
                    )}
                </div>
            </header>
            <main className="flex justify-center items-start p-4 gap-4 w-full max-w-7xl">
                {/* Game Canvas Container */}
                <div className="border-4 border-black rounded shadow-[8px_8px_0_0_#000000] bg-gray-100 flex-shrink-0">
                    <GameCanvas
                        users={users}
                        chatMessages={chatMessages}
                        selfId={selfId}
                        onMove={moveUser}
                        roomMetadata={roomMetadata}
                    />
                </div>

                {/* Chat Sidebar */}
                <div className="w-80 h-[616px] max-h-[616px] self-start flex flex-col border-4 border-black rounded shadow-[8px_8px_0_0_#000000] bg-white overflow-hidden">
                    <div className="bg-black text-white px-4 py-3 font-black uppercase text-sm border-b-4 border-black">
                        Chat History
                    </div>
                    <div
                        ref={chatHistoryRef}
                        className="flex-1 min-h-0 overflow-y-auto bg-gray-50 border-b-4 border-black"
                    >
                        <div className="flex min-h-full flex-col justify-end gap-2 p-4">
                            {chatMessages.length === 0 ? (
                                <p className="text-gray-400 font-bold uppercase text-xs text-center my-auto">No messages yet.</p>
                            ) : (
                                chatMessages.map((msg, i) => (
                                    <div key={i} className="text-sm bg-white p-2 rounded border-2 border-black shadow-[2px_2px_0_0_#000000]">
                                        <span className="font-black text-lime-600 block text-xs mb-1">[{msg.id ? msg.id.substring(0, 4) : "????"}]: </span>
                                        <span className="font-medium break-words">{msg.message}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <form
                        onSubmit={handleChatSubmit}
                        className="flex bg-white p-2 gap-2"
                    >
                        <input
                            type="text"
                            value={chatInput}
                            onChange={handleChatChange}
                            placeholder="Type..."
                            className="w-full min-w-0 flex-1 px-3 py-2 border-4 border-black rounded focus:outline-none font-bold placeholder:text-gray-400 text-sm"
                            onKeyDown={(e) => e.stopPropagation()}
                            onFocus={() => document.body.classList.add('chat-focused')}
                            onBlur={() => {
                                document.body.classList.remove('chat-focused');
                                sendAction("stop-typing");
                            }}
                        />
                        <button type="submit" className="px-4 py-2 bg-lime-500 hover:bg-lime-400 border-4 border-black shadow-[2px_2px_0_0_#000000] active:translate-y-1 active:translate-x-1 active:shadow-none text-black font-black uppercase rounded transition-all text-xs">
                            Send
                        </button>
                    </form>
                </div>
            </main>
            {/* Proximity video — renders fixed above the canvas when someone is nearby */}
            <ProximityVideoOverlay
                selfId={selfId}
                players={users}
                roomCode={effectiveRoomCode}
                userId={selfId || 'guest'}
            />
        </div>
    );
};

function App() {
    return (
        <Router>
            <Navbar />
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<Login />} />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <Profile />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <UserDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/game"
                    element={
                        <ProtectedRoute>
                            <GameView />
                        </ProtectedRoute>
                    }
                />
                <Route path="/video-test" element={<VideoTest />} />
                <Route
                    path="/create-space"
                    element={
                        <ProtectedRoute>
                            <SpaceCreator />
                        </ProtectedRoute>
                    }
                />

                {/* Admin Routes */}
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                >
                    <Route path="space" element={<SpaceCreator />} />
                    <Route path="avatar" element={<AvatarManager />} />
                    <Route path="maps" element={<Maps />} />
                    <Route path="map-editor" element={<MapEditor />} />
                    <Route path="map-editor/:mapId" element={<MapEditor />} />
                    <Route path="backgrounds" element={<Backgrounds />} />
                    <Route path="elements" element={<Elements />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
