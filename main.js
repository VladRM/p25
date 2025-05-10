import { createStaticLayers } from './staticLayers.js';
import { createPlayer, registerPlayerControls } from './player.js';
import { ObstacleSpawner } from './obstacleSpawner.js';

/* ------------------------------------------------------------------ */
/*  Global constants                                                  */
/* ------------------------------------------------------------------ */
export const GAME_WIDTH           = 800;
export const GAME_HEIGHT          = 400;
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

    obstacleSpawner.stop();
}
