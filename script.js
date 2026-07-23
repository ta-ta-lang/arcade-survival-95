// ==========================================
// 1. PLAYER STATS & SURVIVAL ENGINE
// ==========================================
const playerStats = {
    hunger: 100, maxHunger: 100,
    energy: 100, maxEnergy: 100,
    hygiene: 100, maxHygiene: 100,
    dailyTokens: 1000, credits: 0,
    hotbar: new Array(9).fill(null),
    selectedSlot: 0,
    hasBedPlaced: false,

    decay() {
        this.hunger = Math.max(0, this.hunger - 0.5);
        const energyLoss = this.hygiene < 20 ? 1.0 : 0.5;
        this.energy = Math.max(0, this.energy - energyLoss);
        this.hygiene = Math.max(0, this.hygiene - 0.3);
        this.updateUI();
    },

    sleep() {
        if (!this.hasBedPlaced) {
            showNotification("Buy and place a bed first!");
            return;
        }
        this.energy = this.maxEnergy;
        this.dailyTokens = 1000;
        resetMachinePlayLimits();
        this.updateUI();
        showNotification("Day reset! Energy & Tokens fully restored.");
    },

    updateUI() {
        const hungerBar = document.getElementById('hunger-bar');
        const energyBar = document.getElementById('energy-bar');
        const hygieneBar = document.getElementById('hygiene-bar');
        const tokenDisplay = document.getElementById('token-display');
        const creditDisplay = document.getElementById('credit-display');

        if (hungerBar) hungerBar.style.width = `${this.hunger}%`;
        if (energyBar) energyBar.style.width = `${this.energy}%`;
        if (hygieneBar) hygieneBar.style.width = `${this.hygiene}%`;
        if (tokenDisplay) tokenDisplay.innerText = this.dailyTokens;
        if (creditDisplay) creditDisplay.innerText = this.credits;

        this.renderHotbarUI();
    },

    renderHotbarUI() {
        for (let i = 0; i < 9; i++) {
            const slotElement = document.getElementById(`hotbar-slot-${i + 1}`);
            if (!slotElement) continue;

            const item = this.hotbar[i];
            if (i === this.selectedSlot) slotElement.classList.add('selected');
            else slotElement.classList.remove('selected');

            if (item) {
                slotElement.innerHTML = `<span class="slot-num">${i + 1}</span><img src="${item.icon}" alt="${item.name}" class="item-icon">`;
            } else {
                slotElement.innerHTML = `<span class="slot-num">${i + 1}</span>`;
            }
        }
    }
};

setInterval(() => { playerStats.decay(); }, 2000);

// ==========================================
// 2. NOTIFICATIONS & HOTBAR SELECTION
// ==========================================
function showNotification(message, duration = 2500) {
    let notifyBox = document.getElementById('center-notification');
    if (!notifyBox) return;
    notifyBox.innerText = message;
    notifyBox.classList.add('show');
    setTimeout(() => { notifyBox.classList.remove('show'); }, duration);
}

window.addEventListener('keydown', (e) => {
    const keyNum = parseInt(e.key);
    if (keyNum >= 1 && keyNum <= 9) selectHotbarSlot(keyNum - 1);
    if (e.key.toLowerCase() === 'e') checkWorldInteraction();
});

function selectHotbarSlot(slotIndex) {
    playerStats.selectedSlot = slotIndex;
    playerStats.updateUI();
    const currentItem = playerStats.hotbar[slotIndex];
    if (currentItem) showNotification(`Selected: ${currentItem.name}`);
}

function useHeldItem() {
    const index = playerStats.selectedSlot;
    const item = playerStats.hotbar[index];
    if (!item) { showNotification("Nothing selected in hotbar!"); return; }

    if (item.type === "food") {
        playerStats.hunger = Math.min(playerStats.maxHunger, playerStats.hunger + item.val);
        showNotification(`Ate ${item.name}! +${item.val} Hunger.`);
        playerStats.hotbar[index] = null;
    } else if (item.type === "hygiene") {
        playerStats.hygiene = playerStats.maxHygiene;
        showNotification(`Used ${item.name}! Hygiene restored.`);
        playerStats.hotbar[index] = null;
    } else if (item.type === "bed") {
        if (playerStats.hasBedPlaced) { showNotification("Bed is already placed!"); return; }
        playerStats.hasBedPlaced = true;
        showNotification("Bed placed! Walk over and press E to sleep.");
        playerStats.hotbar[index] = null;
    }
    playerStats.updateUI();
}

