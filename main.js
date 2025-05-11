import { createStaticLayers } from './staticLayers.js';
import { createPlayer, registerPlayerControls } from './player.js';
import { ObstacleSpawner } from './obstacleSpawner.js';
import { TrapSpawner } from './trapSpawner.js';
import {
    GAME_WIDTH,
    GAME_HEIGHT,
    DISPLAYED_GROUND_HEIGHT,
    GAME_SPEED,
    OBSTACLE_SPAWN_DELAY,
    MAX_LEVELS,
    LEVEL_DURATION_MS,
    ENEMY_TO_TRAP_RATIO
} from './gameConfig.js';

const UI_SIZE = 64;
const BORDER_W = 2;
const UI_BORDER_PAD = 6;
const BORDER_RADIUS = 8;
const BORDER_TOTAL = UI_SIZE + (BORDER_W + UI_BORDER_PAD) * 2;

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#87CEEB',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 2074 },
            debug: false //true
        }
    },
    scene: { preload, create, update }
};

let scene;
let player;
let score = 0;
let gameStarted = false;
let startScreenText;
let startScreenOverlay;

/* ----- Level / speed management ----- */
let level = 1;
let currentSpeedScale = 1;          // 1.0 = base speed (level 1)
let levelTimer;                     // 30-second timer for level-ups
let levelText;
let votingBooth;                    // Rectangle that appears after level 5
let scoreText;
let gameOver = false;
let gameOverText;
let restartText;
let obstacleSpawner;
let trapSpawner;
let combinedSpawnerTimer; // New timer for combined spawning
let layers;
let trapsGroup;
let obstaclesGroup;
let spawnVotingBoothPending = false;   // flag to add booth once enemies & traps are gone
// Scene properties for the dynamic disarm button
let disarmButtonBorder, disarmButtonIcon, currentTargetableTrap;


new Phaser.Game(config);

function preload() {
    scene = this;

    this.load.atlasXML('tiles_spritesheet', 'res/img/spritesheet-tiles-default.png', 'res/img/spritesheet-tiles-default.xml');
    this.load.atlasXML('backgrounds_spritesheet', 'res/img/spritesheet-backgrounds-default.png', 'res/img/spritesheet-backgrounds-default.xml');
    this.load.atlasXML('characters_spritesheet', 'res/img/spritesheet-characters-default.png', 'res/img/spritesheet-characters-default.xml');
    this.load.atlasXML('enemies_spritesheet', 'res/img/spritesheet-enemies-default.png', 'res/img/spritesheet-enemies-default.xml');

    this.load.image('player_walk1', 'res/img/player/player_walk1.png');
    this.load.image('player_walk2', 'res/img/player/player_walk2.png');

    this.load.image('icon_flashlight', 'res/img/player/flashlight.png');
    this.load.image('icon_compass', 'res/img/player/compass.png');
    this.load.image('icon_brain', 'res/img/player/brain.png');
    this.load.image('voting_booth_img', 'res/img/voting-booth.png');

    // Foot-step sounds
    this.load.audio('footstep_a', 'res/snd/footstep_grass_000.ogg');
    this.load.audio('footstep_b', 'res/snd/footstep_grass_004.ogg');
    this.load.audio('jump',        'res/snd/cartoon-jump-6462.mp3');
    this.load.audio('level_up',    'res/snd/next-level.mp3');
    this.load.audio('game_win',    'res/snd/game-win.mp3');
    this.load.audio('game_over',   'res/snd/game-over.mp3');
}

