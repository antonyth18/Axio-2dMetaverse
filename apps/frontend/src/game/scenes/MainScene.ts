import Phaser from 'phaser';
import { Player } from '../player/Player';
import { RemotePlayer } from '../player/RemotePlayer';

const BACKGROUND_CONFIGS: Record<string, { file: string; width: number; height: number }> = {
    public: { file: '/PNGS/backgrounds/public.png', width: 1280, height: 723 },
    office: { file: '/PNGS/backgrounds/office.png', width: 577,  height: 433 },
};

export class MainScene extends Phaser.Scene {
    private player: Player | undefined;
    private remotePlayers: Map<string, RemotePlayer> = new Map();
    private selfId: string | null = null;
    private lastUsersData: Record<string, any> = {};
    
    // React bridging
    private onMoveCallback?: (x: number, y: number) => void;

    constructor() {
        super('MainScene');
    }

    preload() {
        // Determine which background to load
        const bgKey = localStorage.getItem('spaceBackground') || 'public';
        const bgCfg = BACKGROUND_CONFIGS[bgKey] ?? BACKGROUND_CONFIGS['public'];

        // Load background image
        this.load.image('background', bgCfg.file);

        // Load all avatar spritesheets
        this.load.spritesheet('warrior', '/PNGS/movements/warrior.png', {
            frameWidth: 109,
            frameHeight: 142
        });
        this.load.spritesheet('mage', '/PNGS/movements/mage.png', {
            frameWidth: 125,
            frameHeight: 125
        });
        this.load.spritesheet('rogue', '/PNGS/movements/rogue.png', {
            frameWidth: 125,
            frameHeight: 125
        });
        
        console.log("MainScene: Preload complete");
    }

    create() {
        const bgKey = localStorage.getItem('spaceBackground') || 'public';
        const bgCfg = BACKGROUND_CONFIGS[bgKey] ?? BACKGROUND_CONFIGS['public'];
        const worldW = bgCfg.width;
        const worldH = bgCfg.height;

        this.physics.world.setBounds(0, 0, worldW, worldH);

        const bg = this.add.image(0, 0, 'background');
        bg.setOrigin(0, 0);
        bg.setDisplaySize(worldW, worldH);

        this.setupAnimations();

        this.cameras.main.setBounds(0, 0, worldW, worldH);
        this.cameras.main.setZoom(2.5);

        // Listen for events emitted from GameCanvas (React)
        this.events.on('networkUsersUpdate', this.handleUsersUpdate, this);
        this.events.on('networkChatEvent', this.handleChatEvent, this);
        this.events.on('setSelfId', (id: string) => { 
            console.log("MainScene: Received selfId from React:", id);
            this.selfId = id; 
            // Trigger a re-check of current users data to spawn if needed
            this.handleUsersUpdate(this.lastUsersData);
        }, this);

        // Retrieve the callback passed via preBoot from GameCanvas
        this.onMoveCallback = this.game.registry.get('onMove');

        console.log(`MainScene created — space: ${bgKey} (${worldW}×${worldH})`);
    }

    private setupAnimations() {
        const avatars = ['warrior', 'mage', 'rogue'];

        avatars.forEach(avatar => {
            if (this.anims.exists(`${avatar}-walk-down`)) return;

            this.anims.create({
                key: `${avatar}-walk-down`,
                frames: this.anims.generateFrameNumbers(avatar, { start: 0, end: 2 }),
                frameRate: 8,
                repeat: -1
            });
            this.anims.create({
                key: `${avatar}-walk-left`,
                frames: this.anims.generateFrameNumbers(avatar, { start: 4, end: 6 }),
                frameRate: 8,
                repeat: -1
            });
            this.anims.create({
                key: `${avatar}-walk-right`,
                frames: this.anims.generateFrameNumbers(avatar, { start: 8, end: 10 }),
                frameRate: 8,
                repeat: -1
            });
            this.anims.create({
                key: `${avatar}-walk-up`,
                frames: this.anims.generateFrameNumbers(avatar, { start: 12, end: 14 }),
                frameRate: 8,
                repeat: -1
            });
        });
    }

