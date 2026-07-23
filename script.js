// ==========================================
// 1. PLAYER STATS & SURVIVAL SYSTEM
// ==========================================
const playerStats = {
    hunger: 100,
    maxHunger: 100,
    energy: 100,
    maxEnergy: 100,
    dailyTokens: 1000,
    credits: 0,

    // Decay hunger and energy over time
    decay() {
        this.hunger = Math.max(0, this.hunger - 0.5);
        this.energy = Math.max(0, this.energy - 0.5);
        this.updateUI();
    },

    // Eat food purchased from Naomi
    eat(hungerRestored) {
        this.hunger = Math.min(this.maxHunger, this.hunger + hungerRestored);
        this.updateUI();
    },

    // Sleep in bed: resets energy, tokens, and machine daily limits
    sleep() {
        this.energy = this.maxEnergy;
        this.dailyTokens = 1000;
        resetMachinePlayLimits();
        this.updateUI();
    },

    // Update screen text/bars
    updateUI() {
        const hungerBar = document.getElementById('hunger-bar');
        const energyBar = document.getElementById('energy-bar');
        const tokenDisplay = document.getElementById('token-display');
        const creditDisplay = document.getElementById('credit-display');

        if (hungerBar) hungerBar.style.width = `${this.hunger}%`;
        if (energyBar) energyBar.style.width = `${this.energy}%`;
        if (tokenDisplay) tokenDisplay.innerText = this.dailyTokens;
        if (creditDisplay) creditDisplay.innerText = this.credits;
    }
};

// Automatically drain stats every 2 seconds
setInterval(() => {
    playerStats.decay();
}, 2000);


// ==========================================
// 2. MACHINE PLAY LIMIT SYSTEM
// ==========================================
const machinePlays = {}; 
const MAX_PLAYS_PER_DAY = 3;

function playMachine(machineId, tokenCost) {
    if (!machinePlays[machineId]) machinePlays[machineId] = 0;

    // Check if machine reached daily limit
    if (machinePlays[machineId] >= MAX_PLAYS_PER_DAY) {
        alert("This machine is OUT OF ORDER for today! Go sleep in your bed to play again tomorrow.");
        return false;
    }

    // Check if player has enough tokens
    if (playerStats.dailyTokens < tokenCost) {
        alert("Not enough daily tokens!");
        return false;
    }

    // Check if player has enough energy
    if (playerStats.energy < 10) {
        alert("You are too tired to play! Go sleep in your bed.");
        return false;
    }

    // Pay token cost, drain energy, add play count
    playerStats.dailyTokens -= tokenCost;
    playerStats.energy = Math.max(0, playerStats.energy - 10);
    machinePlays[machineId]++;
    
    playerStats.updateUI();
    return true;
}

// Resets machine limits when sleeping
function resetMachinePlayLimits() {
    for (let machine in machinePlays) {
        machinePlays[machine] = 0;
    }
}


// ==========================================
// 3. NAOMI PRIZE COUNTER & BED UNLOCK
// ==========================================
let hasBed = false;

function buyFromNaomi(itemType, creditCost) {
    if (playerStats.credits < creditCost) {
        alert("You don't have enough credits!");
        return;
    }

    if (itemType === 'food') {
        playerStats.credits -= creditCost;
        playerStats.eat(30);
    } else if (itemType === 'bed') {
        if (hasBed) {
            alert("You already own a bed!");
            return;
        }
        playerStats.credits -= creditCost;
        hasBed = true;
        alert("You bought a bed! You can now use the Sleep button.");
    }

    playerStats.updateUI();
}

function useBed() {
    if (!hasBed) {
        alert("You don't have a bed yet! Earn credits and buy one from Naomi first.");
        return;
    }
    playerStats.sleep();
}
