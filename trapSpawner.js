export class TrapSpawner {
    constructor(scene, group, { groundTopY }) {
        this.scene = scene;
        this.group = group;
        this.groundTopY = groundTopY;
    }

    spawnTrap() {
        console.log(`[TrapSpawner] spawnTrap called. groundTopY: ${this.groundTopY}`);
        const COLORS = [0xff69b4, 0x1e90ff, 0xffd700]; // pink, blue, yellow
        const color = Phaser.Utils.Array.GetRandom(COLORS);

        const width = 120;
        const height = 40;
        const x = this.scene.cameras.main.width + width;
        const y = this.groundTopY - height / 2;

        const trap = this.scene.add.rectangle(x, y, width, height, color)
            .setOrigin(0.5)
            .setDepth(9); // Set depth similar to enemies, but slightly less to be distinct if needed

        this.scene.physics.add.existing(trap);
        trap.body.setAllowGravity(false);
        // The following line was redundant as setVelocityX is called again immediately.
        // trap.body.setVelocityX(-this.scene.game.config.physics.arcade?.gravity ? this.scene.physics.world.gravity.y : 0);
        // trap.body.setVelocityX(-250); // Moved to after adding to group

        this.group.add(trap);
        trap.setData('active', true);
        
        // Set velocity AFTER adding to the group, as adding to group might reset/finalize body properties
        if (trap.body) {
            trap.body.setVelocityX(-250); // same speed as obstacles
            console.log(`[TrapSpawner] Trap body velocity set to: ${trap.body.velocity.x}`);
        } else {
            console.error('[TrapSpawner] Trap has no physics body after being added to group, cannot set velocity!');
        }

        console.log(`[TrapSpawner] Trap created: x=${trap.x}, y=${trap.y}, width=${trap.width}, height=${trap.height}, color=${trap.fillColor.toString(16)}, visible=${trap.visible}, depth=${trap.depth}, active=${trap.getData('active')}`);
        if (trap.body) {
            console.log(`[TrapSpawner] Trap body (final): x=${trap.body.x}, y=${trap.body.y}, width=${trap.body.width}, height=${trap.body.height}, velocityX=${trap.body.velocity.x}`);
        } else {
            console.error('[TrapSpawner] Trap has no physics body after being added to group!');
        }
    }

    update(dt, player) {
        this.group.getChildren().forEach(trap => {
            if (trap.getBounds().right < 0) {
                this.group.remove(trap, true, true);
            }
        });
    }
}
