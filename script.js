// --- GAME ENGINE & CONFIGURATION ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 450;
ctx.imageSmoothingEnabled = false;

// --- GAME STATE ---
const state = {
  // Survival Stats
  hunger: 100,
  energy: 100,
  hygiene: 100,
  
  // Time System (Each real second = 2 in-game minutes -> 20+ min total run)
  day: 1,
  hour: 8,
  minute: 0,
  timeDilated: false, // Option 1 ability
  
  // Debuffs & Story
  isDizzy: false,
  dizzyTimer: 0,
  naomiChallenged: false,
  inArcadeMinigame: false,
  activeMinigame: null, // 'flappy' or 'space'
  unlockedSecret: false,
  
  // Inventory (9 slots)
  inventory: Array(9).fill(null),
  selectedSlot: 0
};

// Item Database
const ITEMS = {
  ENERGY_DRINK: { id: 'ENERGY_DRINK', name: 'N40M1 Energy', type: 'energy', val: 40, color: '#ffff00' },
  PIZZA_SLICE:  { id: 'PIZZA_SLICE',  name: 'Arcade Pizza', type: 'hunger', val: 35, color: '#ff5500' },
  SOAP_BAR:     { id: 'SOAP_BAR',     name: 'Sanitizer',    type: 'hygiene', val: 50, color: '#00ccff' },
  TIME_CHIP:    { id: 'TIME_CHIP',    name: 'Option 1 Chip',type: 'special', val: 0,  color: '#ff00ff' }
};

// Default starter items
state.inventory[0] = ITEMS.PIZZA_SLICE;
state.inventory[1] = ITEMS.ENERGY_DRINK;

// Player Position & Logic
const player = {
  x: 380, y: 220, width: 24, height: 24, speed: 2.5,
  color: '#00ffcc'
};

// Arcade Machine Objects
const machines = [
  { id: 'flappy', x: 100, y: 100, width: 40, height: 50, label: 'FLAPPY CLERK', color: '#ff0055' },
  { id: 'space',  x: 200, y: 100, width: 40, height: 50, label: 'SPACE ESCAPE', color: '#33ff55' },
  { id: 'secret', x: 650, y: 100, width: 40, height: 50, label: 'D0N77RU57',   color: '#aa00ff' },
  { id: 'shop',   x: 380, y: 80,  width: 50, height: 40, label: 'N40M1 SHOP',  color: '#ffff00' },
  { id: 'bed',    x: 700, y: 350, width: 60, height: 40, label: 'REST BED',    color: '#0099ff' }
];

