import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
    public lastDirection: string = 'down';
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
    private wasd: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
    } | undefined;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'player');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        
        // Input setup
        if (scene.input.keyboard) {
            this.cursors = scene.input.keyboard.createCursorKeys();
            this.wasd = scene.input.keyboard.addKeys('W,A,S,D') as any;
        }
    }

    update() {
        if (!this.body) return;

        const speed = 160;
        const velocity = new Phaser.Math.Vector2(0, 0);

        // Horizontal movement
        if (this.cursors?.left.isDown || this.wasd?.A.isDown) {
            velocity.x = -1;
            this.lastDirection = 'left';
        } else if (this.cursors?.right.isDown || this.wasd?.D.isDown) {
            velocity.x = 1;
            this.lastDirection = 'right';
        }

        // Vertical movement
        if (this.cursors?.up.isDown || this.wasd?.W.isDown) {
            velocity.y = -1;
            this.lastDirection = 'up';
        } else if (this.cursors?.down.isDown || this.wasd?.S.isDown) {
            velocity.y = 1;
            this.lastDirection = 'down';
        }

        // Normalize and apply velocity
        velocity.normalize().scale(speed);
        this.setVelocity(velocity.x, velocity.y);

        // Handle animations
        if (velocity.length() > 0) {
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
