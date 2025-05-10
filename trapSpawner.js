export class TrapSpawner {
    constructor(scene, group, { groundTopY }) {
        this.scene = scene;
        this.group = group;
        this.groundTopY = groundTopY;
    }

    spawnTrap() {
        const TRAP_TYPES = [
            { name: 'populist', color: 0xff69b4 }, // Pink
            { name: 'obedience', color: 0x1e90ff }, // Blue
            { name: 'darkweb', color: 0xffd700 }  // Yellow (Dark Web of Lies)
        ];
        const selectedTrapType = Phaser.Utils.Array.GetRandom(TRAP_TYPES);
        const color = selectedTrapType.color;

        const width = 120;
        const height = 40;
        const x = this.scene.cameras.main.width + width;
        const y = this.groundTopY - height / 2;

        const trapId = `trap_${Date.now()}_${Phaser.Math.Between(1000,9999)}`;
        const trap = this.scene.add.rectangle(x, y, width, height, color)
            .setOrigin(0.5)
            .setDepth(9) // Set depth similar to enemies, but slightly less to be distinct if needed
            .setName(trapId); // Give it a unique name for logging

        // Add to the group first. The group will ensure a physics body is created/enabled.
        this.group.add(trap);
        trap.setData('active', true);
        trap.setData('trapType', selectedTrapType.name); // Store the trap type
        
        if (trap.body) {
            trap.body.setAllowGravity(false);
            // Explicitly set debug flags, though global debug should cover this
            trap.body.debugShowBody = true;
            trap.body.debugShowVelocity = true;
            trap.body.setVelocityX(-250); // same speed as obstacles
            // console.log(`[TrapSpawner] Trap body configured. Velocity set to: ${trap.body.velocity.x}`); // Removed log
        } else {
            // console.error('[TrapSpawner] Trap added to group but has NO BODY! Cannot configure physics.'); // Removed log
        }

        // console.log(`[TrapSpawner] Trap created: x=${trap.x}, y=${trap.y}, width=${trap.width}, height=${trap.height}, color=${trap.fillColor.toString(16)}, visible=${trap.visible}, depth=${trap.depth}, active=${trap.getData('active')}`); // Removed log
        if (trap.body) {
            // console.log(`[TrapSpawner] Trap body (final): x=${trap.body.x}, y=${trap.body.y}, width=${trap.body.width}, height=${trap.body.height}, velocityX=${trap.body.velocity.x}`); // Removed log
        } else {
            // console.error('[TrapSpawner] Trap has no physics body after being added to group!'); // Removed log
        }
    }

    update(dt, player) {
        this.group.getChildren().forEach(trap => {
            // if (trap.body) {  // Removed log
                // console.log(`[TrapSpawner Update] Trap ID: ${trap.name || 'N/A'}, X: ${trap.x.toFixed(2)}, Body X: ${trap.body.x.toFixed(2)}, Velocity X: ${trap.body.velocity.x.toFixed(2)}, Visible: ${trap.visible}, Active: ${trap.active}`);
            // } // Removed log
            if (trap.getBounds().right < 0) {
                // console.log(`[TrapSpawner Update] Removing trap that went off-screen left. ID: ${trap.name || 'N/A'}, X: ${trap.x.toFixed(2)}`); // Removed log
                this.group.remove(trap, true, true);
            }
        });
    }
}
