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
// Scene properties for the dynamic disarm button
// disarmButtonBorder, disarmButtonIcon are now managed by UIManager
let currentTargetableTrap; // This remains as it's game logic state
// messageDisplay and messageTimers are now managed by UIManager


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

    // Enemy images
    this.load.image('enemy_1_a', 'res/img/enemies/1_a.png');
    this.load.image('enemy_1_b', 'res/img/enemies/1_b.png');
    this.load.image('enemy_2_a', 'res/img/enemies/2_a.png');
    this.load.image('enemy_2_b', 'res/img/enemies/2_b.png');
    this.load.image('enemy_3_a', 'res/img/enemies/3_a.png');
    this.load.image('enemy_3_b', 'res/img/enemies/3_b.png');
    this.load.image('enemy_4_a', 'res/img/enemies/4_a.png');
    this.load.image('enemy_4_b', 'res/img/enemies/4_b.png');

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
    this.anims.create({
        key: 'adventurer_cheer_anim',
        frames: [
            { key: 'adventurer_cheer1' },
            { key: 'adventurer_cheer2' }
        ],
        frameRate: 5,
        repeat: -1
    });
    this.anims.create({
        key: 'female_cheer_anim',
        frames: [
            { key: 'female_cheer1' },
            { key: 'female_cheer2' }
        ],
        frameRate: 5,
        repeat: -1
    });

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

    player = createPlayer(this, layers.groundTopY);
    this.physics.add.collider(player, layers.ground);
    registerPlayerControls(this, player);

    UIManager.createGameUI(); // Creates score, level, and hidden game over/restart texts
    UIManager.resetUIForNewGame(); // Clears messages, resets texts to default
    
    // scene.displayGameMessage is no longer needed here, call UIManager.displayMessage directly.

    // Assign to this context for the UIManager callback
    this.deactivateNearestTrap = () => {
        // Ensure the target is still valid
        if (scene.currentTargetableTrap && scene.currentTargetableTrap.scene && scene.currentTargetableTrap.getData('active')) {
            const trapToDeactivate = scene.currentTargetableTrap;
            // trapToDeactivate.setFillStyle(0x888888); // Change color - REMOVED
            trapToDeactivate.setData('active', false); // Mark as inactive
            if (trapToDeactivate.body) {
                trapToDeactivate.body.setVelocityX(-GAME_SPEED * currentSpeedScale / 2); // Slow down
            }

            const charactersInTrap = trapToDeactivate.getData('characters');
            if (charactersInTrap && Array.isArray(charactersInTrap)) {
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

            const trapTypeData = trapToDeactivate.getData('trapType');
            let iconKey = '';
            if (typeof trapTypeData === 'string') {
                const lowerTrapType = trapTypeData.toLowerCase();
                if (lowerTrapType === 'populist') iconKey = 'icon_brain';
                else if (lowerTrapType === 'obedience') iconKey = 'icon_compass';
                else if (lowerTrapType === 'darkweb') iconKey = 'icon_flashlight';
            }

            if (iconKey) {
                UIManager.playTrapDisarmAnimation(trapToDeactivate, iconKey);
            }

            if (trapToDeactivate.getData('message_disarmed')) {
                UIManager.displayMessage(trapToDeactivate.getData('message_disarmed'));
            }

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
}


function update(time, delta) {
    if (!gameStarted || gameOver) return;

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
            if (lowerTrapType === 'populist') iconKey = 'icon_brain';
            else if (lowerTrapType === 'obedience') iconKey = 'icon_compass';
            else if (lowerTrapType === 'darkweb') iconKey = 'icon_flashlight';
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
    if (enemyGO.message_hit) {
        UIManager.displayMessage(enemyGO.message_hit);
    }

    gameOver = true;
    scene.sound.play('game_over', { volume: 0.7 });
    scene.physics.pause();

    // UIManager handles clearing messages and showing game over screen
    UIManager.showGameOverScreen();

    playerGO.setTint(0x808080);
    if (playerGO.anims) playerGO.anims.stop();

    // UIManager handles hiding/disabling gameplay UI
    UIManager.hideGameplayUIDuringEnd();

    if (combinedSpawnerTimer) combinedSpawnerTimer.remove(false);
    if (levelTimer) levelTimer.remove(false);
    // enemySpawner.stop(); // No longer needed as timer is external
    // trapSpawner.stop(); // No longer needed as timer is external
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

            // UIManager handles clearing messages and showing win screen
            UIManager.showWinScreen(freedCharactersCount);
            UIManager.hideGameplayUIDuringEnd(); // Hide buttons etc.

            if (combinedSpawnerTimer) combinedSpawnerTimer.remove(false);
            if (levelTimer) levelTimer.remove(false);
        });
    }
}