    private handleUsersUpdate(users: Record<string, any>) {
        if (!users || Object.keys(users).length === 0) return;
        this.lastUsersData = users;

        if (!this.selfId) {
            console.log("MainScene: users update received but selfId missing. Waiting...");
            return;
        }

        // Ensure local player exists
        const localData = users[this.selfId];
        if (localData && !this.player) {
            console.log("MainScene: Creating local player for", this.selfId);
            const avatarKey = localStorage.getItem('avatarId') || 'warrior';
            // Adjust grid coordinates to pixel positions
            const CELL_SIZE = 20; 
            const px = localData.x * CELL_SIZE;
            const py = localData.y * CELL_SIZE;
            
            this.player = new Player(this, px, py, avatarKey);
            this.player.setScale(0.35);
            this.player.setOrigin(0.5, 0.5);
            this.player.setDepth(10); // Standardize depth
            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        }

        // Process remote users
        for (const [id, data] of Object.entries(users)) {
            if (id === this.selfId) continue; // skip self

            const CELL_SIZE = 20;
            const targetPx = data.x * CELL_SIZE;
            const targetPy = data.y * CELL_SIZE;

            let remote = this.remotePlayers.get(id);
            if (!remote) {
                // Initialize new remote player
                console.log("MainScene: Creating remote player", id);
                const avatarKey = 'warrior'; // Ideally pulled from data
                remote = new RemotePlayer(this, targetPx, targetPy, id, avatarKey);
                remote.setDepth(5);
                this.remotePlayers.set(id, remote);
            }
            // Update the remote target
            remote.updateData({
                x: targetPx,
                y: targetPy,
                direction: data.direction
            });
        }

        // Remove disconnected players
        for (const id of Array.from(this.remotePlayers.keys())) {
            if (!users[id]) {
                const p = this.remotePlayers.get(id);
                if (p) p.destroy();
                this.remotePlayers.delete(id);
                console.log("MainScene: Player removed", id);
            }
        }
    }

    private handleChatEvent(chat: { userId: string; message?: string; action?: string; isSystem?: boolean }) {
        if (!chat || !this.selfId) return;

        let playerBubble = null;
        if (chat.userId === this.selfId && this.player) {
            playerBubble = this.player.chatBubble;
        } else {
            const remote = this.remotePlayers.get(chat.userId);
            if (remote) playerBubble = remote.chatBubble;
        }

        if (playerBubble) {
            if (chat.action === 'typing') {
                playerBubble.setTyping(true);
            } else if (chat.action === 'stop-typing') {
                playerBubble.setTyping(false);
            } else if (chat.message) {
                console.log(`MainScene: Showing message from ${chat.userId}: ${chat.message}`);
                playerBubble.showMessage(chat.message, chat.isSystem || false);
            }
        }
    }

    update() {
        if (this.player) {
            this.player.update();
            
            // Check grid crossing
            const CELL_SIZE = 20;
            const currentGridX = Math.round(this.player.x / CELL_SIZE);
            const currentGridY = Math.round(this.player.y / CELL_SIZE);
            
            const speed = this.player.body?.velocity.length() || 0;
            if (speed > 0 && this.onMoveCallback) {
                // Determine next grid block based on direction
                let nextX = currentGridX;
                let nextY = currentGridY;
                if (this.player.lastDirection === 'left') nextX -= 1;
                else if (this.player.lastDirection === 'right') nextX += 1;
                else if (this.player.lastDirection === 'up') nextY -= 1;
                else if (this.player.lastDirection === 'down') nextY += 1;

                this.onMoveCallback(nextX, nextY);
            }
        }

        this.remotePlayers.forEach((p) => p.update());
    }
}