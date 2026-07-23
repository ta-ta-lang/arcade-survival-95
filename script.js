// --- GAME ENGINE & STATE ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const miniCanvas = document.getElementById('minigameCanvas');
const miniCtx = miniCanvas.getContext('2d');

// Game State
const state = {
  day: 1,
  tokens: 1000,
  credits: 0,
  timeDilation: false,
  discoveredFFB: false,
  unlockedCabinet: false,
  naomiChallenged: false,
  inDialogue: false,
  activeMinigame: null,
  gameWon: false
};

// Player Object
const player = {
  x: 400,
  y: 500,
  size: 20,
  speed: 4,
  dx: 0,
  dy: 0,
  color: '#50fa7b'
};

// Input Handling
const keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'Escape' && state.activeMinigame) {
    closeMinigame();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

// HUD Elements
const hudDay = document.getElementById('hud-day');
const hudTokens = document.getElementById('hud-tokens');
const hudCredits = document.getElementById('hud-credits');
const hudTime = document.getElementById('hud-time');

function updateHUD() {
  hudDay.innerText = state.day;
  hudTokens.innerText = state.tokens;
  hudCredits.innerText = state.credits;
  hudTime.innerText = state.timeDilation ? "ON (10% Speed)" : "OFF";
}

// --- WORLD MAP OBJECTS & INTERACTABLES ---
const interactables = [
  { id: 'skeeball', x: 100, y: 120, width: 60, height: 60, color: '#ffb86c', name: 'Skee-Ball Arcade' },
  { id: 'flappy', x: 220, y: 120, width: 60, height: 60, color: '#bd93f9', name: 'Flappy Bird Arcade' },
  { id: 'invaders', x: 340, y: 120, width: 60, height: 60, color: '#ff79c6', name: 'Space Defender Arcade' },
  { id: 'scoreboard', x: 500, y: 120, width: 80, height: 40, color: '#ff5555', name: 'Global Scoreboard' },
  { id: 'naomi', x: 680, y: 250, width: 70, height: 80, color: '#8be9fd', name: 'N40M1 Exchange Counter' },
  { id: 'secretCabinet', x: 100, y: 460, width: 60, height: 60, color: '#44475a', name: 'Dark Black Cabinet' },
  { id: 'bed', x: 700, y: 460, width: 70, height: 90, color: '#f1fa8c', name: 'Rest Area / Bed' }
];

// --- DIALOGUE SYSTEM ---
const dialogueBox = document.getElementById('dialogue-box');
const dialogueTitle = document.getElementById('dialogue-title');
const dialogueText = document.getElementById('dialogue-text');
const dialogueOptions = document.getElementById('dialogue-options');

function showDialogue(title, text, options = []) {
  state.inDialogue = true;
  dialogueTitle.innerText = title;
  dialogueText.innerText = text;
  dialogueOptions.innerHTML = '';

  if (options.length === 0) {
    options.push({ text: "Close (E / Space)", action: closeDialogue });
  }

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'dialogue-btn';
    btn.innerText = opt.text;
    btn.onclick = () => {
      opt.action();
    };
    dialogueOptions.appendChild(btn);
  });

  dialogueBox.classList.remove('hidden');
}

function closeDialogue() {
  dialogueBox.classList.add('hidden');
  state.inDialogue = false;
}

// --- MINIGAME OVERLAY SYSTEM ---
const minigameOverlay = document.getElementById('minigame-overlay');
const minigameTitle = document.getElementById('minigame-title');
document.getElementById('minigame-close').onclick = closeMinigame;

function startMinigame(type) {
  state.activeMinigame = type;
  minigameOverlay.classList.remove('hidden');
  state.inDialogue = true;

  if (type === 'flappy') initFlappyGame();
  if (type === 'invaders') initInvadersGame();
  if (type === 'boss') initBossBattle();
}

function closeMinigame() {
  state.activeMinigame = null;
  minigameOverlay.classList.add('hidden');
  state.inDialogue = false;
}

