import Enemy from './enemy.js';
import { gameSpeed } from './main.js';

/* obstacle colors exported by main.js */
import { obstacleColors } from './main.js';

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
        const h = Phaser.Math.Between(20, 70);
        const w = Phaser.Math.Between(20, 40);
        const col = Phaser.Utils.Array.GetRandom(obstacleColors);

        const enemy = new Enemy(
            this.scene,
            this.scene.sys.game.config.width + w,
            this.groundTopY - h / 2,
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
