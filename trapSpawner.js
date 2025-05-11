export class TrapSpawner {
    constructor(scene, group, { groundTopY }) {
        this.scene = scene;
        this.group = group;
        this.groundTopY = groundTopY;
        this.lastTrapType = null; // Track last spawned trap to avoid repeats
    }

    spawnTrap() {
        const TRAP_TYPES = [
            { name: 'populist', color: 0xff69b4, message_disarmed: "Populist trap disarmed placeholder", message_passed_by: "Populist trap passed by placeholder" }, // Pink
            { name: 'obedience', color: 0x1e90ff, message_disarmed: "Obedience trap disarmed placeholder", message_passed_by: "Obedience trap passed by placeholder" }, // Blue
            { name: 'darkweb', color: 0xffd700, message_disarmed: "Darkweb trap disarmed placeholder", message_passed_by: "Darkweb trap passed by placeholder" }  // Yellow (Dark Web of Lies)
        ];
        let selectedTrapType;
        do {
            selectedTrapType = Phaser.Utils.Array.GetRandom(TRAP_TYPES);
        } while (selectedTrapType.name === this.lastTrapType && TRAP_TYPES.length > 1);
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
        this.lastTrapType = selectedTrapType.name; // Remember last trap type
        trap.setData('active', true);
        trap.setData('trapType', selectedTrapType.name); // Store the trap type
        trap.setData('message_disarmed', selectedTrapType.message_disarmed); // Store disarmed message
        trap.setData('message_passed_by', selectedTrapType.message_passed_by); // Store passed by message
        
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
            if (!trap.body) { // If trap somehow lost its body, remove it
                this.group.remove(trap, true, true);
                return;
            }

            // Check if trap is off-screen to the left
            if (trap.getBounds().right < 0) {
                this.group.remove(trap, true, true);
                return;
            }

            // Check for "passed by" condition if trap is active and message not yet shown
            if (trap.getData('active') && !trap.getData('passed_by_message_shown')) {
                // Consider trap passed if player's center is beyond trap's center
                if (player.x > trap.x + trap.width / 2) {
                    if (this.scene.displayGameMessage && trap.getData('message_passed_by')) {
                        this.scene.displayGameMessage(trap.getData('message_passed_by'));
                    }
                    trap.setData('passed_by_message_shown', true); // Prevent multiple messages
                }
            }
        });
    }
}
