import { gameSpeed } from './main.js';

export default class Enemy extends Phaser.GameObjects.Rectangle {
    constructor (scene, x, y, w, h, color = 0xff0000) {
        super(scene, x, y, w, h, color);
        this.setFillStyle(color, 1); // Explicitly set fillStyle with alpha = 1
        console.log(`[Enemy] Creating enemy at x:${x}, y:${y}, w:${w}, h:${h}, color:${color.toString(16)}, initialFillAlpha:${this.fillAlpha}`);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        /* Ensure the physics body matches the visual rectangle size */
        this.body.setSize(w, h);

        this.body.setAllowGravity(false);
        this.body.setImmovable(true);
        this.body.moves = true; // Default for dynamic bodies, but explicit is fine.
        
        console.log(`[Enemy] Properties before velocity: visible=${this.visible}, active=${this.active}, depth=${this.depth}`);
        if (this.body) {
            console.log(`[Enemy] Physics body properties: debugShowBody=${this.body.debugShowBody}, debugShowVelocity=${this.body.debugShowVelocity}, enable=${this.body.enable}`);
        }

        this.body.setVelocityX(-gameSpeed);
        if (this.body) { // Check if body exists before logging its velocity
            console.log(`[Enemy] Body velocity X set to: ${this.body.velocity.x}`);
        } else {
            console.error('[Enemy] Body not found after scene.physics.add.existing(this)');
        }
        
        // Try forcing visibility and depth
        this.setVisible(true);
        this.setDepth(10); // Ensure it's rendered on top of default depth (0) items, like ground/background

        console.log(`[Enemy] Post-setup: visible=${this.visible}, active=${this.active}, depth=${this.depth}, fillAlpha=${this.fillAlpha}`);
        if (this.parentContainer) {
            console.log(`[Enemy] Parent Container: ${this.parentContainer.constructor.name}`);
        } else {
            console.log('[Enemy] Parent Container: null (Not added to a display list properly?)');
        }
        console.log(`[Enemy] Camera Filter: ${this.cameraFilter}`);

        this.setData('isScorable', true);
    }
}
