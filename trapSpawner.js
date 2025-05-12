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
            { name: 'populist', color: 0xff69b4, message_disarmed: "Ai folosit gândirea critică!", message_passed_by: "Nu trece nepăsător pe lângă cei nehotărâți!" }, // Pink
            { name: 'obedience', color: 0x1e90ff, message_disarmed: "Bravo, le-ai arătat direcția!", message_passed_by: "Ajută-i pe cei dezorientați să găsească calea!" }, // Blue
            { name: 'darkweb', color: 0xffd700, message_disarmed: "Felicitări! Ai făcut lumină și s-au decis!", message_passed_by: "Nu-i lăsa pe apropiați în întuneric!" }  // Yellow (Dark Web of Lies)
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
        const numCharacters = Phaser.Math.Between(1, 4);
        const charactersInTrap = [];
        const charTypes = ['adventurer_hurt', 'female_hurt'];
        const charScale = 0.5;
        const trapRectangleHeight = height; // Height of the invisible trap rectangle

        let xOffsets = [];
        switch (numCharacters) {
            case 1:
                xOffsets = [0];
                break;
            case 2:
                xOffsets = [-25, 25]; // Original spacing for two characters
                break;
            case 3:
                xOffsets = [-35, 0, 35]; // Spaced for three characters
                break;
            case 4:
                xOffsets = [-45, -15, 15, 45]; // Spaced for four characters
                break;
        }

        for (let i = 0; i < numCharacters; i++) {
            const charTypeKey = charTypes[i % charTypes.length]; // Alternate character types
            const xPosOffset = xOffsets[i];

            const charSprite = this.scene.add.sprite(trap.x + xPosOffset, trap.y, charTypeKey)
                .setScale(charScale)
                .setTint(0xaaaaaa)
                .setDepth(trap.depth + 1);

            // Calculate Y offset for the character to place its feet on the ground.
            // Origin is (0.5, 0.5). trap.y is the center of the trap rectangle.
            // trapRectangleHeight / 2 is distance from trap center to its edge (ground).
            // charSprite.displayHeight / 2 is distance from char sprite center to its feet.
            const charYPosOffset = (trapRectangleHeight / 2) - (charSprite.displayHeight / 2);
            charSprite.y = trap.y + charYPosOffset; // Apply the calculated Y position

            charactersInTrap.push({
                sprite: charSprite,
                xOffset: xPosOffset,    // Store original xOffset relative to trap center
                yOffset: charYPosOffset, // Store yOffset relative to trap center (for vertical alignment)
                charTypeKey: charTypeKey // Store the original character type key
            });
        }
        trap.setData('characters', charactersInTrap);
        
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
            const charactersInTrap = trap.getData('characters');

            if (!trap.body) { // If trap somehow lost its body, remove it
                if (charactersInTrap) {
                    charactersInTrap.forEach(charData => {
                        if (charData.sprite) charData.sprite.destroy();
                    });
                }
                this.group.remove(trap, true, true);
                return;
            }

            // Update character positions to follow the trap
            if (charactersInTrap) {
                charactersInTrap.forEach(charData => {
                    if (charData.sprite) {
                        charData.sprite.x = trap.x + charData.xOffset;
                        // charData.yOffset was calculated to align sprite's feet with ground relative to trap.y
                        charData.sprite.y = trap.y + charData.yOffset;
                    }
                });
            }

            // Check if trap is off-screen to the left
            if (trap.getBounds().right < 0) {
                if (charactersInTrap) {
                    charactersInTrap.forEach(charData => {
                        if (charData.sprite) charData.sprite.destroy();
                    });
                }
                this.group.remove(trap, true, true);
                return;
            }

            // Check for "passed by" condition if trap is active and message not yet shown
            if (trap.getData('active') && !trap.getData('passed_by_message_shown')) {
                // Consider trap passed if player's center is beyond trap's center
                if (player.x > trap.x + trap.width / 2) {
                    if (trap.getData('message_passed_by')) {
                        displayMessage(trap.getData('message_passed_by'), 'passed_by');
                    }
                    trap.setData('passed_by_message_shown', true); // Prevent multiple messages
                }
            }
        });
    }
}
