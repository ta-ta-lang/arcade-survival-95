// ==========================================
// 1. PLAYER STATS & SURVIVAL SYSTEM
// ==========================================
const playerStats = {
    hunger: 100,
    maxHunger: 100,
    energy: 100,
    maxEnergy: 100,
    hygiene: 100,
    maxHygiene: 100,
    dailyTokens: 1000,
    credits: 0,
    
    // Minecraft 9-slot Hotbar (index 0 to 8)
    hotbar: new Array(9).fill(null), 
    selectedSlot: 0, // Starts on slot 1 (index 0)
    
    hasBedPlaced: false,
    timeDilationActive: false,

    // Decay stats over time
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
        showNotification("Slept! Energy & Tokens restored.");
    },

    toggleTimeDilation() {
        this.timeDilationActive = !this.timeDilationActive;
        showNotification(`Time Dilation (0.1x): ${this.timeDilationActive ? "ON" : "OFF"}`);
        return this.timeDilationActive;
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

    // Renders the 9 Minecraft Hotbar Slots
    renderHotbarUI() {
        for (let i = 0; i < 9; i++) {
            const slotElement = document.getElementById(`hotbar-slot-${i + 1}`);
            if (!slotElement) continue;

            const item = this.hotbar[i];

            // Highlight selected slot
            if (i === this.selectedSlot) {
                slotElement.classList.add('selected');
            } else {
                slotElement.classList.remove('selected');
            }

            // Display item icon/text inside slot
            if (item) {
                slotElement.innerHTML = `<span class="slot-num">${i + 1}</span><img src="${item.icon}" alt="${item.name}" class="item-icon">`;
            } else {
                slotElement.innerHTML = `<span class="slot-num">${i + 1}</span>`;
            }
        }
    }
};

setInterval(() => {
    playerStats.decay();
}, 2000);


// ==========================================
// 2. ON-SCREEN NOTIFICATION SYSTEM (MIDDLE OF SCREEN)
// ==========================================
function showNotification(message, duration = 2500) {
    let notifyBox = document.getElementById('center-notification');
    
    // Create element if it doesn't exist in HTML yet
    if (!notifyBox) {
        notifyBox = document.createElement('div');
        notifyBox.id = 'center-notification';
        document.body.appendChild(notifyBox);
    }

    notifyBox.innerText = message;
    notifyBox.classList.add('show');

    // Hide notification after duration
    setTimeout(() => {
        notifyBox.classList.remove('show');
    }, duration);
}


// ==========================================
// 3. HOTBAR CONTROLS & ITEM USAGE (KEYS 1-9)
// ==========================================

// Listen for keys 1 through 9
window.addEventListener('keydown', (e) => {
    const keyNum = parseInt(e.key);
    if (keyNum >= 1 && keyNum <= 9) {
        selectHotbarSlot(keyNum - 1);
    }
});

function selectHotbarSlot(slotIndex) {
    playerStats.selectedSlot = slotIndex;
    playerStats.updateUI();

    const currentItem = playerStats.hotbar[slotIndex];
    if (currentItem) {
        showNotification(`Selected Slot ${slotIndex + 1}: ${currentItem.name}`);
    } else {
        showNotification(`Selected Slot ${slotIndex + 1}: Empty`);
    }
}

// Use item currently held in selected hotbar slot
function useHeldItem() {
    const index = playerStats.selectedSlot;
    const item = playerStats.hotbar[index];

    if (!item) {
        showNotification("Nothing in selected slot!");
        return;
    }

    if (item.type === "food") {
        playerStats.hunger = Math.min(playerStats.maxHunger, playerStats.hunger + item.val);
        showNotification(`Ate ${item.name}! +${item.val} Hunger.`);
        playerStats.hotbar[index] = null; // Consume item
    } 
    else if (item.type === "hygiene") {
        playerStats.hygiene = playerStats.maxHygiene;
        showNotification(`Used ${item.name}! Hygiene restored.`);
        playerStats.hotbar[index] = null; // Consume item
    } 
    else if (item.type === "bed") {
        if (playerStats.hasBedPlaced) {
            showNotification("You already have a bed set up!");
            return;
        }
        playerStats.hasBedPlaced = true;
        showNotification("Bed placed! You can now Sleep anytime.");
        playerStats.hotbar[index] = null; // Consume item
    }

    playerStats.updateUI();
}


