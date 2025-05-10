const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 300,
    backgroundColor: '#87CEEB', // Sky blue for the game background
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 600 }, // Gravity affecting the player
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
let ground;
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
const playerJumpVelocity = -400; // Negative Y velocity for jump

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
    console.log("Preload started");
    // No external assets to load for this simple version
}

function create() {
    console.log("Create started");
    // Reset game state for potential restarts
    score = 0;
    gameOver = false;

    // Ground
    // Create a visual rectangle for the ground
    const groundVisual = this.add.rectangle(0, config.height - 20, config.width, 40, 0x8B4513).setOrigin(0);
    // Add physics to the ground visual, making it a static body
    ground = this.physics.add.existing(groundVisual, true); // `true` for static
    console.log("Ground created:", ground);

    // Player
    // Create a visual rectangle for the player
    const playerWidth = 30;
    const playerHeight = 50;
    // Position player on top of the ground
    player = this.add.rectangle(100, config.height - 20 - playerHeight / 2, playerWidth, playerHeight, 0x0000FF); // Blue
    // Add physics to the player visual
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true); // Prevent player from going off-screen
    console.log("Player created:", player);

    // Collision: Player and Ground
    this.physics.add.collider(player, ground);

    // Obstacles: Create a group to manage obstacles
    obstacles = this.physics.add.group();
    console.log("Obstacles group created:", obstacles);

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
    console.log("Setting up obstacle timer with delay:", obstacleSpawnDelay);
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
            this.scene.restart(); // Phaser's scene restart method
        }
    });
    // Restart listener (click/touch, only active when game is over)
    this.input.on('pointerdown', () => {
        if (gameOver) {
            console.log("Pointer down, restarting scene.");
            this.scene.restart();
        }
    }, this);
    console.log("Create finished");
}

function jump() {
    // Allow jump only if not game over and player is on the ground
    if (!gameOver && player.body.touching.down) {
        console.log("Player jumping");
        player.body.setVelocityY(playerJumpVelocity);
    }
}

function spawnObstacle() {
    console.log("--- spawnObstacle called. Game over:", gameOver, "---");
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

    // 1. Create visual rectangle
    const obstacle = this.add.rectangle(
        config.width + obstacleWidth, 
        config.height - 20 - obstacleHeight / 2, 
        obstacleWidth,
        obstacleHeight,
        randomColor
    );
    console.log("1. Obstacle visual created at x:", obstacle.x, "y:", obstacle.y, ". Has body?", !!obstacle.body);

    // 2. Add to group
    obstacles.add(obstacle);
    console.log("2. Obstacle added to group. Has body (from group)?", !!obstacle.body, "Group size:", obstacles.getLength());

    // 3. Ensure physics body is correctly initialized as dynamic
    this.physics.add.existing(obstacle, false); // false explicitly means isStatic = false (i.e., dynamic)
    console.log("3. Called this.physics.add.existing(obstacle, false). Body exists:", !!obstacle.body);

    if (!obstacle.body) {
        console.error("CRITICAL: Obstacle body NOT created. Destroying visual obstacle.");
        obstacle.destroy(); // Clean up visual element
        // No need to remove from group if it was never properly added with a body,
        // but if it was, physics group handles missing bodies gracefully.
        return;
    }
    console.log("   Body Type - isStatic:", obstacle.body.isStatic, "isDynamic:", obstacle.body.isDynamic);

    // 4. Configure the body
    obstacle.body.setAllowGravity(false);
    console.log("4. Set allowGravity(false). Current body.allowGravity:", obstacle.body.allowGravity);

    obstacle.body.setImmovable(true);
    console.log("5. Set immovable(true). Current body.immovable:", obstacle.body.immovable);
    
    obstacle.body.moves = true; 
    console.log("6. Set body.moves = true. Current body.moves:", obstacle.body.moves);
    
    // Set velocity
    obstacle.body.setVelocityX(-gameSpeed);
    // Y velocity should ideally be 0 unless explicitly set for other behaviors
    // obstacle.body.setVelocityY(0); // Explicitly set Y velocity to 0 if needed
    console.log("7. Set velocityX. Current body.velocity.x:", obstacle.body.velocity.x, "Expected:", -gameSpeed);
    console.log("   Current body.velocity.y (after setVelocityX):", obstacle.body.velocity.y);


    obstacle.setData('isScorable', true);
    console.log("--- spawnObstacle finished for one obstacle ---");
}

function update(time, delta) {
    if (gameOver) {
        return; 
    }

    obstacles.getChildren().forEach((obstacle, index) => {
        if (!obstacle || !obstacle.body) {
            console.warn("Update loop: Found invalid obstacle in group at index", index, ". Removing it.");
            if (obstacle) obstacles.remove(obstacle, true, true);
            return;
        }
        
        console.log(`Update: Obstacle ${index} - x: ${obstacle.x.toFixed(2)}, vx: ${obstacle.body.velocity.x.toFixed(2)}, vy: ${obstacle.body.velocity.y.toFixed(2)}, moves: ${obstacle.body.moves}, allowGravity: ${obstacle.body.allowGravity}`);

        if (obstacle.getBounds().right < 0) {
            console.log("Obstacle off-screen, removing. x:", obstacle.x);
            obstacles.remove(obstacle, true, true); 
        }
        else if (obstacle.getData('isScorable') && (obstacle.x + obstacle.width / 2) < player.x) {
            score += 10;
            scoreText.setText('Score: ' + score);
            obstacle.setData('isScorable', false); 
            console.log("Score updated:", score);
        }
    });

    this.physics.overlap(player, obstacles, hitObstacle, null, this);
}

function hitObstacle(playerGameObject, obstacleGameObject) {
    console.log("Collision detected between player and obstacle!");
    if (gameOver) return; 

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
