import { GAME_SPEED } from './gameConfig.js';

const ENEMY_ANIMATIONS = {
    'enemy_1':  { frames: ['enemy_1_a', 'enemy_1_b'], frameRate: 5 },
    'enemy_2':  { frames: ['enemy_2_a', 'enemy_2_b'], frameRate: 5 },
    'enemy_3':  { frames: ['enemy_3_a', 'enemy_3_b'], frameRate: 5 },
    'enemy_4':  { frames: ['enemy_4_a', 'enemy_4_b'], frameRate: 5 }
};

export default class Enemy extends Phaser.GameObjects.Sprite {
    constructor (scene, x, y, texture, frame, enemyType, scale, animMaxUnscaledWidth, animMaxUnscaledHeight, message_avoided, message_hit) {
        super(scene, x, y, texture, frame);
        // console.log(`[Enemy] Constructor: x:${x}, y:${y}, texture:${texture}, frame:${frame}, enemyType:${enemyType}, scale:${scale}`); // Removed log
        
        scene.add.existing(this);

        this.enemyType = enemyType; // Store the type to select animation
        this.animMaxUnscaledWidth = animMaxUnscaledWidth || this.width; // Fallback to current frame's width if not provided
        this.animMaxUnscaledHeight = animMaxUnscaledHeight || this.height; // Fallback to current frame's height if not provided
        this.message_avoided = message_avoided;
        this.message_hit = message_hit;


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
        // Calculate hitbox based on the maximum possible scaled dimensions of the animation
        const maxScaledWidth = this.animMaxUnscaledWidth * this.scaleX;
        const maxScaledHeight = this.animMaxUnscaledHeight * this.scaleY;
        
        const bodyWidth = maxScaledWidth * 1.25; // Increased from 0.8 to 0.95
        const bodyHeight = maxScaledHeight * 1.25; // Increased from 0.8 to 0.95
        
        this.body.setSize(bodyWidth, bodyHeight);
        
        this.body.setAllowGravity(false);
        this.body.setImmovable(true);
        
        this.body.setVelocityX(-GAME_SPEED);

    }
}