// ==========================================
// 3. SHOP & MACHINE INTERACTIONS
// ==========================================
const naomiShop = {
    steak: { name: "Steak", cost: 50, type: "food", val: 40, icon: "https://img.icons8.com/color/48/steak.png" },
    snack: { name: "Snack", cost: 15, type: "food", val: 15, icon: "https://img.icons8.com/color/48/potato-chips.png" },
    soap: { name: "Soap", cost: 30, type: "hygiene", val: 100, icon: "https://img.icons8.com/color/48/soap.png" },
    bed: { name: "Bed", cost: 200, type: "bed", val: 0, icon: "https://img.icons8.com/color/48/bed.png" }
};

function buyFromNaomi(itemKey) {
    const item = naomiShop[itemKey];
    if (!item) return;

    if (playerStats.credits < item.cost) {
        showNotification("Not enough credits!");
        return;
    }

    const emptyIndex = playerStats.hotbar.findIndex(slot => slot === null);
    if (emptyIndex === -1) {
        showNotification("Hotbar full!");
        return;
    }

    playerStats.credits -= item.cost;
    playerStats.hotbar[emptyIndex] = { ...item };
    showNotification(`Bought ${item.name}!`);
    playerStats.updateUI();
}

const machinePlays = {};
const MAX_PLAYS_PER_DAY = 3;

function playMachine(machineId, tokenCost, rewardCredits) {
    if (!machinePlays[machineId]) machinePlays[machineId] = 0;

    if (machinePlays[machineId] >= MAX_PLAYS_PER_DAY) {
        showNotification("OUT OF ORDER today! Go sleep in your bed.");
        return;
    }
    if (playerStats.dailyTokens < tokenCost) {
        showNotification("Not enough daily tokens!");
        return;
    }
    if (playerStats.energy < 10) {
        showNotification("Too tired to play! Go sleep.");
        return;
    }

    playerStats.dailyTokens -= tokenCost;
    playerStats.energy = Math.max(0, playerStats.energy - 10);
    playerStats.hygiene = Math.max(0, playerStats.hygiene - 5);
    machinePlays[machineId]++;
    playerStats.credits += rewardCredits;

    playerStats.updateUI();
    showNotification(`Played ${machineId}! Won +${rewardCredits} Credits!`);
}

function resetMachinePlayLimits() {
    for (let m in machinePlays) machinePlays[m] = 0;
}

function closeShopModal() { document.getElementById('shop-modal').classList.add('hidden'); }
function closeTerminalModal() { document.getElementById('terminal-modal').classList.add('hidden'); }

function enterSecretTerminalPassword(inputPassword) {
    const cleanPassword = inputPassword.replace(/[^a-zA-Z]/g, "").toUpperCase();
    if (cleanPassword === "DONTTRUSTNAOMI") {
        showNotification("ACCESS GRANTED: Secret revealed!");
        closeTerminalModal();
    } else {
        showNotification("INCORRECT PASSWORD.");
    }
}

// ==========================================
// 4. PLAYABLE FLAPPY BIRD MINIGAME ENGINE
// ==========================================
const flappyCanvas = document.getElementById('flappyCanvas');
const fCtx = flappyCanvas.getContext('2d');

let flappyBird = { x: 50, y: 150, vy: 0, gravity: 0.35, jump: -6.5, radius: 10 };
let pipes = [];
let flappyScore = 0;
let flappyInterval = null;
let flappyActive = false;

function startFlappyGame() {
    if (playerStats.dailyTokens < 50) {
        showNotification("Requires 50 Daily Tokens to play Flappy Bird!");
        return;
    }
    playerStats.dailyTokens -= 50;
    playerStats.updateUI();

    document.getElementById('flappy-modal').classList.remove('hidden');
    flappyBird.y = 150;
    flappyBird.vy = 0;
    pipes = [];
    flappyScore = 0;
    flappyActive = true;

    if (flappyInterval) clearInterval(flappyInterval);
    flappyInterval = setInterval(updateFlappyGame, 1000 / 60);
}

function closeFlappyModal() {
    flappyActive = false;
    if (flappyInterval) clearInterval(flappyInterval);
    document.getElementById('flappy-modal').classList.add('hidden');
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && flappyActive) {
        flappyBird.vy = flappyBird.jump;
        e.preventDefault();
    }
});

