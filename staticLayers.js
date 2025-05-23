/**
 * Build parallax layers (clouds, hills, ground) and return references.
 */
export function createStaticLayers (scene, { width, height, displayedGroundHeight }) {

    /* --- Clouds (furthest) --- */
    const cloudFrame  = scene.textures.getFrame('backgrounds_spritesheet', 'background_clouds');
    const cloudHeight = cloudFrame.height;
    const clouds = scene.add.tileSprite(
        width / 2, -90,                 // x centrado, y = -100 (sube 100 px)
        width, cloudHeight,              // height exactly the cloud frame height
        'backgrounds_spritesheet', 'background_clouds'
    ).setOrigin(0.5, 0);                // anchor to top-center

    /* --- Ground (closest) --- */
    const groundTile = scene.add.tileSprite(
        width / 2,
        height - displayedGroundHeight / 2, // Ground touches the bottom
        width, displayedGroundHeight,
        'ground_tile_top'
    );
    const ground = scene.physics.add.existing(groundTile, true);

    /* --- Hills / Trees (mid) --- */
    const hillFrame  = scene.textures.getFrame('backgrounds_spritesheet', 'background_color_hills');
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

    const groundTopY = height - displayedGroundHeight; // Ground top is now lower
    const HILLS_TRIM_TOP = 40;   // píxeles a ocultar por arriba
    const hills = scene.add.tileSprite(
        width / 2, groundTopY + 40,     // Lower hills by 40px relative to groundTopY
        width, frameH - HILLS_TRIM_TOP, // altura visible sin los 100 px superiores
        patternTexKey
    ).setOrigin(0.5, 1).setAlpha(0.5);

    // Oculta los 100 px superiores desplazando la textura
    hills.tilePositionY = HILLS_TRIM_TOP;

    // Set depths for correct rendering order
    // Lower depth = further back, Higher depth = closer to camera
    clouds.setDepth(-1);    // Clouds: al fondo
    hills.setDepth(0);      // Colinas: delante de nubes
    groundTile.setDepth(1); // Suelo: delante de colinas

    return { clouds, hills, groundTile, ground, groundTopY };
}
