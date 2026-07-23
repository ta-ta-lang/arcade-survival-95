// ==========================================
// 1. PLAYER STATS & INVENTORY SYSTEM
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
    inventory: [], // NEW: Stores items bought from Naomi
    hasBedPlaced: false, // Tracks if a bed is placed in your room
    timeDilationActive: false,

    // Decay hunger, energy, and hygiene over time
    decay() {
        this.hunger = Math.max(0, this.hunger - 0.5);
        
        // Energy drops faster if hygiene is dirty (< 20%)
        const energyLoss = this.hygiene < 20 ? 1.0 : 0.5;
        this.energy = Math.max(0, this.energy - energyLoss);
        
        this.hygiene = Math.max(0, this.hygiene - 0.3);
        this.updateUI();
    },

    // Sleep in bed: resets energy, tokens, and machine daily limits
    sleep() {
        if (!this.hasBedPlaced) {
            alert("You don't have a bed set up! Buy one from Naomi and place it first.");
            return;
        }
        this.energy = this.maxEnergy;
        this.dailyTokens = 1000;
        resetMachinePlayLimits();
        this.updateUI();
        alert("Slept well! Energy restored to 100%, Daily Tokens reset to 1000, and machines unlocked.");
    },

    // Toggle Time-Dilation Passive (Slows minigames to 10% speed)
    toggleTimeDilation() {
        this.timeDilationActive = !this.timeDilationActive;
        console.log(`Time Dilation Speed (0.1x): ${this.timeDilationActive ? "ON" : "OFF"}`);
        return this.timeDilationActive;
    },

    // Update screen text/bars/inventory UI
    updateUI() {
        const hungerBar = document.getElementById('hunger-bar');
        const energyBar = document.getElementById('energy-bar');
        const hygieneBar = document.getElementById('hygiene-bar');
        const tokenDisplay = document.getElementById('token-display');
        const creditDisplay = document.getElementById('credit-display');
        const inventoryDisplay = document.getElementById('inventory-list');

        if (hungerBar) hungerBar.style.width = `${this.hunger}%`;
        if (energyBar) energyBar.style.width = `${this.energy}%`;
        if (hygieneBar) hygieneBar.style.width = `${this.hygiene}%`;
        if (tokenDisplay) tokenDisplay.innerText = this.dailyTokens;
        if (creditDisplay) creditDisplay.innerText = this.credits;

        // Render Inventory Items
        if (inventoryDisplay) {
            inventoryDisplay.innerHTML = "";
            this.inventory.forEach((item, index) => {
                const itemElement = document.createElement('div');
                itemElement.innerText = `${item.name} `;
                
                const useBtn = document.createElement('button');
                useBtn.innerText = "Use";
                useBtn.onclick = () => useInventoryItem(index);
                
                itemElement.appendChild(useBtn);
                inventoryDisplay.appendChild(itemElement);
            });
        }
    }
};

// Automatically drain stats every 2 seconds
setInterval(() => {
    playerStats.decay();
}, 2000);


// ==========================================
// 2. NAOMI PRIZE COUNTER & INVENTORY LOGIC
// ==========================================

// Catalog of items Naomi sells
const naomiShop = {
    steak:   { name: "Steak Food", cost: 50, type: "food", val: 40 },
    snack:   { name: "Arcade Snack", cost: 15, type: "food", val: 15 },
    soap:    { name: "Hygiene Kit", cost: 30, type: "hygiene", val: 100 },
    bed:     { name: "Comfortable Bed", cost: 200, type: "bed", val: 0 }
};

function buyFromNaomi(itemKey) {
    const item = naomiShop[itemKey];
    if (!item) return;

    if (playerStats.credits < item.cost) {
        alert("You don't have enough credits!");
        return;
    }

    playerStats.credits -= item.cost;
    playerStats.inventory.push(item); // Add item object to inventory
    alert(`Purchased ${item.name}! Added to your inventory.`);
    playerStats.updateUI();
}

