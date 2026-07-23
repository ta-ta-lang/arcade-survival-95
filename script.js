// ==========================================
// 1. PLAYER STATS & REAL-TIME UI UPDATE
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
        showNotification("Day reset! Tokens & Energy restored.");
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
        const container = document.getElementById('hotbar-container');
        if (!container) return;

        let html = '';
        for (let i = 0; i < 9; i++) {
            const item = this.hotbar[i];
            const isSelected = (i === this.selectedSlot) ? 'selected' : '';
            
            let itemContent = '';
            if (item) {
                itemContent = `<div class="item-badge" style="background:${item.color}">${item.name}</div>`;
            }

            html += `
                <div class="hotbar-slot ${isSelected}" onclick="selectHotbarSlot(${i})">
                    <span class="slot-num">${i + 1}</span>
                    ${itemContent}
                </div>
            `;
        }
        container.innerHTML = html;
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
    if (!item) { showNotification("Nothing in selected slot!"); return; }

    if (item.type === "food") {
        playerStats.hunger = Math.min(playerStats.maxHunger, playerStats.hunger + item.val);
        showNotification(`Ate ${item.name}! +${item.val} Hunger.`);
        playerStats.hotbar[index] = null;
    } else if (item.type === "hygiene") {
        playerStats.hygiene = playerStats.maxHygiene;
        showNotification(`Used ${item.name}! Hygiene restored.`);
        playerStats.hotbar[index] = null;
    } else if (item.type === "bed") {
        if (playerStats.hasBedPlaced) { showNotification("Bed already placed!"); return; }
        playerStats.hasBedPlaced = true;
        showNotification("Bed placed! Walk to it and press E to sleep.");
        playerStats.hotbar[index] = null;
    }
    playerStats.updateUI();
}

// ==========================================
// 3. SHOP & ARCADE INTERACTION ENGINE
// ==========================================
const naomiShop = {
    steak: { name: "Steak", cost: 50, type: "food", val: 40, color: "#ff7043" },
    snack: { name: "Snack", cost: 15, type: "food", val: 15, color: "#ffca28" },
    soap: { name: "Soap", cost: 30, type: "hygiene", val: 100, color: "#29b6f6" },
    bed: { name: "Bed", cost: 200, type: "bed", val: 0, color: "#ab47bc" }
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
    showNotification(`Bought ${item.name}! Check inventory.`);
    playerStats.updateUI();
}

const machinePlays = {};
const MAX_PLAYS_PER_DAY = 3;

