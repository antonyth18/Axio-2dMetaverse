import Phaser from 'phaser';
import { ChatBubble } from '../components/ChatBubble';

export class Player extends Phaser.Physics.Arcade.Sprite {
    public lastDirection: string = 'down';
    public textureKey: string;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
    private wasd: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
    } | undefined;
    public chatBubble: ChatBubble;

    constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
        super(scene, x, y, textureKey);
        this.textureKey = textureKey;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        
        // Reduce hitbox to feet area
        if (this.body) {
            const body = this.body as Phaser.Physics.Arcade.Body;
            const hitWidth = 40;
            const hitHeight = 30;
            body.setSize(hitWidth, hitHeight);
            
            body.setOffset((this.width - hitWidth) / 2, this.height - hitHeight - 20);
        }
        
        // Input setup
        if (scene.input.keyboard) {
            this.cursors = scene.input.keyboard.createCursorKeys();
            this.wasd = scene.input.keyboard.addKeys('W,A,S,D') as any;
        }

        this.chatBubble = new ChatBubble(scene, x, y);
    }

    update() {
        if (!this.body) return;

        const speed = 160;
        const velocity = new Phaser.Math.Vector2(0, 0);

        if (this.cursors?.left.isDown || this.wasd?.A.isDown) {
            velocity.x = -1;
            this.lastDirection = 'left';
        } else if (this.cursors?.right.isDown || this.wasd?.D.isDown) {
            velocity.x = 1;
            this.lastDirection = 'right';
        }

        if (this.cursors?.up.isDown || this.wasd?.W.isDown) {
            velocity.y = -1;
            this.lastDirection = 'up';
        } else if (this.cursors?.down.isDown || this.wasd?.S.isDown) {
            velocity.y = 1;
            this.lastDirection = 'down';
        }

        velocity.normalize().scale(speed);
        this.setVelocity(velocity.x, velocity.y);

        if (velocity.length() > 0) {
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

        this.chatBubble.updatePosition(this.x, this.y);
    }
    
    destroy(fromScene?: boolean) {
        this.chatBubble.destroy();
        super.destroy(fromScene);
    }
}
