// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const healthVal = document.getElementById('health-val');
const scoreVal = document.getElementById('score-val');

// Game State & Stats
const gameState = {
  health: 100,
  score: 0,
  running: true
};

// Player Object
const player = {
  x: 100,
  y: 100,
  width: 32,
  height: 32,
  speed: 4,
  color: '#00ffcc'
};

// Input Handling
const keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

// Resize Canvas to Screen
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Game Logic Updates
function update() {
  if (!gameState.running) return;

  // Player Movement (WASD / Arrows)
  if (keys['w'] || keys['arrowup']) player.y -= player.speed;
  if (keys['s'] || keys['arrowdown']) player.y += player.speed;
  if (keys['a'] || keys['arrowleft']) player.x -= player.speed;
  if (keys['d'] || keys['arrowright']) player.x += player.speed;

  // Keep player inside canvas boundary
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

// Rendering
function render() {
  // Clear screen
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

// Main Loop
function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// Start Game Loop
gameLoop();
