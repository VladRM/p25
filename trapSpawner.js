export class TrapSpawner {
    constructor(scene, group, { spawnDelay, groundTopY }) {
        this.scene = scene;
        this.group = group;
        this.spawnDelay = spawnDelay;
        this.groundTopY = groundTopY;

        this.start();
    }

    start() {
        this.timer = this.scene.time.addEvent({
            delay: this.spawnDelay,
            callback: () => this.spawnTrap(),
            loop: true
        });
    }

    stop() {
        if (this.timer) this.timer.remove(false);
    }

    spawnTrap() {
        const COLORS = [0xff69b4, 0x1e90ff, 0xffd700]; // pink, blue, yellow
        const color = Phaser.Utils.Array.GetRandom(COLORS);

        const width = 120;
        const height = 40;
        const x = this.scene.cameras.main.width + width;
        const y = this.groundTopY - height / 2;

        const trap = this.scene.add.rectangle(x, y, width, height, color)
            .setOrigin(0.5);

        this.scene.physics.add.existing(trap);
        trap.body.setAllowGravity(false);
        trap.body.setVelocityX(-this.scene.game.config.physics.arcade?.gravity ? this.scene.physics.world.gravity.y : 0);
        trap.body.setVelocityX(-250); // same speed as obstacles

        this.group.add(trap);
        trap.setData('active', true);
    }

    update(dt, player) {
        this.group.getChildren().forEach(trap => {
            if (trap.getBounds().right < 0) {
                this.group.remove(trap, true, true);
            }
        });
    }
}
