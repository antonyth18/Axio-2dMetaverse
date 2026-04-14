import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

function App() {
    const gameContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!gameContainerRef.current) return;

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: gameContainerRef.current,
            width: 800,
            height: 600,
            scene: {
                preload: function (this: Phaser.Scene) {
                    this.load.image('sky', 'https://labs.phaser.io/assets/skies/space2.png');
                },
                create: function (this: Phaser.Scene) {
                    this.add.image(400, 300, 'sky');
                    const text = this.add.text(400, 300, 'Metaverse World', {
                        fontSize: '64px',
                        color: '#fff',
                    });
                    text.setOrigin(0.5);
                },
            },
            physics: {
                default: 'arcade',
            },
        };

        const game = new Phaser.Game(config);

        return () => {
            game.destroy(true);
        };
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
            <h1 style={{ color: 'white' }}>Metaverse Platform</h1>
            <div ref={gameContainerRef} />
        </div>
    );
}

export default App;