function create() {
    // Create static background layers first
    layers = createStaticLayers(this, {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        displayedGroundHeight: DISPLAYED_GROUND_HEIGHT
    });

    // Add a semi-transparent overlay for the start screen
    startScreenOverlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5)
        .setOrigin(0, 0)
        .setDepth(50); // Ensure it's above background but below UI text

    // Display Start Screen Text on top of the overlay
    startScreenText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Click / Tap to Start', {
        fontSize: '32px', fill: '#FFFFFF', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(51); // Ensure text is above overlay

    this.input.once('pointerdown', startGame, this);
    // Keyboard input for starting the game can also be added here if desired, e.g., spacebar
    // this.input.keyboard.once('keydown-SPACE', startGame, this);

    // Initialize gameOverText and restartText here so they exist, but keep them invisible.
    // They are made visible in hitObstacle.
    gameOverText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 'Game Over!', {
        fontSize: '48px', fill: '#FF0000', fontStyle: 'bold'
    }).setOrigin(0.5).setVisible(false);
    restartText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, 'Click / Tap to Restart', {
        fontSize: '24px', fill: '#000000'
    }).setOrigin(0.5).setVisible(false);

    // Setup restart handlers. They only act if gameOver is true.
    this.input.keyboard.on('keydown-R', () => { if (gameOver) this.scene.restart(); });
    this.input.on('pointerdown', () => { if (gameOver && !gameStarted) { /* Do nothing if start screen is active */ } else if (gameOver) { this.scene.restart(); } });
}

