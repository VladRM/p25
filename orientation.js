(function() {
    const orientationMessage = document.getElementById('orientation-message');

    function checkOrientationAndScroll() {
        const gameCanvas = document.querySelector('canvas');
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);

        if (isMobile) {
            // Using screen.orientation for modern browsers, fallback to window.matchMedia
            const isPortrait = screen.orientation ? screen.orientation.type.includes('portrait') : window.matchMedia("(orientation: portrait)").matches;

            if (isPortrait) {
                orientationMessage.style.display = 'flex';
                if (gameCanvas) {
                    gameCanvas.style.display = 'none'; // Hide canvas if in portrait
                }
            } else { // Landscape
                orientationMessage.style.display = 'none';
                if (gameCanvas) {
                    gameCanvas.style.display = 'block'; // Ensure canvas is visible
                    // Scroll the canvas into view
                    gameCanvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        } else { // Not mobile
            orientationMessage.style.display = 'none';
            if (gameCanvas) {
                gameCanvas.style.display = 'block'; // Ensure canvas is visible
            }
        }
    }

    // Listen for orientation changes
    if (screen.orientation) {
        screen.orientation.addEventListener('change', checkOrientationAndScroll);
    } else {
        window.addEventListener('orientationchange', checkOrientationAndScroll);
    }
    
    // Also check on resize as a fallback for some devices/browsers
    window.addEventListener('resize', checkOrientationAndScroll);
    
    // Initial check when the page loads
    // window.onload ensures that main.js (and thus the canvas) should be loaded
    window.addEventListener('load', checkOrientationAndScroll);
    
    // Fallback for initial display of message if canvas isn't ready yet on 'load' for some reason
    // This will show the message quickly if portrait, then 'load' will refine
    document.addEventListener('DOMContentLoaded', function() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
        if (isMobile) {
            const isPortrait = screen.orientation ? screen.orientation.type.includes('portrait') : window.matchMedia("(orientation: portrait)").matches;
            if (isPortrait) {
                orientationMessage.style.display = 'flex';
            }
        }
    });
})();