function playMachine(machineId, tokenCost, rewardCredits) {
    if (!machinePlays[machineId]) machinePlays[machineId] = 0;

    if (machinePlays[machineId] >= MAX_PLAYS_PER_DAY) {
        showNotification("OUT OF ORDER today! Sleep in your bed to reset.");
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
    showNotification(`Played ${machineId}! +${rewardCredits} Credits!`);
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

let flappyBird = { x: 60, y: 180, vy: 0, gravity: 0.4, jump: -7, radius: 12 };
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
    flappyBird.y = 180;
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

    if (pipes.length === 0 || pipes[pipes.length - 1].x < 200) {
        const gap = 120;
        const topH = Math.floor(Math.random() * (flappyCanvas.height - gap - 80)) + 30;
        pipes.push({ x: flappyCanvas.width, top: topH, bottom: topH + gap, passed: false });
    }

    pipes.forEach(p => p.x -= 2.5);

    pipes.forEach(p => {
        if (!p.passed && p.x < flappyBird.x) {
            p.passed = true;
            flappyScore++;
            playerStats.credits += 10;
            playerStats.updateUI();
        }

        if (flappyBird.x + flappyBird.radius > p.x && flappyBird.x - flappyBird.radius < p.x + 45) {
            if (flappyBird.y - flappyBird.radius < p.top || flappyBird.y + flappyBird.radius > p.bottom) {
                gameOverFlappy();
            }
        }
    });

    if (flappyBird.y > flappyCanvas.height || flappyBird.y < 0) gameOverFlappy();

    fCtx.fillStyle = '#70c5ce';
    fCtx.fillRect(0, 0, flappyCanvas.width, flappyCanvas.height);

    pipes.forEach(p => {
        fCtx.fillStyle = '#2e7d32';
        fCtx.fillRect(p.x, 0, 45, p.top);
        fCtx.fillRect(p.x, p.bottom, 45, flappyCanvas.height - p.bottom);
    });

    fCtx.fillStyle = '#ffca28';
    fCtx.beginPath();
    fCtx.arc(flappyBird.x, flappyBird.y, flappyBird.radius, 0, Math.PI * 2);
    fCtx.fill();

    fCtx.fillStyle = '#fff';
    fCtx.font = 'bold 18px Courier New';
    fCtx.fillText(`Score: ${flappyScore} | Credits: +${flappyScore * 10}`, 15, 30);
}

function gameOverFlappy() {
    flappyActive = false;
    clearInterval(flappyInterval);
    showNotification(`Game Over! Total Credits Earned: +${flappyScore * 10}`);
}

// ==========================================
// 5. FULLSCREEN CANVAS & 2X DOUBLED SPRITES
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// DOUBLED PLAYER SIZE & SPEED (100x100)
const player = { x: 600, y: 500, width: 80, height: 80, speed: 7.5 };

// DOUBLED OBJECT SIZES & POSITIONS
const worldObjects = [
    { id: 'naomi', name: "Naomi's Counter", x: 600, y: 100, w: 360, h: 140 },
    { id: 'flappy', name: "FLAPPY BIRD", x: 100, y: 280, w: 180, h: 260, color: '#ffca28' },
    { id: 'machine1', name: "Cyber Racer", x: 320, y: 280, w: 180, h: 260, color: '#00d2ff', cost: 100, win: 50 },
    { id: 'machine2', name: "Neon Fighter", x: 540, y: 280, w: 180, h: 260, color: '#ff0055', cost: 100, win: 75 },
    { id: 'machine3', name: "Retro Space", x: 100, y: 580, w: 180, h: 260, color: '#9c27b0', cost: 100, win: 60 },
    { id: 'machine4', name: "Pinball King", x: 320, y: 580, w: 180, h: 260, color: '#4caf50', cost: 100, win: 80 },
    { id: 'terminal', name: "Hacker Terminal", x: 1200, y: 120, w: 140, h: 150 },
    { id: 'bed', name: "Rest Bed", x: 1300, y: 600, w: 220, h: 150 }
];

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function updateMovement() {
    if (flappyActive) return;

    if (keys['w'] || keys['arrowup']) player.y = Math.max(20, player.y - player.speed);
    if (keys['s'] || keys['arrowdown']) player.y = Math.min(canvas.height - player.height - 20, player.y + player.speed);
    if (keys['a'] || keys['arrowleft']) player.x = Math.max(20, player.x - player.speed);
    if (keys['d'] || keys['arrowright']) player.x = Math.min(canvas.width - player.width - 20, player.x + player.speed);
}

function checkWorldInteraction() {
    if (flappyActive) return;

    let nearestObj = null;
    let minDist = 180;

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

// 2X SCALED DRAWING FUNCTIONS
function drawArcadeCabinet(obj) {
    ctx.fillStyle = '#15151e';
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.strokeStyle = obj.color;
    ctx.lineWidth = 6;
    ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

    // Marquee
    ctx.fillStyle = obj.color;
    ctx.fillRect(obj.x + 12, obj.y + 12, obj.w - 24, 40);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText("ARCADE", obj.x + obj.w/2, obj.y + 38);

    // Screen
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(obj.x + 18, obj.y + 65, obj.w - 36, 90);
    ctx.fillStyle = obj.color;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(obj.x + 24, obj.y + 72, obj.w - 48, 76);
    ctx.globalAlpha = 1.0;

    // Controls
    ctx.fillStyle = '#222';
    ctx.fillRect(obj.x + 12, obj.y + 175, obj.w - 24, 45);
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(obj.x + 45, obj.y + 198, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(obj.x + 100, obj.y + 198, 9, 0, Math.PI * 2);
    ctx.arc(obj.x + 130, obj.y + 198, 9, 0, Math.PI * 2);
    ctx.fill();
}

function drawNaomiCounter(obj) {
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(obj.x, obj.y + 40, obj.w, obj.h - 40);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(obj.x - 12, obj.y + 25, obj.w + 24, 25);

    // Naomi Sprite
    ctx.fillStyle = '#e91e63';
    ctx.beginPath();
    ctx.arc(obj.x + obj.w/2, obj.y - 10, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.arc(obj.x + obj.w/2, obj.y - 4, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 18px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText("NAOMI'S SHOP", obj.x + obj.w/2, obj.y + 85);
}

function drawTerminal(obj) {
    ctx.fillStyle = '#222';
    ctx.fillRect(obj.x, obj.y + 50, obj.w, obj.h - 50);

    ctx.fillStyle = '#002200';
    ctx.fillRect(obj.x + 12, obj.y, obj.w - 24, 60);
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 4;
    ctx.strokeRect(obj.x + 12, obj.y, obj.w - 24, 60);

    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(">_PASS", obj.x + obj.w/2, obj.y + 36);
}

function drawBed(obj) {
    if (!playerStats.hasBedPlaced) return;
    ctx.fillStyle = '#4a2e18';
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(obj.x + 10, obj.y + 30, obj.w - 20, obj.h - 40);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(obj.x + 20, obj.y + 10, obj.w - 40, 25);
}

function drawPlayerSprite() {
    const px = player.x;
    const py = player.y;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(px + 40, py + 72, 32, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(px + 18, py + 30, 44, 34);

    // Legs
    ctx.fillStyle = '#111122';
    ctx.fillRect(px + 22, py + 64, 14, 16);
    ctx.fillRect(px + 44, py + 64, 14, 16);

    // Head
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(px + 22, py + 8, 36, 26);

    // Hair
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(px + 18, py + 2, 44, 12);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(px + 28, py + 18, 5, 6);
    ctx.fillRect(px + 46, py + 18, 5, 6);
}

function renderWorld() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#181826';
    ctx.lineWidth = 2;
    const tileSize = 80;
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
            ctx.font = 'bold 15px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(obj.name, obj.x + obj.w / 2, obj.y - 14);
        }
    });

    drawPlayerSprite();
}

function gameLoop() {
    updateMovement();
    renderWorld();
    requestAnimationFrame(gameLoop);
}

// Start Engine
playerStats.updateUI();
requestAnimationFrame(gameLoop);
