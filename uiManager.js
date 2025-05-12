import { GAME_WIDTH, GAME_HEIGHT } from './gameConfig.js'; // Assuming these are needed for positioning

// UI Constants (moved from main.js)
const UI_SIZE = 74; // Increased by 10 for a larger button
const BORDER_W = 2;
const UI_BORDER_PAD = 6;
const BORDER_RADIUS = 8;
const BORDER_TOTAL = UI_SIZE + (BORDER_W + UI_BORDER_PAD) * 2;
const UI_PAD = 10;

// Message display constants
const MESSAGE_X_CENTER = GAME_WIDTH / 2;
const MESSAGE_Y_BOTTOM = 50; // Note: Messages appear 50px from bottom. Progress bar will be below this area. // Increased by 20

// Progress Bar Constants
const PROGRESS_BAR_HEIGHT = 8;
const PROGRESS_BAR_PADDING_X = 20; // Padding from left/right edges of the screen
const PROGRESS_BAR_PADDING_Y_BOTTOM = 5; // Padding from the absolute bottom edge of the screen
const PROGRESS_BAR_BG_COLOR = 0x222222; // Darker grey for background
const PROGRESS_BAR_FG_COLOR = 0x006400; // Dark Green, same as win text
const PROGRESS_BAR_BORDER_COLOR = 0xAAAAAA; // Medium grey for border (used for BG border)
const PROGRESS_BAR_BORDER_THICKNESS = 1; // Thickness for borders
const PROGRESS_BAR_DEPTH = 100; // Render depth
const MESSAGE_Y_TOP = 30; // Increased by 20
const MESSAGE_Y_SPACING = MESSAGE_Y_BOTTOM - MESSAGE_Y_TOP;
const MESSAGE_FADE_IN_DURATION = 250;
const MESSAGE_FADE_OUT_DURATION = 500;
const MESSAGE_SCROLL_UP_DURATION = 250;
const MESSAGE_VISIBLE_DURATION = 3000;

let sceneRef; // Reference to the main game scene

// UI Element References
let mainTitleText, subTitleText, startScreenText, startScreenOverlay, howToPlayTitleText, startScreenInstructionsText;
let scoreText, levelText;
let gameOverText, gameOverReasonText, restartText, gameOverTextBackground; // Added gameOverReasonText
let winTextInternal, winTextBackground; // Added background for win text
let disarmButtonBorder, disarmButtonIcon, disarmButtonFlashTween, disarmButtonTransitionTween; // Added disarmButtonTransitionTween
let disarmButtonState = { enabled: false, iconKey: null }; // Track current state to avoid restarting tween every frame
let messageDisplay = [null, null]; // [bottomText, topText]
let messageTimers = [null, null]; // Timers for [bottomText, topText]
let uiButtonsCollection = []; // To store buttons that need to be hidden/disabled on game over
let progressBarBg, progressBarFg; // Graphics objects for the progress bar
let jumpedOverBoothText, jumpedOverBoothTextBackground; // For the "jumped over booth" game over screen


export function initUIManager(sceneContext) {
    sceneRef = sceneContext;
    // Ensure sceneRef has a way to call displayMessage if it's used internally by other systems
    // However, it's better if other systems call uiManager.displayMessage directly.
}

function getScene() {
    if (!sceneRef) {
        console.error("UIManager: Scene reference not initialized. Call initUIManager first.");
    }
    return sceneRef;
}

