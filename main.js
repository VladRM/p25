import { createStaticLayers } from './staticLayers.js';
import { createPlayer, registerPlayerControls } from './player.js';
import { ObstacleSpawner } from './obstacleSpawner.js';
import { TrapSpawner } from './trapSpawner.js';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 320;
export const displayedGroundHeight = 20;
export const gameSpeed = 250;
export const obstacleSpawnDelay = 1750; // This will be used for the combined spawner

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
            debug: true
        }
    },
    scene: { preload, create, update }
};

let scene;
let player;
let score = 0;
let scoreText;
let gameOver = false;
let gameOverText;
let restartText;
let obstacleSpawner;
let trapSpawner;
let combinedSpawnerTimer; // New timer for combined spawning
let layers;
let trapsGroup;
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
}

function create() {
    score = 0;
    gameOver = false;

    layers = createStaticLayers(this, {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        displayedGroundHeight
    });

    player = createPlayer(this, layers.groundTopY);
    this.physics.add.collider(player, layers.ground);
    registerPlayerControls(this, player);

    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '24px', fill: '#000000' });
    gameOverText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 'Game Over!', {
        fontSize: '48px', fill: '#FF0000', fontStyle: 'bold'
    }).setOrigin(0.5).setVisible(false);
    restartText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, 'Click or Press R to Restart', {
        fontSize: '24px', fill: '#000000'
    }).setOrigin(0.5).setVisible(false);

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
            .setDisplaySize(UI_SIZE, UI_SIZE)
            .setScrollFactor(0)
            .setVisible(false); // Start invisible

        // Icon's pointerdown handler
        icon.on('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation();
            // If icon is clicked, it implies it's active (visible and interactive).
            scene.deactivateNearestTrap();
        });
        // Icon's interactivity (setInteractive/disableInteractive) is managed in update().

        // Border handles the click, but only if the icon is visible (logic in handler)
        // Starts non-interactive, enabled in update() when a trap is targetable
        border.setInteractive({ useHandCursor: true })
            .on('pointerdown', (pointer, localX, localY, event) => {
                event?.stopPropagation();
                // Only call deactivate if the icon is visible (meaning a trap is targeted)
                if (scene.disarmButtonIcon && scene.disarmButtonIcon.visible) {
                    scene.deactivateNearestTrap();
                }
            })
            .disableInteractive(); // Start non-interactive

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

    const obstaclesGroup = this.physics.add.group();
    trapsGroup = this.physics.add.group();

    obstacleSpawner = new ObstacleSpawner(this, obstaclesGroup, {
        groundTopY: layers.groundTopY
    });
    trapSpawner = new TrapSpawner(this, trapsGroup, {
        groundTopY: layers.groundTopY
    });

    const spawnRandomly = () => {
        const choice = Phaser.Math.Between(0, 1);
        // console.log(`[Main] spawnRandomly choice: ${choice === 0 ? 'Obstacle' : 'Trap'}`); // Removed log
        if (choice === 0) {
            obstacleSpawner.spawnObstacle();
        } else {
            trapSpawner.spawnTrap();
        }
    };

    combinedSpawnerTimer = this.time.addEvent({
        delay: obstacleSpawnDelay,
        callback: spawnRandomly,
        loop: true
    });

    scene.deactivateNearestTrap = () => {
        // Ensure the target is still valid (exists in scene and is marked as 'active' by our game logic)
        if (scene.currentTargetableTrap && scene.currentTargetableTrap.scene && scene.currentTargetableTrap.getData('active')) {
            const trapToDeactivate = scene.currentTargetableTrap;
            trapToDeactivate.setFillStyle(0x888888); // Change color
            trapToDeactivate.setData('active', false); // Mark as inactive
            if (trapToDeactivate.body) {
                trapToDeactivate.body.setVelocityX(-gameSpeed / 2); // Slow down
            }
            score += 10;
            scoreText.setText('Score: ' + score);

            // Reset button state immediately after deactivation
            scene.currentTargetableTrap = null;
            if (scene.disarmButtonIcon) scene.disarmButtonIcon.setVisible(false);
            if (scene.disarmButtonBorder) scene.disarmButtonBorder.disableInteractive();
        } else {
            // If the target became invalid (e.g., destroyed, already deactivated, or no longer in scene)
            // ensure the button is reset.
            if (scene.currentTargetableTrap) { // It was set, but now fails the validity check
                scene.currentTargetableTrap = null; // Clear the potentially stale reference
            }
            if (scene.disarmButtonIcon) scene.disarmButtonIcon.setVisible(false);
            if (scene.disarmButtonBorder) scene.disarmButtonBorder.disableInteractive();
        }
    };

    this.physics.add.overlap(player, obstaclesGroup, hitObstacle, null, this);
    this.physics.add.overlap(player, trapsGroup, hitTrap, null, this); // Added overlap for traps

    this.input.keyboard.on('keydown-R', () => { if (gameOver) this.scene.restart(); });
    this.input.on('pointerdown', () => { if (gameOver) this.scene.restart(); });
}