function updateFlappyGame() {
    flappyBird.vy += flappyBird.gravity;
    flappyBird.y += flappyBird.vy;

    // Spawn Pipes
    if (pipes.length === 0 || pipes[pipes.length - 1].x < 180) {
        const gap = 110;
        const topH = Math.floor(Math.random() * (flappyCanvas.height - gap - 80)) + 30;
        pipes.push({ x: flappyCanvas.width, top: topH, bottom: topH + gap, passed: false });
    }

    // Move Pipes
    pipes.forEach(p => p.x -= 2);

    // Check Collisions & Score
    pipes.forEach(p => {
        if (!p.passed && p.x < flappyBird.x) {
            p.passed = true;
            flappyScore++;
            playerStats.credits += 10; // Earn 10 Credits per pipe
            playerStats.updateUI();
        }

        if (flappyBird.x + flappyBird.radius > p.x && flappyBird.x - flappyBird.radius < p.x + 40) {
            if (flappyBird.y - flappyBird.radius < p.top || flappyBird.y + flappyBird.radius > p.bottom) {
                gameOverFlappy();
            }
        }
    });

    if (flappyBird.y > flappyCanvas.height || flappyBird.y < 0) gameOverFlappy();

    // Render Flappy
    fCtx.fillStyle = '#70c5ce';
    fCtx.fillRect(0, 0, flappyCanvas.width, flappyCanvas.height);

    // Draw Pipes
    ctxFillPipes();

    // Draw Bird
    fCtx.fillStyle = '#ffca28';
    fCtx.beginPath();
    fCtx.arc(flappyBird.x, flappyBird.y, flappyBird.radius, 0, Math.PI * 2);
    fCtx.fill();

    // Draw Score
    fCtx.fillStyle = '#fff';
    fCtx.font = 'bold 16px Courier New';
    fCtx.fillText(`Score: ${flappyScore} (+$${flappyScore * 10})`, 10, 25);
}

function ctxFillPipes() {
    pipes.forEach(p => {
        fCtx.fillStyle = '#2e7d32';
        fCtx.fillRect(p.x, 0, 40, p.top);
        fCtx.fillRect(p.x, p.bottom, 40, flappyCanvas.height - p.bottom);
    });
}

function gameOverFlappy() {
    flappyActive = false;
    clearInterval(flappyInterval);
    showNotification(`Game Over! Earned +$${flappyScore * 10} Credits!`);
}

// ==========================================
// 5. FULLSCREEN CANVAS & SCALED SPRITES
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// SCALED UP PLAYER (64x64)
const player = { x: 400, y: 400, width: 50, height: 50, speed: 6.0 };

// SCALED UP WORLD OBJECTS
const worldObjects = [
    { id: 'naomi', name: "Naomi's Counter", x: 500, y: 80, w: 220, h: 90 },
    { id: 'flappy', name: "FLAPPY BIRD", x: 120, y: 220, w: 100, h: 140, color: '#ffca28' },
    { id: 'machine1', name: "Cyber Racer", x: 260, y: 220, w: 100, h: 140, color: '#00d2ff', cost: 100, win: 50 },
    { id: 'machine2', name: "Neon Fighter", x: 400, y: 220, w: 100, h: 140, color: '#ff0055', cost: 100, win: 75 },
    { id: 'machine3', name: "Retro Space", x: 120, y: 420, w: 100, h: 140, color: '#9c27b0', cost: 100, win: 60 },
    { id: 'machine4', name: "Pinball King", x: 260, y: 420, w: 100, h: 140, color: '#4caf50', cost: 100, win: 80 },
    { id: 'terminal', name: "Hacker Terminal", x: 950, y: 100, w: 90, h: 100 },
    { id: 'bed', name: "Rest Bed", x: 1000, y: 500, w: 140, h: 100 }
];

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function updateMovement() {
    if (flappyActive) return; // Freeze movement while playing Flappy Bird

    if (keys['w'] || keys['arrowup']) player.y = Math.max(20, player.y - player.speed);
    if (keys['s'] || keys['arrowdown']) player.y = Math.min(canvas.height - player.height - 20, player.y + player.speed);
    if (keys['a'] || keys['arrowleft']) player.x = Math.max(20, player.x - player.speed);
    if (keys['d'] || keys['arrowright']) player.x = Math.min(canvas.width - player.width - 20, player.x + player.speed);
}

