import Phaser from 'phaser';
import { ChatBubble } from '../components/ChatBubble';

export class RemotePlayer extends Phaser.GameObjects.Sprite {
    public playerId: string;
    public textureKey: string;
    private targetX: number;
    private targetY: number;
    private lastDirection: string = 'down';
    public chatBubble: ChatBubble;

    constructor(scene: Phaser.Scene, x: number, y: number, playerId: string, textureKey: string) {
        super(scene, x, y, textureKey);
        this.playerId = playerId;
        this.textureKey = textureKey;
        this.targetX = x;
        this.targetY = y;

        scene.add.existing(this);
        this.setFrame(1);
        this.setOrigin(0.5, 0.5);
        
        this.chatBubble = new ChatBubble(scene, x, y);
    }

    public setAvatar(textureKey: string) {
        if (!textureKey || textureKey === this.textureKey) return;

        this.textureKey = textureKey;
        this.setTexture(textureKey);
    }

    public updateData(data: { x: number, y: number, direction: string, avatarId?: string }) {
        this.targetX = data.x;
        this.targetY = data.y;
        this.lastDirection = data.direction;

        if (data.avatarId && data.avatarId !== this.textureKey) {
            this.setAvatar(data.avatarId);
        }
    }

    update() {
        // Lerp towards target position
        const lerpFactor = 0.15;
        const prevX = this.x;
        const prevY = this.y;
        
        this.x = Phaser.Math.Linear(this.x, this.targetX, lerpFactor);
        this.y = Phaser.Math.Linear(this.y, this.targetY, lerpFactor);

        const isMoving = Math.abs(this.x - prevX) > 0.1 || Math.abs(this.y - prevY) > 0.1;
        
        if (isMoving) {
            this.play(`${this.textureKey}-walk-${this.lastDirection}`, true);
        } else {
            this.anims.stop();
            // idle frame by direction
            switch (this.lastDirection) {
                case 'down': this.setFrame(1); break;
                case 'left': this.setFrame(5); break;
                case 'right': this.setFrame(9); break;
                case 'up': this.setFrame(13); break;
            }
        }
        
        this.chatBubble.updatePosition(this.x, this.y, this.displayHeight);
    }
    
    destroy(fromScene?: boolean) {
        this.chatBubble.destroy();
        super.destroy(fromScene);
    }
}
