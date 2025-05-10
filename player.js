const JUMP_VELOCITY = -821;

/**
 * Create and return the astronaut sprite.
 */
export function createPlayer (scene, groundTopY) {
    const player = scene.physics.add.sprite(
        100, groundTopY - 64,
        'player_walk1' // Use the first frame of the new animation
    ).setScale(0.8).setCollideWorldBounds(true)
     .setData('justJumped', false);

    // Adjust hitbox to be smaller and better centered
    player.body.setSize(player.width * 0.5, player.height * 0.8)
          .setOffset(player.width * 0.25, player.height * 0.15);

    if (!scene.anims.exists('green_walk')) {
        scene.anims.create({
            key : 'green_walk', // Animation key can remain the same or be changed
            frames : [
                { key : 'player_walk1' },
                { key : 'player_walk2' }
            ],
            frameRate : 6, // Adjust frameRate as needed for the new animation
            repeat : -1
        });
    }
    player.anims.play('green_walk');

    // Play foot-step sounds on each walk frame when the player is on the ground
    player.on('animationupdate-green_walk', (anim, frame) => {
        if (!player.body || !player.body.touching.down || player.getData('justJumped')) return;

        const texFrame = frame.textureFrame || frame.frame || frame.key;
        if (texFrame === 'player_walk1') {
            scene.sound.play('footstep_a', { volume: 0.4 });
            player.setData('justJumped', false);
        } else if (texFrame === 'player_walk2') {
            scene.sound.play('footstep_b', { volume: 0.4 });
            player.setData('justJumped', false);
        }
    });

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
            scene.sound.play('jump', { volume: 0.5 });
            player.setData('justJumped', true);
        }
    }
    scene.input.keyboard.on('keydown-SPACE', jump, scene);
    scene.input.on('pointerdown', jump, scene);
    return { cursors };
}