// --- INTERACTION LOGIC ---
function checkInteractions() {
  if (state.inDialogue || state.activeMinigame) return;

  let nearObject = null;
  interactables.forEach(obj => {
    const dist = Math.hypot((player.x + player.size/2) - (obj.x + obj.width/2), (player.y + player.size/2) - (obj.y + obj.height/2));
    if (dist < 55) {
      nearObject = obj;
    }
  });

  if (nearObject && (keys['e'] || keys[' '])) {
    keys['e'] = false;
    keys[' '] = false;

    // Route Interaction
    if (nearObject.id === 'skeeball') {
      if (state.tokens >= 10) {
        state.tokens -= 10;
        state.credits += 50;
        updateHUD();
        showDialogue("SKEE-BALL", "You roll a near-perfect streak!\n\n+50 Credits earned! (-10 Tokens)");
      } else {
        showDialogue("SKEE-BALL", "You don't have enough tokens left today!");
      }
    }

    else if (nearObject.id === 'flappy') {
      if (state.tokens >= 50) {
        state.tokens -= 50;
        updateHUD();
        minigameTitle.innerText = "FLAPPY BIRD ARCADE";
        startMinigame('flappy');
      } else {
        showDialogue("FLAPPY BIRD", "Requires 50 Tokens to play!");
      }
    }

    else if (nearObject.id === 'invaders') {
      if (state.tokens >= 50) {
        state.tokens -= 50;
        updateHUD();
        minigameTitle.innerText = "SPACE DEFENDER ARCADE";
        startMinigame('invaders');
      } else {
        showDialogue("SPACE DEFENDER", "Requires 50 Tokens to play!");
      }
    }

    else if (nearObject.id === 'scoreboard') {
      if (state.day >= 60 && !state.discoveredFFB) {
        state.discoveredFFB = true;
        showDialogue(
          "SCOREBOARD INVESTIGATION",
          "You inspect 14 game scoreboards closely.\nSpot #2 on all 14 boards is held by initials 'FFB'.\nThe scores are binary codes: 1, 10, 110, 1000, 1010...\n\nDecoding the binary order spells out:\nDONTTRUSTNAOMI!"
        );
      } else if (state.discoveredFFB) {
        showDialogue("SCOREBOARD", "The binary message reads: DONTTRUSTNAOMI.");
      } else {
        showDialogue("SCOREBOARD", "High Score #1: MASTER_X\nHigh Score #2: FFB - 10101\nHigh Score #3: ACE");
      }
    }

    else if (nearObject.id === 'naomi') {
      if (!state.unlockedCabinet) {
        showDialogue("N40M1 EXCHANGE COUNTER", "'Greetings challenger. Trade credits for survival.'", [
          {
            text: "Buy Meal Ticket (200 Credits)",
            action: () => {
              if (state.credits >= 200) {
                state.credits -= 200;
                updateHUD();
                showDialogue("N40M1", "Meal purchased! You eat well.");
              } else {
                showDialogue("N40M1", "Insufficient credits!");
              }
            }
          }
        ]);
      } else {
        // Boss Battle Trigger
        showDialogue("N40M1 CONFRONTATION", "You step up to N40M1: 'We know the truth, N40M1! We challenge you to beat us at every game in this arcade!'", [
          {
            text: "Begin Final Showdown!",
            action: () => {
              closeDialogue();
              minigameTitle.innerText = "FINAL BOSS: N40M1 ARCADE SHOWDOWN";
              startMinigame('boss');
            }
          }
        ]);
      }
    }

    else if (nearObject.id === 'secretCabinet') {
      if (!state.unlockedCabinet) {
        if (state.discoveredFFB) {
          showDialogue("MYSTERIOUS CABINET", "The screen asks for a 14-digit override code.", [
            {
              text: "Enter: DONTTRUSTNAOMI",
              action: () => {
                state.unlockedCabinet = true;
                state.timeDilation = true;
                updateHUD();
                showDialogue(
                  "TERMINAL UNLOCKED (FFB)",
                  "Screen flashes: 'I am FFB (Freddy Fazbear). You have been trapped here for OVER 10 YEARS due to N40M1's time dilation. The arcade machines hold trapped human souls.\n\nI have unlocked TIME DILATION (10% Speed Ability) for you! Go challenge N40M1 at the counter!'"
                );
              }
            }
          ]);
        } else {
          showDialogue("MYSTERIOUS CABINET", "A dark, unbranded cabinet. Requires a 14-digit override password...");
        }
      } else {
        showDialogue("MYSTERIOUS CABINET", "Terminal active. Time Dilation Ability Enabled. Go defeat N40M1!");
      }
    }

    else if (nearObject.id === 'bed') {
      showDialogue("BEDROOM AREA", "Rest up and skip 30 days ahead?", [
        {
          text: "Sleep (+30 Days)",
          action: () => {
            state.day += 30;
            state.tokens = 1000;
            updateHUD();
            closeDialogue();
            if (state.day >= 60 && !state.discoveredFFB) {
              showDialogue("TIME PASSES...", "Months pass. You begin noticing strange initials on the high scoreboards...");
            }
          }
        }
      ]);
    }
  }
}

