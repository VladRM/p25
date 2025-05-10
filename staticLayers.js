/**
 * Build parallax layers (clouds, hills, ground) and return references.
 */
export function createStaticLayers (scene, { width, height, displayedGroundHeight }) {

    /* --- Clouds (furthest) --- */
    const clouds = scene.add.tileSprite(
        width / 2, height / 2,
        width, height,
        'backgrounds_spritesheet', 'background_clouds'
    );
    clouds.tilePositionY = 90;

    /* --- Ground (closest) --- */
    const groundTile = scene.add.tileSprite(
        width / 2,
        (height - displayedGroundHeight) + displayedGroundHeight / 2,
        width, displayedGroundHeight,
        'tiles_spritesheet', 'terrain_grass_horizontal_middle'
    );
    const ground = scene.physics.add.existing(groundTile, true);

    /* --- Hills / Trees (mid) --- */
    const hillFrame  = scene.textures.getFrame('backgrounds_spritesheet', 'background_color_hills');
    const treeFrame  = scene.textures.getFrame('backgrounds_spritesheet', 'background_color_trees');
    const frameW     = hillFrame.width;
    const frameH     = hillFrame.height;

    const patternFrames = ['background_color_hills', 'background_color_hills', 'background_color_trees'];
    const patternTexKey = 'hills_pattern_texture';
    const patternW      = frameW * patternFrames.length;

    if (!scene.textures.exists(patternTexKey)) {
        const canvas = scene.textures.createCanvas(patternTexKey, patternW, frameH);
        const ctx    = canvas.getContext();
        patternFrames.forEach((key, i) => {
            const fr = scene.textures.getFrame('backgrounds_spritesheet', key);
            ctx.drawImage(fr.source.image, fr.cutX, fr.cutY, fr.width, fr.height,
                          i * frameW, 0, fr.width, fr.height);
        });
        canvas.refresh();
    }

    const groundTopY = height - displayedGroundHeight;
    const hills = scene.add.tileSprite(
        width / 2, groundTopY,
        width, frameH,
        patternTexKey
    ).setOrigin(0.5, 1);

    // Set depths for correct rendering order
    // Lower depth = further back, Higher depth = closer to camera
    hills.setDepth(0);      // Hills will be behind clouds and ground
    clouds.setDepth(1);     // Clouds will be in front of hills, but behind ground
    groundTile.setDepth(2); // Ground will be in front of clouds and hills

    return { clouds, hills, groundTile, ground, groundTopY };
}