export function createStartScreen() {
    const scene = getScene();
    if (!scene) return;

    startScreenOverlay = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.25)
        .setOrigin(0, 0)
        .setDepth(50);

    mainTitleText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, 'La Vot!', {
        fontSize: '48px', fill: '#FFFFFF', fontStyle: 'bold', align: 'center', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(51);

    subTitleText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70, 'Evita propaganda, elibereaza votanti si mergi la vot.', {
        fontSize: '24px', fill: '#FFFFFF', fontStyle: 'bold', align: 'center', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(51);

    startScreenText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, 'Click / Tap pentru a incepe jocul', {
        fontSize: '20px', fill: '#FFFFFF', fontStyle: 'normal', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(51);

    startScreenInstructionsText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 75, 'Click / Tap sau SPACE pentru a sari\n\nApasa butonul din dreapta sus pentru a elibera votantii din capcana.', {
        fontSize: '20px', fill: '#FFFFFF', fontStyle: 'normal', align: 'center', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(51);
}

export function destroyStartScreen() {
    if (mainTitleText) mainTitleText.destroy();
    if (subTitleText) subTitleText.destroy();
    if (startScreenText) startScreenText.destroy();
    if (startScreenOverlay) startScreenOverlay.destroy();
    if (howToPlayTitleText) howToPlayTitleText.destroy();
    if (startScreenInstructionsText) startScreenInstructionsText.destroy();
    mainTitleText = null;
    subTitleText = null;
    startScreenText = null;
    startScreenOverlay = null;
    howToPlayTitleText = null;
    startScreenInstructionsText = null;
}

export function createGameUI() {
    const scene = getScene();
    if (!scene) return;

    scoreText = scene.add.text(10, 10, 'Scor: 0', { 
        fontSize: '18px', 
        fill: '#FFFFFF', 
        stroke: '#000000',
        strokeThickness: 3 
    });
    levelText = scene.add.text(10, 34, 'Nivel: 1', { 
        fontSize: '18px', 
        fill: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 3
    });

    createProgressBar(); // Initialize the progress bar

    // Initialize gameOverText and restartText (hidden by default)
    gameOverText = scene.add.text(0, 0, 'Game Over!', { // Position will be set in showGameOverScreen
        fontSize: '48px',
        fill: '#FF0000', // Strong Red
        fontStyle: 'bold',
        // stroke: '#FFFFFF', // Removed for flat style
        // strokeThickness: 6, // Removed for flat style
        // shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, stroke: true, fill: true }, // Removed for flat style
        align: 'center'
    }).setOrigin(0.5).setVisible(false).setDepth(201); // Depth relative to its background

    restartText = scene.add.text(0, 0, 'Click / Tap to Restart', { // Position will be set in showGameOverScreen
        fontSize: '24px',
        fill: '#000000', // Black for contrast on white background
        fontStyle: 'normal',
        // stroke: '#000000', // Removed for flat style
        // strokeThickness: 3, // Removed for flat style
        align: 'center'
    }).setOrigin(0.5).setVisible(false).setDepth(201); // Depth relative to its background
}

export function updateScoreText(newScore) {
    if (scoreText) {
        scoreText.setText('Score: ' + newScore);
    }
}

export function updateLevelText(newLevel) {
    if (levelText) {
        levelText.setText('Level: ' + newLevel);
    }
}

// Moved and adapted addUIButton from main.js
function addUIButtonInternal(xRight, onClickCallback, iconTextureKey = 'icon_brain') {
    const scene = getScene();
    if (!scene) return { border: null, icon: null };

    const startY = UI_PAD;

    const border = scene.add.graphics().setScrollFactor(0);
    border.fillStyle(0x000000, 0.35);
    border.fillRoundedRect(
        xRight - BORDER_TOTAL,
        startY,
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
    border.setAlpha(0.5); // Start disabled

    const icon = scene.add.image(
        xRight - BORDER_TOTAL / 2,
        startY + BORDER_TOTAL / 2,
        iconTextureKey // Use provided or placeholder
    )
        .setOrigin(0.5)
        .setDisplaySize(UI_SIZE, UI_SIZE)
        .setScrollFactor(0)
        .setVisible(true)
        .setAlpha(0) // Start transparent
        .setInteractive();

    border.setInteractive(
        new Phaser.Geom.Rectangle(
            xRight - BORDER_TOTAL,
            startY,
            BORDER_TOTAL,
            BORDER_TOTAL
        ),
        Phaser.Geom.Rectangle.Contains
    );

    const handleClick = (pointer, localX, localY, event) => {
        event.stopPropagation();
        if (onClickCallback && icon.alpha > 0) { // Only call if button is "enabled" (icon visible)
            onClickCallback();
        }
    };

    border.on('pointerdown', handleClick);
    icon.on('pointerdown', handleClick);
    
    uiButtonsCollection.push(border, icon); // Add to collection for later management

    return { border, icon };
}

export function createDisarmButton(onClickCallback) {
    const scene = getScene();
    if (!scene) return;

    const startX = GAME_WIDTH - UI_PAD;
    const buttonElements = addUIButtonInternal(startX, onClickCallback);
    disarmButtonBorder = buttonElements.border;
    disarmButtonIcon = buttonElements.icon;
    // Scene references for these might still be useful if main.js needs to access them directly for some reason,
    // but ideally, all manipulation goes through uiManager.
    scene.disarmButtonBorder = disarmButtonBorder;
    scene.disarmButtonIcon = disarmButtonIcon;
}

export function updateDisarmButtonState(iconKey, isEnabled) {
    const scene = getScene();
    if (!scene) return;

    // If nothing changed, keep current visuals/tween
    if (isEnabled === disarmButtonState.enabled && iconKey === disarmButtonState.iconKey) {
        return;
    }

    // Persist the new state
    disarmButtonState.enabled = isEnabled;
    disarmButtonState.iconKey = iconKey;

    // Stop any existing transition tween before applying a new state or starting a new tween
    if (disarmButtonTransitionTween) {
        disarmButtonTransitionTween.stop();
        disarmButtonTransitionTween = null;
    }
    // Stop any existing flash tween (this might be specific and separate)
    if (disarmButtonFlashTween) {
        disarmButtonFlashTween.stop();
        disarmButtonFlashTween = null;
    }

    if (disarmButtonIcon) {
        if (isEnabled && iconKey) {
            const BORDER_POP_SCALE_START = 0.9;                               // start slightly smaller
            /* ---------- prepare icon ---------- */
            disarmButtonIcon.setTexture(iconKey)
                             .setDisplaySize(UI_SIZE + 10, UI_SIZE + 10)      // enlarge by 5 px per side
                             .setAlpha(0)                                     // start invisible
                             .setScale(BORDER_POP_SCALE_START);               // pop-in effect – grow to 1
            disarmButtonIcon.setInteractive({ useHandCursor: true });

            /* ---------- prepare border ---------- */
            if (disarmButtonBorder) {
                disarmButtonBorder
                    .setAlpha(0)                                             // start invisible
                    .setScale(1);                                            // keep size, fade-in centered
                if (disarmButtonBorder.input) {
                    disarmButtonBorder.input.cursor = 'hand';
                }
            }

            /* ---------- fade-in & grow ---------- */
            // Store the new tween and set it to null on completion or stop
            disarmButtonTransitionTween = scene.tweens.add({
                targets : [disarmButtonIcon, disarmButtonBorder].filter(Boolean),
                alpha   : { from: 0, to: 1 },
                scale   : 1,                                                 // both reach natural size
                duration: 250,
                ease    : 'Power1',
                onComplete: () => { disarmButtonTransitionTween = null; },
                onStop: () => { disarmButtonTransitionTween = null; }
            });
        } else {
            // Logic for when isEnabled is false (button is disabled)
            // Any active transition tween (e.g., fade-in) would have been stopped above.
            disarmButtonIcon.setAlpha(0)                        // hide icon
                            .setDisplaySize(UI_SIZE, UI_SIZE);  // restore default size
            disarmButtonIcon.setInteractive();                  // Remove hand cursor

            if (disarmButtonBorder) {
                disarmButtonBorder
                    .setAlpha(0.5)                               // disabled look
                    .setScale(1);                                // restore default size
                if (disarmButtonBorder.input) {                  // Reset cursor for inactive border
                    disarmButtonBorder.input.cursor = '';
                }
            }
        }
    }
}

export function playTrapDisarmAnimation(trap, iconKey) {
    const scene = getScene();
    if (!scene || !trap || !trap.scene || !iconKey) return;

    const iconDisplayHeight = 48;
    const gap = 5;
    const iconX = trap.x;
    const iconY = (trap.y - trap.height) - (iconDisplayHeight / 2) - gap;

    const animIcon = scene.add.image(iconX, iconY, iconKey)
        .setDisplaySize(iconDisplayHeight, iconDisplayHeight)
        .setDepth(10);

    scene.physics.add.existing(animIcon);

    if (animIcon.body) {
        animIcon.body.setAllowGravity(false);
        if (trap.body) {
            animIcon.body.setVelocityX(trap.body.velocity.x);
        } else {
            animIcon.body.setVelocityX(0);
        }

        scene.tweens.add({
            targets: animIcon,
            alpha: 0,
            y: animIcon.y - 20,
            duration: 1500, // fef7d7c: Doubled duration
            ease: 'Power1',
            onComplete: () => {
                if (animIcon && animIcon.scene) animIcon.destroy();
            }
        });
    } else {
        scene.tweens.add({
            targets: animIcon,
            alpha: 0,
            duration: 1500, // fef7d7c: Doubled duration
            ease: 'Power1',
            onComplete: () => {
                if (animIcon && animIcon.scene) animIcon.destroy();
            }
        });
    }
}

export function displayMessage(text) {
    const scene = getScene();
    if (!scene) return;

    // Clear existing timers
    if (messageTimers[1]) messageTimers[1].remove(false);
    if (messageTimers[0]) messageTimers[0].remove(false);
    messageTimers = [null, null];

    // Handle current top message
    if (messageDisplay[1]) {
        const oldTopMessage = messageDisplay[1];
        scene.tweens.add({
            targets: oldTopMessage,
            y: oldTopMessage.y - MESSAGE_Y_SPACING, alpha: 0,
            duration: MESSAGE_FADE_OUT_DURATION, ease: 'Power1',
            onComplete: () => { if (oldTopMessage && oldTopMessage.scene) oldTopMessage.destroy(); }
        });
    }
    messageDisplay[1] = null;

    // Move current bottom message to top
    if (messageDisplay[0]) {
        const oldBottomMessage = messageDisplay[0];
        messageDisplay[1] = oldBottomMessage;
        scene.tweens.add({
            targets: oldBottomMessage, y: MESSAGE_Y_TOP, alpha: 0.5,
            duration: MESSAGE_SCROLL_UP_DURATION, ease: 'Power1'
        });
        messageTimers[1] = scene.time.delayedCall(MESSAGE_VISIBLE_DURATION, () => {
            if (messageDisplay[1] === oldBottomMessage && oldBottomMessage.scene) {
                scene.tweens.add({
                    targets: oldBottomMessage, alpha: 0, duration: MESSAGE_FADE_OUT_DURATION, ease: 'Power1',
                    onComplete: () => {
                        if (oldBottomMessage && oldBottomMessage.scene) oldBottomMessage.destroy();
                        if (messageDisplay[1] === oldBottomMessage) messageDisplay[1] = null;
                    }
                });
            }
        });
    }
    messageDisplay[0] = null;

    // Create and display new message
    const newMessage = scene.add.text(MESSAGE_X_CENTER, MESSAGE_Y_BOTTOM, text, {
        fontSize: '20px', fill: '#FFFFFF', fontStyle: 'bold', // Increased fontSize
        stroke: '#000000', strokeThickness: 4, align: 'center'
    }).setOrigin(0.5, 0.5).setAlpha(0).setDepth(200);
    messageDisplay[0] = newMessage;

    scene.tweens.add({
        targets: newMessage, alpha: 1,
        duration: MESSAGE_FADE_IN_DURATION, ease: 'Power1'
    });
    messageTimers[0] = scene.time.delayedCall(MESSAGE_VISIBLE_DURATION, () => {
        if (messageDisplay[0] === newMessage && newMessage.scene) {
            scene.tweens.add({
                targets: newMessage, alpha: 0, duration: MESSAGE_FADE_OUT_DURATION, ease: 'Power1',
                onComplete: () => {
                    if (newMessage && newMessage.scene) newMessage.destroy();
                    if (messageDisplay[0] === newMessage) messageDisplay[0] = null;
                }
            });
        }
    });
}

export function showGameOverScreen(reason = null) { // Added reason parameter
    const scene = getScene();
    if (!scene || !gameOverText || !restartText) return;

    clearAllMessages();

    // Ensure texts are visible to get correct dimensions
    gameOverText.setVisible(true);
    restartText.setVisible(true);

    // Create or update reason text if provided
    if (reason) {
        if (gameOverReasonText && gameOverReasonText.scene) gameOverReasonText.destroy();
        gameOverReasonText = scene.add.text(0, 0, reason, {
            fontSize: '18px', // Smaller font for the reason
            fill: '#333333', // Dark grey, less prominent than "Game Over!"
            fontStyle: 'normal',
            align: 'center',
            wordWrap: { width: GAME_WIDTH * 0.6, useAdvancedWrap: true } // Wrap text
        }).setOrigin(0.5).setVisible(true).setDepth(201);
    } else {
        if (gameOverReasonText && gameOverReasonText.scene) {
            gameOverReasonText.destroy();
            gameOverReasonText = null;
        }
    }

    const textPadding = 20;
    const lineSpacing = 10;
    let reasonTextHeight = 0;
    let reasonTextWidth = 0;

    if (gameOverReasonText) {
        reasonTextHeight = gameOverReasonText.height + lineSpacing;
        reasonTextWidth = gameOverReasonText.width;
    }

    const requiredWidth = Math.max(gameOverText.width, restartText.width, reasonTextWidth) + 2 * textPadding;
    const requiredHeight = gameOverText.height + reasonTextHeight + restartText.height + lineSpacing + 2 * textPadding;

    const boxX = GAME_WIDTH / 2 - requiredWidth / 2;
    const boxY = GAME_HEIGHT / 2 - requiredHeight / 2;

    if (gameOverTextBackground && gameOverTextBackground.scene) {
        gameOverTextBackground.destroy();
    }
    gameOverTextBackground = scene.add.graphics({ x: boxX, y: boxY });
    gameOverTextBackground.fillStyle(0xffffff, 0.8);
    gameOverTextBackground.fillRoundedRect(0, 0, requiredWidth, requiredHeight, BORDER_RADIUS);
    gameOverTextBackground.lineStyle(BORDER_W, 0x000000, 1);
    gameOverTextBackground.strokeRoundedRect(0, 0, requiredWidth, requiredHeight, BORDER_RADIUS);
    gameOverTextBackground.setDepth(200);

    let currentY = boxY + textPadding;

    gameOverText.setPosition(GAME_WIDTH / 2, currentY + gameOverText.height / 2);
    currentY += gameOverText.height + lineSpacing;

    if (gameOverReasonText) {
        gameOverReasonText.setPosition(GAME_WIDTH / 2, currentY + gameOverReasonText.height / 2);
        currentY += gameOverReasonText.height + lineSpacing;
    }

    restartText.setPosition(GAME_WIDTH / 2, currentY + restartText.height / 2);

    scene.children.bringToTop(gameOverTextBackground);
    scene.children.bringToTop(gameOverText);
    if (gameOverReasonText) scene.children.bringToTop(gameOverReasonText);
    scene.children.bringToTop(restartText);
}

export function showWinScreen(freedCharactersCount = 0) { // Add parameter with default
    const scene = getScene();
    if (!scene) return;

    // Clear any active game messages first
    clearAllMessages();

    let winMessageString = 'Felicitari, ai evitat propaganda si ajuns cu bine la vot!';
    if (freedCharactersCount > 0) {
        winMessageString += `\nAi eliberat ${freedCharactersCount} votanti din capcanele populismului si dezinformarii!`;
        winMessageString += `\nCu ajutorul tau, democratia este mai puternica!`;
    } else {
        winMessageString += `\nDin pacate nu ai eliberat niciun votant din capcanele propagandei`;
        winMessageString += `\nData viitoare i-ai si pe ei cu tine!`;
    }

    const textStyle = {
        fontSize: '20px', // Reduced font size
        fill: '#006400', // Dark Green
        fontStyle: 'bold',
        // Removed stroke and shadow
        align: 'center' // Ensure text is centered if it wraps
    };

    // Create text first to get its dimensions, initially invisible
    winTextInternal = scene.add.text(0, 0, winMessageString, textStyle)
        .setOrigin(0.5)
        .setDepth(201) // Text on top of its background
        .setVisible(false);

    const textPadding = 20; // Padding around the text inside the box
    const boxWidth = winTextInternal.width + 2 * textPadding;
    const boxHeight = winTextInternal.height + 2 * textPadding;
    const boxX = GAME_WIDTH / 2 - boxWidth / 2;
    const boxY = (GAME_HEIGHT / 2 - 60) - boxHeight / 2; // Adjusted Y position for the box

    // Create background graphics object
    if (winTextBackground) {
        winTextBackground.destroy(); // Destroy if already exists
    }
    winTextBackground = scene.add.graphics({ x: boxX, y: boxY });
    winTextBackground.fillStyle(0xffffff, 0.8); // White background with 80% opacity
    winTextBackground.fillRoundedRect(0, 0, boxWidth, boxHeight, BORDER_RADIUS);
    winTextBackground.lineStyle(BORDER_W, 0x000000, 1); // Black border
    winTextBackground.strokeRoundedRect(0, 0, boxWidth, boxHeight, BORDER_RADIUS);
    winTextBackground.setDepth(200); // Background behind text

    // Position the text in the center of the screen (which is also the center of the box)
    winTextInternal.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60); // Adjusted Y position for the text
    winTextInternal.setVisible(true); // Make text visible now that background is drawn

    // Ensure text is on top of the new background
    scene.children.bringToTop(winTextBackground); // Should be redundant due to setDepth
    scene.children.bringToTop(winTextInternal);
}

export function hideGameplayUIDuringEnd() {
    uiButtonsCollection.forEach(b => {
        if (b && b.scene) { // Check if it hasn't been destroyed
             if (typeof b.disableInteractive === 'function') {
                b.disableInteractive();
            }
            if (typeof b.setVisible === 'function') {
                b.setVisible(false);
            }
        }
    });
    // Optionally hide score/level text too, or leave them visible
    // if (scoreText) scoreText.setVisible(false);
    // if (levelText) levelText.setVisible(false);

    // Hide progress bar elements
    if (progressBarBg && progressBarBg.scene) {
        progressBarBg.setVisible(false);
    }
    if (progressBarFg && progressBarFg.scene) {
        progressBarFg.setVisible(false);
    }
}

function clearAllMessages() {
    messageDisplay.forEach(msg => {
        if (msg && msg.scene) msg.destroy();
    });
    messageDisplay = [null, null];
    messageTimers.forEach(timer => {
        if (timer) timer.remove(false);
    });
    messageTimers = [null, null];
}


export function resetUIForNewGame() {
    if (gameOverTextBackground && gameOverTextBackground.scene) {
        gameOverTextBackground.destroy();
        gameOverTextBackground = null;
    }
    if (gameOverText) gameOverText.setVisible(false);
    if (gameOverReasonText && gameOverReasonText.scene) { // Clear reason text
        gameOverReasonText.destroy();
        gameOverReasonText = null;
    }
    if (restartText) restartText.setVisible(false);

    if (winTextBackground && winTextBackground.scene) {
        winTextBackground.destroy();
        winTextBackground = null;
    }
    if (winTextInternal && winTextInternal.scene) {
        winTextInternal.destroy();
        winTextInternal = null;
    }
    
    clearAllMessages();

    // Destroy and nullify progress bar elements
    if (progressBarBg && progressBarBg.scene) {
        progressBarBg.destroy();
    }
    progressBarBg = null;
    if (progressBarFg && progressBarFg.scene) {
        progressBarFg.destroy();
    }
    progressBarFg = null;

    // Reset button collection for the new game (they will be recreated)
    uiButtonsCollection = [];
    // Ensure disarm button elements are reset if they persist across scenes/restarts
    // (though they are typically recreated in startGame)
    if (disarmButtonTransitionTween) { // Stop transition tween first
        disarmButtonTransitionTween.stop();
        disarmButtonTransitionTween = null;
    }
    if (disarmButtonFlashTween) {
        disarmButtonFlashTween.stop();
        disarmButtonFlashTween = null;
    }
    if (disarmButtonIcon) {
        disarmButtonIcon.setAlpha(0);
        if (disarmButtonIcon.scene) { // Only call setInteractive if part of a scene
            disarmButtonIcon.setInteractive();
        }
    }
    if (disarmButtonBorder) disarmButtonBorder.setAlpha(0.5);

    // Reset cached button state for the next game
    disarmButtonState = { enabled: false, iconKey: null };

    if (jumpedOverBoothTextBackground && jumpedOverBoothTextBackground.scene) {
        jumpedOverBoothTextBackground.destroy();
        jumpedOverBoothTextBackground = null;
    }
    if (jumpedOverBoothText && jumpedOverBoothText.scene) {
        jumpedOverBoothText.destroy();
        jumpedOverBoothText = null;
    }
}

// --- Progress Bar Functions ---

export function createProgressBar() {
    const scene = getScene();
    if (!scene) return;

    // Destroy existing progress bar elements if they were somehow not cleaned up by resetUIForNewGame
    if (progressBarBg) progressBarBg.destroy();
    if (progressBarFg) progressBarFg.destroy();

    const barWidth = GAME_WIDTH - 2 * PROGRESS_BAR_PADDING_X;
    const barY = GAME_HEIGHT - PROGRESS_BAR_HEIGHT - PROGRESS_BAR_PADDING_Y_BOTTOM;

    // Background of the progress bar
    progressBarBg = scene.add.graphics();
    progressBarBg.fillStyle(PROGRESS_BAR_BG_COLOR, 0.8); // Semi-transparent background
    progressBarBg.fillRect(PROGRESS_BAR_PADDING_X, barY, barWidth, PROGRESS_BAR_HEIGHT);

    // Border for the background
    progressBarBg.lineStyle(PROGRESS_BAR_BORDER_THICKNESS, PROGRESS_BAR_BORDER_COLOR, 1);
    progressBarBg.strokeRect(PROGRESS_BAR_PADDING_X, barY, barWidth, PROGRESS_BAR_HEIGHT);
    progressBarBg.setDepth(PROGRESS_BAR_DEPTH);
    progressBarBg.setScrollFactor(0); // Keep it static on screen

    // Foreground (the actual progress fill)
    progressBarFg = scene.add.graphics();
    // Initial fill will be drawn by the first call to updateProgressBar
    progressBarFg.setDepth(PROGRESS_BAR_DEPTH + 1); // Ensure FG is on top of BG
    progressBarFg.setScrollFactor(0); // Keep it static on screen
}

export function updateProgressBar(progressPercent) { // progressPercent is a value from 0.0 to 1.0
    const scene = getScene();
    // Ensure elements exist and scene is valid; progressBarBg is used for dimensions/position reference
    if (!scene || !progressBarFg || !progressBarBg || !progressBarBg.scene) return;

    const barTotalWidth = GAME_WIDTH - 2 * PROGRESS_BAR_PADDING_X;
    const barY = GAME_HEIGHT - PROGRESS_BAR_HEIGHT - PROGRESS_BAR_PADDING_Y_BOTTOM;
    
    // Clamp progressPercent between 0 and 1
    const clampedProgress = Math.max(0, Math.min(progressPercent, 1));
    const currentProgressWidth = barTotalWidth * clampedProgress;

    progressBarFg.clear(); // Clear previous drawing of the foreground
    progressBarFg.fillStyle(PROGRESS_BAR_FG_COLOR, 1);
    progressBarFg.fillRect(PROGRESS_BAR_PADDING_X, barY, currentProgressWidth, PROGRESS_BAR_HEIGHT);

    // Add a black border to the foreground fill
    if (currentProgressWidth > 0) { // Only draw border if there's progress
        progressBarFg.lineStyle(PROGRESS_BAR_BORDER_THICKNESS, 0x000000, 1); // Black border, 1px thick
        progressBarFg.strokeRect(PROGRESS_BAR_PADDING_X, barY, currentProgressWidth, PROGRESS_BAR_HEIGHT);
    }
}

export function showJumpedOverBoothScreen(message) {
    const scene = getScene();
    if (!scene) return;

    clearAllMessages();

    const textStyle = {
        fontSize: '24px',
        fill: '#FF0000', // Strong Red, similar to game over
        fontStyle: 'bold',
        align: 'center'
    };

    // Create text first to get its dimensions, initially invisible
    if (jumpedOverBoothText && jumpedOverBoothText.scene) jumpedOverBoothText.destroy();
    jumpedOverBoothText = scene.add.text(0, 0, message, textStyle)
        .setOrigin(0.5)
        .setDepth(201)
        .setVisible(false);

    const textPadding = 20;
    const lineSpacing = 10; // Space between message and restart prompt
    const requiredWidth = Math.max(jumpedOverBoothText.width, (restartText ? restartText.width : 0)) + 2 * textPadding; // Consider restart text width
    const requiredHeight = jumpedOverBoothText.height + (restartText ? (lineSpacing + restartText.height) : 0) + 2 * textPadding;

    const boxX = GAME_WIDTH / 2 - requiredWidth / 2;
    const boxY = GAME_HEIGHT / 2 - requiredHeight / 2;

    if (jumpedOverBoothTextBackground && jumpedOverBoothTextBackground.scene) {
        jumpedOverBoothTextBackground.destroy();
    }
    jumpedOverBoothTextBackground = scene.add.graphics({ x: boxX, y: boxY });
    jumpedOverBoothTextBackground.fillStyle(0xffffff, 0.8); // White background
    jumpedOverBoothTextBackground.fillRoundedRect(0, 0, requiredWidth, requiredHeight, BORDER_RADIUS);
    jumpedOverBoothTextBackground.lineStyle(BORDER_W, 0x000000, 1); // Black border
    jumpedOverBoothTextBackground.strokeRoundedRect(0, 0, requiredWidth, requiredHeight, BORDER_RADIUS);
    jumpedOverBoothTextBackground.setDepth(200);

    const messageY = boxY + textPadding + jumpedOverBoothText.height / 2;
    jumpedOverBoothText.setPosition(GAME_WIDTH / 2, messageY);
    jumpedOverBoothText.setVisible(true);

    if (restartText && restartText.scene) {
        const restartMessageY = messageY + jumpedOverBoothText.height / 2 + lineSpacing + restartText.height / 2;
        restartText.setText('Click / Tap to Restart'); // Ensure correct text
        restartText.setPosition(GAME_WIDTH / 2, restartMessageY);
        restartText.setVisible(true);
        scene.children.bringToTop(restartText);
    }
    
    scene.children.bringToTop(jumpedOverBoothTextBackground); // Redundant due to setDepth
    scene.children.bringToTop(jumpedOverBoothText);

    hideGameplayUIDuringEnd();
}
