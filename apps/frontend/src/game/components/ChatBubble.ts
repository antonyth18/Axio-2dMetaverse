import Phaser from 'phaser';

export class ChatBubble {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private graphics: Phaser.GameObjects.Graphics;
    private text: Phaser.GameObjects.Text;
    private fadeTimer?: Phaser.Time.TimerEvent;
    
    // Stack queue
    private messageQueue: { text: string, isSystem: boolean }[] = [];
    private isTyping: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;
        this.container = scene.add.container(x, y);
        this.container.setDepth(100); // render above players
        this.container.setAlpha(0); // hidden by default

        this.graphics = scene.add.graphics();
        this.text = scene.add.text(0, 0, '', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#000000',
            align: 'center',
            wordWrap: { width: 150 }
        });
        this.text.setOrigin(0.5, 1); // bottom center

        this.container.add([this.graphics, this.text]);
    }

    public showMessage(message: string, isSystem: boolean = false) {
        this.isTyping = false;
        
        // Push and keep only latest 3
        this.messageQueue.push({ text: message, isSystem });
        if (this.messageQueue.length > 3) {
            this.messageQueue.shift();
        }

        this.renderMessages();
    }

    public setTyping(typing: boolean) {
        if (this.isTyping === typing) return;
        this.isTyping = typing;
        this.renderMessages();
    }

    private renderMessages() {
        this.graphics.clear();
        
        let content = '';
        let lastIsSystem = false;

        this.messageQueue.forEach(m => {
            content += m.text + '\n';
            lastIsSystem = m.isSystem;
        });

        if (this.isTyping) {
            content += '...\n';
        }

        content = content.trim();

        if (!content) {
            this.container.setAlpha(0);
            return;
        }

        this.text.setText(content);
        if (lastIsSystem) {
            this.text.setColor('#ff4444');
        } else {
            this.text.setColor('#000000');
        }

        const bounds = this.text.getBounds();
        const padding = 8;
        const width = bounds.width + padding * 2;
        const height = bounds.height + padding * 2;
        const radius = 6;

        const bgFill = lastIsSystem ? 0xfff0f0 : 0xffffff;

        this.graphics.fillStyle(bgFill, 0.9);
        this.graphics.lineStyle(2, 0x000000, 1);

        // Draw bubble above the origin
        const bx = -width / 2;
        const by = -height - 10; // 10px above the player's head

        this.graphics.fillRoundedRect(bx, by, width, height, radius);
        this.graphics.strokeRoundedRect(bx, by, width, height, radius);

        // draw tail
        this.graphics.beginPath();
        this.graphics.moveTo(-5, by + height);
        this.graphics.lineTo(5, by + height);
        this.graphics.lineTo(0, by + height + 8);
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();

        this.text.setPosition(0, by + height - padding);

        // Show and fade
        this.container.setAlpha(1);

        if (this.fadeTimer) {
            this.fadeTimer.remove();
        }

        this.fadeTimer = this.scene.time.delayedCall(4000, () => {
            this.scene.tweens.add({
                targets: this.container,
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    this.messageQueue = [];
                }
            });
        });
    }

    public updatePosition(x: number, y: number) {
        // Position above the player
        this.container.setPosition(x, y - 50); 
    }

    public destroy() {
        if (this.fadeTimer) this.fadeTimer.remove();
        this.container.destroy();
    }
}