// --- INPUT HANDLING ---
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  
  // Hotbar Switching (1-9)
  if (e.key >= '1' && e.key <= '9') {
    state.selectedSlot = parseInt(e.key) - 1;
    updateHotbarUI();
  }
  
  // Use Item with 'E'
  if (e.key.toLowerCase() === 'e') {
    useSelectedItem();
  }
  
  // Interact with Spacebar
  if (e.key === ' ') {
    interactNearest();
  }
  
  // Option 1 Time Dilation Trigger (Key 'Q')
  if (e.key.toLowerCase() === 'q' && hasItem('TIME_CHIP')) {
    state.timeDilated = !state.timeDilated;
    showDialogue('OPTION 1', state.timeDilated ? "TIME DILATION ACTIVE (10% SPEED)" : "NORMAL TIME RESTORED");
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

// --- SURVIVAL & TIME ENGINE ---
setInterval(() => {
  if (state.inArcadeMinigame) return;

  // Time Progression (Slowed if Option 1 active)
  let timeStep = state.timeDilated ? 0.2 : 1;
  state.minute += timeStep;
  
  if (state.minute >= 60) {
    state.minute = 0;
    state.hour++;
    
    // Hourly Stat Decay
    state.hunger = Math.max(0, state.hunger - 4);
    state.energy = Math.max(0, state.energy - 3);
    state.hygiene = Math.max(0, state.hygiene - 2);

    if (state.hour >= 24) {
      state.hour = 0;
      state.day++;
    }
  }

  // 11:00 PM NAOMI NIGHTLY CHALLENGE TRIGGER (23:00)
  if (state.hour === 23 && state.minute === 0 && !state.naomiChallenged) {
    triggerNaomiChallenge();
  }

  // Dizzy Debuff Countdown
  if (state.isDizzy) {
    state.dizzyTimer--;
    if (state.dizzyTimer <= 0) {
      state.isDizzy = false;
      document.getElementById('dizzy-overlay').classList.add('hidden');
    }
  }

  updateHUD();
}, 500);

// --- NAOMI 11:00 PM CHALLENGE ---
function triggerNaomiChallenge() {
  state.naomiChallenged = true;
  showDialogue("N40M1", "IT IS 11:00 PM. YOU DID NOT SLEEP. BEAT MY HIGH SCORE OR PAY THE PENALTY!");
  
  setTimeout(() => {
    startMinigame('flappy', true); // Mandatory challenge
  }, 3000);
}

function resolveChallenge(won) {
  state.inArcadeMinigame = false;
  if (!won) {
    // Penalty: Lose 50% Hunger + Dizzy Debuff for 15s
    state.hunger = Math.max(0, Math.floor(state.hunger * 0.5));
    state.isDizzy = true;
    state.dizzyTimer = 30; // 30 half-seconds = 15s
    document.getElementById('dizzy-overlay').classList.remove('hidden');
    showDialogue("N40M1", "YOU LOST. 50% HUNGER DRAINED. ENJOY THE DIZZINESS.");
  } else {
    showDialogue("N40M1", "IMPRACTICAL... YOU SURVIVED THE NIGHT CHALLENGE.");
  }
}

// --- HOTBAR & INVENTORY ---
function updateHotbarUI() {
  const slots = document.querySelectorAll('.hotbar-slot');
  slots.forEach((slot, index) => {
    slot.classList.toggle('active', index === state.selectedSlot);
    const canvas = slot.querySelector('.item-icon');
    const ctxIcon = canvas.getContext('2d');
    ctxIcon.clearRect(0, 0, 24, 24);

    const item = state.inventory[index];
    if (item) {
      // Draw Mini Pixel Picture Icon
      ctxIcon.fillStyle = item.color;
      ctxIcon.fillRect(4, 4, 16, 16);
      ctxIcon.fillStyle = '#fff';
      ctxIcon.fillRect(8, 8, 8, 8);
    }
  });
}

function useSelectedItem() {
  const item = state.inventory[state.selectedSlot];
  if (!item) return;

  if (item.type === 'hunger') state.hunger = Math.min(100, state.hunger + item.val);
  if (item.type === 'energy') state.energy = Math.min(100, state.energy + item.val);
  if (item.type === 'hygiene') state.hygiene = Math.min(100, state.hygiene + item.val);

  if (item.type !== 'special') {
    state.inventory[state.selectedSlot] = null; // Consume item
    updateHotbarUI();
  }
}

function hasItem(id) {
  return state.inventory.some(item => item && item.id === id);
}

// --- MINIGAMES (FLAPPY & SPACE SHOOTER) ---
let miniScore = 0;
let isChallengeMode = false;

function startMinigame(type, challenge = false) {
  state.inArcadeMinigame = true;
  state.activeMinigame = type;
  isChallengeMode = challenge;
  miniScore = 0;
}

function runMinigameLogic() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#00ffcc';
  ctx.font = '20px Courier New';
  ctx.fillText(`ARCADE MACHINE: ${state.activeMinigame.toUpperCase()}`, 200, 50);
  ctx.fillText(`SCORE: ${miniScore} / ${isChallengeMode ? 10 : 5}`, 280, 200);
  ctx.fillText("PRESS [SPACE] TO SCORE | PRESS [X] TO EXIT", 150, 300);

  if (keys[' ']) {
    keys[' '] = false; // Debounce
    miniScore++;
    if (isChallengeMode && miniScore >= 10) {
      resolveChallenge(true);
    } else if (!isChallengeMode && miniScore >= 5) {
      state.inArcadeMinigame = false;
      showDialogue("ARCADE", "YOU WIN! +$15 CREDITS ADDED.");
    }
  }

  if (keys['x']) {
    if (isChallengeMode) resolveChallenge(false);
    else state.inArcadeMinigame = false;
  }
}

