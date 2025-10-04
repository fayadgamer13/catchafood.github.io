// --- Game Configuration ---
const GAME_WIDTH = 600;
const GAME_HEIGHT = 800;
const PLAYER_SPEED = 15; // How many pixels the player moves per key press
const MAX_TIME = 120; // 2 minutes in seconds
const FRAME_RATE = 1000 / 60; // Game loop runs at 60 FPS

const FOOD_TYPES = [
    'food1.png',
    'food2.png',
    'food3.png',
    'food4.png'
];

const FRAME_IMAGES = [
    'player_frame1.png',
    'player_frame2.png',
    'player_frame3.png',
    'player_frame4.png',
    'player_frame5.png'
];
const FRAME_SPEED = 11; // Player frames change every 11 game ticks

// --- Game State Variables ---
let gameState = 'ready'; // 'ready', 'playing', 'paused', 'over', 'won'
let score = 0;
let timeLeft = MAX_TIME;
let playerPositionX = GAME_WIDTH / 2;
let playerWidth = 80;
let playerHeight = 100;
let itemFallSpeed = 3;
let itemSpawnInterval = 1000; // Spawn new item every 1000ms

let gameLoopInterval;
let timerInterval;
let itemSpawnTimeout;
let frameCounter = 0;
let currentFrameIndex = 0;
let itemsOnScreen = [];
let foodsCollected = 0;
let totalFoodsToCollect = 10; // The goal to win

// --- DOM Elements ---
const gameContainer = document.getElementById('game-container');
const gameScreen = document.getElementById('game-screen');
const playerElement = document.getElementById('player');
const scoreDisplay = document.getElementById('score');
const timerText = document.getElementById('timer-text');
const overlay = document.getElementById('overlay');
const gameMessage = document.getElementById('game-message');
const subMessage = document.getElementById('sub-message');
const playButton = document.getElementById('play-button');
const tryAgainButton = document.getElementById('tryagain-button');
const pauseButton = document.getElementById('pause-button');

// --- Audio Elements (Pre-load sounds) ---
const audioPop = new Audio('assets/audio/pop.mp3');
const audioBomb = new Audio('assets/audio/bomb.mp3');
const audioWinner = new Audio('assets/audio/winner.mp3');
const audioLost = new Audio('assets/audio/lost.mp3');

// --- Utility Functions ---

/** Generates a random integer between min (inclusive) and max (inclusive) */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Handles collision detection between two rectangles (A and B) */
function checkCollision(A, B) {
    return A.x < B.x + B.width &&
           A.x + A.width > B.x &&
           A.y < B.y + B.height &&
           A.y + A.height > B.y;
}

// --- Player Movement and Animation ---

/** Updates the player's visual position */
function updatePlayerPosition() {
    // Keep player within horizontal bounds
    playerPositionX = Math.max(0, Math.min(GAME_WIDTH - playerWidth, playerPositionX));
    playerElement.style.left = playerPositionX + 'px';
}

/** Handles player frame animation */
function animatePlayer() {
    frameCounter++;
    if (frameCounter >= FRAME_SPEED) {
        currentFrameIndex = (currentFrameIndex + 1) % FRAME_IMAGES.length;
        playerElement.style.backgroundImage = `url(assets/images/${FRAME_IMAGES[currentFrameIndex]})`;
        frameCounter = 0;
    }
}

// --- Item Spawning and Management ---

