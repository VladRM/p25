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
            this.scene.sys.game.config.width + w,
            yPos,
            w, h, col
        );
        this.group.add(enemy);
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
