import Phaser from 'phaser';

export class RemotePlayer extends Phaser.GameObjects.Sprite {
    public playerId: string;
    private targetX: number;
    private targetY: number;
    private lastDirection: string = 'down';

    constructor(scene: Phaser.Scene, x: number, y: number, playerId: string) {
        super(scene, x, y, 'player');
        this.playerId = playerId;
        this.targetX = x;
        this.targetY = y;

        scene.add.existing(this);
        this.setScale(0.25);
        this.setOrigin(0.5, 0.5);
    }

    public updateData(data: { x: number, y: number, direction: string }) {
        this.targetX = data.x;
        this.targetY = data.y;
        this.lastDirection = data.direction;
    }

    update() {
        // Smooth interpolation
        const lerpFactor = 0.15;
        const prevX = this.x;
        const prevY = this.y;
        
        this.x = Phaser.Math.Linear(this.x, this.targetX, lerpFactor);
        this.y = Phaser.Math.Linear(this.y, this.targetY, lerpFactor);

        // Check if actually moving to play/stop animation
        const isMoving = Math.abs(this.x - prevX) > 0.1 || Math.abs(this.y - prevY) > 0.1;
        
        if (isMoving) {
            this.play(`walk-${this.lastDirection}`, true);
        } else {
            this.anims.stop();
            // Show idle frame based on direction
            switch (this.lastDirection) {
                case 'down': this.setFrame(1); break;
                case 'left': this.setFrame(5); break;
                case 'right': this.setFrame(9); break;
                case 'up': this.setFrame(13); break;
            }
        }
    }
}
