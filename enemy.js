import { gameSpeed } from './main.js';

const ENEMY_ANIMATIONS = {
    'barnacle': { frames: ['barnacle_attack_a', 'barnacle_attack_b'], frameRate: 5 },
    'slime':    { frames: ['slime_spike_walk_a', 'slime_spike_walk_b'], frameRate: 5 },
    'worm':     { frames: ['worm_ring_move_a', 'worm_ring_move_b'], frameRate: 5 }
};

export default class Enemy extends Phaser.GameObjects.Sprite {
    constructor (scene, x, y, texture, frame, enemyType, scale) {
        super(scene, x, y, texture, frame);
        console.log(`[Enemy] Constructor: x:${x}, y:${y}, texture:${texture}, frame:${frame}, enemyType:${enemyType}, scale:${scale}`);
        
        scene.add.existing(this);

        this.enemyType = enemyType; // Store the type to select animation

        // Set GameObject properties
        this.setVisible(true);
        this.setDepth(10);
        this.setData('isScorable', true);
        this.setScale(scale); // Use the provided scale

        // Play animation
        this.playAnimation();
        
        console.log(`[Enemy] Constructor end: visible=${this.visible}, active=${this.active}, depth=${this.depth}, parentContainer=${this.parentContainer ? this.parentContainer.constructor.name : 'null'}`);
    }

    playAnimation() {
        const animConfig = ENEMY_ANIMATIONS[this.enemyType];
        if (animConfig) {
            const animKey = `${this.enemyType}_anim`;
            if (!this.scene.anims.exists(animKey)) {
                this.scene.anims.create({
                    key: animKey,
                    frames: animConfig.frames.map(frame => ({ key: 'enemies_spritesheet', frame: frame })),
                    frameRate: animConfig.frameRate,
                    repeat: -1
                });
            }
            this.play(animKey);
        }
    }

    initializePhysics() {
        if (!this.body) {
            console.error('[Enemy] initializePhysics called but this.body is not defined. Ensure it was added to a physics group.');
            return;
        }
        console.log('[Enemy] initializePhysics called.');

        // Set body size based on displayed sprite size, adjust as necessary
        // Make hitbox smaller and offset to be more forgiving
        this.body.setSize(this.displayWidth * 0.6, this.displayHeight * 0.6);
        this.body.setOffset(this.displayWidth * 0.2, this.displayHeight * 0.3);


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