/** Creates and adds a falling item to the game */
function spawnItem() {
    if (gameState !== 'playing') return;

    const type = getRandomInt(1, 100);
    let itemData;
    let className;

    if (type <= 60) { // 60% Food
        className = 'food';
        const foodImage = FOOD_TYPES[getRandomInt(0, FOOD_TYPES.length - 1)];
        itemData = {
            type: 'food',
            value: 1,
            image: foodImage,
        };
    } else if (type <= 85) { // 25% Coin
        className = 'coin';
        itemData = {
            type: 'coin',
            value: 5,
            image: 'coin.png',
        };
    } else { // 15% Bomb
        className = 'bomb';
        itemData = {
            type: 'bomb',
            value: 0,
            image: 'bomb.png',
        };
    }

    const itemElement = document.createElement('div');
    itemElement.classList.add('item', className);
    itemElement.style.backgroundImage = `url(assets/images/${itemData.image})`;
    
    // Random horizontal position, keeping within bounds
    const itemWidth = 50;
    const randomX = getRandomInt(0, GAME_WIDTH - itemWidth);
    itemElement.style.left = randomX + 'px';

    const item = {
        element: itemElement,
        type: itemData.type,
        value: itemData.value,
        x: randomX,
        y: -50,
        width: itemWidth,
        height: 50
    };
    
    itemsOnScreen.push(item);
    gameScreen.appendChild(itemElement);

    // Schedule the next spawn
    itemSpawnTimeout = setTimeout(spawnItem, itemSpawnInterval);
}

/** Updates the position of all falling items and checks for collisions */
function updateItems() {
    const playerRect = {
        x: playerPositionX,
        y: GAME_HEIGHT - 50 - playerHeight, // Player's Y is relative to the bottom
        width: playerWidth,
        height: playerHeight
    };

    itemsOnScreen = itemsOnScreen.filter(item => {
        item.y += itemFallSpeed;
        item.element.style.top = item.y + 'px';

        const itemRect = {
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height
        };

        // 1. Collision Check (Item touches Player)
        if (checkCollision(playerRect, itemRect)) {
            item.element.remove();
            handleItemCollision(item.type, item.value);
            return false; // Remove item from list
        }

        // 2. Out of Bounds Check (Item missed and hit the floor)
        if (item.y > GAME_HEIGHT - 50) { // 50 is the floor height
            item.element.remove();
            return false; // Remove item from list
        }

        return true; // Keep item in list
    });
}

/** Handles the effect of collecting or hitting an item */
function handleItemCollision(type, value) {
    if (type === 'bomb') {
        audioBomb.play();
        gameOver(false); // Player lost by hitting a bomb
    } else {
        // Food or Coin: Plays the pop sound
        audioPop.currentTime = 0; // Rewind to play immediately
        audioPop.play();

        if (type === 'coin') {
            score += value;
            // Display a quick "Coin Earned!" message (optional, but good feedback)
            showFeedbackMessage(`+${value} Coin!`, playerPositionX + playerWidth/2);
        } else if (type === 'food') {
            foodsCollected++;
            if (foodsCollected >= totalFoodsToCollect) {
                gameOver(true); // Win by collecting all food
            }
        }
        scoreDisplay.textContent = score;
    }
}

/** Displays a temporary message above the player for feedback */
function showFeedbackMessage(message, x) {
    const feedback = document.createElement('div');
    feedback.textContent = message;
    feedback.style.position = 'absolute';
    feedback.style.left = x + 'px';
    feedback.style.bottom = '150px';
    feedback.style.color = '#f1c40f'; // Gold/Yellow
    feedback.style.fontWeight = 'bold';
    feedback.style.fontSize = '1.2em';
    feedback.style.zIndex = '30';
    feedback.style.pointerEvents = 'none'; // Don't block clicks
    feedback.style.transition = 'bottom 1s ease-out, opacity 1s ease-out';
    feedback.style.opacity = '1';

    gameScreen.appendChild(feedback);

    // Animate the message up and fade it out
    setTimeout(() => {
        feedback.style.bottom = '200px';
        feedback.style.opacity = '0';
    }, 50);

    // Remove the element after the animation
    setTimeout(() => {
        feedback.remove();
    }, 1050);
}

// --- Game Loop and Timer ---

/** The main function that runs every frame (60 times per second) */
function gameLoop() {
    if (gameState !== 'playing') return;

    animatePlayer();
    updateItems();
}

/** Updates the timer display */
function updateTimer() {
    if (gameState !== 'playing') return;

    timeLeft--;
    
    // Format minutes and seconds
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    if (timeLeft <= 0) {
        // Time ran out. Win if no bomb was hit (game state would still be 'playing')
        gameOver(true); 
    }
}

