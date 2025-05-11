import { GAME_WIDTH, GAME_HEIGHT } from './gameConfig.js'; // Assuming these are needed for positioning

// UI Constants (moved from main.js)
const UI_SIZE = 64;
const BORDER_W = 2;
const UI_BORDER_PAD = 6;
const BORDER_RADIUS = 8;
const BORDER_TOTAL = UI_SIZE + (BORDER_W + UI_BORDER_PAD) * 2;
const UI_PAD = 10;

// Message display constants
const MESSAGE_X_CENTER = GAME_WIDTH / 2;
const MESSAGE_Y_BOTTOM = 30;
const MESSAGE_Y_TOP = 10;
const MESSAGE_Y_SPACING = MESSAGE_Y_BOTTOM - MESSAGE_Y_TOP;
const MESSAGE_FADE_IN_DURATION = 250;
const MESSAGE_FADE_OUT_DURATION = 500;
const MESSAGE_SCROLL_UP_DURATION = 250;
const MESSAGE_VISIBLE_DURATION = 3000;

let sceneRef; // Reference to the main game scene

// UI Element References
let startScreenText, startScreenOverlay;
let scoreText, levelText;
let gameOverText, restartText;
let winTextInternal; // Renamed to avoid conflict if main.js had a 'winText'
let disarmButtonBorder, disarmButtonIcon;
let messageDisplay = [null, null]; // [bottomText, topText]
let messageTimers = [null, null]; // Timers for [bottomText, topText]
let uiButtonsCollection = []; // To store buttons that need to be hidden/disabled on game over


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

    startScreenOverlay = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5)
        .setOrigin(0, 0)
        .setDepth(50);

    startScreenText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Click / Tap to Start', {
        fontSize: '32px', fill: '#FFFFFF', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(51);
}

export function destroyStartScreen() {
    if (startScreenText) startScreenText.destroy();
    if (startScreenOverlay) startScreenOverlay.destroy();
    startScreenText = null;
    startScreenOverlay = null;
}

export function createGameUI() {
    const scene = getScene();
    if (!scene) return;

    scoreText = scene.add.text(16, 16, 'Score: 0', { fontSize: '24px', fill: '#000000' });
    levelText = scene.add.text(16, 40, 'Level: 1', { fontSize: '20px', fill: '#000000' });

    // Initialize gameOverText and restartText (hidden by default)
    gameOverText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 'Game Over!', {
        fontSize: '48px', fill: '#FF0000', fontStyle: 'bold'
    }).setOrigin(0.5).setVisible(false).setDepth(201);
    restartText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, 'Click / Tap to Restart', {
        fontSize: '24px', fill: '#000000'
    }).setOrigin(0.5).setVisible(false).setDepth(201);
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
    if (disarmButtonIcon) {
        if (isEnabled && iconKey) {
            disarmButtonIcon.setTexture(iconKey).setAlpha(1);
            disarmButtonIcon.setInteractive({ useHandCursor: true });
        } else {
            disarmButtonIcon.setAlpha(0); // Icon transparent
            disarmButtonIcon.setInteractive(); // No hand cursor, but catches click
        }
    }
    if (disarmButtonBorder) {
        disarmButtonBorder.setAlpha(isEnabled ? 1 : 0.5);
        if (disarmButtonBorder.input) { // Ensure input is initialized
            disarmButtonBorder.input.cursor = isEnabled ? 'hand' : '';
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
        fontSize: '18px', fill: '#FFFFFF', fontStyle: 'bold',
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

export function showGameOverScreen() {
    if (gameOverText && restartText) {
        gameOverText.setVisible(true);
        sceneRef.children.bringToTop(gameOverText);
        restartText.setVisible(true);
        sceneRef.children.bringToTop(restartText);
    }
    clearAllMessages();
}

export function showWinScreen() {
    const scene = getScene();
    if (!scene) return;

    // Clear any active game messages first
    clearAllMessages();

    winTextInternal = scene.add.text(
        GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Felicitari, ai ajuns cu bine la vot!',
        { fontSize: '48px', fill: '#00AA00', fontStyle: 'bold' }
    ).setOrigin(0.5).setDepth(201);
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
    if (gameOverText) gameOverText.setVisible(false);
    if (restartText) restartText.setVisible(false);
    if (winTextInternal && winTextInternal.scene) {
        winTextInternal.destroy();
        winTextInternal = null;
    }
    
    clearAllMessages();

    // Reset button collection for the new game (they will be recreated)
    uiButtonsCollection = [];
    // Ensure disarm button elements are reset if they persist across scenes/restarts
    // (though they are typically recreated in startGame)
    if (disarmButtonIcon) {
        disarmButtonIcon.setAlpha(0);
        if (disarmButtonIcon.scene) { // Only call setInteractive if part of a scene
            disarmButtonIcon.setInteractive();
        }
    }
    if (disarmButtonBorder) disarmButtonBorder.setAlpha(0.5);
}
