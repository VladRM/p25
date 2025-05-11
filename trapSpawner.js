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
            { name: 'populist', color: 0xff69b4, message_disarmed: "Ai folosit gandirea critica!", message_passed_by: "Nu trece nepasator pe langa cei nehotarati!" }, // Pink
            { name: 'obedience', color: 0x1e90ff, message_disarmed: "Bravo, le-ai aratat directia!", message_passed_by: "Ajuta-i pe cei dezorientati sa gaseasca calea!" }, // Blue
            { name: 'darkweb', color: 0xffd700, message_disarmed: "Felicitari! Ai facut lumina si i-ai ajutat sa se decida!", message_passed_by: "Nu-i lasa pe apropiati in intuneric!" }  // Yellow (Dark Web of Lies)
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
        const trap = this.scene.add.rectangle(x, y, width, height, color, 0) // Set fillAlpha to 0 to make it invisible
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
        const trapRectangleHeight = height; // Height of the invisible trap rectangle

        const adventurerChar = this.scene.add.sprite(trap.x - 25, trap.y, 'adventurer_hurt') // Initial Y centered with trap
            .setScale(charScale)
            .setTint(0xaaaaaa)
            .setDepth(trap.depth + 1);
        // Calculate Y offset for the adventurer character to place its feet on the ground.
        // The character's sprite origin is (0.5, 0.5).
        // groundTopY = trap.y + trapRectangleHeight / 2. Feet should be at groundTopY.
        // So, target adventurerChar.y = groundTopY - adventurerChar.displayHeight / 2.
        // Expressed relative to trap.y: adventurerChar.y = trap.y + (trapRectangleHeight / 2 - adventurerChar.displayHeight / 2).
        const adventurerYOffset = (trapRectangleHeight / 2) - (adventurerChar.displayHeight / 2);
        adventurerChar.y = trap.y + adventurerYOffset; // Apply the calculated Y position
        trap.setData('adventurerYOffset', adventurerYOffset); // Store offset for updates

        const femaleChar = this.scene.add.sprite(trap.x + 25, trap.y, 'female_hurt') // Initial Y centered with trap
            .setScale(charScale)
            .setTint(0xaaaaaa)
            .setDepth(trap.depth + 1);
        // Calculate Y offset similarly for the female character.
        const femaleYOffset = (trapRectangleHeight / 2) - (femaleChar.displayHeight / 2);
        femaleChar.y = trap.y + femaleYOffset; // Apply the calculated Y position
        trap.setData('femaleYOffset', femaleYOffset); // Store offset for updates

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
                const adventurerYOffset = trap.getData('adventurerYOffset');
                // Ensure offset is a number; default to 0 if not found (should always be found).
                adventurerChar.y = trap.y + (typeof adventurerYOffset === 'number' ? adventurerYOffset : 0);
            }
            if (femaleChar) {
                femaleChar.x = trap.x + 25;
                const femaleYOffset = trap.getData('femaleYOffset');
                // Ensure offset is a number; default to 0 if not found.
                femaleChar.y = trap.y + (typeof femaleYOffset === 'number' ? femaleYOffset : 0);
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