// --- Game State Functions ---

function startGame() {
    // Reset state
    gameState = 'playing';
    score = 0;
    foodsCollected = 0;
    timeLeft = MAX_TIME;
    itemsOnScreen.forEach(item => item.element.remove());
    itemsOnScreen = [];

    scoreDisplay.textContent = score;
    updateTimer();
    overlay.classList.add('hidden');
    
    // Start main intervals
    gameLoopInterval = setInterval(gameLoop, FRAME_RATE);
    timerInterval = setInterval(updateTimer, 1000);
    itemSpawnTimeout = setTimeout(spawnItem, itemSpawnInterval);
}

function pauseGame() {
    if (gameState !== 'playing') return;
    gameState = 'paused';

    clearInterval(gameLoopInterval);
    clearInterval(timerInterval);
    clearTimeout(itemSpawnTimeout);

    // Show pause overlay
    gameMessage.innerHTML = '<h1>PAUSED</h1>';
    subMessage.textContent = 'Take a breath.';
    playButton.setAttribute('data-action', 'continue');
    // Change play button image to a generic continue/play image if desired, but using play_button.png for simplicity
    tryAgainButton.style.display = 'block'; 
    overlay.classList.remove('hidden');
}

function continueGame() {
    if (gameState !== 'paused') return;
    gameState = 'playing';

    overlay.classList.add('hidden');
    // Restart intervals
    gameLoopInterval = setInterval(gameLoop, FRAME_RATE);
    timerInterval = setInterval(updateTimer, 1000);
    itemSpawnTimeout = setTimeout(spawnItem, itemSpawnInterval);
}

function gameOver(didWin) {
    gameState = didWin ? 'won' : 'over';

    clearInterval(gameLoopInterval);
    clearInterval(timerInterval);
    clearTimeout(itemSpawnTimeout);

    // Determine message and sound
    let title, message;
    if (didWin) {
        audioWinner.play();
        title = 'YOU WIN!';
        message = `You collected all ${totalFoodsToCollect} foods! Your Score: ${score}`;
    } else {
        audioLost.play();
        title = 'GAME OVER';
        message = `You hit a BOMB! Final Score: ${score}`;
    }

    // Show game over overlay
    gameMessage.innerHTML = `<h1>${title}</h1>`;
    subMessage.textContent = message;
    playButton.style.display = 'none'; // Hide the play button
    tryAgainButton.style.display = 'block'; // Show the try again button
    overlay.classList.remove('hidden');
}

// --- Event Listeners ---

// Handle Overlay Buttons
document.getElementById('overlay-buttons').addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;

    const action = target.getAttribute('data-action');
    if (action === 'start' || action === 'continue') {
        startGame(); // Start and Continue both use the same logic for this simple game
    } else if (action === 'tryagain') {
        startGame(); 
    }
    // Update button visibility for next state
    if (action === 'start' || action === 'tryagain') {
        playButton.style.display = 'block';
        playButton.setAttribute('data-action', 'start');
        tryAgainButton.style.display = 'none';
        subMessage.textContent = 'Press PLAY to start.';
    }
});

// Handle Pause Button
pauseButton.addEventListener('click', pauseGame);

// Handle Keyboard Input for Player Movement
document.addEventListener('keydown', (e) => {
    if (gameState !== 'playing') return;

    let moved = false;
    // Left Key (ArrowLeft or A)
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        playerPositionX -= PLAYER_SPEED;
        moved = true;
    }
    // Right Key (ArrowRight or D)
    else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        playerPositionX += PLAYER_SPEED;
        moved = true;
    }
    // Down Key (ArrowDown or S) -> Center Player
    else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        playerPositionX = (GAME_WIDTH / 2) - (playerWidth / 2);
        moved = true;
    }
    // P key for Pause
    else if (e.key.toLowerCase() === 'p') {
        pauseGame();
    }

    if (moved) {
        updatePlayerPosition();
    }
});

// Initial Setup
updatePlayerPosition();
