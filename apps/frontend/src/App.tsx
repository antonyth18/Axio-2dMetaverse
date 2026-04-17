import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GameCanvas } from './game/GameCanvas';
import { Login } from './pages/auth/Login';
import { HomePage } from './pages/home/HomePage';
import { Profile } from './pages/user/Profile';
import { UserDashboard } from './pages/user/UserDashboard';
import { Navbar } from './components/layout/Navbar';

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
import { useState } from 'react';

const GameView = () => {
    const token = localStorage.getItem("authToken");
    const spaceId = localStorage.getItem("spaceId") || "default-space";
    const [chatInput, setChatInput] = useState('');
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const urlCode = params.get('code');

    // Helper to get userId from JWT
    const getUserIdFromToken = (token: string) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload).id;
        } catch (e) {
            return null;
        }
    };

    const userIdFromToken = token ? getUserIdFromToken(token) : null;

    const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(urlCode);

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
        url: import.meta.env.VITE_WS_URL || 'http://localhost:8081',
        token: token || "",
        roomCode: effectiveRoomCode,
        onRoomCreated: handleRoomCreated
    });

    const selfId = socketSelfId || userIdFromToken;
    const error = null;
    const createRoom = React.useCallback(() => {
        console.log("[APP] Triggering room creation...");
        triggerCreateRoom();
    }, [triggerCreateRoom]);

    React.useEffect(() => {
        if (urlCode && !currentRoomCode) {
            setCurrentRoomCode(urlCode);
        }
    }, [urlCode, currentRoomCode]);

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
            <header className="mb-4 text-center">
                <h1 className="text-3xl font-black mb-1 text-black uppercase">MetaVerse Arena</h1>
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
                           onClick={() => createRoom()}
                       >
                           Create Arena
                       </button>
                    )}
                </div>
            </header>
            <main className="relative flex justify-center items-center p-4 border-4 border-black rounded shadow-[8px_8px_0_0_#000000] bg-gray-100">
                <GameCanvas 
                    users={users} 
                    chatMessages={chatMessages} 
                    selfId={selfId}
                    onMove={moveUser} 
                    roomMetadata={roomMetadata}
                />
                <form 
                    onSubmit={handleChatSubmit} 
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white p-2 rounded shadow border border-gray-300"
                >
                    <input
                        type="text"
                        value={chatInput}
                        onChange={handleChatChange}
                        placeholder="Type to chat..."
                        className="px-3 py-2 border rounded focus:outline-none w-64"
                        onFocus={() => {
                           // Ensure keyboard inputs in form don't move phaser player
                           document.body.classList.add('chat-focused');
                        }}
                        onBlur={() => {
                           document.body.classList.remove('chat-focused');
                           sendAction("stop-typing");
                        }}
                    />
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded">
                        Send
                    </button>
                </form>
            </main>
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