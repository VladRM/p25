import { gameSpeed } from './main.js';

export default class Enemy extends Phaser.GameObjects.Rectangle {
    constructor (scene, x, y, w, h, color = 0xff0000) {
        super(scene, x, y, w, h, color); // Creates the GO, associates with scene
        this.setFillStyle(color, 1);
        console.log(`[Enemy] Constructor: x:${x}, y:${y}, w:${w}, h:${h}, color:${color.toString(16)}, initialFillAlpha:${this.fillAlpha}`);
        
        scene.add.existing(this); // Add to scene's display list. Its parentContainer will be null here.

        // Store original w and h for initializePhysics, as this.width/this.height might refer to scaled dimensions later
        this.w_orig = w; 
        this.h_orig = h;

        // Set GameObject properties
        this.setVisible(true); // Default is true, but explicit for clarity
        this.setDepth(10);     // Ensure it's rendered on top of default depth (0) items
        this.setData('isScorable', true);
        
        console.log(`[Enemy] Constructor end: visible=${this.visible}, active=${this.active}, depth=${this.depth}, parentContainer=${this.parentContainer ? this.parentContainer.constructor.name : 'null'}`);
        // this.body is not yet defined. Physics will be initialized by initializePhysics() after being added to a physics group.
    }

    initializePhysics() {
        // This method MUST be called after this enemy has been added to a physics group,
        // which is when this.body will be created and available.
        if (!this.body) {
            console.error('[Enemy] initializePhysics called but this.body is not defined. Ensure it was added to a physics group.');
            return;
        }
        console.log('[Enemy] initializePhysics called.');

        /* Ensure the physics body matches the visual rectangle size */
        this.body.setSize(this.w_orig, this.h_orig); // Use stored original w, h

        this.body.setAllowGravity(false);
        this.body.setImmovable(true);
        // this.body.moves is true by default for dynamic bodies if the group adds dynamic bodies.

        this.body.setVelocityX(-gameSpeed);

        console.log(`[Enemy] Physics initialized: VelocityX=${this.body.velocity.x}, Size=${this.body.width}x${this.body.height}`);
        if (this.body) { // Redundant check as it's checked above, but good for detailed logging
            console.log(`[Enemy] Physics body properties: debugShowBody=${this.body.debugShowBody}, debugShowVelocity=${this.body.debugShowVelocity}, enable=${this.body.enable}`);
        }
    }
}
