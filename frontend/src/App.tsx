import React from 'react';
import { GameCanvas } from './game/GameCanvas';
import './App.css';

function App() {
    return (
        <div className="app-container">
            <header className="app-header">
                <h1>AxioVerse</h1>
                <p>Use WASD or Arrow Keys to move</p>
            </header>
            <main className="game-wrapper">
                <GameCanvas />
            </main>
            <footer className="api-status">
                <div className="status-item">
                    <span>Gateway:</span> <span className="status-indicator"></span>
                </div>
                <div className="status-item">
                    <span>Realtime:</span> <span className="status-indicator"></span>
                </div>
            </footer>
        </div>
    );
}

export default App;
