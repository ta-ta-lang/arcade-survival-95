// ==========================================
// 1. HARDCORE STATS, DECAY & FLOATING NOTIFICATIONS
// ==========================================
const playerStats = {
    hunger: 100, maxHunger: 100,
    energy: 100, maxEnergy: 100,
    hygiene: 100, maxHygiene: 100,
    dailyTokens: 1000, credits: 0,
    hotbar: new Array(9).fill(null),
    selectedSlot: 0,
    placedBed: null,
    isDead: false,

    decay() {
        if (this.isDead) return;

        // 3X DECAY RATES
        this.hunger = Math.max(0, this.hunger - 1.2);
        this.energy = Math.max(0, this.energy - 0.95);
        this.hygiene = Math.max(0, this.hygiene - 0.85);

        if (this.hunger <= 0) {
            triggerGameOver("You passed out from severe starvation!");
            return;
        }

        // STRICT HYGIENE ENFORCEMENT
        if (this.hygiene < 35 && checkDistanceToNaomi() < 280) {
            startNaomiBattle("RULE VIOLATION: Uncleanliness detected near Naomi's Counter!");
        }

        this.updateUI();
    },

    sleep() {
        if (!this.placedBed) { showNotification("Buy and place a bed first!"); return; }
        this.energy = this.maxEnergy;
        this.dailyTokens = 1000;
        resetMachinePlayLimits();
        this.updateUI();
        showNotification("Rested in bed! Tokens & Energy fully restored.");
        createFloatingText(player.x, player.y, "ZZZ... RESTED!", "#00ffcc");
    },

    updateUI() {
        document.getElementById('hunger-bar').style.width = `${this.hunger}%`;
        document.getElementById('energy-bar').style.width = `${this.energy}%`;
        document.getElementById('hygiene-bar').style.width = `${this.hygiene}%`;
        document.getElementById('token-display').innerText = Math.floor(this.dailyTokens);
        document.getElementById('credit-display').innerText = Math.floor(this.credits);
        this.renderHotbar();
    },

    renderHotbar() {
        const container = document.getElementById('hotbar-container');
        if (!container) return;
        let html = '';
        for (let i = 0; i < 9; i++) {
            const item = this.hotbar[i];
            const isSel = (i === this.selectedSlot) ? 'selected' : '';
            const content = item ? `<div class="item-badge" style="background:${item.color}">${item.name}</div>` : '';
            html += `<div class="hotbar-slot ${isSel}" onclick="selectSlot(${i})"><span class="slot-num">${i + 1}</span>${content}</div>`;
        }
        container.innerHTML = html;
    }
};

// Faster decay loop interval
setInterval(() => playerStats.decay(), 1200);

function triggerGameOver(reason) {
    playerStats.isDead = true;
    document.getElementById('death-reason').innerText = reason;
    document.getElementById('gameover-modal').classList.remove('hidden');
}

