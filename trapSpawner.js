import { displayMessage } from './uiManager.js';

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

        // Add characters inside the trap
        const charScale = 0.5;
        const charYOffset = 0; // Adjust if needed
        const adventurerChar = this.scene.add.sprite(trap.x - 25, trap.y + charYOffset, 'adventurer_hurt')
            .setScale(charScale)
            .setTint(0xaaaaaa)
            .setDepth(trap.depth + 1);
        const femaleChar = this.scene.add.sprite(trap.x + 25, trap.y + charYOffset, 'female_hurt')
            .setScale(charScale)
            .setTint(0xaaaaaa)
            .setDepth(trap.depth + 1);

        trap.setData('adventurerChar', adventurerChar);
        trap.setData('femaleChar', femaleChar);
        
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
    }

    update(dt, player) {
        this.group.getChildren().forEach(trap => {
            const adventurerChar = trap.getData('adventurerChar');
            const femaleChar = trap.getData('femaleChar');

            if (!trap.body) { // If trap somehow lost its body, remove it
                if (adventurerChar) adventurerChar.destroy();
                if (femaleChar) femaleChar.destroy();
                this.group.remove(trap, true, true);
                return;
            }

            // Update character positions to follow the trap
            if (adventurerChar) {
                adventurerChar.x = trap.x - 25;
                adventurerChar.y = trap.y; // Assuming charYOffset was 0 or handled by sprite's origin
            }
            if (femaleChar) {
                femaleChar.x = trap.x + 25;
                femaleChar.y = trap.y; // Assuming charYOffset was 0 or handled by sprite's origin
            }

            // Check if trap is off-screen to the left
            if (trap.getBounds().right < 0) {
                if (adventurerChar) adventurerChar.destroy();
                if (femaleChar) femaleChar.destroy();
                this.group.remove(trap, true, true);
                return;
            }

            // Check for "passed by" condition if trap is active and message not yet shown
            if (trap.getData('active') && !trap.getData('passed_by_message_shown')) {
                // Consider trap passed if player's center is beyond trap's center
                if (player.x > trap.x + trap.width / 2) {
                    if (trap.getData('message_passed_by')) {
                        displayMessage(trap.getData('message_passed_by'));
                    }
                    trap.setData('passed_by_message_shown', true); // Prevent multiple messages
                }
            }
        });
    }
}
