const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 300,
    backgroundColor: '#87CEEB', // Sky blue for the game background
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 2074 }, // Gravity affecting the player (increased for faster, higher jump)
            debug: true // Set to true for physics debugging visuals
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Game variables
let player;
let skyTileSprite; // For the visual sky background
let cloudsTileSprite; // For the new, closer cloud layer
let greenHillsTileSprite; // For the visual green hills background
let treesTileSprite; // For the visual trees background
let ground;
let groundTileSprite; // For the visual ground tile sprite
let obstacles;
let cursors;
let score = 0;
let scoreText;
let gameOver = false;
let gameOverText;
let restartText;
let obstacleTimer; // Timer for spawning obstacles

const gameSpeed = 250; // Speed at which obstacles move left (pixels per second)
const obstacleSpawnDelay = 1750; // Time in milliseconds between obstacle spawns
const playerJumpVelocity = -821; // Negative Y velocity for jump (increased for faster, higher jump)

// Define 5 obstacle colors
const obstacleColors = [
    0xFF0000, // Red
    0xFFA500, // Orange
    0xFFFF00, // Yellow
    0x008000, // Green
    0x800080  // Purple
];

// Initialize the Phaser game instance
const game = new Phaser.Game(config);

function preload() {
    // Load the atlas for the tiles (ground, etc.)
    this.load.atlasXML('tiles_spritesheet', 'res/img/spritesheet-tiles-default.png', 'res/img/spritesheet-tiles-default.xml');
    // Load the atlas for backgrounds
    this.load.atlasXML('backgrounds_spritesheet', 'res/img/spritesheet-backgrounds-default.png', 'res/img/spritesheet-backgrounds-default.xml');
}

function create() {
    // Reset game state for potential restarts
    score = 0;
    gameOver = false;

    // Sky Background
    // The 'background_clouds' sprite is 256x256. We'll tile it.
    skyTileSprite = this.add.tileSprite(
        config.width / 2,
        config.height / 2,
        config.width,
        config.height,
        'backgrounds_spritesheet',
        'background_clouds'
    );
    // Ensure sky is behind everything else by setting a low depth, or by adding it first.
    // Since we are adding it before other elements like ground and player, it will naturally be in the background.

    // Clouds Layer (in front of sky, behind hills)
    // Also uses 'background_clouds' but will scroll at a different speed for parallax.
    cloudsTileSprite = this.add.tileSprite(
        config.width / 2,
        config.height / 2, // Centered, covers full height
        config.width,
        config.height,
        'backgrounds_spritesheet',
        'background_clouds'
    );

    // Green Hills Background
    // The 'background_color_hills' sprite is 256x256.
    // Position its bottom edge slightly above the ground.
    // Ground top is at config.height - 20. Sprite height is 256.
    // Center Y = (config.height - 20) - (spriteHeight / 2) + vertical_offset_from_ground_top
    // Let's make it sit a bit higher than the previous 'fade_hills' to ensure trees can be in front.
    greenHillsTileSprite = this.add.tileSprite(
        config.width / 2,
        (config.height - 20) - (256 / 2) + 30, // Adjusted Y position
        config.width,
        256, // Full height of the sprite
        'backgrounds_spritesheet',
        'background_color_hills'
    );

    // Trees Background
    // The 'background_color_trees' sprite is 256x256.
    // This layer will be in front of greenHillsTileSprite.
    // Position its bottom edge also slightly above the ground, potentially overlapping hills slightly.
    treesTileSprite = this.add.tileSprite(
        config.width / 2,
        (config.height - 20) - (256 / 2) + 60, // Adjusted Y position, slightly lower than hills to appear closer or overlap
        config.width,
        256, // Full height of the sprite
        'backgrounds_spritesheet',
        'background_color_trees'
    );
    // Order of creation: sky -> greenHills -> trees -> ground -> player.

    // Ground
    const actualGroundSpriteFrameHeight = 64; // Actual height of the "terrain_grass_horizontal_middle" sprite frame
    const displayedGroundHeight = 20; // Desired visible and physical height of the ground on screen

    groundTileSprite = this.add.tileSprite(
        config.width / 2, // Center X of the TileSprite
        (config.height - 20) + (displayedGroundHeight / 2), // Position its center so its top aligns with y = config.height - 20
        config.width,
        displayedGroundHeight, // Set the visual height of the TileSprite on screen
        'tiles_spritesheet',
        'terrain_grass_horizontal_middle' // Using "terrain_grass_horizontal_middle" tile (frame is 64px tall)
    );
    // The TileSprite will use the 'terrain_grass_horizontal_middle' frame.
    // Since displayedGroundHeight (20px) is less than actualGroundSpriteFrameHeight (64px),
    // Phaser will clip the frame, effectively showing the top 20px of the sprite, tiled horizontally.

    ground = this.physics.add.existing(groundTileSprite, true); // `true` for static, makes it a physics body
    // The physics body will now be config.width x displayedGroundHeight (20px).
    // Its top surface will be at y = config.height - 20, consistent with the previous ground.

    // Player
    const playerWidth = 30;
    const playerHeight = 50;
    player = this.add.rectangle(100, config.height - 20 - playerHeight / 2, playerWidth, playerHeight, 0x0000FF); // Blue
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);

    // Collision: Player and Ground
    this.physics.add.collider(player, ground);

    // Obstacles: Create a group to manage obstacles
    obstacles = this.physics.add.group();

    // Input: Setup for jump
    cursors = this.input.keyboard.createCursorKeys(); // For arrow keys
    this.input.keyboard.on('keydown-SPACE', jump, this); // Spacebar
    this.input.on('pointerdown', jump, this); // Mouse click or touch

    // Score Text
    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '24px', fill: '#000000' });

    // Game Over Text (initially hidden)
    gameOverText = this.add.text(config.width / 2, config.height / 2 - 30, 'Game Over!', {
        fontSize: '48px',
        fill: '#FF0000', // Red
        fontStyle: 'bold'
    }).setOrigin(0.5).setVisible(false);

    // Restart Text (initially hidden)
    restartText = this.add.text(config.width / 2, config.height / 2 + 30, 'Click or Press R to Restart', {
        fontSize: '24px',
        fill: '#000000'
    }).setOrigin(0.5).setVisible(false);

    // Timer to spawn obstacles
    obstacleTimer = this.time.addEvent({
        delay: obstacleSpawnDelay,
        callback: spawnObstacle,
        callbackScope: this,
        loop: true
    });

    // Restart listener (R key)
    this.input.keyboard.on('keydown-R', () => {
        if (gameOver) {
            console.log("R key pressed, restarting scene.");
            this.scene.restart();
        }
    });
    // Restart listener (click/touch, only active when game is over)
    this.input.on('pointerdown', () => {
        if (gameOver) {
            // Check if the click is not on an interactive UI element if you add them later
            console.log("Pointer down, restarting scene.");
            this.scene.restart();
        }
    }, this);
}

