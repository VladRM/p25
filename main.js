import { createStaticLayers } from './staticLayers.js';
import { createPlayer, registerPlayerControls } from './player.js';
import { ObstacleSpawner } from './obstacleSpawner.js';

/* ------------------------------------------------------------------ */
/*  Global constants                                                  */
/* ------------------------------------------------------------------ */
export const GAME_WIDTH           = 800;
export const GAME_HEIGHT          = 320; // Reduced from 400
export const displayedGroundHeight = 20;
export const gameSpeed            = 250;   // px / s
export const obstacleSpawnDelay   = 1750;  // ms

/* ------------------------------------------------------------------ */
/*  Phaser configuration                                              */
/* ------------------------------------------------------------------ */
const config = {
    type   : Phaser.AUTO,
    width  : GAME_WIDTH,
    height : GAME_HEIGHT,
    backgroundColor : '#87CEEB',
    physics : {
        default : 'arcade',
        arcade  : {
            gravity : { y : 2074 },
            debug   : false //true
        }
    },
    scene : { preload, create, update }
};

let scene;
let player;
let score         = 0;
let scoreText;
let gameOver      = false;
let gameOverText;
let restartText;
let obstacleSpawner;
let layers;

/* start the game */
new Phaser.Game(config);

/* ------------------------------------------------------------------ */
/*  Scene lifecycle                                                   */
/* ------------------------------------------------------------------ */
function preload () {
    scene = this;

    this.load.atlasXML('tiles_spritesheet'      , 'res/img/spritesheet-tiles-default.png'      , 'res/img/spritesheet-tiles-default.xml');
    this.load.atlasXML('backgrounds_spritesheet', 'res/img/spritesheet-backgrounds-default.png', 'res/img/spritesheet-backgrounds-default.xml');
    this.load.atlasXML('characters_spritesheet' , 'res/img/spritesheet-characters-default.png' , 'res/img/spritesheet-characters-default.xml');
    this.load.atlasXML('enemies_spritesheet'    , 'res/img/spritesheet-enemies-default.png'    , 'res/img/spritesheet-enemies-default.xml');

    // Load new player images
    this.load.image('player_walk1', 'res/img/player/player_walk1.png');
    this.load.image('player_walk2', 'res/img/player/player_walk2.png');

    // --- UI-icons (super-powers) ---
    this.load.image('icon_flashlight', 'res/img/player/flashlight.png');
    this.load.image('icon_compass'  , 'res/img/player/compass.png');
    this.load.image('icon_brain'    , 'res/img/player/brain.png');
}

function create () {
    /* reset state */
    score    = 0;
    gameOver = false;

    /* static layers */
    layers = createStaticLayers(this, {
        width  : GAME_WIDTH,
        height : GAME_HEIGHT,
        displayedGroundHeight
    });

    /* player */
    player = createPlayer(this, layers.groundTopY);
    this.physics.add.collider(player, layers.ground);
    registerPlayerControls(this, player);

    /* HUD */
    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize : '24px', fill : '#000000' });
    gameOverText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 'Game Over!', {
        fontSize : '48px', fill : '#FF0000', fontStyle : 'bold'
    }).setOrigin(0.5).setVisible(false);
    restartText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, 'Click or Press R to Restart', {
        fontSize : '24px', fill : '#000000'
    }).setOrigin(0.5).setVisible(false);

    /* ---------- Super-power buttons (top-right, horizontal) ---------- */
    const UI_PAD  = 10;   // separación entre botones/borde
    const UI_SIZE = 64;   // lado en px (tamaño cómodo para móvil)

    const startX = GAME_WIDTH - UI_PAD;      // extremo derecho
    const startY = UI_PAD;                   // parte superior

    // botón más a la derecha
    const btnFlash = this.add.image(startX, startY, 'icon_flashlight')
        .setOrigin(1, 0)
        .setDisplaySize(UI_SIZE, UI_SIZE)    // tamaño fijo
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

    // siguiente hacia la izquierda
    const btnCompass = this.add.image(
        btnFlash.x - UI_SIZE - UI_PAD, startY, 'icon_compass')
        .setOrigin(1, 0)
        .setDisplaySize(UI_SIZE, UI_SIZE)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

    // más a la izquierda
    const btnBrain = this.add.image(
        btnCompass.x - UI_SIZE - UI_PAD, startY, 'icon_brain')
        .setOrigin(1, 0)
        .setDisplaySize(UI_SIZE, UI_SIZE)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

    this.uiButtons = [btnFlash, btnCompass, btnBrain];
    this.children.bringToTop(this.uiButtons);

    // callbacks placeholder
    btnFlash .on('pointerdown', () => console.log('[UI] Flash-light power activated'));
    btnCompass.on('pointerdown', () => console.log('[UI] Compass power activated'));
    btnBrain .on('pointerdown', () => console.log('[UI] Brain power activated'));

    /* obstacles */
    const obstaclesGroup = this.physics.add.group();
    obstacleSpawner = new ObstacleSpawner(this, obstaclesGroup, {
        spawnDelay : obstacleSpawnDelay,
        groundTopY : layers.groundTopY
    });
    this.physics.add.overlap(player, obstaclesGroup, hitObstacle, null, this);

    /* restart controls */
    this.input.keyboard.on('keydown-R', () => { if (gameOver) this.scene.restart(); });
    this.input.on('pointerdown',       () => { if (gameOver) this.scene.restart(); });
}

function update (time, delta) {
    if (gameOver) return;

    const dt = delta / 1000;

    /* parallax */
    layers.clouds.tilePositionX   += (gameSpeed / 5)   * dt;
    layers.hills.tilePositionX    += (gameSpeed / 2.5) * dt;
    layers.groundTile.tilePositionX += gameSpeed * dt;

    /* obstacles & score */
    const gained = obstacleSpawner.update(dt, player);
    if (gained) {
        score += gained;
        scoreText.setText('Score: ' + score);
    }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function hitObstacle (playerGO, obstacleGO) {
    if (gameOver) return;

    gameOver = true;
    scene.physics.pause();

    playerGO.setTint(0x808080);
    if (playerGO.anims) playerGO.anims.stop();

    gameOverText.setVisible(true);
    restartText.setVisible(true);

    // desactivar / ocultar botones UI al game-over
    if (scene.uiButtons)
        scene.uiButtons.forEach(b => { b.disableInteractive().setVisible(false); });

    obstacleSpawner.stop();
}