// Function to USE an item from your Inventory
function useInventoryItem(itemIndex) {
    const item = playerStats.inventory[itemIndex];
    if (!item) return;

    if (item.type === "food") {
        playerStats.hunger = Math.min(playerStats.maxHunger, playerStats.hunger + item.val);
        alert(`Ate ${item.name}! +${item.val} Hunger.`);
    } 
    else if (item.type === "hygiene") {
        playerStats.hygiene = playerStats.maxHygiene;
        alert(`Used ${item.name}! Hygiene fully restored.`);
    } 
    else if (item.type === "bed") {
        if (playerStats.hasBedPlaced) {
            alert("You already have a bed set up!");
            return; // Don't consume the bed
        }
        playerStats.hasBedPlaced = true;
        alert("Bed placed in your area! You can now use the Sleep action anytime.");
    }

    // Remove item from inventory after using it
    playerStats.inventory.splice(itemIndex, 1);
    playerStats.updateUI();
}


// ==========================================
// 3. MACHINE PLAY LIMIT & WIN SYSTEM
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
    playerStats.hygiene = Math.max(0, playerStats.hygiene - 5);
    machinePlays[machineId]++;
    
    playerStats.updateUI();
    return true;
}

// Call this function when the player completes/wins a normal arcade minigame
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
// 4. SECRET BINARY PUZZLE & FFB TERMINAL
// ==========================================
const arcadeScoreboards = {
    machine1:  { acronymLetter: "D", binaryScore: "1" },
    machine2:  { acronymLetter: "O", binaryScore: "10" },
    machine3:  { acronymLetter: "N", binaryScore: "11" },
    machine4:  { acronymLetter: "T", binaryScore: "100" },
    machine5:  { acronymLetter: "T", binaryScore: "101" },
    machine6:  { acronymLetter: "R", binaryScore: "110" },
    machine7:  { acronymLetter: "U", binaryScore: "111" },
    machine8:  { acronymLetter: "S", binaryScore: "1000" },
    machine9:  { acronymLetter: "T", binaryScore: "1001" },
    machine10: { acronymLetter: "N", binaryScore: "1010" },
    machine11: { acronymLetter: "A", binaryScore: "1011" },
    machine12: { acronymLetter: "O", binaryScore: "1100" },
    machine13: { acronymLetter: "M", binaryScore: "1101" },
    machine14: { acronymLetter: "I", binaryScore: "1110" }
};

function enterSecretTerminalPassword(inputPassword) {
    const cleanPassword = inputPassword.replace(/[^a-zA-Z]/g, "").toUpperCase();

    if (cleanPassword === "DONTTRUSTNAOMI") {
        alert("ACCESS GRANTED.\n\nFFB: 'You found the truth... You've been trapped in this arcade for 10 years. Challenge Naomi to a 1,000-game showdown to free all trapped souls!'");
        startBossShowdown();
    } else {
        alert("INCORRECT PASSWORD. SYSTEM LOCKED.");
    }
}


// ==========================================
// 5. NAOMI BOSS SHOWDOWN & ENDINGS
// ==========================================
const bossMatch = {
    active: false,
    playerWins: 0,
    naomiWins: 0,
    totalGamesPlayed: 0,
    maxNaomiLossThreshold: 100
};

function startBossShowdown() {
    bossMatch.active = true;
    bossMatch.playerWins = 0;
    bossMatch.naomiWins = 0;
    bossMatch.totalGamesPlayed = 0;
    alert("SHOWDOWN STARTED! Beat Naomi across arcade games. Do NOT let her reach 101 wins!");
}

function recordBossGameResult(playerWon) {
    if (!bossMatch.active) return;

    bossMatch.totalGamesPlayed++;

    if (playerWon) {
        bossMatch.playerWins++;
    } else {
        bossMatch.naomiWins++;
    }

    if (bossMatch.naomiWins > bossMatch.maxNaomiLossThreshold) {
        triggerBadEnding();
        return;
    }

    if (bossMatch.playerWins + bossMatch.naomiWins >= 1000 && bossMatch.playerWins > bossMatch.naomiWins) {
        triggerGoodEnding();
        return;
    }
}

function triggerBadEnding() {
    bossMatch.active = false;
    alert("NAOMI WINS... Your soul has been extracted and trapped inside a Dance Dance Revolution machine forever. GAME OVER.");
    location.reload();
}

function triggerGoodEnding() {
    bossMatch.active = false;
    playerStats.credits += 1000000000;
    playerStats.updateUI();

    alert("YOU DEFEATED NAOMI!\n\nNaomi explodes into millions of digital sparks! All trapped souls are restored to their human bodies, time reverts back 1 year, and you walk away with $1,000,000,000!");
}
}
