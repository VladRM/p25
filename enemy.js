import { gameSpeed } from './main.js';

export default class Enemy extends Phaser.GameObjects.Rectangle {
    constructor (scene, x, y, w, h, color = 0xff0000) {
        super(scene, x, y, w, h, color);
        console.log(`[Enemy] Creating enemy at x:${x}, y:${y}, w:${w}, h:${h}, color:${color.toString(16)}`);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        /* Ensure the physics body matches the visual rectangle size */
        this.body.setSize(w, h);

        this.body.setAllowGravity(false);
        this.body.setImmovable(true);
        this.body.moves = true;
        this.body.setVelocityX(-gameSpeed);
        if (this.body) { // Check if body exists before logging its velocity
            console.log(`[Enemy] Body velocity X set to: ${this.body.velocity.x}`);
        } else {
            console.error('[Enemy] Body not found after scene.physics.add.existing(this)');
        }

        this.setData('isScorable', true);
    }
}
