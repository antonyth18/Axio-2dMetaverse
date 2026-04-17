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

        // Kill any existing fade tweens
        this.scene.tweens.killTweensOf(this.container);
        this.container.setAlpha(1);
        this.container.setVisible(true);

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
            this.container.setVisible(false);
            return;
        }

        this.text.setText(content);
        this.text.setFontSize(20); // Make it BIG for debugging
        this.text.setStroke('#ffffff', 4); // White outline
        
        if (lastIsSystem) {
            this.text.setColor('#ff0000');
        } else {
            this.text.setColor('#000000');
        }

        const bounds = this.text.getBounds();
        const padding = 10;
        const width = Math.max(bounds.width + padding * 2, 40);
        const height = bounds.height + padding * 2;
        const radius = 8;

        const bgFill = lastIsSystem ? 0xffcccc : 0xf0f0f0;

        this.graphics.fillStyle(bgFill, 1);
        this.graphics.lineStyle(3, 0x000000, 1);

        // Draw bubble above the origin
        const bx = -width / 2;
        const by = -height - 15; 

        this.graphics.fillRoundedRect(bx, by, width, height, radius);
        this.graphics.strokeRoundedRect(bx, by, width, height, radius);

        // draw tail
        this.graphics.beginPath();
        this.graphics.moveTo(-8, by + height);
        this.graphics.lineTo(8, by + height);
        this.graphics.lineTo(0, by + height + 10);
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();

        this.text.setPosition(0, by + height/2);
        this.text.setOrigin(0.5, 0.5);

        // Show
        this.container.setVisible(true);
        this.container.setAlpha(1);
        this.container.setDepth(1000); // Super high depth

        if (this.fadeTimer) {
            this.fadeTimer.remove();
        }

        this.fadeTimer = this.scene.time.delayedCall(5000, () => {
            this.scene.tweens.add({
                targets: this.container,
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    this.container.setVisible(false);
                    this.messageQueue = [];
                }
            });
        });
    }

    public updatePosition(x: number, y: number) {
        // Position above the player's head
        this.container.setPosition(x, y - 60); 
    }

    public destroy() {
        if (this.fadeTimer) this.fadeTimer.remove();
        this.container.destroy();
    }
}
