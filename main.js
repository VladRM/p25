import * as UIManager from './uiManager.js';
import { createStaticLayers } from './staticLayers.js';
import { createPlayer, registerPlayerControls } from './player.js';
import { EnemySpawner } from './enemySpawner.js';
import { TrapSpawner } from './trapSpawner.js';
import {
    GAME_WIDTH,
    GAME_HEIGHT,
    DISPLAYED_GROUND_HEIGHT,
    GAME_SPEED,
    ENEMY_SPAWN_DELAY,
    MAX_LEVELS,
    LEVEL_DURATION_MS,
    ENEMY_TO_TRAP_RATIO
} from './gameConfig.js';

// UI Constants are now in uiManager.js

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#FFFFFF',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 2074 },
            debug: false // true //
        }
    },
    scene: { preload, create, update }
};
function sendGAEvent(eventName, params = {}) {
    if (typeof gtag === 'function') {
        gtag('event', eventName, params);
    }
}

let scene;
let player;
let score = 0;
let gameStarted = false;
// startScreenText and startScreenOverlay are now managed by UIManager

/* ----- Level / speed management ----- */
let level = 1;
let currentSpeedScale = 1;          // 1.0 = base speed (level 1)
let levelTimer;                     // 30-second timer for level-ups
// levelText managed by UIManager
let votingBooth;                    // Rectangle that appears after level 5
// scoreText managed by UIManager
let gameOver = false;
// gameOverText and restartText managed by UIManager
let enemySpawner;
let trapSpawner;
let combinedSpawnerTimer; // New timer for combined spawning
let layers;
let trapsGroup;
let enemiesGroup;
let spawnVotingBoothPending = false;   // flag to add booth once enemies & traps are gone
let consecutiveEnemiesSpawned = 0;
let consecutiveTrapsSpawned = 0;
let freedCharactersCount = 0; // Add this line
// Scene properties for the dynamic disarm button
// disarmButtonBorder, disarmButtonIcon are now managed by UIManager
let currentTargetableTrap; // This remains as it's game logic state
// messageDisplay and messageTimers are now managed by UIManager

// Progress bar related variables
let totalGameDuration; // Total milliseconds for MAX_LEVELS
let elapsedGameTime;   // Elapsed milliseconds in the current game for progress bar


new Phaser.Game(config);

