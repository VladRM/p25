import { GAME_SPEED } from './gameConfig.js';

const ENEMY_ANIMATIONS = {
    'enemy_1':  { frames: ['enemy_1_a', 'enemy_1_b'], frameRate: 5 },
    'enemy_2':  { frames: ['enemy_2_a', 'enemy_2_b'], frameRate: 5 },
    'enemy_3':  { frames: ['enemy_3_a', 'enemy_3_b'], frameRate: 5 },
    'enemy_4':  { frames: ['enemy_4_a', 'enemy_4_b'], frameRate: 5 }
};

export default class Enemy extends Phaser.GameObjects.Sprite {
    constructor (scene, x, y, texture, frame, enemyType, scale, animMaxUnscaledWidth, animMaxUnscaledHeight) {
        super(scene, x, y, texture, frame);
        // console.log(`[Enemy] Constructor: x:${x}, y:${y}, texture:${texture}, frame:${frame}, enemyType:${enemyType}, scale:${scale}`); // Removed log
        
        scene.add.existing(this);

        this.enemyType = enemyType; // Store the type to select animation
        this.animMaxUnscaledWidth = animMaxUnscaledWidth || this.width; // Fallback to current frame's width if not provided
        this.animMaxUnscaledHeight = animMaxUnscaledHeight || this.height; // Fallback to current frame's height if not provided


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
        // Set hitbox to 80% of the sprite's displayed width and 80% of its displayed height.
        // This results in a hitbox area of 0.8 * 0.8 = 0.64 (64%) of the sprite's area.
        // Phaser.Physics.Arcade.Body.setSize() by default centers the new body on the sprite's origin.
        // Assuming the sprite's origin is (0.5, 0.5), this will correctly center the hitbox on the sprite.
        
        // Set hitbox to 80% of the sprite's current displayed width and height.
        // When initializePhysics is called, this will be based on the scaled dimensions of the first frame of the animation.
        // If subsequent animation frames have different dimensions, the hitbox will not resize with them.
        console.log(`[Enemy] initializePhysics: enemyType=${this.enemyType}, texture=${this.texture.key}, frame=${this.frame.name}`);
        console.log(`[Enemy] initializePhysics: scaleX=${this.scaleX}, scaleY=${this.scaleY}`);
        // Log original (current frame) width/height and displayWidth/Height for reference
        console.log(`[Enemy] initializePhysics: current frame width=${this.width}, height=${this.height}`);
        console.log(`[Enemy] initializePhysics: current frame displayWidth=${this.displayWidth}, displayHeight=${this.displayHeight}`);
        console.log(`[Enemy] initializePhysics: using animMaxUnscaledWidth=${this.animMaxUnscaledWidth}, animMaxUnscaledHeight=${this.animMaxUnscaledHeight} for hitbox calc.`);

        // Calculate hitbox based on the maximum possible scaled dimensions of the animation
        const maxScaledWidth = this.animMaxUnscaledWidth * this.scaleX;
        const maxScaledHeight = this.animMaxUnscaledHeight * this.scaleY;
        
        const bodyWidth = maxScaledWidth * 1.25; // Increased from 0.8 to 0.95
        const bodyHeight = maxScaledHeight * 1.25; // Increased from 0.8 to 0.95
        
        console.log(`[Enemy] initializePhysics: maxScaledWidth=${maxScaledWidth}, maxScaledHeight=${maxScaledHeight}`);
        console.log(`[Enemy] initializePhysics: calculated bodyWidth=${bodyWidth}, bodyHeight=${bodyHeight}`);
        
        this.body.setSize(bodyWidth, bodyHeight);
        // No explicit setOffset is needed if the sprite origin is (0.5, 0.5) 
        // as setSize centers the new body on the sprite's origin by default.

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
