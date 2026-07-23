// ==========================================
// 1. PLAYER STATS & SURVIVAL SYSTEM
// ==========================================
const playerStats = {
    hunger: 100,
    maxHunger: 100,
    energy: 100,
    maxEnergy: 100,
    hygiene: 100,        // NEW: Hygiene Stat
    maxHygiene: 100,
    dailyTokens: 1000,
    credits: 0,

    // Decay hunger, energy, and hygiene over time
    decay() {
        this.hunger = Math.max(0, this.hunger - 0.5);
        
        // Energy drops faster if hygiene is dirty (< 20%)
        const energyLoss = this.hygiene < 20 ? 1.0 : 0.5;
        this.energy = Math.max(0, this.energy - energyLoss);
        
        this.hygiene = Math.max(0, this.hygiene - 0.3);
        this.updateUI();
    },

    // Eat food purchased from Naomi
    eat(hungerRestored) {
        this.hunger = Math.min(this.maxHunger, this.hunger + hungerRestored);
        this.updateUI();
    },

    // Shower/Clean up
    wash() {
        this.hygiene = this.maxHygiene;
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
        const hygieneBar = document.getElementById('hygiene-bar');
        const tokenDisplay = document.getElementById('token-display');
        const creditDisplay = document.getElementById('credit-display');

        if (hungerBar) hungerBar.style.width = `${this.hunger}%`;
        if (energyBar) energyBar.style.width = `${this.energy}%`;
        if (hygieneBar) hygieneBar.style.width = `${this.hygiene}%`;
        if (tokenDisplay) tokenDisplay.innerText = this.dailyTokens;
        if (creditDisplay) creditDisplay.innerText = this.credits;
    }
};

// Automatically drain stats every 2 seconds
setInterval(() => {
    playerStats.decay();
}, 2000);


// ==========================================
// 2. MACHINE PLAY LIMIT & WIN SYSTEM
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

    // Check tokens
    if (playerStats.dailyTokens < tokenCost) {
        alert("Not enough daily tokens!");
        return false;
    }

    // Check energy
    if (playerStats.energy < 10) {
        alert("You are too tired to play! Go sleep in your bed.");
        return false;
    }

    // Pay token cost, drain energy/hygiene, add play count
    playerStats.dailyTokens -= tokenCost;
    playerStats.energy = Math.max(0, playerStats.energy - 10);
    playerStats.hygiene = Math.max(0, playerStats.hygiene - 5); // Machine handles get dirty
    machinePlays[machineId]++;
    
    playerStats.updateUI();
    return true;
}

// Call this function when the player completes/wins an arcade minigame
function completeMinigame(creditsWon) {
    playerStats.credits += creditsWon;
    playerStats.updateUI();
    alert(`You won! +${creditsWon} Credits added to your balance.`);
}

// Resets machine limits when sleeping
function resetMachinePlayLimits() {
    for (let machine in machinePlays) {
        machinePlays[machine] = 0;
    }
}


// ==========================================
// 3. NAOMI PRIZE COUNTER
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
    } else if (itemType === 'hygiene') {
        playerStats.credits -= creditCost;
        playerStats.wash();
        alert("You used the hygiene station and feel refreshed!");
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


// ==========================================
// 4. SECRET BINARY PUZZLE & FFB TERMINAL
// ==========================================

// High scores displayed on machines (Spells "DON'T TRUST NAOMI")
const arcadeScoreboards = {
    machine1:  { acronymLetter: "D", binaryScore: "1" },        // 1
    machine2:  { acronymLetter: "O", binaryScore: "10" },       // 2
    machine3:  { acronymLetter: "N", binaryScore: "11" },       // 3
    machine4:  { acronymLetter: "T", binaryScore: "100" },      // 4
    machine5:  { acronymLetter: "T", binaryScore: "101" },      // 5
    machine6:  { acronymLetter: "R", binaryScore: "110" },      // 6
    machine7:  { acronymLetter: "U", binaryScore: "111" },      // 7
    machine8:  { acronymLetter: "S", binaryScore: "1000" },     // 8
    machine9:  { acronymLetter: "T", binaryScore: "1001" },     // 9
    machine10: { acronymLetter: "N", binaryScore: "1010" },     // 10
    machine11: { acronymLetter: "A", binaryScore: "1011" },     // 11
    machine12: { acronymLetter: "O", binaryScore: "1100" },     // 12
    machine13: { acronymLetter: "M", binaryScore: "1101" },     // 13
    machine14: { acronymLetter: "I", binaryScore: "1110" }      // 14
};

// Secret 1000-Token Machine Password Prompt
function enterSecretTerminalPassword(inputPassword) {
    const cleanPassword = inputPassword.replace(/[^a-zA-Z]/g, "").toUpperCase();

    if (cleanPassword === "DONTTRUSTNAOMI") {
        alert("ACCESS GRANTED.\n\nFFB: 'You found the truth... You've been trapped in this arcade for 10 years. Challenge Naomi to a 1,000-game showdown to free all trapped souls!'");
        startBossShowdown();
    } else {
        alert("INCORRECT PASSWORD. SYSTEM LOCKED.");
    }
}

function startBossShowdown() {
    console.log("Boss Showdown Activated!");
    // Trigger final boss minigame state
}