function selectSlot(idx) {
    playerStats.selectedSlot = idx;
    playerStats.updateUI();
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function showNotification(msg) {
    const el = document.getElementById('center-notification');
    el.innerText = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
}

// Floating visual numbers
const floatingTexts = [];
function createFloatingText(x, y, text, color) {
    floatingTexts.push({ x, y, text, color, alpha: 1.0, dy: -2.0 });
}

// Particle footstep system
const particles = [];
function addParticle(x, y) {
    particles.push({ x, y, radius: Math.random() * 4 + 2, alpha: 0.6 });
}

// ==========================================
// 2. ITEM USE & BED PLACEMENT
// ==========================================
function useSelectedItem() {
    const idx = playerStats.selectedSlot;
    const item = playerStats.hotbar[idx];
    if (!item) return false;

    if (item.type === "food") {
        playerStats.hunger = Math.min(playerStats.maxHunger, playerStats.hunger + item.val);
        createFloatingText(player.x, player.y, `+${item.val} HUNGER`, "#ff7043");
        playerStats.hotbar[idx] = null;
        playerStats.updateUI();
        return true;
    } else if (item.type === "hygiene") {
        playerStats.hygiene = playerStats.maxHygiene;
        createFloatingText(player.x, player.y, `CLEANED!`, "#29b6f6");
        playerStats.hotbar[idx] = null;
        playerStats.updateUI();
        return true;
    } else if (item.type === "bed") {
        if (playerStats.placedBed) { showNotification("Bed is already placed!"); return true; }
        playerStats.placedBed = { x: player.x - 40, y: player.y + 60, w: 160, h: 100 };
        playerStats.hotbar[idx] = null;
        playerStats.updateUI();
        createFloatingText(player.x, player.y, "BED PLACED", "#ab47bc");
        return true;
    }
    return false;
}

// ==========================================
// 3. STORYLINE & TERMINAL UNLOCK SYSTEM
// ==========================================
let storyStep = 0;
let bossHP = 1000;
let isFinalBoss = false;
let bossMode = "mash"; 
let bossTimer = null;
let bossMashCount = 0;

const storyDialogue = [
    {
        header: ">_ TERMINAL LOG #01",
        body: "I have to be quick... well done decoding the binary scores from the arcade boards.\n\nYou think you've only been trapped here a few months, don't you?",
        btn: "Read Next"
    },
    {
        header: ">_ TERMINAL LOG #02",
        body: "Look around you... each machine houses the soul of a player who tried this challenge before you.\n\nIf you fail, you'll be locked into an arcade cabinet for all eternity.",
        btn: "Ask question..."
    },
    {
        header: ">_ PLAYER INPUT LOG",
        body: "You type into the terminal: 'How long have we actually been in here?'\n\nFFB responds:\n'10 YEARS.'",
        btn: "What?!"
    },
    {
        header: ">_ TERMINAL LOG #03",
        body: "Any day now, you will become N40M1's next permanent arcade cabinet servant.\n\nThere is only one way out: Challenge N40M1 to a 1,000-Game Showdown and beat her in real-time games!",
        btn: "CHALLENGE N40M1!"
    }
];

function submitPasscode() {
    const input = document.getElementById('terminal-input').value.trim().toUpperCase();
    if (input === "DONTTRUSTNAOMI") {
        closeModal('terminal-modal');
        storyStep = 0;
        showStoryStep();
    } else {
        showNotification("ACCESS DENIED: INCORRECT PASSCODE!");
    }
}

function showStoryStep() {
    const current = storyDialogue[storyStep];
    document.getElementById('story-header').innerText = current.header;
    document.getElementById('story-body').innerText = current.body;
    document.getElementById('story-btn').innerText = current.btn;
    document.getElementById('story-modal').classList.remove('hidden');
}

function nextStoryStep() {
    storyStep++;
    if (storyStep < storyDialogue.length) {
        showStoryStep();
    } else {
        closeModal('story-modal');
        initiateNaomiShowdown();
    }
}

function initiateNaomiShowdown() {
    isFinalBoss = true;
    bossHP = 1000;
    document.getElementById('battle-title').innerText = "NAOMI 1,000-GAME SHOWDOWN";
    document.getElementById('battle-desc').innerText = "Naomi grins: 'If you fail these rapid minigames, your soul is mine forever!'";
    document.getElementById('battle-modal').classList.remove('hidden');
    startBossMinigameLoop();
    updateBossUI();
}

function startNaomiBattle(reason) {
    isFinalBoss = false;
    bossHP = 400; // Increased enforcement boss HP
    document.getElementById('battle-title').innerText = "NAOMI ENFORCEMENT BATTLE";
    document.getElementById('battle-desc').innerText = reason;
    document.getElementById('battle-modal').classList.remove('hidden');
    startBossMinigameLoop();
    updateBossUI();
}

// 3X HARDER BOSS MECHANICS
function startBossMinigameLoop() {
    bossMashCount = 0;
    bossMode = Math.random() < 0.5 ? "mash" : "timing";
    const promptEl = document.getElementById('boss-prompt');
    
    if (bossMode === "mash") {
        promptEl.innerText = "MASH ATTACK 25 TIMES RAPIDLY!";
    } else {
        promptEl.innerText = "HIT ATTACK ON THE TINY GREEN TARGET!";
    }

    if (bossTimer) clearInterval(bossTimer);
    bossTimer = setInterval(drawBossCanvas, 1000/60);
}

let meterPos = 0;
let meterDir = 9.0; // 3x Faster meter speed
function drawBossCanvas() {
    const bCanvas = document.getElementById('bossCanvas');
    if (!bCanvas) return;
    const bCtx = bCanvas.getContext('2d');
    bCtx.fillStyle = '#050510'; bCtx.fillRect(0, 0, bCanvas.width, bCanvas.height);

    if (bossMode === "mash") {
        bCtx.fillStyle = '#ff0055'; bCtx.fillRect(20, 70, (bossMashCount / 25) * 300, 40);
        bCtx.strokeStyle = '#fff'; bCtx.strokeRect(20, 70, 300, 40);
        bCtx.fillStyle = '#fff'; bCtx.font = 'bold 16px Courier New'; bCtx.textAlign = 'center';
        bCtx.fillText(`MASH: ${bossMashCount} / 25`, 170, 95);
    } else {
        meterPos += meterDir;
        if (meterPos > 300 || meterPos < 0) meterDir *= -1;

        bCtx.fillStyle = '#222'; bCtx.fillRect(20, 70, 300, 40);
        // Shrunk Green Zone (Harder timing)
        bCtx.fillStyle = '#00ff00'; bCtx.fillRect(150, 70, 30, 40); 
        bCtx.fillStyle = '#ffcc00'; bCtx.fillRect(20 + meterPos, 65, 6, 50); 
    }
}

function handleBossAction() {
    if (bossMode === "mash") {
        bossMashCount++;
        if (bossMashCount >= 25) {
            damageBoss(isFinalBoss ? 120 : 60);
            startBossMinigameLoop();
        }
    } else {
        // Tight 30px hit box
        if (meterPos >= 130 && meterPos <= 160) {
            damageBoss(isFinalBoss ? 180 : 90);
            showNotification("CRITICAL HIT!");
        } else {
            playerStats.hunger = Math.max(0, playerStats.hunger - 15);
            playerStats.updateUI();
            showNotification("MISSED TIMING! -15 HUNGER!");
        }
        startBossMinigameLoop();
    }
}

function damageBoss(dmg) {
    bossHP -= dmg;
    if (bossHP <= 0) {
        clearInterval(bossTimer);
        closeModal('battle-modal');
        if (isFinalBoss) {
            triggerVictoryEnding();
        } else {
            showNotification("Naomi backed off! Keep your hygiene high!");
        }
    }
    updateBossUI();
}

function updateBossUI() {
    const max = isFinalBoss ? 1000 : 400;
    const pct = Math.max(0, (bossHP / max) * 100);
    document.getElementById('boss-hp-bar').style.width = `${pct}%`;
    document.getElementById('boss-hp-text').innerText = `${Math.max(0, bossHP)} / ${max}`;
}

function triggerVictoryEnding() {
    playerStats.credits += 1000000000;
    playerStats.updateUI();

    document.getElementById('gameover-title').innerText = "VICTORY & ESCAPE!";
    document.getElementById('gameover-title').style.color = "#00ff00";
    document.getElementById('death-reason').innerHTML = `
        <span style="color:#00ff00;">N40M1 EXPLODES IN NEON SPARKS!</span><br><br>
        All trapped souls are released from the arcade cabinets and return to human form.<br>
        In the distance, 'FFB' steps out... It's <strong>FREDDY FAZBEAR</strong>! He waves goodbye as everyone escapes!<br><br>
        The time-dilation lifts: exactly 1 year has passed outside. You walk free with <strong>$1 BILLION CREDITS!</strong>
    `;
    document.getElementById('gameover-modal').classList.remove('hidden');
}

// ==========================================
// 4. HARDCORE ACTION MINIGAME SYSTEM
// ==========================================
const machinePlays = {};

function launchActionMinigame(title, cost, winReward) {
    if ((machinePlays[title] || 0) >= 3) { showNotification("Machine out of order today! Sleep in bed."); return; }
    if (playerStats.dailyTokens < cost) { showNotification("Not enough Tokens!"); return; }

    playerStats.dailyTokens -= cost;
    playerStats.energy = Math.max(0, playerStats.energy - 20); // Higher energy cost
    machinePlays[title] = (machinePlays[title] || 0) + 1;
    playerStats.updateUI();

    document.getElementById('action-title').innerText = title;
    document.getElementById('action-desc').innerText = `Hit 8 tiny targets to earn up to ${winReward} Credits!`;
    document.getElementById('action-minigame-modal').classList.remove('hidden');

    runTargetMinigame(winReward);
}

function runTargetMinigame(maxWin) {
    const aCanvas = document.getElementById('actionCanvas');
    const aCtx = aCanvas.getContext('2d');
    let target = { x: 180, y: 140, r: 12 }; // Shrunk Target Radius
    let score = 0;
    let clicks = 0;

    function newTarget() {
        target.x = Math.random() * 280 + 40;
        target.y = Math.random() * 200 + 40;
    }

    function draw() {
        aCtx.fillStyle = '#050515'; aCtx.fillRect(0, 0, 360, 280);
        aCtx.fillStyle = '#ff0055'; aCtx.beginPath(); aCtx.arc(target.x, target.y, target.r, 0, Math.PI*2); aCtx.fill();
        aCtx.fillStyle = '#fff'; aCtx.font = 'bold 12px Courier New'; aCtx.textAlign = 'center';
        aCtx.fillText(`HITS: ${score} / 8`, 180, 20);
    }

    aCanvas.onclick = (e) => {
        const rect = aCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (Math.hypot(mx - target.x, my - target.y) < target.r) {
            score++;
            newTarget();
        }
        clicks++;

        if (score >= 8 || clicks >= 12) {
            aCanvas.onclick = null;
            closeModal('action-minigame-modal');
            const earned = Math.floor((score / 8) * maxWin);
            playerStats.credits += earned;
            playerStats.updateUI();
            createFloatingText(player.x, player.y, `+${earned} CREDITS!`, "#ffcc00");
            showNotification(`Minigame Complete! Earned ${earned} Credits.`);
        } else {
            draw();
        }
    };

    draw();
}

function resetMachinePlayLimits() { for (let k in machinePlays) machinePlays[k] = 0; }

// ==========================================
// 5. NAOMI SHOP
// ==========================================
const naomiShop = {
    steak: { name: "Steak", cost: 75, type: "food", val: 40, color: "#ff7043" },
    snack: { name: "Snack", cost: 25, type: "food", val: 15, color: "#ffca28" },
    soap: { name: "Soap", cost: 50, type: "hygiene", val: 100, color: "#29b6f6" },
    bed: { name: "Bed", cost: 350, type: "bed", val: 0, color: "#ab47bc" }
};

function buyFromNaomi(key) {
    const item = naomiShop[key];
    if (playerStats.credits < item.cost) { showNotification("Not enough credits!"); return; }
    const emptyIdx = playerStats.hotbar.findIndex(s => s === null);
    if (emptyIdx === -1) { showNotification("Hotbar full!"); return; }

    playerStats.credits -= item.cost;
    playerStats.hotbar[emptyIdx] = { ...item };
    playerStats.updateUI();
    showNotification(`Bought ${item.name}! Check hotbar.`);
}

// ==========================================
// 6. HARDCORE MINI-GAMES
// ==========================================
// Flappy Bird (Heavy Gravity)
const fCtx = document.getElementById('flappyCanvas').getContext('2d');
let fBird = { y: 180, vy: 0 }, fPipes = [], fTimer = null;

function startFlappy() {
    if (playerStats.dailyTokens < 50) { showNotification("Need 50 Tokens!"); return; }
    playerStats.dailyTokens -= 50; playerStats.updateUI();
    document.getElementById('flappy-modal').classList.remove('hidden');
    fBird.y = 180; fBird.vy = 0; fPipes = [];
    if (fTimer) clearInterval(fTimer);
    fTimer = setInterval(runFlappy, 1000/60);
}

function runFlappy() {
    fBird.vy += 0.9; // 2.25x Gravity
    fBird.y += fBird.vy;

    if (fPipes.length === 0 || fPipes[fPipes.length - 1].x < 170) {
        fPipes.push({ x: 360, top: Math.random() * 180 + 30, passed: false });
    }
    fPipes.forEach(p => p.x -= 4.0); // 1.6x Speed
    fPipes.forEach(p => {
        if (!p.passed && p.x < 60) { p.passed = true; playerStats.credits += 25; playerStats.updateUI(); createFloatingText(player.x, player.y, "+25 CR", "#ffcc00"); }
        // Shrunk gap (75px)
        if (60 > p.x && 60 < p.x + 40 && (fBird.y < p.top || fBird.y > p.top + 75)) { clearInterval(fTimer); closeModal('flappy-modal'); }
    });
    fCtx.fillStyle = '#70c5ce'; fCtx.fillRect(0, 0, 360, 380);
    fPipes.forEach(p => { fCtx.fillStyle = '#2e7d32'; fCtx.fillRect(p.x, 0, 40, p.top); fCtx.fillRect(p.x, p.top + 75, 40, 380); });
    fCtx.fillStyle = '#ffca28'; fCtx.beginPath(); fCtx.arc(60, fBird.y, 10, 0, Math.PI*2); fCtx.fill();
}

// Cyber Dodge (Dense 3x Waves)
const dCtx = document.getElementById('dodgeCanvas').getContext('2d');
let dPlayerX = 160, dObs = [], dTimer = null;

function startDodge() {
    if (playerStats.dailyTokens < 50) { showNotification("Need 50 Tokens!"); return; }
    playerStats.dailyTokens -= 50; playerStats.updateUI();
    document.getElementById('dodge-modal').classList.remove('hidden');
    dPlayerX = 160; dObs = [];
    if (dTimer) clearInterval(dTimer);
    dTimer = setInterval(runDodge, 1000/60);
}

function runDodge() {
    if (Math.random() < 0.18) dObs.push({ x: Math.random() * 320, y: 0, speed: Math.random() * 5 + 6 });
    dObs.forEach(o => o.y += o.speed);
    dObs.forEach((o, i) => {
        if (o.y > 340 && Math.abs(o.x - dPlayerX) < 30) { clearInterval(dTimer); closeModal('dodge-modal'); }
        if (o.y > 380) { dObs.splice(i, 1); playerStats.credits += 10; playerStats.updateUI(); createFloatingText(player.x, player.y, "+10 CR", "#ffcc00"); }
    });
    dCtx.fillStyle = '#050515'; dCtx.fillRect(0, 0, 360, 380);
    dCtx.fillStyle = '#00d2ff'; dCtx.fillRect(dPlayerX, 340, 30, 20);
    dCtx.fillStyle = '#ff0055'; dObs.forEach(o => dCtx.fillRect(o.x, o.y, 25, 25));
}

// Neon Catch (Small Paddle, High Speed)
const cCtx = document.getElementById('catchCanvas').getContext('2d');
let cPaddleX = 150, cItems = [], cTimer = null;

function startCatch() {
    if (playerStats.dailyTokens < 50) { showNotification("Need 50 Tokens!"); return; }
    playerStats.dailyTokens -= 50; playerStats.updateUI();
    document.getElementById('catch-modal').classList.remove('hidden');
    cPaddleX = 150; cItems = [];
    if (cTimer) clearInterval(cTimer);
    cTimer = setInterval(runCatch, 1000/60);
}

function runCatch() {
    if (Math.random() < 0.08) cItems.push({ x: Math.random() * 330, y: 0 });
    cItems.forEach(it => it.y += 7.5);
    cItems.forEach((it, i) => {
        if (it.y > 340 && it.x > cPaddleX - 5 && it.x < cPaddleX + 35) {
            cItems.splice(i, 1); playerStats.credits += 20; playerStats.updateUI(); createFloatingText(player.x, player.y, "+20 CR", "#ffcc00");
        } else if (it.y > 380) cItems.splice(i, 1);
    });
    cCtx.fillStyle = '#100515'; cCtx.fillRect(0, 0, 360, 380);
    cCtx.fillStyle = '#ff0055'; cCtx.fillRect(cPaddleX, 350, 30, 15); // Half paddle width
    cCtx.fillStyle = '#ffcc00'; cItems.forEach(it => { cCtx.beginPath(); cCtx.arc(it.x, it.y, 8, 0, Math.PI*2); cCtx.fill(); });
}

// KEYBOARD CONTROLS
window.addEventListener('keydown', e => {
    if (e.code === 'Space') {
        if (!document.getElementById('flappy-modal').classList.contains('hidden')) fBird.vy = -8.5;
    }
    if (e.key === 'a' || e.key === 'ArrowLeft') { dPlayerX = Math.max(0, dPlayerX - 22); cPaddleX = Math.max(0, cPaddleX - 22); }
    if (e.key === 'd' || e.key === 'ArrowRight') { dPlayerX = Math.min(330, dPlayerX + 22); cPaddleX = Math.min(330, cPaddleX + 22); }
    if (e.key >= '1' && e.key <= '9') selectSlot(parseInt(e.key) - 1);
    if (e.key.toLowerCase() === 'e') checkInteraction();
});

// ==========================================
// 7. RENDER WORLD & ANIMATIONS
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

const player = { x: 600, y: 500, w: 80, h: 80, speed: 7.5 };

const worldObjects = [
    { id: 'naomi', name: "Naomi's Counter", x: 600, y: 80, w: 360, h: 140 },
    { id: 'flappy', name: "FLAPPY BIRD", x: 100, y: 260, w: 160, h: 240, color: '#ffcc00' },
    { id: 'dodge', name: "CYBER DODGE", x: 300, y: 260, w: 160, h: 240, color: '#00d2ff' },
    { id: 'catch', name: "NEON CATCH", x: 500, y: 260, w: 160, h: 240, color: '#ff0055' },

    { id: 'm1', name: "Dig Dug", x: 100, y: 560, w: 160, h: 240, color: '#2196f3', cost: 20, win: 30 },
    { id: 'm2', name: "OutRun 2", x: 300, y: 560, w: 160, h: 240, color: '#e91e63', cost: 20, win: 35 },
    { id: 'm3', name: "NBA Hoops", x: 500, y: 560, w: 160, h: 240, color: '#9c27b0', cost: 20, win: 40 },
    { id: 'm4', name: "Time Crisis", x: 700, y: 560, w: 160, h: 240, color: '#ff9800', cost: 20, win: 45 },

    { id: 'cursed', name: "Cursed Cabinet", x: 700, y: 260, w: 160, h: 240, color: '#ff0000' },
    { id: 'terminal', name: "Secret Terminal", x: 1100, y: 100, w: 140, h: 140 }
];

const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function checkDistanceToNaomi() {
    return Math.hypot((player.x + 40) - (600 + 180), (player.y + 40) - (80 + 70));
}

function checkInteraction() {
    if (useSelectedItem()) return;

    let near = null;
    worldObjects.forEach(obj => {
        const dist = Math.hypot((obj.x + obj.w/2) - (player.x + player.w/2), (obj.y + obj.h/2) - (player.y + player.h/2));
        if (dist < 180) near = obj;
    });

    if (playerStats.placedBed) {
        const bed = playerStats.placedBed;
        const distBed = Math.hypot((bed.x + bed.w/2) - (player.x + player.w/2), (bed.y + bed.h/2) - (player.y + player.h/2));
        if (distBed < 180) { playerStats.sleep(); return; }
    }

    if (!near) return;
    if (near.id === 'naomi') document.getElementById('shop-modal').classList.remove('hidden');
    else if (near.id === 'flappy') startFlappy();
    else if (near.id === 'dodge') startDodge();
    else if (near.id === 'catch') startCatch();
    else if (near.id === 'cursed') document.getElementById('cursed-modal').classList.remove('hidden');
    else if (near.id.startsWith('m')) launchActionMinigame(near.name, near.cost, near.win);
    else if (near.id === 'terminal') document.getElementById('terminal-modal').classList.remove('hidden');
}

function drawArcadeCabinet(obj) {
    ctx.fillStyle = '#15151e'; ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.strokeStyle = obj.color; ctx.lineWidth = 6; ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

    ctx.fillStyle = obj.color; ctx.fillRect(obj.x + 10, obj.y + 10, obj.w - 20, 36);
    ctx.fillStyle = '#000'; ctx.font = 'bold 12px Courier New'; ctx.textAlign = 'center';
    ctx.fillText(obj.id === 'cursed' ? "FFB SCORE" : "ARCADE", obj.x + obj.w/2, obj.y + 32);

    ctx.fillStyle = obj.id === 'cursed' ? '#330000' : '#0a0a12';
    ctx.fillRect(obj.x + 15, obj.y + 55, obj.w - 30, 85);
    ctx.fillStyle = obj.color; ctx.globalAlpha = 0.35;
    ctx.fillRect(obj.x + 20, obj.y + 60, obj.w - 40, 75);
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = '#222'; ctx.fillRect(obj.x + 10, obj.y + 155, obj.w - 20, 45);
    ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(obj.x + 35, obj.y + 178, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(obj.x + 85, obj.y + 178, 8, 0, Math.PI * 2); ctx.arc(obj.x + 115, obj.y + 178, 8, 0, Math.PI * 2); ctx.fill();
}

function drawNaomiCounter(obj) {
    ctx.fillStyle = '#5c3a21'; ctx.fillRect(obj.x, obj.y + 40, obj.w, obj.h - 40);
    ctx.fillStyle = '#8b5a2b'; ctx.fillRect(obj.x - 12, obj.y + 25, obj.w + 24, 25);

    ctx.fillStyle = '#e91e63'; ctx.beginPath(); ctx.arc(obj.x + obj.w/2, obj.y - 10, 36, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffdbac'; ctx.beginPath(); ctx.arc(obj.x + obj.w/2, obj.y - 4, 26, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px Courier New'; ctx.textAlign = 'center';
    ctx.fillText("N40M1 COUNTER", obj.x + obj.w/2, obj.y + 85);
}

function drawTerminal(obj) {
    ctx.fillStyle = '#222'; ctx.fillRect(obj.x, obj.y + 50, obj.w, obj.h - 50);
    ctx.fillStyle = '#002200'; ctx.fillRect(obj.x + 12, obj.y, obj.w - 24, 60);
    ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 4; ctx.strokeRect(obj.x + 12, obj.y, obj.w - 24, 60);
    ctx.fillStyle = '#00ff00'; ctx.font = 'bold 12px Courier New'; ctx.textAlign = 'center';
    ctx.fillText(">_1000 CR", obj.x + obj.w/2, obj.y + 36);
}

function drawPlacedBed(bed) {
    ctx.fillStyle = '#4a2e18'; ctx.fillRect(bed.x, bed.y, bed.w, bed.h);
    ctx.fillStyle = '#2196f3'; ctx.fillRect(bed.x + 10, bed.y + 25, bed.w - 20, bed.h - 35);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(bed.x + 15, bed.y + 8, bed.w - 30, 20);

    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px Courier New'; ctx.textAlign = 'center';
    ctx.fillText("BED (Press E)", bed.x + bed.w / 2, bed.y - 10);
}

function drawPlayerSprite() {
    const px = player.x, py = player.y;

    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(px + 40, py + 72, 32, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#00ffcc'; ctx.fillRect(px + 18, py + 30, 44, 34);
    ctx.fillStyle = '#111122'; ctx.fillRect(px + 22, py + 64, 14, 16); ctx.fillRect(px + 44, py + 64, 14, 16);
    ctx.fillStyle = '#ffdbac'; ctx.fillRect(px + 22, py + 8, 36, 26);
    ctx.fillStyle = '#3e2723'; ctx.fillRect(px + 18, py + 2, 44, 12);
    ctx.fillStyle = '#000'; ctx.fillRect(px + 28, py + 18, 5, 6); ctx.fillRect(px + 46, py + 18, 5, 6);
}

function drawWorld() {
    ctx.fillStyle = '#0a0a10'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#181826'; ctx.lineWidth = 2;
    for (let x = 0; x < canvas.width; x += 80) {
        for (let y = 0; y < canvas.height; y += 80) ctx.strokeRect(x, y, 80, 80);
    }

    worldObjects.forEach(obj => {
        if (obj.id === 'naomi') drawNaomiCounter(obj);
        else if (obj.id === 'terminal') drawTerminal(obj);
        else drawArcadeCabinet(obj);

        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px Courier New'; ctx.textAlign = 'center';
        ctx.fillText(obj.name, obj.x + obj.w / 2, obj.y - 12);
    });

    if (playerStats.placedBed) drawPlacedBed(playerStats.placedBed);

    // Render particles
    particles.forEach((p, i) => {
        ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill();
        p.alpha -= 0.02;
        if (p.alpha <= 0) particles.splice(i, 1);
    });

    drawPlayerSprite();

    // Render floating text numbers
    floatingTexts.forEach((ft, i) => {
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 16px Courier New';
        ctx.fillText(ft.text, ft.x + 40, ft.y);
        ft.y += ft.dy;
        ft.alpha -= 0.02;
        if (ft.alpha <= 0) floatingTexts.splice(i, 1);
    });
}

function gameLoop() {
    let moved = false;
    if (!playerStats.isDead) {
        if (keys['w'] || keys['arrowup']) { player.y = Math.max(20, player.y - player.speed); moved = true; }
        if (keys['s'] || keys['arrowdown']) { player.y = Math.min(canvas.height - player.h - 20, player.y + player.speed); moved = true; }
        if (keys['a'] || keys['arrowleft']) { player.x = Math.max(20, player.x - player.speed); moved = true; }
        if (keys['d'] || keys['arrowright']) { player.x = Math.min(canvas.width - player.w - 20, player.x + player.speed); moved = true; }
        if (moved && Math.random() < 0.3) addParticle(player.x + 40, player.y + 70);
    }
    drawWorld();
    requestAnimationFrame(gameLoop);
}

playerStats.updateUI();
requestAnimationFrame(gameLoop);