// --- INTERACTION & SHOP ---
function interactNearest() {
  machines.forEach(m => {
    let dist = Math.hypot((player.x + 12) - (m.x + m.width/2), (player.y + 12) - (m.y + m.height/2));
    if (dist < 50) {
      if (m.id === 'shop') openShop();
      if (m.id === 'bed') restBed();
      if (m.id === 'flappy' || m.id === 'space') startMinigame(m.id);
      if (m.id === 'secret') {
        showDialogue("TERMINAL", "DECODED FAZBEAR BINARY: 'DONTTRUSTNAOMI'. YOU HAVE BEEN TRAPPED FOR 10 YEARS!");
      }
    }
  });
}

function openShop() {
  // Buy Pizza if space exists
  let emptySlot = state.inventory.findIndex(i => i === null);
  if (emptySlot !== -1) {
    state.inventory[emptySlot] = ITEMS.PIZZA_SLICE;
    updateHotbarUI();
    showDialogue("N40M1", "PURCHASED ARCADE PIZZA. STORED IN HOTBAR.");
  } else {
    showDialogue("N40M1", "YOUR INVENTORY IS FULL!");
  }
}

function restBed() {
  if (state.hour >= 20 || state.hour < 6) {
    state.energy = 100;
    state.hour = 8; // Wake up at 8 AM
    state.day++;
    state.naomiChallenged = false;
    showDialogue("SYSTEM", "YOU SLEPT UNTIL 8:00 AM. ENERGY RESTORED.");
  } else {
    showDialogue("SYSTEM", "IT IS TOO EARLY TO SLEEP!");
  }
}

// --- MAIN RENDER & UPDATE ENGINE ---
function update() {
  if (state.inArcadeMinigame) return;

  // Movement Logic (Modified if dizzy)
  let speed = player.speed;
  if (state.isDizzy) speed *= 0.5; // Dizziness penalty slows controls

  let moveX = 0, moveY = 0;
  if (keys['w'] || keys['arrowup']) moveY -= speed;
  if (keys['s'] || keys['arrowdown']) moveY += speed;
  if (keys['a'] || keys['arrowleft']) moveX -= speed;
  if (keys['d'] || keys['arrowright']) moveX += speed;

  // Dizziness sway
  if (state.isDizzy) {
    moveX += Math.sin(Date.now() / 100) * 1.5;
  }

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x + moveX));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y + moveY));
}

function draw() {
  if (state.inArcadeMinigame) {
    runMinigameLogic();
    return;
  }

  // Clear Screen
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Arcade Room Floor Grid
  ctx.strokeStyle = '#181828';
  for (let x = 0; x < canvas.width; x += 32) ctx.strokeRect(x, 0, 32, canvas.height);

  // Draw Machines / Furniture
  machines.forEach(m => {
    ctx.fillStyle = m.color;
    ctx.fillRect(m.x, m.y, m.width, m.height);
    ctx.fillStyle = '#fff';
    ctx.font = '8px Courier New';
    ctx.fillText(m.label, m.x - 5, m.y - 5);
  });

  // Draw Player Sprite
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

function updateHUD() {
  const hStr = String(state.hour % 12 || 12).padStart(2, '0');
  const mStr = String(Math.floor(state.minute)).padStart(2, '0');
  const ampm = state.hour >= 12 ? 'PM' : 'AM';
  document.getElementById('clock-display').innerText = `${hStr}:${mStr} ${ampm} | DAY ${state.day}`;

  document.getElementById('hunger-bar').style.width = state.hunger + '%';
  document.getElementById('energy-bar').style.width = state.energy + '%';
  document.getElementById('hygiene-bar').style.width = state.hygiene + '%';
}

function showDialogue(speaker, text) {
  const box = document.getElementById('dialogue-box');
  document.getElementById('dialogue-name').innerText = speaker;
  document.getElementById('dialogue-text').innerText = text;
  box.classList.remove('hidden');

  setTimeout(() => box.classList.add('hidden'), 4000);
}

// Start Game Engine
updateHotbarUI();
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
