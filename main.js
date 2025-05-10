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
    const UI_PAD   = 10;   // margen entre borde y botones
    const UI_SIZE  = 64;   // lado del icono (tamaño cómodo para móvil)
    const BORDER_W = 2;    // grosor del borde

    const startX = GAME_WIDTH - UI_PAD;
    const startY = UI_PAD;

    /* helper para crear botón + borde */
    const addUIButton = (x, texture, logMsg) => {
        // borde
        const border = this.add.rectangle(
            x, startY,
            UI_SIZE + BORDER_W * 2, UI_SIZE + BORDER_W * 2,
            0x000000, 0.35                // relleno semitransparente
        )
        .setOrigin(1, 0)
        .setStrokeStyle(BORDER_W, 0xffffff)
        .setScrollFactor(0);

        // icono
        const btn = this.add.image(x, startY, texture)
            .setOrigin(1, 0)
            .setDisplaySize(UI_SIZE, UI_SIZE)
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', (pointer, localX, localY, event) => {
                event?.stopPropagation();               // evita que el tap haga saltar al jugador
                console.log('[UI] ' + logMsg);
            });

        return { border, btn };
    };

    // derecha → izquierda
    const { border: borderFlash,   btn: btnFlash   } = addUIButton(startX                          , 'icon_flashlight', 'Flash-light power activated');
    const { border: borderCompass, btn: btnCompass } = addUIButton(startX - (UI_SIZE + UI_PAD)    , 'icon_compass',   'Compass power activated');
    const { border: borderBrain,   btn: btnBrain   } = addUIButton(startX - 2*(UI_SIZE + UI_PAD) , 'icon_brain',     'Brain power activated');

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