function preload() {
    scene = this; // Keep scene reference for UIManager and other modules if they don't manage it themselves

    this.load.atlasXML('backgrounds_spritesheet', 'res/img/spritesheet-backgrounds-default.png', 'res/img/spritesheet-backgrounds-default.xml');

    this.load.image('player_walk1', 'res/img/player/player_walk1.png');
    this.load.image('player_walk2', 'res/img/player/player_walk2.png');

    this.load.image('icon_flashlight', 'res/img/player/flashlight.png');
    this.load.image('icon_compass', 'res/img/player/compass.png');
    this.load.image('icon_brain', 'res/img/player/brain.png');
    this.load.image('voting_booth_img', 'res/img/voting-booth.png');
    this.load.image('ground_tile_top', 'res/img/terrain_grass_block_top.png');
    this.load.image('start_screen', 'res/img/start-screen.png');

    // Enemy images
    this.load.image('enemy_1_a', 'res/img/enemies/1_a.png');
    this.load.image('enemy_1_b', 'res/img/enemies/1_b.png');
    this.load.image('enemy_2_a', 'res/img/enemies/2_a.png');
    this.load.image('enemy_2_b', 'res/img/enemies/2_b.png');
    this.load.image('enemy_3_a', 'res/img/enemies/3_a.png');
    this.load.image('enemy_3_b', 'res/img/enemies/3_b.png');
    this.load.image('enemy_4_a', 'res/img/enemies/4_a.png');
    this.load.image('enemy_4_b', 'res/img/enemies/4_b.png');

    // Trap images
    this.load.image('trap_1_a', 'res/img/traps/1_a.png');
    this.load.image('trap_1_b', 'res/img/traps/1_b.png');
    this.load.image('trap_1_c', 'res/img/traps/1_c.png');
    this.load.image('trap_2_a', 'res/img/traps/2_a.png');
    this.load.image('trap_2_b', 'res/img/traps/2_b.png');
    this.load.image('trap_2_c', 'res/img/traps/2_c.png');
    this.load.image('trap_3_a', 'res/img/traps/3_a.png');
    this.load.image('trap_3_b', 'res/img/traps/3_b.png');
    this.load.image('trap_3_c', 'res/img/traps/3_c.png');
    this.load.image('trap_4_a', 'res/img/traps/4_a.png');
    this.load.image('trap_4_b', 'res/img/traps/4_b.png');
    this.load.image('trap_4_c', 'res/img/traps/4_c.png');

    // Character images
    this.load.image('adventurer_hurt', 'res/img/characters/adventurer_hurt.png');
    this.load.image('adventurer_cheer1', 'res/img/characters/adventurer_cheer1.png');
    this.load.image('adventurer_cheer2', 'res/img/characters/adventurer_cheer2.png');
    this.load.image('female_hurt', 'res/img/characters/female_hurt.png');
    this.load.image('female_cheer1', 'res/img/characters/female_cheer1.png');
    this.load.image('female_cheer2', 'res/img/characters/female_cheer2.png');

    // Foot-step sounds
    this.load.audio('footstep_a', 'res/snd/footstep_grass_000.ogg');
    this.load.audio('footstep_b', 'res/snd/footstep_grass_004.ogg');
    this.load.audio('jump',        'res/snd/cartoon-jump-6462.mp3');
    this.load.audio('level_up',    'res/snd/next-level.mp3');
    this.load.audio('game_win',    'res/snd/game-win.mp3');
    this.load.audio('game_over',   'res/snd/game-over.mp3');
    this.load.audio('yay',         'res/snd/yay.mp3'); // Assuming 'yay.mp3' is the sound file
}

function create() {
    gameStarted = false;
    gameOver = false;

    // Initialize UIManager
    UIManager.initUIManager(this);

    // Create static background layers first
    layers = createStaticLayers(this, {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        displayedGroundHeight: DISPLAYED_GROUND_HEIGHT
    });

    // Display Start Screen using UIManager
    UIManager.createStartScreen();
    // Game over and restart text will be created by UIManager when needed, or in its createGameUI.

    this.input.once('pointerdown', startGame, this);
    // Keyboard input for starting the game can also be added here if desired, e.g., spacebar
    // this.input.keyboard.once('keydown-SPACE', startGame, this);

    // Character animations
    if (!this.anims.exists('adventurer_cheer_anim')) {
        this.anims.create({
            key: 'adventurer_cheer_anim',
            frames: [
                { key: 'adventurer_cheer1' },
                { key: 'adventurer_cheer2' }
            ],
            frameRate: 5,
            repeat: -1
        });
    }
    if (!this.anims.exists('female_cheer_anim')) {
        this.anims.create({
            key: 'female_cheer_anim',
            frames: [
                { key: 'female_cheer1' },
                { key: 'female_cheer2' }
            ],
            frameRate: 5,
            repeat: -1
        });
    }
    if (!this.anims.exists('groupthink_freed_anim')) {
        this.anims.create({
            key: 'groupthink_freed_anim',
            frames: [
                { key: 'trap_4_b' },
                { key: 'trap_4_c' }
            ],
            frameRate: 5,
            repeat: -1 // Loop the freed animation
        });
    }
    if (!this.anims.exists('direction_freed_anim')) {
        this.anims.create({
            key: 'direction_freed_anim',
            frames: [
                { key: 'trap_1_b' },
                { key: 'trap_1_c' }
            ],
            frameRate: 5,
            repeat: -1 // Loop the freed animation
        });
    }
    if (!this.anims.exists('manipulated_freed_anim')) {
        this.anims.create({
            key: 'manipulated_freed_anim',
            frames: [
                { key: 'trap_2_b' },
                { key: 'trap_2_c' }
            ],
            frameRate: 5,
            repeat: -1 // Loop the freed animation
        });
    }
    if (!this.anims.exists('blind_freed_anim')) {
        this.anims.create({
            key: 'blind_freed_anim',
            frames: [
                { key: 'trap_3_b' },
                { key: 'trap_3_c' }
            ],
            frameRate: 5,
            repeat: -1 // Loop the freed animation
        });
    }

    // Setup restart handlers. They only act if gameOver is true.
    this.input.keyboard.on('keydown-R', () => { if (gameOver) this.scene.restart(); });
    this.input.on('pointerdown', () => { if (gameOver && !gameStarted) { /* Do nothing if start screen is active */ } else if (gameOver) { this.scene.restart(); } });
}