// --- MAIN LOOP & RENDERING ---
function update() {
  if (!state.inDialogue && !state.activeMinigame) {
    player.dx = 0;
    player.dy = 0;

    if (keys['w'] || keys['arrowup']) player.dy = -player.speed;
    if (keys['s'] || keys['arrowdown']) player.dy = player.speed;
    if (keys['a'] || keys['arrowleft']) player.dx = -player.speed;
    if (keys['d'] || keys['arrowright']) player.dx = player.speed;

    player.x += player.dx;
    player.y += player.dy;

    // Map Boundaries
    player.x = Math.max(20, Math.min(760, player.x));
    player.y = Math.max(20, Math.min(560, player.y));

    checkInteractions();
  }
}

function draw() {
  // Clear Main Canvas
  ctx.fillStyle = '#0d0f12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Floor Tile Grid
  ctx.strokeStyle = '#161b22';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Draw Interactable Objects
  interactables.forEach(obj => {
    ctx.fillStyle = obj.color;
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    
    // Label text above object
    ctx.fillStyle = '#e6edf3';
    ctx.font = '11px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(obj.name, obj.x + obj.width / 2, obj.y - 8);
  });

  // Draw Player
  ctx.fillStyle = player.color;
  ctx.shadowColor = '#50fa7b';
  ctx.shadowBlur = 10;
  ctx.fillRect(player.x, player.y, player.size, player.size);
  ctx.shadowBlur = 0; // Reset shadow

  // Floating Interact Hint
  interactables.forEach(obj => {
    const dist = Math.hypot((player.x + player.size/2) - (obj.x + obj.width/2), (player.y + player.size/2) - (obj.y + obj.height/2));
    if (dist < 55) {
      ctx.fillStyle = '#ff79c6';
      ctx.font = 'bold 12px Courier New';
      ctx.fillText('[E] INTERACT', obj.x + obj.width / 2, obj.y + obj.height + 18);
    }
  });
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// --- MINIGAME 1: FLAPPY BIRD ARCADE ---
let flappyY, flappyVelocity, pipes, flappyScore;

function initFlappyGame() {
  flappyY = 200;
  flappyVelocity = 0;
  pipes = [];
  flappyScore = 0;
  loopFlappy();
}

function loopFlappy() {
  if (state.activeMinigame !== 'flappy') return;

  // Apply Time Dilation if active
  const gravity = state.timeDilation ? 0.08 : 0.4;
  const jumpSpeed = state.timeDilation ? -3 : -7;

  flappyVelocity += gravity;
  flappyY += flappyVelocity;

  if (keys[' '] || keys['arrowup']) {
    keys[' '] = false;
    keys['arrowup'] = false;
    flappyVelocity = jumpSpeed;
  }

  // Spawn Pipes
  if (Math.random() < 0.02) {
    const gap = 120;
    const topHeight = Math.random() * 200 + 30;
    pipes.push({ x: 600, top: topHeight, bottom: topHeight + gap, passed: false });
  }

  // Clear & Draw
  miniCtx.fillStyle = '#05070a';
  miniCtx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);

  // Draw Bird
  miniCtx.fillStyle = '#f1fa8c';
  miniCtx.fillRect(100, flappyY, 20, 20);

  // Move & Draw Pipes
  miniCtx.fillStyle = '#50fa7b';
  pipes.forEach((p, idx) => {
    p.x -= 2;
    miniCtx.fillRect(p.x, 0, 40, p.top);
    miniCtx.fillRect(p.x, p.bottom, 40, miniCanvas.height - p.bottom);

    if (!p.passed && p.x < 100) {
      p.passed = true;
      flappyScore += 100;
    }

    // Collision Check
    if (p.x < 120 && p.x + 40 > 100) {
      if (flappyY < p.top || flappyY + 20 > p.bottom) {
        // Game Over
        state.credits += flappyScore;
        updateHUD();
        alert(`Game Over! Earned ${flappyScore} Credits.`);
        closeMinigame();
        return;
      }
    }
  });

  // Clean old pipes
  pipes = pipes.filter(p => p.x > -50);

  // Score HUD
  miniCtx.fillStyle = '#fff';
  miniCtx.font = '16px Courier New';
  miniCtx.fillText(`Score: ${flappyScore}`, 20, 30);

  requestAnimationFrame(loopFlappy);
}

