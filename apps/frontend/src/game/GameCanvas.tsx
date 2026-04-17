import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';

interface GameCanvasProps {
    users: Record<string, any>;
    chatMessages: any[];
    selfId: string | null;
    onMove: (x: number, y: number, direction: string) => void;
    roomMetadata?: {
        backgroundUrl: string;
        width: number;
        height: number;
    } | null;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ users, chatMessages, selfId, onMove, roomMetadata }) => {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const [sceneReady, setSceneReady] = useState(false);

    // Keep track of how many chat messages we've processed
    const processedChatCount = useRef(0);

    useEffect(() => {
        if (!gameContainerRef.current) return;

        if (!gameRef.current) {
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                parent: gameContainerRef.current,
                width: 800,
                height: 600,
                physics: {
                    default: 'arcade',
                    arcade: {
                        gravity: { x: 0, y: 0 },
                        debug: false,
                    },
                },
                render: {
                    pixelArt: true,
                },
                scene: [MainScene],
                callbacks: {
                    preBoot: (game) => {
                        game.registry.set('onMove', onMove);
                    },
                    postBoot: (game) => {
                        setSceneReady(true);
                    }
                }
            };

            gameRef.current = new Phaser.Game(config);
        }

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, []);

    // Sync registry when logic props change
    useEffect(() => {
        if (gameRef.current) {
            gameRef.current.registry.set('onMove', onMove);
        }
    }, [onMove]);

    // Update Users
    useEffect(() => {
        if (sceneReady && gameRef.current) {
            const scene = gameRef.current.scene.getScene('MainScene');
            if (scene) {
                scene.events.emit('setSelfId', selfId);
                scene.events.emit('networkUsersUpdate', users);
            }
        }
    }, [users, sceneReady, selfId]);

    // Update Room Metadata
    useEffect(() => {
        if (sceneReady && gameRef.current && roomMetadata) {
            const scene = gameRef.current.scene.getScene('MainScene');
            if (scene) {
                scene.events.emit('arena-metadata-update', roomMetadata);
            }
        }
    }, [roomMetadata, sceneReady]);

    // Update Chat
    useEffect(() => {
        if (sceneReady && gameRef.current && chatMessages.length > processedChatCount.current) {
            console.log(`[CANVAS] New chat messages detected: ${chatMessages.length - processedChatCount.current}`);
            const scene = gameRef.current.scene.getScene('MainScene');
            if (scene) {
                // Emit only the new messages
                for (let i = processedChatCount.current; i < chatMessages.length; i++) {
                    console.log(`[CANVAS] Bridging chat to Phaser:`, chatMessages[i]);
                    scene.events.emit('networkChatEvent', chatMessages[i]);
                }
                processedChatCount.current = chatMessages.length;
            } else {
                console.warn("[CANVAS] MainScene not found during chat bridge!");
            }
        }
    }, [chatMessages, sceneReady]);

    return (
        <div
            ref={gameContainerRef}
            style={{
                width: '800px',
                height: '600px',
                border: '4px solid #444',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}
        />
    );
};