// displayGameMessage function is now in UIManager.js

function startGame() {
    // gameStarted = true; // Moved to the end of the function
    UIManager.destroyStartScreen();

    score = 0;
    gameOver = false;
    level = 1; // Reset level
    currentSpeedScale = 1; // Reset speed scale
    consecutiveEnemiesSpawned = 0;
    consecutiveTrapsSpawned = 0;
    // freedCharactersCount = 0; // Reset if you track this per game

    // Initialize for progress bar
    totalGameDuration = MAX_LEVELS * LEVEL_DURATION_MS;
    elapsedGameTime = 0;

    player = createPlayer(this, layers.groundTopY);
    player.setDepth(11); // Ensure player is above traps (9) and trapped characters (10)
    this.physics.add.collider(player, layers.ground);
    registerPlayerControls(this, player);

    // Important: Reset UI from any previous game state *before* creating new UI
    UIManager.resetUIForNewGame(); // Clears messages, old texts, old progress bar
    UIManager.createGameUI();      // Creates new score, level, progress bar, and hidden game over/restart texts
    
    // scene.displayGameMessage is no longer needed here, call UIManager.displayMessage directly.

    // Assign to this context for the UIManager callback
    this.deactivateNearestTrap = () => {
        // Ensure the target is still valid
        if (scene.currentTargetableTrap && scene.currentTargetableTrap.scene && scene.currentTargetableTrap.getData('active')) {
            const trapToDeactivate = scene.currentTargetableTrap;
            const trapType = trapToDeactivate.getData('trapType');
            const trapVisualType = trapToDeactivate.getData('trapVisualType');

            trapToDeactivate.setData('active', false); // Mark as inactive
            if (trapToDeactivate.body) {
                trapToDeactivate.body.setVelocityX(-GAME_SPEED * currentSpeedScale / 2); // Slow down
            }

            // Handle freeing based on trap type
            if (trapVisualType === 'sprite') {
                // Play the freed animation on the trap sprite itself
                if (trapType === 'groupthink') {
                    trapToDeactivate.play('groupthink_freed_anim');
                    // Increment freed count (assuming groupthink represents 4 people)
                    const groupSize = 4;
                    freedCharactersCount += groupSize;
                    sendGAEvent('voters_freed', { count: groupSize, total: freedCharactersCount, type: 'groupthink' });
                } else if (trapType === 'direction') {
                    trapToDeactivate.play('direction_freed_anim');
                    const singleVoter = 1;
                    freedCharactersCount += singleVoter;
                    sendGAEvent('voters_freed', { count: singleVoter, total: freedCharactersCount, type: 'direction' });
                } else if (trapType === 'manipulated') {
                    trapToDeactivate.play('manipulated_freed_anim');
                    const twoVoters = 2;
                    freedCharactersCount += twoVoters;
                    sendGAEvent('voters_freed', { count: twoVoters, total: freedCharactersCount, type: 'manipulated' });
                } else if (trapType === 'blind') {
                    trapToDeactivate.play('blind_freed_anim');
                    const threeVoters = 3;
                    freedCharactersCount += threeVoters;
                    sendGAEvent('voters_freed', { count: threeVoters, total: freedCharactersCount, type: 'blind' });
                }

            } else if (trapVisualType === 'rectangle') {
                // Original logic for rectangle traps with characters
                const charactersInTrap = trapToDeactivate.getData('characters');
                if (charactersInTrap && Array.isArray(charactersInTrap)) {
                    freedCharactersCount += charactersInTrap.length;
                    sendGAEvent('voters_freed', { count: charactersInTrap.length, total: freedCharactersCount, type: trapType });
                    charactersInTrap.forEach(charData => {
                        if (charData.sprite) {
                            charData.sprite.clearTint();
                            if (charData.charTypeKey === 'adventurer_hurt') {
                                charData.sprite.play('adventurer_cheer_anim');
                            } else if (charData.charTypeKey === 'female_hurt') {
                                charData.sprite.play('female_cheer_anim');
                            }
                        }
                    });
                }
            }

            // Determine icon for UI animation (remains the same)
            let iconKey = '';
            if (typeof trapType === 'string') {
                const lowerTrapType = trapType.toLowerCase(); // Use trapType directly here
                if (lowerTrapType === 'manipulated') iconKey = 'icon_brain';
                else if (lowerTrapType === 'direction') iconKey = 'icon_compass';
                else if (lowerTrapType === 'blind') iconKey = 'icon_flashlight';
                else if (lowerTrapType === 'groupthink') iconKey = 'icon_flashlight'; // Use flashlight for groupthink
            }

            if (iconKey) {
                UIManager.playTrapDisarmAnimation(trapToDeactivate, iconKey);
            }

            if (trapToDeactivate.getData('message_disarmed')) {
                UIManager.displayMessage(trapToDeactivate.getData('message_disarmed'));
            }

            scene.sound.play('yay', { volume: 0.1 }); // Play "yay" sound

            score += 10;
            UIManager.updateScoreText(score);

            scene.currentTargetableTrap = null; // Game logic state
            UIManager.updateDisarmButtonState(null, false); // Update UI
        } else {
            // Target became invalid
            if (scene.currentTargetableTrap) {
                scene.currentTargetableTrap = null;
            }
            UIManager.updateDisarmButtonState(null, false); // Ensure button is reset
        }
    };

    /* Level-up timer */
    levelTimer = this.time.addEvent({
        delay   : LEVEL_DURATION_MS,
        loop    : true,
        callback: () => {
            if (level < MAX_LEVELS) {
                level += 1;
                this.sound.play('level_up', { volume: 1 });
                UIManager.updateLevelText(level);
                if (level >= 2) sendGAEvent('level_reached', { level });
                currentSpeedScale = 1 + (level - 1) * 0.2;
            } else if (level === MAX_LEVELS) {
                // This is the transition from MAX_LEVELS to MAX_LEVELS + 1
                level += 1; // Increment to MAX_LEVELS + 1 to trigger booth logic
                // currentSpeedScale remains at MAX_LEVELS rate

                levelTimer.remove(false);
                if (combinedSpawnerTimer) combinedSpawnerTimer.remove(false);
                spawnVotingBoothPending = true;   // defer booth until screen clear
            }
            // No action if level is already > MAX_LEVELS (should not happen if timer is removed)
        }
    });

    // addUIButton function is now internal to UIManager.js
    // Create the disarm button structure using UIManager
    UIManager.createDisarmButton(this.deactivateNearestTrap);
    scene.currentTargetableTrap = null; // Still managed by main.js

    // this.uiButtons for game over handling is now managed internally by UIManager's uiButtonsCollection

    enemiesGroup = this.physics.add.group();
    trapsGroup = this.physics.add.group();

    enemySpawner = new EnemySpawner(this, enemiesGroup, {
        groundTopY: layers.groundTopY
    });
    trapSpawner = new TrapSpawner(this, trapsGroup, {
        groundTopY: layers.groundTopY
    });

    const spawnNext = () => {
        if (consecutiveEnemiesSpawned >= 3) {
            trapSpawner.spawnTrap();
            consecutiveTrapsSpawned++;
            consecutiveEnemiesSpawned = 0;
        } else if (consecutiveTrapsSpawned >= 2) {
            enemySpawner.spawnEnemy();
            consecutiveEnemiesSpawned++;
            consecutiveTrapsSpawned = 0;
        } else {
            const enemyProbability = ENEMY_TO_TRAP_RATIO / (ENEMY_TO_TRAP_RATIO + 1);
            if (Math.random() < enemyProbability) {
                enemySpawner.spawnEnemy();
                consecutiveEnemiesSpawned++;
                consecutiveTrapsSpawned = 0;
            } else {
                trapSpawner.spawnTrap();
                consecutiveTrapsSpawned++;
                consecutiveEnemiesSpawned = 0;
            }
        }
    };

    combinedSpawnerTimer = this.time.addEvent({
        delay: ENEMY_SPAWN_DELAY,
        callback: spawnNext,
        loop: true
    });

    // Make deactivateNearestTrap available on the scene if UIManager's button was set up to call scene.deactivateNearestTrap
    // This is already handled by passing `this.deactivateNearestTrap` to `UIManager.createDisarmButton`.

    this.physics.add.overlap(player, enemiesGroup, hitEnemy, null, this);

    gameStarted = true; // Game is officially started only after all initializations
    sendGAEvent('game_start');
}


