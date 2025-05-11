import Enemy from './enemy.js';
// gameSpeed is not directly used in this file anymore for enemy velocity, it's handled in Enemy.js
// import { gameSpeed } from './main.js';

const ENEMY_TYPES = [
    // IMPORTANT: Replace animMaxUnscaledWidth/Height with actual max dimensions from your art assets
    { type: 'enemy_1',  textureKey: 'enemy_1_a', baseFrame: null, animMaxUnscaledWidth: 256, animMaxUnscaledHeight: 350, message_avoided: "Enemy 1 avoided placeholder", message_hit: "Enemy 1 hit placeholder" },
    { type: 'enemy_2',  textureKey: 'enemy_2_a', baseFrame: null, animMaxUnscaledWidth: 256, animMaxUnscaledHeight: 320, message_avoided: "Enemy 2 avoided placeholder", message_hit: "Enemy 2 hit placeholder" },
    { type: 'enemy_3',  textureKey: 'enemy_3_a', baseFrame: null, animMaxUnscaledWidth: 256, animMaxUnscaledHeight: 256, message_avoided: "Enemy 3 avoided placeholder", message_hit: "Enemy 3 hit placeholder" },
    { type: 'enemy_4',  textureKey: 'enemy_4_a', baseFrame: null, animMaxUnscaledWidth: 256, animMaxUnscaledHeight: 256, message_avoided: "Enemy 4 avoided placeholder", message_hit: "Enemy 4 hit placeholder" }
];

export class ObstacleSpawner {
    constructor (scene, group, { groundTopY }) {
        this.scene      = scene;
        this.group      = group;
        this.groundTopY = groundTopY;
        this.lastEnemyType = null;  // Track last spawned enemy to avoid repeats
    }

    spawnObstacle () {
        let enemyTypeData;
        do {
            enemyTypeData = Phaser.Utils.Array.GetRandom(ENEMY_TYPES);
        } while (enemyTypeData.type === this.lastEnemyType && ENEMY_TYPES.length > 1);

        // Create a temporary sprite to get its original dimensions
        const tempSprite = this.scene.make.sprite({ key: enemyTypeData.textureKey, frame: enemyTypeData.baseFrame }, false);
        const originalWidth = tempSprite.width;
        const originalHeight = tempSprite.height;
        console.log(`[ObstacleSpawner] spawnObstacle: enemyType=${enemyTypeData.type}, textureKey=${enemyTypeData.textureKey}`);
        console.log(`[ObstacleSpawner] spawnObstacle: originalWidth=${originalWidth}, originalHeight=${originalHeight}`);

        // Calculate scale to fit within a 128x128 box while maintaining aspect ratio
        const maxDim = 96;
        console.log(`[ObstacleSpawner] spawnObstacle: target maxDim=${maxDim}`);
        let chosenScale = 1; // Default scale if dimensions are 0
        if (originalWidth > 0 && originalHeight > 0) {
            const scaleX = maxDim / originalWidth;
            const scaleY = maxDim / originalHeight;
            chosenScale = Math.min(scaleX, scaleY);
            console.log(`[ObstacleSpawner] spawnObstacle: calculated scaleX=${scaleX}, scaleY=${scaleY}, chosenScale=${chosenScale}`);
        } else {
            console.log(`[ObstacleSpawner] spawnObstacle: originalWidth or originalHeight is 0, using default chosenScale=${chosenScale}`);
        }
        
        // Apply the calculated scale to get accurate dimensions for positioning
        tempSprite.setScale(chosenScale);
        const spriteHeight = tempSprite.displayHeight;
        const spriteWidth = tempSprite.displayWidth;
        console.log(`[ObstacleSpawner] spawnObstacle: after scaling tempSprite, displayWidth=${spriteWidth}, displayHeight=${spriteHeight}`);
        tempSprite.destroy(); // Clean up temporary sprite

        let yPos = this.groundTopY - spriteHeight / 2; // Position based on sprite's center
        if (typeof this.groundTopY !== 'number' || isNaN(this.groundTopY)) {
            // console.warn(`[ObstacleSpawner] groundTopY is invalid: ${this.groundTopY}. Defaulting Y position for obstacle.`); // Removed log
            yPos = this.scene.sys.game.config.height - 20 - spriteHeight / 2; // Default based on game height
        }

        const enemy = new Enemy(
            this.scene,
            this.scene.sys.game.config.width + spriteWidth, // Initial X position (off-screen to the right)
            yPos,
            enemyTypeData.textureKey, // Use the textureKey from ENEMY_TYPES
            enemyTypeData.baseFrame,  // Use the baseFrame from ENEMY_TYPES (can be null)
            enemyTypeData.type,       // Pass the enemy type for animation handling
            chosenScale,              // Pass the chosen scale
            enemyTypeData.animMaxUnscaledWidth, // Pass the max unscaled width for hitbox calculation
            enemyTypeData.animMaxUnscaledHeight, // Pass the max unscaled height for hitbox calculation
            enemyTypeData.message_avoided, // Pass the avoided message
            enemyTypeData.message_hit      // Pass the hit message
        );
        this.group.add(enemy);
        this.lastEnemyType = enemyTypeData.type; // Remember last enemy type
        enemy.initializePhysics();
    }

    /* update returns score gained this frame */
    update (dt, player) {
        let gained = 0;
        this.group.getChildren().forEach(ob => {
            if (!ob.body) { this.group.remove(ob, true, true); return; }

            if (ob.getBounds().right < 0) {
                this.group.remove(ob, true, true);
            } else if (ob.getData('isScorable') && (ob.x + ob.width / 2) < player.x) {
                gained += 1;
                ob.setData('isScorable', false);
                // Display message for avoiding enemy
                if (this.scene.displayGameMessage && ob.message_avoided) {
                    this.scene.displayGameMessage(ob.message_avoided);
                }
            }
        });
        return gained;
    }
}
