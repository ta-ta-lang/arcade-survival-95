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
            showNotification("You don't have a bed set up! Buy one from Naomi and place it.");
            return;
        }
        this.energy = this.maxEnergy;
        this.dailyTokens = 1000;
        resetMachinePlayLimits();
        this.updateUI();
        showNotification("Slept well! Energy & Daily Tokens fully restored.");
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
// 2. NOTIFICATION SYSTEM & HOTBAR (KEYS 1-9 & E)
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
        showNotification("Bed placed in your room! Walk to it and press E to Sleep.");
        playerStats.hotbar[index] = null;
    }
    playerStats.updateUI();
}

// ==========================================
// 3. SHOP & MACHINE LOGIC
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
        showNotification("Hotbar full! Clear a slot first.");
        return;
    }

    playerStats.credits -= item.cost;
    playerStats.hotbar[emptyIndex] = { ...item };
    showNotification(`Bought ${item.name}! Added to Slot ${emptyIndex + 1}.`);
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
        showNotification("ACCESS GRANTED: Challenge Naomi to 1,000 games!");
        closeTerminalModal();
    } else {
        showNotification("INCORRECT PASSWORD.");
    }
}

// ==========================================
// 4. 2D CANVAS ARCADE WORLD & CHARACTER ENGINE
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const player = { x: 400, y: 300, width: 24, height: 24, speed: 3.5, color: '#00ffcc' };

const worldObjects = [
    { id: 'naomi', name: "Naomi Counter", x: 350, y: 50, w: 100, h: 40, color: '#e91e63' },
    { id: 'machine1', name: "Machine #1", x: 100, y: 150, w: 50, h: 60, color: '#2196f3', cost: 100, win: 50 },
    { id: 'machine2', name: "Machine #2", x: 200, y: 150, w: 50, h: 60, color: '#9c27b0', cost: 100, win: 75 },
    { id: 'terminal', name: "Secret Terminal", x: 650, y: 80, w: 40, h: 50, color: '#00ff00' },
    { id: 'bed', name: "Bed", x: 700, y: 400, w: 60, h: 60, color: '#ff9800' }
];

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function updateMovement() {
    if (keys['w'] || keys['arrowup']) player.y = Math.max(10, player.y - player.speed);
    if (keys['s'] || keys['arrowdown']) player.y = Math.min(canvas.height - player.height - 10, player.y + player.speed);
    if (keys['a'] || keys['arrowleft']) player.x = Math.max(10, player.x - player.speed);
    if (keys['d'] || keys['arrowright']) player.x = Math.min(canvas.width - player.width - 10, player.x + player.speed);
}

function checkWorldInteraction() {
    let nearestObj = null;
    let minDist = 60; // Interaction distance

    worldObjects.forEach(obj => {
        const cx = obj.x + obj.w / 2;
        const cy = obj.y + obj.h / 2;
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const dist = Math.hypot(cx - px, cy - py);

        if (dist < minDist) nearestObj = obj;
    });

    if (!nearestObj) {
        useHeldItem(); // If not near an object, use selected hotbar item!
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

function drawWorld() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Floor Tiles Pattern
    ctx.strokeStyle = '#222233';
    for (let x = 0; x < canvas.width; x += 40) {
        for (let y = 0; y < canvas.height; y += 40) {
            ctx.strokeRect(x, y, 40, 40);
        }
    }

    // Draw Objects & Labels
    worldObjects.forEach(obj => {
        if (obj.id === 'bed' && !playerStats.hasBedPlaced) return; // Only draw bed if placed!

        ctx.fillStyle = obj.color;
        ctx.fillRect(obj.x, obj.y, obj.w, obj.h);

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(obj.name, obj.x + obj.w / 2, obj.y - 6);
    });

    // Draw Player Character
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Player head outline
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText("YOU", player.x + player.width / 2, player.y - 6);
}

function gameLoop() {
    updateMovement();
    drawWorld();
    requestAnimationFrame(gameLoop);
}

// Start Game Loop & Initialize UI
playerStats.updateUI();
requestAnimationFrame(gameLoop);
