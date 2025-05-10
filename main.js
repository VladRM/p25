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
            debug: false
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

    const addUIButton = (xRight, texture, logMsg) => {
        const border = scene.add.graphics().setScrollFactor(0).setInteractive();
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

        const btn = scene.add.image(
            xRight - BORDER_TOTAL / 2,
            startY + BORDER_TOTAL / 2,
            texture
        )
            .setOrigin(0.5)
            .setDisplaySize(UI_SIZE, UI_SIZE)
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', (pointer, localX, localY, event) => {
                event?.stopPropagation();
                console.log('[UI] ' + logMsg);
                scene.deactivateNearestTrap();
            });

        return { border, btn };
    };

    const { border: borderFlash, btn: btnFlash } = addUIButton(startX, 'icon_flashlight', 'Flash-light power activated');
    const { border: borderCompass, btn: btnCompass } = addUIButton(startX - (BORDER_TOTAL + UI_PAD), 'icon_compass', 'Compass power activated');
    const { border: borderBrain, btn: btnBrain } = addUIButton(startX - 2 * (BORDER_TOTAL + UI_PAD), 'icon_brain', 'Brain power activated');

    this.uiButtons = [
        btnFlash, btnCompass, btnBrain,
        borderFlash, borderCompass, borderBrain
    ];
    this.children.bringToTop(this.uiButtons);

    const obstaclesGroup = this.physics.add.group();
    trapsGroup = this.physics.add.group();

    obstacleSpawner = new ObstacleSpawner(this, obstaclesGroup, {
        groundTopY: layers.groundTopY
    });
    trapSpawner = new TrapSpawner(this, trapsGroup, {
        groundTopY: layers.groundTopY
    });

    const spawnRandomly = () => {
        if (Phaser.Math.Between(0, 1) === 0) {
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
        const activeTraps = trapsGroup.getChildren().filter(t => t.getData('active'));
        if (!activeTraps.length) return;
        const nearest = activeTraps.sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))[0];
        if (Math.abs(nearest.x - player.x) <= 200) {
            nearest.setFillStyle(0x888888);
            nearest.setData('active', false);
            nearest.body.enable = false;
        }
    };

    this.physics.add.overlap(player, obstaclesGroup, hitObstacle, null, this);

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
