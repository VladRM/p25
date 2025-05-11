import Enemy from './enemy.js';
// gameSpeed is not directly used in this file anymore for enemy velocity, it's handled in Enemy.js
// import { gameSpeed } from './main.js';

const ENEMY_TYPES = [
    { type: 'barnacle', textureKey: 'enemies_spritesheet', baseFrame: 'barnacle_attack_a' },
    { type: 'slime',    textureKey: 'enemies_spritesheet', baseFrame: 'slime_spike_walk_a' },
    { type: 'worm',     textureKey: 'enemies_spritesheet', baseFrame: 'worm_ring_move_a' },
    { type: 'enemy_1',  textureKey: 'enemy_1_a',           baseFrame: null } // baseFrame is null as textureKey is the full image
];

export class ObstacleSpawner {
    constructor (scene, group, { groundTopY }) {
        this.scene      = scene;
        this.group      = group;
        this.groundTopY = groundTopY;
        this.lastEnemyType = null;  // Track last spawned enemy to avoid repeats
    }

    spawnObstacle () {
        // console.log(`[ObstacleSpawner] spawnObstacle called. groundTopY: ${this.groundTopY}`); // Removed log
        
        let enemyTypeData;
        do {
            enemyTypeData = Phaser.Utils.Array.GetRandom(ENEMY_TYPES);
        } while (enemyTypeData.type === this.lastEnemyType && ENEMY_TYPES.length > 1);
        // const textureKey = 'enemies_spritesheet'; // No longer hardcoded

        const baseScale = 0.7;
        let chosenScale;
        if (Phaser.Math.Between(0, 1) === 0) { // Randomly pick one of the two scales
            chosenScale = baseScale;
        } else {
            chosenScale = baseScale * 1.5;
        }

        // Create a temporary sprite to get its dimensions for positioning
        // This sprite is not added to the scene or group yet.
        const tempSprite = this.scene.make.sprite({ key: enemyTypeData.textureKey, frame: enemyTypeData.baseFrame }, false);
        // Apply the chosen scale to get accurate dimensions for positioning
        tempSprite.setScale(chosenScale);
        const spriteHeight = tempSprite.displayHeight;
        const spriteWidth = tempSprite.displayWidth; 
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
            enemyTypeData.type, // Pass the enemy type for animation handling
            chosenScale         // Pass the chosen scale
        );
        this.group.add(enemy);
        this.lastEnemyType = enemyTypeData.type; // Remember last enemy type
        enemy.initializePhysics();

        // console.log(`[ObstacleSpawner] Enemy ${enemyTypeData.type} added: parentContainer=${enemy.parentContainer ? enemy.parentContainer.constructor.name : 'null'}, group.length=${this.group.getLength()}`); // Removed log
        if (enemy.body) {
             // console.log(`[ObstacleSpawner] Enemy body in group: pos=(${enemy.body.x.toFixed(2)}, ${enemy.body.y.toFixed(2)}), size=(${enemy.body.width}x${enemy.body.height}), velX=${enemy.body.velocity.x}`); // Removed log
        } else {
             // console.error('[ObstacleSpawner] Enemy added to group but has NO BODY? This should not happen if group is a physics group.'); // Removed log
        }
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
            }
        });
        return gained;
    }
}
