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
            showNotification("You need to buy and place a bed first!");
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
    showNotification(`Played Arcade Machine! Won +${rewardCredits} Credits!`);
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
// 4. FULLSCREEN CANVAS & RETRO SPRITE DRAWING
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const player = { x: 300, y: 300, width: 32, height: 32, speed: 4.5 };

const worldObjects = [
    { id: 'naomi', name: "Naomi's Counter", x: 400, y: 100, w: 140, h: 60 },
    { id: 'machine1', name: "Cyber Racer", x: 120, y: 220, w: 60, h: 90, color: '#00d2ff', cost: 100, win: 50 },
    { id: 'machine2', name: "Neon Fighter", x: 220, y: 220, w: 60, h: 90, color: '#ff0055', cost: 100, win: 75 },
    { id: 'terminal', name: "Hacker Terminal", x: 750, y: 120, w: 60, h: 70 },
    { id: 'bed', name: "Rest Bed", x: 800, y: 450, w: 90, h: 70 }
];

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function updateMovement() {
    if (keys['w'] || keys['arrowup']) player.y = Math.max(20, player.y - player.speed);
    if (keys['s'] || keys['arrowdown']) player.y = Math.min(canvas.height - player.height - 20, player.y + player.speed);
    if (keys['a'] || keys['arrowleft']) player.x = Math.max(20, player.x - player.speed);
    if (keys['d'] || keys['arrowright']) player.x = Math.min(canvas.width - player.width - 20, player.x + player.speed);
}

function checkWorldInteraction() {
    let nearestObj = null;
    let minDist = 80;

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
    } else if (nearestObj.id === 'machine1' || nearestObj.id === 'machine2') {
        playMachine(nearestObj.name, nearestObj.cost, nearestObj.win);
    } else if (nearestObj.id === 'terminal') {
        document.getElementById('terminal-modal').classList.remove('hidden');
    } else if (nearestObj.id === 'bed') {
        playerStats.sleep();
    }
}

// --- DETAILED CUSTOM CANVAS DRAWING FUNCTIONS ---

function drawArcadeCabinet(obj) {
    // Cabinet Body
    ctx.fillStyle = '#15151e';
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.strokeStyle = obj.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

    // Glowing Marquee Title Top
    ctx.fillStyle = obj.color;
    ctx.fillRect(obj.x + 5, obj.y + 5, obj.w - 10, 16);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 9px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText("ARCADE", obj.x + obj.w/2, obj.y + 16);

    // CRT Screen
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(obj.x + 8, obj.y + 26, obj.w - 16, 30);
    ctx.fillStyle = obj.color;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(obj.x + 12, obj.y + 30, obj.w - 24, 22); // Screen glow
    ctx.globalAlpha = 1.0;

    // Control Panel & Joystick
    ctx.fillStyle = '#222';
    ctx.fillRect(obj.x + 5, obj.y + 60, obj.w - 10, 15);
    // Joystick
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(obj.x + 20, obj.y + 66, 4, 0, Math.PI * 2);
    ctx.fill();
    // Buttons
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(obj.x + 38, obj.y + 66, 3, 0, Math.PI * 2);
    ctx.arc(obj.x + 46, obj.y + 66, 3, 0, Math.PI * 2);
    ctx.fill();

    // Coin Door
    ctx.fillStyle = '#333';
    ctx.fillRect(obj.x + 18, obj.y + 78, obj.w - 36, 8);
}

function drawNaomiCounter(obj) {
    // Wooden Counter
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(obj.x, obj.y + 20, obj.w, obj.h - 20);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(obj.x - 5, obj.y + 15, obj.w + 10, 10); // Countertop desk

    // Naomi Character behind counter
    // Hair
    ctx.fillStyle = '#e91e63';
    ctx.beginPath();
    ctx.arc(obj.x + obj.w/2, obj.y + 2, 14, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.arc(obj.x + obj.w/2, obj.y + 5, 10, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(obj.x + obj.w/2 - 4, obj.y + 4, 2, 3);
    ctx.fillRect(obj.x + obj.w/2 + 2, obj.y + 4, 2, 3);

    // Sign on counter
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 11px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText("NAOMI'S SHOP", obj.x + obj.w/2, obj.y + 42);
}

function drawTerminal(obj) {
    // Desk
    ctx.fillStyle = '#222';
    ctx.fillRect(obj.x, obj.y + 30, obj.w, obj.h - 30);

    // Glowing Green Hacker Monitor
    ctx.fillStyle = '#002200';
    ctx.fillRect(obj.x + 10, obj.y, obj.w - 20, 32);
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(obj.x + 10, obj.y, obj.w - 20, 32);

    // Matrix lines on screen
    ctx.fillStyle = '#00ff00';
    ctx.font = '8px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(">_PASS", obj.x + obj.w/2, obj.y + 18);
}

function drawBed(obj) {
    if (!playerStats.hasBedPlaced) return;

    // Wood frame
    ctx.fillStyle = '#4a2e18';
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    // Mattress / Blanket
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(obj.x + 4, obj.y + 15, obj.w - 8, obj.h - 19);
    // Pillow
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(obj.x + 8, obj.y + 4, obj.w - 16, 12);
}

function drawPlayerSprite() {
    const px = player.x;
    const py = player.y;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(px + 16, py + 30, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body / Hoodie
    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(px + 8, py + 14, 16, 14);

    // Pants
    ctx.fillStyle = '#111122';
    ctx.fillRect(px + 9, py + 26, 6, 6);
    ctx.fillRect(px + 17, py + 26, 6, 6);

    // Head
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(px + 10, py + 4, 12, 10);

    // Hair
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(px + 9, py + 1, 14, 5);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(px + 12, py + 8, 2, 2);
    ctx.fillRect(px + 18, py + 8, 2, 2);
}

function renderWorld() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Retro Carpet Tile Pattern Background
    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#181826';
    ctx.lineWidth = 1;
    const tileSize = 50;
    for (let x = 0; x < canvas.width; x += tileSize) {
        for (let y = 0; y < canvas.height; y += tileSize) {
            ctx.strokeRect(x, y, tileSize, tileSize);
        }
    }

    // Render All World Objects
    worldObjects.forEach(obj => {
        if (obj.id === 'machine1' || obj.id === 'machine2') drawArcadeCabinet(obj);
        else if (obj.id === 'naomi') drawNaomiCounter(obj);
        else if (obj.id === 'terminal') drawTerminal(obj);
        else if (obj.id === 'bed') drawBed(obj);

        // Object Label Tags
        if (obj.id !== 'bed' || playerStats.hasBedPlaced) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(obj.name, obj.x + obj.w / 2, obj.y - 8);
        }
    });

    // Render Character
    drawPlayerSprite();
}

function gameLoop() {
    updateMovement();
    renderWorld();
    requestAnimationFrame(gameLoop);
}

// Start Game Loop
playerStats.updateUI();
requestAnimationFrame(gameLoop);
