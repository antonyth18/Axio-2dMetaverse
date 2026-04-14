import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import { Player } from '../player/Player';
import { RemotePlayer } from '../player/RemotePlayer';

export class MainScene extends Phaser.Scene {
    private player: Player | undefined;
    private socket: Socket | undefined;
    private remotePlayers: Map<string, RemotePlayer> = new Map();
    private lastUpdate: number = 0;

    constructor() {
        super('MainScene');
    }

    preload() {
        this.load.image('tiles', '/assets/tileset.png');
        this.load.tilemapTiledJSON('map', '/assets/tilemap.json');
        this.load.spritesheet('player', '/assets/character.png', {
            frameWidth: 160,
            frameHeight: 160
        });
    }

    create() {
        const map = this.make.tilemap({ key: 'map' });

        const tileset = map.addTilesetImage(
            'tileset',
            'tiles',
            80, // tile width
            80, // tile height
            0,  // margin
            0   // spacing
        );

        if (!tileset) {
            console.error('Tileset not found!');
            return;
        }

        const groundLayer = map.createLayer('Ground', tileset, 0, 0);

        if (!groundLayer) {
            console.error('Ground layer not found!');
            return;
        }

        groundLayer.setCollisionByExclusion([-1]);

        this.player = new Player(this, 100, 100);
        this.player.setScale(0.25);
        this.player.setOrigin(0.5, 0.5);

        this.setupAnimations();

        // ✅ Collision between player and map
        this.physics.add.collider(this.player, groundLayer);

        // ✅ Camera setup
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setZoom(1);

        // ✅ World bounds
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // ✅ Socket.IO Setup
        this.setupSocket();

        console.log('MainScene initialized correctly');
    }

    private setupAnimations() {
        // Only create animations if they don't exist
        if (this.anims.exists('walk-down')) return;

        this.anims.create({
            key: 'walk-down',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 2 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-left',
            frames: this.anims.generateFrameNumbers('player', { start: 4, end: 6 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('player', { start: 8, end: 10 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-up',
            frames: this.anims.generateFrameNumbers('player', { start: 12, end: 14 }),
            frameRate: 8,
            repeat: -1
        });
    }

    private setupSocket() {
        // Connect to the gateway server
        this.socket = io('http://localhost:3000');

        this.socket.on('currentPlayers', (players: any[]) => {
            players.forEach((playerData) => {
                if (playerData.playerId !== this.socket?.id) {
                    this.addRemotePlayer(playerData);
                }
            });
        });

        this.socket.on('playerMoved', (playerData: any) => {
            const remotePlayer = this.remotePlayers.get(playerData.playerId);
            if (remotePlayer) {
                remotePlayer.updateData(playerData);
            } else if (playerData.playerId !== this.socket?.id) {
                this.addRemotePlayer(playerData);
            }
        });

        this.socket.on('playerLeft', (playerId: string) => {
            const remotePlayer = this.remotePlayers.get(playerId);
            if (remotePlayer) {
                remotePlayer.destroy();
                this.remotePlayers.delete(playerId);
            }
        });
    }

    private addRemotePlayer(playerData: any) {
        const remotePlayer = new RemotePlayer(this, playerData.x, playerData.y, playerData.playerId);
        this.remotePlayers.set(playerData.playerId, remotePlayer);
        remotePlayer.updateData(playerData);
    }

    update() {
        if (this.player) {
            this.player.update();

            // Send movement updates throttled to avoid flooding
            const now = Date.now();
            if (now - this.lastUpdate > 50) { // ~20 updates per second
                const movementData = {
                    x: Math.round(this.player.x),
                    y: Math.round(this.player.y),
                    direction: this.player.lastDirection,
                    timestamp: now
                };
                this.socket?.emit('playerMoved', movementData);
                this.lastUpdate = now;
            }
        }

        // Update remote players for interpolation
        this.remotePlayers.forEach((p) => p.update());
    }
}