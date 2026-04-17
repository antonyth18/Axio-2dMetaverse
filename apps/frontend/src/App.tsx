import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

import { useWebSocket } from './hooks/useWebSocket';
import { useState } from 'react';

// Extracted game wrapper so the canvas only mounts on the /game route
const GameView = () => {
    const token = localStorage.getItem("authToken");
    const spaceId = localStorage.getItem("spaceId") || "default-space";
    const [chatInput, setChatInput] = useState('');

    const {
        connected,
        users,
        chatMessages,
        selfId,
        moveUser,
        sendAction,
        sendMessage,
        error,
    } = useWebSocket({
        url: import.meta.env.VITE_WS_URL || 'ws://localhost:8080',
        token: token || "",
        spaceId: spaceId,
        shouldConnect: !!token,
        loadUserAvatar: async () => {}, // Skip for now, characters handle themselves natively
    });

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
                <h1 className="text-3xl font-black mb-2">MetaVerse Arena</h1>
                <p className="mb-4 font-medium uppercase tracking-wider text-sm">
                    {error ? (
                        <span className="text-red-500">Error: {error}</span>
                    ) : connected ? (
                        <span className="text-green-600">Connected to space</span>
                    ) : (
                        <span className="text-gray-500 animate-pulse">Connecting to arena...</span>
                    )}
                </p>
                <div className="flex gap-4 items-center justify-center">
                    <button
                        className="px-6 py-2 bg-black text-white font-bold rounded hover:bg-gray-800 transition-colors uppercase text-sm"
                        onClick={() => window.location.href = "/dashboard"}
                    >
                        Back to Dashboard
                    </button>
                </div>
            </header>
            <main className="relative flex justify-center items-center p-4 border-4 border-black rounded shadow-[8px_8px_0_0_#000000] bg-gray-100">
                <GameCanvas 
                    users={users} 
                    chatMessages={chatMessages} 
                    selfId={selfId}
                    onMove={moveUser} 
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