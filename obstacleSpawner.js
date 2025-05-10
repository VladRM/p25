import Enemy from './enemy.js';
import { gameSpeed } from './main.js';

const obstacleColors = [
    0xFF0000, // Red
    0xFFA500, // Orange
    0xFFFF00, // Yellow
    0x008000, // Green
    0x800080  // Purple
];

export class ObstacleSpawner {
    constructor (scene, group, { spawnDelay, groundTopY }) {
        this.scene      = scene;
        this.group      = group;
        this.spawnDelay = spawnDelay;
        this.groundTopY = groundTopY;

        this.start();
    }

    start () {
        this.timer = this.scene.time.addEvent({
            delay    : this.spawnDelay,
            callback : () => this.spawnObstacle(),
            loop     : true
        });
    }

    stop () {
        if (this.timer) this.timer.remove(false);
    }

    spawnObstacle () {
        console.log(`[ObstacleSpawner] spawnObstacle called. groundTopY: ${this.groundTopY}, spawnDelay: ${this.spawnDelay}`);
        const h = Phaser.Math.Between(20, 70);
        const w = Phaser.Math.Between(20, 40);
        const col = Phaser.Utils.Array.GetRandom(obstacleColors);

        let yPos = this.groundTopY - h / 2;
        if (typeof this.groundTopY !== 'number' || isNaN(this.groundTopY)) {
            console.warn(`[ObstacleSpawner] groundTopY is invalid: ${this.groundTopY}. Defaulting Y position for obstacle.`);
            // Default Y position calculation, assuming ground is 20px from bottom of game area and using game config height
            yPos = this.scene.sys.game.config.height - 20 - h / 2;
        }

        const enemy = new Enemy(
            this.scene,
            this.scene.sys.game.config.width + w, // Initial X position
            yPos,
            w, h, col // Pass w, h for Enemy's dimensions
        );
        this.group.add(enemy);    // Adds to group, which should enable physics body on enemy
        enemy.initializePhysics(); // Now that body exists (from being added to physics group), set its properties

        // Log parent container status and body info after all setup
        console.log(`[ObstacleSpawner] Enemy added: parentContainer=${enemy.parentContainer ? enemy.parentContainer.constructor.name : 'null'}, group.length=${this.group.getLength()}`);
        if (enemy.body) {
             console.log(`[ObstacleSpawner] Enemy body in group: pos=(${enemy.body.x.toFixed(2)}, ${enemy.body.y.toFixed(2)}), size=(${enemy.body.width}x${enemy.body.height}), velX=${enemy.body.velocity.x}`);
        } else {
             console.error('[ObstacleSpawner] Enemy added to group but has NO BODY? This should not happen if group is a physics group.');
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
                gained += 10;
                ob.setData('isScorable', false);
            }
        });
        return gained;
    }
}