// ==========================================
// 4. NAOMI PRIZE COUNTER
// ==========================================
const naomiShop = {
    steak:   { name: "Steak", cost: 50, type: "food", val: 40, icon: "https://img.icons8.com/color/48/steak.png" },
    snack:   { name: "Snack", cost: 15, type: "food", val: 15, icon: "https://img.icons8.com/color/48/potato-chips.png" },
    soap:    { name: "Soap", cost: 30, type: "hygiene", val: 100, icon: "https://img.icons8.com/color/48/soap.png" },
    bed:     { name: "Bed", cost: 200, type: "bed", val: 0, icon: "https://img.icons8.com/color/48/bed.png" }
};

function buyFromNaomi(itemKey) {
    const item = naomiShop[itemKey];
    if (!item) return;

    if (playerStats.credits < item.cost) {
        showNotification("Not enough credits!");
        return;
    }

    // Find first empty hotbar slot
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


// ==========================================
// 5. MACHINE PLAY & WIN SYSTEM
// ==========================================
const machinePlays = {}; 
const MAX_PLAYS_PER_DAY = 3;

function playMachine(machineId, tokenCost) {
    if (!machinePlays[machineId]) machinePlays[machineId] = 0;

    if (machinePlays[machineId] >= MAX_PLAYS_PER_DAY) {
        showNotification("OUT OF ORDER today! Sleep to reset.");
        return false;
    }

    if (playerStats.dailyTokens < tokenCost) {
        showNotification("Not enough daily tokens!");
        return false;
    }

    if (playerStats.energy < 10) {
        showNotification("Too tired to play! Sleep in your bed.");
        return false;
    }

    playerStats.dailyTokens -= tokenCost;
    playerStats.energy = Math.max(0, playerStats.energy - 10);
    playerStats.hygiene = Math.max(0, playerStats.hygiene - 5);
    machinePlays[machineId]++;
    
    playerStats.updateUI();
    return true;
}

function completeMinigame(creditsWon) {
    playerStats.credits += creditsWon;
    playerStats.updateUI();
    showNotification(`YOU WON! +${creditsWon} Credits!`);
}

function resetMachinePlayLimits() {
    for (let machine in machinePlays) {
        machinePlays[machine] = 0;
    }
}


// ==========================================
// 6. SECRET TERMINAL & BOSS SHOWDOWN
// ==========================================
function enterSecretTerminalPassword(inputPassword) {
    const cleanPassword = inputPassword.replace(/[^a-zA-Z]/g, "").toUpperCase();

    if (cleanPassword === "DONTTRUSTNAOMI") {
        showNotification("ACCESS GRANTED: Challenge Naomi to a 1,000-game showdown!");
        startBossShowdown();
    } else {
        showNotification("INCORRECT PASSWORD.");
    }
}

const bossMatch = { active: false, playerWins: 0, naomiWins: 0 };

function startBossShowdown() {
    bossMatch.active = true;
    showNotification("SHOWDOWN STARTED! Beat Naomi!");
}

function recordBossGameResult(playerWon) {
    if (!bossMatch.active) return;

    if (playerWon) bossMatch.playerWins++;
    else bossMatch.naomiWins++;

    if (bossMatch.naomiWins > 100) {
        showNotification("GAME OVER: Soul trapped in DDR machine forever.");
        location.reload();
    } else if (bossMatch.playerWins + bossMatch.naomiWins >= 1000 && bossMatch.playerWins > bossMatch.naomiWins) {
        playerStats.credits += 1000000000;
        playerStats.updateUI();
        showNotification("VICTORY! Naomi exploded! You won $1,000,000,000!");
    }
}