function update(time, delta) {
    if (!gameStarted || gameOver) return;

    // Update progress bar based on elapsed time
    if (!gameOver) { // Ensure progress bar doesn't update after game over is true
        if (level <= MAX_LEVELS) {
            elapsedGameTime += delta; // delta is already in milliseconds
            let progress = 0;
            if (totalGameDuration > 0) {
                progress = Math.min(elapsedGameTime / totalGameDuration, 1);
            } else {
                progress = 1; // Instantly full if total duration is 0 or less
            }
            UIManager.updateProgressBar(progress);
        } else {
            // After MAX_LEVELS are completed (e.g., voting booth phase), keep progress bar full.
            UIManager.updateProgressBar(1);
        }
    }

    const dt = delta / 1000;

    const effectiveSpeed = GAME_SPEED * currentSpeedScale;
    layers.clouds.tilePositionX  += (effectiveSpeed / 5)   * dt;
    layers.hills.tilePositionX   += (effectiveSpeed / 2.5) * dt;
    layers.groundTile.tilePositionX +=  effectiveSpeed      * dt;

    /* Keep all dynamic objects in sync with current speed */
    if (enemySpawner && enemySpawner.group) enemySpawner.group.setVelocityX(-effectiveSpeed);
    if (trapSpawner && trapSpawner.group) {
        // Active traps move at full speed, de-activated traps at half speed
        trapSpawner.group.getChildren().forEach(trap => {
            if (!trap.body) return;
            const velocityX = trap.getData('active') ? -effectiveSpeed : -effectiveSpeed / 2;
            trap.body.setVelocityX(velocityX);
        });
    }
    if (votingBooth && votingBooth.body)       votingBooth.body.setVelocityX(-effectiveSpeed);

    // Check if player jumped over the voting booth
    if (votingBooth && votingBooth.body && player && player.body && !gameOver && !player.getData('isVoting')) {
        if (player.getBounds().left > votingBooth.getBounds().right) {
            handleJumpedOverBooth(player, votingBooth);
        }
    }

    const gained = enemySpawner.update(dt, player);
    trapSpawner.update(dt, player);
    if (gained) {
        score += gained;
        UIManager.updateScoreText(score);
    }

    /* Spawn the voting booth once the play-field is clear */
    if (spawnVotingBoothPending &&
        enemiesGroup.getChildren().length === 0 &&
        trapsGroup.getChildren().length === 0) {

        spawnVotingBoothPending = false;

        votingBooth = scene.physics.add.sprite(
            GAME_WIDTH + 120, // Initial X position off-screen
            layers.groundTopY,
            'voting_booth_img'
        ).setOrigin(0.5, 1); // Origin at bottom-center for correct ground placement

        votingBooth.displayHeight = 128;
        votingBooth.displayWidth = 100;
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
            if (lowerTrapType === 'manipulated') iconKey = 'icon_brain';
            else if (lowerTrapType === 'direction') iconKey = 'icon_compass';
            else if (lowerTrapType === 'blind') iconKey = 'icon_flashlight';
            else if (lowerTrapType === 'groupthink') iconKey = 'icon_flashlight'; // Use flashlight for groupthink
        }

        // Update disarm button state via UIManager
        if (iconKey) {
            UIManager.updateDisarmButtonState(iconKey, true);
        } else {
            // Fallback or if iconKey isn't determined
            UIManager.updateDisarmButtonState(null, false);
            scene.currentTargetableTrap = null; // Ensure no trap is targeted if iconKey fails
        }
    } else {
        // No trap in range
        scene.currentTargetableTrap = null;
        UIManager.updateDisarmButtonState(null, false);
    }
}

