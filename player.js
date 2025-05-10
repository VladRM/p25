const JUMP_VELOCITY = -821;

/**
 * Create and return the astronaut sprite.
 */
export function createPlayer (scene, groundTopY) {
    const player = scene.physics.add.sprite(
        100, groundTopY - 64,
        'characters_spritesheet', 'character_green_walk_a'
    ).setScale(0.8).setCollideWorldBounds(true);

    // Adjust hitbox to be smaller and better centered
    player.body.setSize(player.width * 0.5, player.height * 0.8)
          .setOffset(player.width * 0.25, player.height * 0.15);

    if (!scene.anims.exists('green_walk')) {
        scene.anims.create({
            key : 'green_walk',
            frames : [
                { key : 'characters_spritesheet', frame : 'character_green_walk_a' },
                { key : 'characters_spritesheet', frame : 'character_green_walk_b' }
            ],
            frameRate : 6,
            repeat : -1
        });
    }
    player.anims.play('green_walk');
    return player;
}

/**
 * Add keyboard / pointer controls for the player.
 */
export function registerPlayerControls (scene, player) {
    const cursors = scene.input.keyboard.createCursorKeys();
    function jump () {
        if (player.body.touching.down) {
            player.body.setVelocityY(JUMP_VELOCITY);
        }
    }
    scene.input.keyboard.on('keydown-SPACE', jump, scene);
    scene.input.on('pointerdown', jump, scene);
    return { cursors };
}
