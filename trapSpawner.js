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
            { name: 'populist', type: 'rectangle', color: 0xff69b4, message_disarmed: "Ai folosit gândirea critică!", message_passed_by: "Nu trece nepăsător pe lângă cei nehotărâți!" }, // Pink
            { name: 'obedience', type: 'rectangle', color: 0x1e90ff, message_disarmed: "Bravo, le-ai arătat direcția!", message_passed_by: "Ajută-i pe cei dezorientați să găsească calea!" }, // Blue
            { name: 'darkweb', type: 'rectangle', color: 0xffd700, message_disarmed: "Felicitări! Ai făcut lumină și s-au decis!", message_passed_by: "Nu-i lăsa pe apropiați în întuneric!" }, // Yellow (Dark Web of Lies)
            { name: 'groupthink', type: 'sprite', textureKey: 'trap_3_a', message_disarmed: "Felicitări! Ai făcut lumină și s-au decis!", message_passed_by: "Nu-i lăsa pe apropiați în întuneric!" } // Sprite-based, uses darkweb messages
        ];
        let selectedTrapType;
        do {
            selectedTrapType = Phaser.Utils.Array.GetRandom(TRAP_TYPES);
        } while (selectedTrapType.name === this.lastTrapType && TRAP_TYPES.length > 1);

        let trap;
        const trapId = `trap_${Date.now()}_${Phaser.Math.Between(1000,9999)}`;
        const initialX = this.scene.cameras.main.width + 150; // Start further off-screen

        if (selectedTrapType.type === 'sprite') {
            // Create a sprite-based trap
            const y = this.groundTopY; // Align bottom of sprite with ground
            trap = this.scene.add.sprite(initialX, y, selectedTrapType.textureKey)
                .setOrigin(0.5, 1) // Origin at bottom-center
                .setDepth(9)
                .setName(trapId);
            // Scale if necessary, e.g., trap.setScale(0.8);
            // No characters needed for sprite traps

        } else {
            // Create a rectangle-based trap (original logic)
            const color = selectedTrapType.color;
            const width = 120;
            const height = 40;
            const y = this.groundTopY - height / 2; // Center rectangle vertically

            trap = this.scene.add.rectangle(initialX, y, width, height, color, 0) // Invisible fill
                .setOrigin(0.5)
                .setDepth(9)
                .setName(trapId);

            // Add characters inside the rectangle trap
            const numCharacters = Phaser.Math.Between(1, 4);
            const charactersInTrap = [];
            const charTypes = ['adventurer_hurt', 'female_hurt'];
            const charScale = 0.5;
            const trapRectangleHeight = height;

            let xOffsets = [];
            switch (numCharacters) {
                case 1: xOffsets = [0]; break;
                case 2: xOffsets = [-25, 25]; break;
                case 3: xOffsets = [-35, 0, 35]; break;
                case 4: xOffsets = [-45, -15, 15, 45]; break;
            }

            for (let i = 0; i < numCharacters; i++) {
                const charTypeKey = charTypes[i % charTypes.length];
                const xPosOffset = xOffsets[i];

                const charSprite = this.scene.add.sprite(trap.x + xPosOffset, trap.y, charTypeKey)
                    .setScale(charScale)
                    .setTint(0xaaaaaa)
                    .setDepth(trap.depth + 1);

                const charYPosOffset = (trapRectangleHeight / 2) - (charSprite.displayHeight / 2);
                charSprite.y = trap.y + charYPosOffset;

                charactersInTrap.push({
                    sprite: charSprite,
                    xOffset: xPosOffset,
                    yOffset: charYPosOffset,
                    charTypeKey: charTypeKey
                });
            }
            trap.setData('characters', charactersInTrap);
        }

        // Common setup for all trap types
        this.group.add(trap); // Add to group AFTER creation and potential character setup
        this.lastTrapType = selectedTrapType.name;
        trap.setData('active', true);
        trap.setData('trapType', selectedTrapType.name);
        trap.setData('message_disarmed', selectedTrapType.message_disarmed);
        trap.setData('message_passed_by', selectedTrapType.message_passed_by);
        trap.setData('trapVisualType', selectedTrapType.type); // Store 'sprite' or 'rectangle'

        if (trap.body) {
            trap.body.setAllowGravity(false);
            // Adjust hitbox if necessary, especially for sprites
            if (selectedTrapType.type === 'sprite') {
                 // Example: Make hitbox slightly smaller than the visual sprite
                 trap.body.setSize(trap.width * 0.8, trap.height * 0.9);
                 // Adjust offset if origin is not 0.5, 0.5 or if needed
                 // trap.body.setOffset(trap.width * 0.1, trap.height * 0.05);
            }
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
            const trapVisualType = trap.getData('trapVisualType'); // 'sprite' or 'rectangle'
            const charactersInTrap = trap.getData('characters'); // Only exists for 'rectangle' type

            if (!trap.body) { // If trap somehow lost its body, remove it
                // Destroy associated characters if it's a rectangle type
                if (trapVisualType === 'rectangle' && charactersInTrap) {
                    charactersInTrap.forEach(charData => {
                        if (charData.sprite) charData.sprite.destroy();
                    });
                }
                this.group.remove(trap, true, true);
                return;
            }

            // Update character positions ONLY for rectangle traps
            if (trapVisualType === 'rectangle' && charactersInTrap) {
                charactersInTrap.forEach(charData => {
                    if (charData.sprite) {
                        charData.sprite.x = trap.x + charData.xOffset;
                        charData.sprite.y = trap.y + charData.yOffset;
                    }
                });
            }

            // Check if trap is off-screen to the left
            if (trap.getBounds().right < 0) {
                // Destroy associated characters if it's a rectangle type
                if (trapVisualType === 'rectangle' && charactersInTrap) {
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