function jump() {
    if (!gameOver && player.body.touching.down) {
        // console.log("Player jumping"); // Optional: can be useful
        player.body.setVelocityY(playerJumpVelocity);
    }
}

function spawnObstacle() {
    if (gameOver) return; 

    if (!this.add || !this.physics) {
        console.error("spawnObstacle: 'this' context is not the scene. Aborting spawn.");
        return;
    }

    const minObstacleHeight = 20;
    const maxObstacleHeight = 70;
    const obstacleHeight = Phaser.Math.Between(minObstacleHeight, maxObstacleHeight);
    const obstacleWidth = Phaser.Math.Between(20, 40);
    const randomColor = Phaser.Utils.Array.GetRandom(obstacleColors);

    const obstacle = this.add.rectangle(
        config.width + obstacleWidth, 
        config.height - 20 - obstacleHeight / 2, 
        obstacleWidth,
        obstacleHeight,
        randomColor
    );

    obstacles.add(obstacle);
    this.physics.add.existing(obstacle, false); 

    if (!obstacle.body) {
        console.error("CRITICAL: Obstacle body NOT created. Destroying visual obstacle.");
        obstacle.destroy();
        return;
    }

    obstacle.body.setAllowGravity(false);
    obstacle.body.setImmovable(true);
    obstacle.body.moves = true; 
    obstacle.body.setVelocityX(-gameSpeed);
    obstacle.setData('isScorable', true);
}

function update(time, delta) {
    if (gameOver) {
        return; 
    }

    // Scroll the sky texture (slower than ground for parallax)
    if (skyTileSprite) {
        skyTileSprite.tilePositionX += (gameSpeed / 4) * (delta / 1000); // Scroll at 1/4 of ground speed
    }

    // Scroll the new clouds layer (faster than sky, slower than hills)
    if (cloudsTileSprite) {
        cloudsTileSprite.tilePositionX += (gameSpeed / 3) * (delta / 1000); // Scroll at 1/3 of ground speed
    }

    // Scroll the green hills texture (slower parallax)
    if (greenHillsTileSprite) {
        greenHillsTileSprite.tilePositionX += (gameSpeed / 2.5) * (delta / 1000); // Scroll at 2/5 of ground speed
    }

    // Scroll the trees texture (medium speed parallax)
    if (treesTileSprite) {
        treesTileSprite.tilePositionX += (gameSpeed / 1.5) * (delta / 1000); // Scroll at 2/3 of ground speed
    }

    // Scroll the ground texture
    if (groundTileSprite) {
        // gameSpeed is pixels per second, delta is in ms. delta / 1000 is seconds.
        groundTileSprite.tilePositionX += gameSpeed * (delta / 1000);
    }

    obstacles.getChildren().forEach((obstacle, index) => {
        if (!obstacle || !obstacle.body) {
            // This warning is useful to keep
            console.warn("Update loop: Found invalid obstacle in group at index", index, ". Removing it.");
            if (obstacle) obstacles.remove(obstacle, true, true);
            return;
        }
        
        // Removed the very verbose per-frame obstacle log

        if (obstacle.getBounds().right < 0) {
            // console.log("Obstacle off-screen, removing. x:", obstacle.x); // Optional
            obstacles.remove(obstacle, true, true); 
        }
        else if (obstacle.getData('isScorable') && (obstacle.x + obstacle.width / 2) < player.x) {
            score += 10;
            scoreText.setText('Score: ' + score);
            obstacle.setData('isScorable', false); 
            // console.log("Score updated:", score); // Optional
        }
    });

    this.physics.overlap(player, obstacles, hitObstacle, null, this);
}

function hitObstacle(playerGameObject, obstacleGameObject) {
    if (gameOver) return; 

    console.log("Collision detected between player and obstacle!");
    gameOver = true;
    this.physics.pause(); 
    console.log("Game over. Physics paused.");

    playerGameObject.setFillStyle(0x808080); 

    gameOverText.setVisible(true);
    restartText.setVisible(true);

    if (obstacleTimer) {
        console.log("Stopping obstacle timer.");
        obstacleTimer.remove(false);
    }
}