function startGame() {
    gameStarted = true;
    if (startScreenText) startScreenText.destroy();
    if (startScreenOverlay) startScreenOverlay.destroy(); // Remove the overlay

    score = 0;
    gameOver = false;
    level = 1; // Reset level
    currentSpeedScale = 1; // Reset speed scale

    // Static layers are already created in create(), no need to recreate
    // layers = createStaticLayers(this, {
    //     width: GAME_WIDTH,
    //     height: GAME_HEIGHT,
    //     displayedGroundHeight: DISPLAYED_GROUND_HEIGHT
    // });

    player = createPlayer(this, layers.groundTopY);
    this.physics.add.collider(player, layers.ground);
    registerPlayerControls(this, player);

    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '24px', fill: '#000000' });
    levelText = this.add.text(16, 40, 'Level: 1', { fontSize: '20px', fill: '#000000' });
    // gameOverText and restartText are already created in create(), just ensure they are hidden initially if not already.
    gameOverText.setVisible(false);
    restartText.setVisible(false);


    /* Level-up timer */
    levelTimer = this.time.addEvent({
        delay   : LEVEL_DURATION_MS,
        loop    : true,
        callback: () => {
            if (level < MAX_LEVELS) {
                level += 1;
                this.sound.play('level_up', { volume: 1 });
                levelText.setText('Level: ' + level);
                currentSpeedScale = 1 + (level - 1) * 0.2;
            } else if (level === MAX_LEVELS) {
                // This is the transition from MAX_LEVELS to MAX_LEVELS + 1
                level += 1; // Increment to MAX_LEVELS + 1 to trigger booth logic
                // Do not update levelText to "Level: 6"
                // currentSpeedScale remains at MAX_LEVELS rate

                levelTimer.remove(false);
                if (combinedSpawnerTimer) combinedSpawnerTimer.remove(false);
                spawnVotingBoothPending = true;   // defer booth until screen clear
            }
            // No action if level is already > MAX_LEVELS (should not happen if timer is removed)
        }
    });

    const UI_PAD = 10;

    const startX = GAME_WIDTH - UI_PAD;
    const startY = UI_PAD;

    // addUIButton now creates a border and an initially invisible icon placeholder
    const addUIButton = (xRight) => {
        const border = scene.add.graphics().setScrollFactor(0); // Interaction managed dynamically
        border.fillStyle(0x000000, 0.35);
        border.fillRoundedRect(
            xRight - BORDER_TOTAL,
            startY,
            BORDER_TOTAL, BORDER_TOTAL,
            BORDER_RADIUS
        );
        border.lineStyle(BORDER_W, 0xffffff);
        border.strokeRoundedRect(
            xRight - BORDER_TOTAL,
            startY,
            BORDER_TOTAL, BORDER_TOTAL,
            BORDER_RADIUS
        );

        // Icon is created, but initially invisible. Texture and visibility managed in update().
        const icon = scene.add.image(
            xRight - BORDER_TOTAL / 2,
            startY + BORDER_TOTAL / 2,
            'icon_brain' // Placeholder texture, will be hidden
        )
            .setOrigin(0.5)
            .setDisplaySize(UI_SIZE, UI_SIZE) // Defines hit area
            .setScrollFactor(0)
            .setVisible(true) // Icon is always visible to the input system
            .setAlpha(0)      // Start fully transparent (effectively "no icon" visually)
            .setInteractive(); // Interactive to catch clicks

        // Border also starts with 0.5 alpha for the disabled state
        border.setAlpha(0.5);

        /* ------------------------------------------------------------
         * Make the entire button (border area) interactive so clicks
         * inside the disabled button never reach the global pointer
         * handler that triggers the player jump.
         * ---------------------------------------------------------- */
        border.setInteractive(
            new Phaser.Geom.Rectangle(
                xRight - BORDER_TOTAL,
                startY,
                BORDER_TOTAL,
                BORDER_TOTAL
            ),
            Phaser.Geom.Rectangle.Contains
        );

        border.on('pointerdown', (pointer, localX, localY, event) => {
            event.stopPropagation();                // Block jump
            if (scene.currentTargetableTrap) {
                scene.deactivateNearestTrap();      // Only act if enabled
            }
        });

        // Icon's pointerdown handler
        icon.on('pointerdown', (pointer, localX, localY, event) => {
            event.stopPropagation(); // Always stop propagation to prevent jump
            // Only attempt to disarm if a trap is currently targetable (button is "enabled")
            if (scene.currentTargetableTrap) {
                scene.deactivateNearestTrap();
            }
        });

        // Border handles the click, but only if the icon is visible (logic in handler)
        // Border is purely visual, no interactivity.
        return { border, icon };
    };

    // Create the disarm button structure
    const buttonElements = addUIButton(startX);
    this.disarmButtonBorder = buttonElements.border;
    this.disarmButtonIcon = buttonElements.icon;
    scene.disarmButtonBorder = this.disarmButtonBorder; // Make accessible via scene var if needed
    scene.disarmButtonIcon = this.disarmButtonIcon;
    scene.currentTargetableTrap = null;


    this.uiButtons = [ // For game over handling
        this.disarmButtonBorder,
        this.disarmButtonIcon
    ];
    // Ensure button is rendered on top of other elements if necessary,
    // though individual elements are added to scene's display list.
    // If z-ordering becomes an issue, explicitly bringToTop this.disarmButtonBorder and this.disarmButtonIcon.
    // For now, Phaser's default rendering order should suffice.

    obstaclesGroup = this.physics.add.group();
    trapsGroup = this.physics.add.group();

    obstacleSpawner = new ObstacleSpawner(this, obstaclesGroup, {
        groundTopY: layers.groundTopY
    });
    trapSpawner = new TrapSpawner(this, trapsGroup, {
        groundTopY: layers.groundTopY
    });

    const spawnNext = () => {
        const enemyProbability = ENEMY_TO_TRAP_RATIO / (ENEMY_TO_TRAP_RATIO + 1);
        if (Math.random() < enemyProbability) {
            obstacleSpawner.spawnObstacle();
        } else {
            trapSpawner.spawnTrap();
        }
    };

    combinedSpawnerTimer = this.time.addEvent({
        delay: OBSTACLE_SPAWN_DELAY,
        callback: spawnNext,
        loop: true
    });

    scene.deactivateNearestTrap = () => {
        // Ensure the target is still valid (exists in scene and is marked as 'active' by our game logic)
        if (scene.currentTargetableTrap && scene.currentTargetableTrap.scene && scene.currentTargetableTrap.getData('active')) {
            const trapToDeactivate = scene.currentTargetableTrap;
            trapToDeactivate.setFillStyle(0x888888); // Change color
            trapToDeactivate.setData('active', false); // Mark as inactive
            if (trapToDeactivate.body) {
                trapToDeactivate.body.setVelocityX(-GAME_SPEED * currentSpeedScale / 2); // Slow down (half of current speed)
            }

            // --- Add disarm animation ---
            const trapTypeData = trapToDeactivate.getData('trapType');
            let iconKey = '';
            if (typeof trapTypeData === 'string') {
                const lowerTrapType = trapTypeData.toLowerCase();
                if (lowerTrapType === 'populist') iconKey = 'icon_brain';
                else if (lowerTrapType === 'obedience') iconKey = 'icon_compass';
                else if (lowerTrapType === 'darkweb') iconKey = 'icon_flashlight';
            }

            if (iconKey) {
                const iconDisplayHeight = 48; // Desired display size for the animation icon
                const gap = 5; // Gap in pixels between trap top and icon bottom
                const iconX = trapToDeactivate.x;
                // Trap's origin is (0.5, 1), so trapToDeactivate.y is its bottom edge.
                // trapToDeactivate.height is its actual height.
                // Icon's origin is (0.5, 0.5) by default.
                // Position icon's center iconDisplayHeight/2 + gap pixels above the trap's top edge.
                const iconY = (trapToDeactivate.y - trapToDeactivate.height) - (iconDisplayHeight / 2) - gap;

                const animIcon = scene.add.image(iconX, iconY, iconKey)
                    .setDisplaySize(iconDisplayHeight, iconDisplayHeight)
                    .setDepth(10); // Ensure icon is rendered on top of the trap

                scene.physics.add.existing(animIcon);

                if (animIcon.body) {
                    animIcon.body.setAllowGravity(false);
                    // Match the trap's (new, slower) horizontal velocity
                    if (trapToDeactivate.body) {
                        animIcon.body.setVelocityX(trapToDeactivate.body.velocity.x);
                    } else {
                        // Should not happen, but as a fallback, don't move horizontally
                        animIcon.body.setVelocityX(0);
                    }

                    // Tween to fade out, move up, and then destroy
                    scene.tweens.add({
                        targets: animIcon,
                        alpha: 0,
                        y: animIcon.y - 20, // Move upwards by 20 pixels
                        duration: 750,      // Animation duration in ms
                        ease: 'Power1',
                        onComplete: () => {
                            // Ensure icon still exists and is part of the scene before destroying
                            if (animIcon && animIcon.scene) {
                                animIcon.destroy();
                            }
                        }
                    });
                } else {
                    // Fallback if physics body couldn't be added (e.g. scene shutting down)
                    // Just fade out and destroy without physics-based movement
                    scene.tweens.add({
                        targets: animIcon,
                        alpha: 0,
                        duration: 750,
                        ease: 'Power1',
                        onComplete: () => {
                            if (animIcon && animIcon.scene) {
                                animIcon.destroy();
                            }
                        }
                    });
                }
            }
            // --- End disarm animation ---

            score += 10;
            scoreText.setText('Score: ' + score);

            // Reset button state immediately after deactivation to "disabled": icon transparent, semi-transparent border.
            scene.currentTargetableTrap = null;
            if (scene.disarmButtonIcon) {
                scene.disarmButtonIcon.setAlpha(0); // Icon transparent
                scene.disarmButtonIcon.setInteractive(); // No hand cursor, but catches click
            }
            if (scene.disarmButtonBorder) {
                scene.disarmButtonBorder.setAlpha(0.5);
            }
        } else {
            // If the target became invalid (e.g., destroyed, already deactivated, or no longer in scene)
            // ensure the button is reset to "disabled" state: icon transparent, semi-transparent border.
            if (scene.currentTargetableTrap) { // It was set, but now fails the validity check
                scene.currentTargetableTrap = null; // Clear the potentially stale reference
            }
            if (scene.disarmButtonIcon) {
                scene.disarmButtonIcon.setAlpha(0); // Icon transparent
                scene.disarmButtonIcon.setInteractive(); // No hand cursor, but catches click
            }
            if (scene.disarmButtonBorder) {
                scene.disarmButtonBorder.setAlpha(0.5);
            }
        }
    };

    this.physics.add.overlap(player, obstaclesGroup, hitObstacle, null, this);
    this.physics.add.overlap(player, trapsGroup, hitTrap, null, this); // Added overlap for traps
}


