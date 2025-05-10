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

const UI_SIZE  = 64;   // lado del icono (tamaño cómodo para móvil)
const BORDER_W = 2;    // grosor del borde
const UI_BORDER_PAD   = 6;   // relleno interior entre icono y borde
const BORDER_RADIUS   = 8;   // esquinas redondeadas (px)
const BORDER_TOTAL    = UI_SIZE + (BORDER_W + UI_BORDER_PAD) * 2; // ancho/alto exterior del cuadro

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
    const UI_PAD   = 10;   // margen entre borde y botones

    const startX = GAME_WIDTH - UI_PAD;
    const startY = UI_PAD;

    /* helper para crear botón + borde */
    const addUIButton = (xRight, texture, logMsg) => {
        /* --- borde redondeado --- */
        const border = scene.add.graphics().setScrollFactor(0).setInteractive();
        border.fillStyle(0x000000, 0.35);
        border.fillRoundedRect(
            xRight - BORDER_TOTAL,           // x (esquina sup-izq)
            startY,                          // y
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

        /* --- icono centrado --- */
        const btn = scene.add.image(
            xRight - BORDER_TOTAL / 2,       // centro en X
            startY + BORDER_TOTAL / 2,       // centro en Y
            texture
        )
        .setOrigin(0.5)                      // centrado respecto de su posición
        .setDisplaySize(UI_SIZE, UI_SIZE)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation();
            console.log('[UI] ' + logMsg);
        });

        return { border, btn };
    };

    // derecha → izquierda
    const { border: borderFlash,   btn: btnFlash   } = addUIButton(startX,                                           'icon_flashlight', 'Flash-light power activated');
    const { border: borderCompass, btn: btnCompass } = addUIButton(startX - (BORDER_TOTAL + UI_PAD),                'icon_compass',   'Compass power activated');
    const { border: borderBrain,   btn: btnBrain   } = addUIButton(startX - 2 * (BORDER_TOTAL + UI_PAD),            'icon_brain',     'Brain power activated');

    // guardar referencias para ocultarlas al morir
    this.uiButtons = [
        btnFlash, btnCompass, btnBrain,
        borderFlash, borderCompass, borderBrain
    ];
    this.children.bringToTop(this.uiButtons);   // asegurar que queden sobre el HUD

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