function update(time, delta) {
    if (gameOver) return;

    const dt = delta / 1000;

    layers.clouds.tilePositionX += (gameSpeed / 5) * dt;
    layers.hills.tilePositionX += (gameSpeed / 2.5) * dt;
    layers.groundTile.tilePositionX += gameSpeed * dt;

    const gained = obstacleSpawner.update(dt, player);
    trapSpawner.update(dt, player);
    if (gained) {
        score += gained;
        scoreText.setText('Score: ' + score);
    }

    // Update logic for the dynamic disarm button
    const activeTraps = trapsGroup.getChildren().filter(t => t.getData('active'));
    let nearestActiveTrapInRange = null;
    let minDistance = 201; // Max disarm distance + 1

    activeTraps.forEach(trap => {
        const distance = Math.abs(trap.x - player.x);
        if (distance <= 200 && distance < minDistance) {
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
            scene.disarmButtonIcon.setTexture(iconKey).setVisible(true);
            scene.disarmButtonIcon.setInteractive({ useHandCursor: true }); // Make icon interactive
            if (scene.disarmButtonBorder) {
                scene.disarmButtonBorder.setInteractive({ useHandCursor: true }); // Make border interactive
            }
        } else {
            // Fallback or if iconKey isn't determined (e.g. unknown trapType)
            if (scene.disarmButtonIcon) {
                scene.disarmButtonIcon.setVisible(false);
                scene.disarmButtonIcon.disableInteractive(); // Disable icon interactivity
            }
            if (scene.disarmButtonBorder) {
                scene.disarmButtonBorder.disableInteractive(); // Disable border interactivity
            }
            scene.currentTargetableTrap = null;
        }
    } else {
        // No trap in range
        scene.currentTargetableTrap = null;
        if (scene.disarmButtonIcon) {
            scene.disarmButtonIcon.setVisible(false);
            scene.disarmButtonIcon.disableInteractive(); // Disable icon interactivity
        }
        if (scene.disarmButtonBorder) {
            scene.disarmButtonBorder.disableInteractive(); // Disable border interactivity
        }
    }
}

function hitObstacle(playerGO, obstacleGO) {
    if (gameOver) return;

    gameOver = true;
    scene.physics.pause();

    playerGO.setTint(0x808080);
    if (playerGO.anims) playerGO.anims.stop();

    gameOverText.setVisible(true);
    restartText.setVisible(true);

    if (scene.uiButtons)
        scene.uiButtons.forEach(b => { b.disableInteractive().setVisible(false); });

    if (combinedSpawnerTimer) combinedSpawnerTimer.remove(false);
    // obstacleSpawner.stop(); // No longer needed as timer is external
    // trapSpawner.stop(); // No longer needed as timer is external
}

function hitTrap(playerGO, trapGO) {
    // Player passes through traps without consequence.
    // The trap's state (active, color, speed) is only changed by deactivateNearestTrap.
    // This function is now a no-op regarding game state changes from collision.
}