function update(time, delta) {
    if (!gameStarted || gameOver) return;

    const dt = delta / 1000;

    const effectiveSpeed = GAME_SPEED * currentSpeedScale;
    layers.clouds.tilePositionX  += (effectiveSpeed / 5)   * dt;
    layers.hills.tilePositionX   += (effectiveSpeed / 2.5) * dt;
    layers.groundTile.tilePositionX +=  effectiveSpeed      * dt;

    /* Keep all dynamic objects in sync with current speed */
    if (obstacleSpawner && obstacleSpawner.group) obstacleSpawner.group.setVelocityX(-effectiveSpeed);
    if (trapSpawner && trapSpawner.group) {
        // Active traps move at full speed, de-activated traps at half speed
        trapSpawner.group.getChildren().forEach(trap => {
            if (!trap.body) return;
            const velocityX = trap.getData('active') ? -effectiveSpeed : -effectiveSpeed / 2;
            trap.body.setVelocityX(velocityX);
        });
    }
    if (votingBooth && votingBooth.body)       votingBooth.body.setVelocityX(-effectiveSpeed);

    const gained = obstacleSpawner.update(dt, player);
    trapSpawner.update(dt, player);
    if (gained) {
        score += gained;
        scoreText.setText('Score: ' + score);
    }

    /* Spawn the voting booth once the play-field is clear */
    if (spawnVotingBoothPending &&
        obstaclesGroup.getChildren().length === 0 &&
        trapsGroup.getChildren().length === 0) {

        spawnVotingBoothPending = false;

        votingBooth = scene.physics.add.sprite(
            GAME_WIDTH + 120, // Initial X position off-screen
            layers.groundTopY,
            'voting_booth_img'
        ).setOrigin(0.5, 1); // Origin at bottom-center for correct ground placement

        // Scale the booth to be proportionally correct with the player.
        // Previous height was 180 (a bit too tall), previous width was implicitly scaled (much too wide).
        // New dimensions:
        votingBooth.displayHeight = 160;
        votingBooth.displayWidth = 90;

        // The physics body should automatically adjust to displaySize.
        // If collision issues arise, we might need to explicitly call:
        // votingBooth.body.setSize(votingBooth.displayWidth, votingBooth.displayHeight);
        // and potentially .setOffset() if the origin is not centered on the new body.

        votingBooth.body.setAllowGravity(false);
        votingBooth.body.setVelocityX(-effectiveSpeed);

        scene.physics.add.overlap(player, votingBooth, winGame, null, scene);
    }

    // Update logic for the dynamic disarm button
    const activeTraps = trapsGroup.getChildren().filter(t => t.getData('active'));
    let nearestActiveTrapInRange = null;
    let minDistance = 201; // Max disarm distance + 1

    activeTraps.forEach(trap => {
        const distance = Math.abs(trap.x - player.x);
        // Only consider traps that are in front of or at the player's x position
        // and within the disarm range.
        if (trap.x >= player.x && distance <= 200 && distance < minDistance) {
            minDistance = distance;
            nearestActiveTrapInRange = trap;
        }
    });

    if (nearestActiveTrapInRange) {
        scene.currentTargetableTrap = nearestActiveTrapInRange;
        const trapTypeData = nearestActiveTrapInRange.getData('trapType');
        let iconKey = '';

        if (typeof trapTypeData === 'string') {
            const lowerTrapType = trapTypeData.toLowerCase();
            if (lowerTrapType === 'populist') iconKey = 'icon_brain';
            else if (lowerTrapType === 'obedience') iconKey = 'icon_compass';
            else if (lowerTrapType === 'darkweb') iconKey = 'icon_flashlight';
        }

        if (iconKey && scene.disarmButtonIcon) {
            scene.disarmButtonIcon.setTexture(iconKey).setAlpha(1); // Show icon
            scene.disarmButtonIcon.setInteractive({ useHandCursor: true });
            if (scene.disarmButtonBorder) scene.disarmButtonBorder.setAlpha(1);
        } else {
            // Fallback or if iconKey isn't determined (e.g. unknown trapType)
            // This case implies nearestActiveTrapInRange was true, but iconKey failed.
            // Treat as "disabled" state: icon transparent, semi-transparent border.
            if (scene.disarmButtonIcon) {
                scene.disarmButtonIcon.setAlpha(0); // Icon transparent
                scene.disarmButtonIcon.setInteractive(); // No hand cursor, but catches click
            }
            if (scene.disarmButtonBorder) scene.disarmButtonBorder.setAlpha(0.5);
            scene.currentTargetableTrap = null; // Ensure no trap is targeted
        }
    } else {
        // No trap in range, set to "disabled" state: icon transparent, semi-transparent border.
        scene.currentTargetableTrap = null;
        if (scene.disarmButtonIcon) {
            scene.disarmButtonIcon.setAlpha(0); // Icon transparent
            scene.disarmButtonIcon.setInteractive(); // No hand cursor, but catches click
        }
        if (scene.disarmButtonBorder) {
            scene.disarmButtonBorder.setAlpha(0.5);
        }
    }
}

