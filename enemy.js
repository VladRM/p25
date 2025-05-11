import { GAME_SPEED } from './gameConfig.js';

const ENEMY_ANIMATIONS = {
    // Example: You would need to find the actual max dimensions for your enemy frames
    // and populate maxFrameWidth and maxFrameHeight accordingly.
    'enemy_1':  { 
        frames: ['enemy_1_a', 'enemy_1_b'], 
        frameRate: 5,
        // maxFrameWidth: 64, // Example: unscaled width of the largest frame for enemy_1
        // maxFrameHeight: 64 // Example: unscaled height of the largest frame for enemy_1
    }, 
    'enemy_2':  { 
        frames: ['enemy_2_a', 'enemy_2_b'], 
        frameRate: 5
        // maxFrameWidth: 70, // Example
        // maxFrameHeight: 70  // Example
    },  
    'enemy_3':  { 
        frames: ['enemy_3_a', 'enemy_3_b'], 
        frameRate: 5
        // maxFrameWidth: 60, // Example
        // maxFrameHeight: 60  // Example
    }  
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
        // Set hitbox to 80% of the sprite's displayed width and 80% of its displayed height.
        // This results in a hitbox area of 0.8 * 0.8 = 0.64 (64%) of the sprite's area.
        // Phaser.Physics.Arcade.Body.setSize() by default centers the new body on the sprite's origin.
        // Assuming the sprite's origin is (0.5, 0.5), this will correctly center the hitbox on the sprite.
        
        const animConfig = ENEMY_ANIMATIONS[this.enemyType];
        let bodyWidth, bodyHeight;

        if (animConfig && animConfig.maxFrameWidth && animConfig.maxFrameHeight) {
            // Use defined max frame dimensions if available
            bodyWidth = animConfig.maxFrameWidth * this.scaleX * 0.8;
            bodyHeight = animConfig.maxFrameHeight * this.scaleY * 0.8;
        } else {
            // Fallback to current display dimensions (based on the first animation frame)
            bodyWidth = this.displayWidth * 0.8;
            bodyHeight = this.displayHeight * 0.8;
        }
        
        this.body.setSize(bodyWidth, bodyHeight);
        // No explicit setOffset is needed if the sprite origin is (0.5, 0.5) and setSize's default centering is used.


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