// --- MINIGAME 2: SPACE DEFENDER ---
let shipX, bullets, aliens, invaderScore;

function initInvadersGame() {
  shipX = 280;
  bullets = [];
  aliens = [];
  invaderScore = 0;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      aliens.push({ x: 80 + c * 60, y: 40 + r * 40, alive: true });
    }
  }

  loopInvaders();
}

function loopInvaders() {
  if (state.activeMinigame !== 'invaders') return;

  const moveSpeed = state.timeDilation ? 8 : 5;

  if (keys['a'] || keys['arrowleft']) shipX -= moveSpeed;
  if (keys['d'] || keys['arrowright']) shipX += moveSpeed;
  shipX = Math.max(10, Math.min(570, shipX));

  if (keys[' '] || keys['arrowup']) {
    keys[' '] = false;
    keys['arrowup'] = false;
    bullets.push({ x: shipX + 10, y: 350 });
  }

  // Clear
  miniCtx.fillStyle = '#05070a';
  miniCtx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);

  // Draw Ship
  miniCtx.fillStyle = '#8be9fd';
  miniCtx.fillRect(shipX, 360, 20, 20);

  // Bullets
  miniCtx.fillStyle = '#ff79c6';
  bullets.forEach(b => {
    b.y -= 7;
    miniCtx.fillRect(b.x, b.y, 4, 10);
  });

  // Aliens
  let remaining = 0;
  aliens.forEach(a => {
    if (a.alive) {
      remaining++;
      miniCtx.fillStyle = '#ff5555';
      miniCtx.fillRect(a.x, a.y, 30, 20);

      // Bullet collision
      bullets.forEach(b => {
        if (b.x > a.x && b.x < a.x + 30 && b.y > a.y && b.y < a.y + 20) {
          a.alive = false;
          invaderScore += 150;
        }
      });
    }
  });

  if (remaining === 0) {
    state.credits += invaderScore;
    updateHUD();
    alert(`Stage Cleared! Earned ${invaderScore} Credits.`);
    closeMinigame();
    return;
  }

  requestAnimationFrame(loopInvaders);
}

// --- MINIGAME 3: FINAL BOSS BATTLE VS N40M1 ---
let bossHealth = 100;
let playerHealth = 100;

function initBossBattle() {
  bossHealth = 100;
  playerHealth = 100;
  loopBoss();
}

function loopBoss() {
  if (state.activeMinigame !== 'boss') return;

  miniCtx.fillStyle = '#05070a';
  miniCtx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);

  // Draw N40M1
  miniCtx.fillStyle = '#ff5555';
  miniCtx.fillRect(250, 50, 100, 100);
  miniCtx.fillStyle = '#fff';
  miniCtx.font = '14px Courier New';
  miniCtx.fillText("N40M1 CORE", 260, 100);

  // Health Bars
  miniCtx.fillStyle = '#ff5555';
  miniCtx.fillRect(50, 20, bossHealth * 5, 15);
  miniCtx.fillStyle = '#50fa7b';
  miniCtx.fillRect(50, 360, playerHealth * 5, 15);

  miniCtx.fillStyle = '#fff';
  miniCtx.fillText(`N40M1: ${bossHealth}%`, 50, 15);
  miniCtx.fillText(`YOU: ${playerHealth}%`, 50, 355);

  // Instruction Prompt
  miniCtx.fillStyle = '#8be9fd';
  miniCtx.fillText("PRESS [SPACEBAR] TO HIT WITH 10% TIME DILATION!", 100, 220);

  if (keys[' ']) {
    keys[' '] = false;
    // With time dilation active, player crushes N40M1
    const damage = state.timeDilation ? 25 : 5;
    bossHealth -= damage;
    playerHealth -= 2;

    if (bossHealth <= 0) {
      closeMinigame();
      showDialogue(
        "VICTORY!",
        "With Time Dilation active, your precision overwhelms N40M1!\n\nN40M1 SHUDDERS AND EXPLODES!\n\nThe arcade machines transform back into thousands of human souls. Freddy Fazbear (FFB) waves goodbye as everyone vanishes home.\n\nThe doors open—exactly 1 real-world year has passed. You claim your $1 Billion!"
      );
      return;
    }
  }

  requestAnimationFrame(loopBoss);
}

// Launch Game Loop
updateHUD();
gameLoop();