function checkWorldInteraction() {
    if (flappyActive) return;

    let nearestObj = null;
    let minDist = 120;

    worldObjects.forEach(obj => {
        const cx = obj.x + obj.w / 2;
        const cy = obj.y + obj.h / 2;
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const dist = Math.hypot(cx - px, cy - py);

        if (dist < minDist) nearestObj = obj;
    });

    if (!nearestObj) {
        useHeldItem();
        return;
    }

    if (nearestObj.id === 'naomi') {
        document.getElementById('shop-modal').classList.remove('hidden');
    } else if (nearestObj.id === 'flappy') {
        startFlappyGame();
    } else if (nearestObj.id.startsWith('machine')) {
        playMachine(nearestObj.name, nearestObj.cost, nearestObj.win);
    } else if (nearestObj.id === 'terminal') {
        document.getElementById('terminal-modal').classList.remove('hidden');
    } else if (nearestObj.id === 'bed') {
        playerStats.sleep();
    }
}

// --- LARGE PIXEL DRAWING FUNCTIONS ---

function drawArcadeCabinet(obj) {
    ctx.fillStyle = '#15151e';
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.strokeStyle = obj.color;
    ctx.lineWidth = 4;
    ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

    // Marquee
    ctx.fillStyle = obj.color;
    ctx.fillRect(obj.x + 8, obj.y + 8, obj.w - 16, 24);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText("ARCADE", obj.x + obj.w/2, obj.y + 24);

    // Screen
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(obj.x + 12, obj.y + 40, obj.w - 24, 45);
    ctx.fillStyle = obj.color;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(obj.x + 16, obj.y + 44, obj.w - 32, 37);
    ctx.globalAlpha = 1.0;

    // Controls
    ctx.fillStyle = '#222';
    ctx.fillRect(obj.x + 8, obj.y + 92, obj.w - 16, 22);
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(obj.x + 30, obj.y + 103, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(obj.x + 60, obj.y + 103, 5, 0, Math.PI * 2);
    ctx.arc(obj.x + 75, obj.y + 103, 5, 0, Math.PI * 2);
    ctx.fill();
}

function drawNaomiCounter(obj) {
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(obj.x, obj.y + 30, obj.w, obj.h - 30);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(obj.x - 8, obj.y + 20, obj.w + 16, 15);

    // Naomi Sprite
    ctx.fillStyle = '#e91e63';
    ctx.beginPath();
    ctx.arc(obj.x + obj.w/2, obj.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.arc(obj.x + obj.w/2, obj.y + 4, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText("NAOMI'S SHOP", obj.x + obj.w/2, obj.y + 60);
}

function drawTerminal(obj) {
    ctx.fillStyle = '#222';
    ctx.fillRect(obj.x, obj.y + 40, obj.w, obj.h - 40);

    ctx.fillStyle = '#002200';
    ctx.fillRect(obj.x + 10, obj.y, obj.w - 20, 45);
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.strokeRect(obj.x + 10, obj.y, obj.w - 20, 45);

    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 11px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(">_PASS", obj.x + obj.w/2, obj.y + 26);
}

function drawBed(obj) {
    if (!playerStats.hasBedPlaced) return;
    ctx.fillStyle = '#4a2e18';
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(obj.x + 6, obj.y + 20, obj.w - 12, obj.h - 26);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(obj.x + 12, obj.y + 6, obj.w - 24, 18);
}

function drawPlayerSprite() {
    const px = player.x;
    const py = player.y;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(px + 25, py + 46, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(px + 12, py + 20, 26, 22);

    // Legs
    ctx.fillStyle = '#111122';
    ctx.fillRect(px + 14, py + 40, 9, 10);
    ctx.fillRect(px + 27, py + 40, 9, 10);

    // Head
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(px + 15, py + 6, 20, 16);

    // Hair
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(px + 13, py + 2, 24, 8);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(px + 18, py + 12, 3, 4);
    ctx.fillRect(px + 28, py + 12, 3, 4);
}

function renderWorld() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#181826';
    ctx.lineWidth = 1;
    const tileSize = 60;
    for (let x = 0; x < canvas.width; x += tileSize) {
        for (let y = 0; y < canvas.height; y += tileSize) {
            ctx.strokeRect(x, y, tileSize, tileSize);
        }
    }

    worldObjects.forEach(obj => {
        if (obj.id.startsWith('machine') || obj.id === 'flappy') drawArcadeCabinet(obj);
        else if (obj.id === 'naomi') drawNaomiCounter(obj);
        else if (obj.id === 'terminal') drawTerminal(obj);
        else if (obj.id === 'bed') drawBed(obj);

        if (obj.id !== 'bed' || playerStats.hasBedPlaced) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(obj.name, obj.x + obj.w / 2, obj.y - 10);
        }
    });

    drawPlayerSprite();
}

function gameLoop() {
    updateMovement();
    renderWorld();
    requestAnimationFrame(gameLoop);
}

// Start Loop
playerStats.updateUI();
requestAnimationFrame(gameLoop);
