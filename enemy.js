import { gameSpeed } from './main.js';

export default class Enemy extends Phaser.GameObjects.Rectangle {
    constructor (scene, x, y, w, h, color = 0xff0000) {
        super(scene, x, y, w, h, color);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        /* Ensure the physics body matches the visual rectangle size */
        this.body.setSize(w, h);

        this.body.setAllowGravity(false);
        this.body.setImmovable(true);
        this.body.moves = true;
        this.body.setVelocityX(-gameSpeed);

        this.setData('isScorable', true);
    }
}