function hitObstacle(playerGO, obstacleGO) {
    if (gameOver) return;

    gameOver = true;
    scene.sound.play('game_over', { volume: 0.7 });
    scene.physics.pause();

    playerGO.setTint(0x808080);
    if (playerGO.anims) playerGO.anims.stop();

    gameOverText.setVisible(true).setDepth(100); // Set a high depth
    restartText.setVisible(true).setDepth(100); // Set a high depth

    // Bring to top as well, though depth is usually sufficient
    scene.children.bringToTop(gameOverText);
    scene.children.bringToTop(restartText);

    if (scene.uiButtons)
        scene.uiButtons.forEach(b => { b.disableInteractive().setVisible(false); });

    if (combinedSpawnerTimer) combinedSpawnerTimer.remove(false);
    if (levelTimer) levelTimer.remove(false);
    // obstacleSpawner.stop(); // No longer needed as timer is external
    // trapSpawner.stop(); // No longer needed as timer is external
}

function hitTrap(playerGO, trapGO) {
    // Player passes through traps without consequence.
    // The trap's state (active, color, speed) is only changed by deactivateNearestTrap.
    // This function is now a no-op regarding game state changes from collision.
}

/* ---------------- WIN CONDITION ---------------- */
function winGame(playerGO, boothGO) {
    if (gameOver) return;          // prevent double processing

    // Condition for player entering the booth
    if (playerGO.x <= boothGO.x && !playerGO.getData('isVoting')) {
        playerGO.setData('isVoting', true); // Flag to prevent re-triggering
        scene.sound.play('game_win', { volume: 0.7 }); // Play win sound on first contact
        gameOver = true; // Set gameOver early to stop other updates

        playerGO.setVisible(false);
        if (playerGO.anims) playerGO.anims.stop();
        if (playerGO.body) {
            playerGO.body.setAcceleration(0,0);
            playerGO.body.setVelocity(0,0);
            playerGO.body.enable = false; // Effectively stops physics for player
        }
        if (boothGO.body) {
            boothGO.body.setVelocityX(0); // Stop the booth from moving
        }


        // Delay for 2 seconds before showing win message
        scene.time.delayedCall(2000, () => {
            scene.physics.pause(); // Now pause all physics

            const winText = scene.add.text(
                GAME_WIDTH / 2, GAME_HEIGHT / 2, 'You Win!',
                { fontSize: '48px', fill: '#00AA00', fontStyle: 'bold' }
            ).setOrigin(0.5);

            if (scene.uiButtons)
                scene.uiButtons.forEach(b => { b.disableInteractive().setVisible(false); });

            if (combinedSpawnerTimer) combinedSpawnerTimer.remove(false);
            if (levelTimer) levelTimer.remove(false);
        });
    }
}