function hitEnemy(playerGO, enemyGO) {
    if (gameOver) return;

    // Display message for hitting enemy using UIManager
    // UIManager.displayMessage(enemyGO.message_hit); // This will now be part of the game over screen

    gameOver = true;
    sendGAEvent('game_loss', { score, level, freed_characters: freedCharactersCount });
    scene.sound.play('game_over', { volume: 0.7 });
    scene.physics.pause();

    // UIManager handles clearing messages and showing game over screen
    UIManager.showGameOverScreen(enemyGO.message_hit ? enemyGO.message_hit : "Ai fost prins de propagandă!"); // Pass the message_hit or a default

    playerGO.setTint(0x808080);
    if (playerGO.anims) playerGO.anims.stop();

    // UIManager handles hiding/disabling gameplay UI
    UIManager.hideGameplayUIDuringEnd();

    if (combinedSpawnerTimer) combinedSpawnerTimer.remove(false);
    if (levelTimer) levelTimer.remove(false);
    // enemySpawner.stop(); // No longer needed as timer is external
    // trapSpawner.stop(); // No longer needed as timer is external
}

function handleJumpedOverBooth(playerGO, boothGO) {
    if (gameOver) return; // Safeguard

    gameOver = true;
    sendGAEvent('game_loss', { score, level, freed_characters: freedCharactersCount, reason: 'jumped_booth' });
    scene.sound.play('game_over', { volume: 0.7 }); // Using standard game_over sound
    scene.physics.pause();

    UIManager.showJumpedOverBoothScreen("Prea mult elan, prea puțin civism.\nAi sărit peste șansa de a schimba ceva.");

    playerGO.setTint(0x808080);
    if (playerGO.anims) playerGO.anims.stop();

    UIManager.hideGameplayUIDuringEnd();

    if (combinedSpawnerTimer) combinedSpawnerTimer.remove(false);
    if (levelTimer) levelTimer.remove(false);

    if (boothGO && boothGO.body) {
        boothGO.body.setVelocityX(0); // Stop the booth
    }
}

/* ---------------- WIN CONDITION ---------------- */
function winGame(playerGO, boothGO) {
    if (gameOver) return;          // prevent double processing

    // Condition for player entering the booth
    if (playerGO.x <= boothGO.x && !playerGO.getData('isVoting')) {
        playerGO.setData('isVoting', true); // Flag to prevent re-triggering
        scene.sound.play('game_win', { volume: 0.7 }); // Play win sound on first contact
        gameOver = true; // Set gameOver early to stop other updates
        sendGAEvent('game_win', { score, level, freed_characters: freedCharactersCount });

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

            // UIManager handles clearing messages and showing win screen
            UIManager.showWinScreen(freedCharactersCount);
            UIManager.hideGameplayUIDuringEnd(); // Hide buttons etc.

            if (combinedSpawnerTimer) combinedSpawnerTimer.remove(false);
            if (levelTimer) levelTimer.remove(false);
        });
    }
}
