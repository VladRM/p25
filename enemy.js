import { GAME_SPEED } from './gameConfig.js';

const ENEMY_ANIMATIONS = {
    'enemy_1':  { frames: ['enemy_1_a', 'enemy_1_b'], frameRate: 5 }, // Frames are direct image keys
    'enemy_2':  { frames: ['enemy_2_a', 'enemy_2_b'], frameRate: 5 },  // Frames are direct image keys
    'enemy_3':  { frames: ['enemy_3_a', 'enemy_3_b'], frameRate: 5 }  // Frames are direct image keys
};

export default class Enemy extends Phaser.GameObjects.Sprite {
    constructor (scene, x, y, texture, frame, enemyType, scale) {
        super(scene, x, y, texture, frame);
        // console.log(`[Enemy] Constructor: x:${x}, y:${y}, texture:${texture}, frame:${frame}, enemyType:${enemyType}, scale:${scale}`); // Removed log
        
        scene.add.existing(this);

        this.enemyType = enemyType; // Store the type to select animation

        // Set GameObject properties
        this.setVisible(true);
        this.setDepth(10);
        this.setData('isScorable', true);
        this.setScale(scale); // Use the provided scale

        // Play animation
        this.playAnimation();
        
        // console.log(`[Enemy] Constructor end: visible=${this.visible}, active=${this.active}, depth=${this.depth}, parentContainer=${this.parentContainer ? this.parentContainer.constructor.name : 'null'}`); // Removed log
    }

    playAnimation() {
        const animConfig = ENEMY_ANIMATIONS[this.enemyType];
        if (animConfig) {
            const animKey = `${this.enemyType}_anim`;
            if (!this.scene.anims.exists(animKey)) {
                let frameObjects;
                if (animConfig.spritesheet) {
                    // Frames are part of a spritesheet
                    frameObjects = animConfig.frames.map(frameName => ({ key: animConfig.spritesheet, frame: frameName }));
                } else {
                    // Frames are individual image keys
                    frameObjects = animConfig.frames.map(imageKey => ({ key: imageKey }));
                }
                this.scene.anims.create({
                    key: animKey,
                    frames: frameObjects,
                    frameRate: animConfig.frameRate,
                    repeat: -1
                });
            }
            this.play(animKey);
        }
    }

    initializePhysics() {
        if (!this.body) {
            // console.error('[Enemy] initializePhysics called but this.body is not defined. Ensure it was added to a physics group.'); // Removed log
            return;
        }
        // console.log('[Enemy] initializePhysics called.'); // Removed log

        // Set body size based on displayed sprite size, adjust as necessary
        // Hitbox will be 80% of the sprite's area, centered.
        // Scale factor for dimensions to achieve 80% area: sqrt(0.8) ~= 0.8944
        // setSize by default re-centers the physics body on the game object's origin.
        this.body.setSize(this.displayWidth * 0.8944, this.displayHeight * 0.8944);
        // For a sprite with origin (0.5, 0.5), setOffset(0,0) keeps the body centered on the sprite.
        this.body.setOffset(0, 0);


        this.body.setAllowGravity(false);
        this.body.setImmovable(true);
        // this.body.moves is true by default for dynamic bodies if the group adds dynamic bodies.

        this.body.setVelocityX(-GAME_SPEED);

        // console.log(`[Enemy] Physics initialized: VelocityX=${this.body.velocity.x}, Size=${this.body.width}x${this.body.height}`); // Removed log
        if (this.body) { // Redundant check as it's checked above, but good for detailed logging
            // console.log(`[Enemy] Physics body properties: debugShowBody=${this.body.debugShowBody}, debugShowVelocity=${this.body.debugShowVelocity}, enable=${this.body.enable}`); // Removed log
        }
    }
}
