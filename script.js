// ==========================================
// 1. STATS, DECAY & DEATH SYSTEM
// ==========================================
const playerStats = {
    hunger: 100, maxHunger: 100,
    energy: 100, maxEnergy: 100,
    hygiene: 100, maxHygiene: 100,
    dailyTokens: 1000, credits: 0,
    hotbar: new Array(9).fill(null),
    selectedSlot: 0,
    hasBedPlaced: false,
    isDead: false,

    decay() {
        if (this.isDead) return;

        this.hunger = Math.max(0, this.hunger - 0.4);
        this.energy = Math.max(0, this.energy - 0.3);
        this.hygiene = Math.max(0, this.hygiene - 0.2);

        // DEATH CONDITION 1: STARVATION OR EXHAUSTION
        if (this.hunger <= 0) {
            triggerGameOver("You passed out from severe starvation!");
            return;
        }

        // RULE BREAKING CONDITION: Naomi spots dirty player breaking arcade rules
        if (this.hygiene < 15 && checkDistanceToNaomi() < 220) {
            startNaomiBattle("RULE VIOLATION: Poor Hygiene near Naomi's Counter!");
        }

        this.updateUI();
    },

    sleep() {
        if (!this.hasBedPlaced) { showNotification("Buy and place a bed first!"); return; }
        this.energy = this.maxEnergy;
        this.dailyTokens = 1000;
        resetMachinePlayLimits();
        this.updateUI();
        showNotification("Slept well! Tokens & Energy fully restored.");
    },

    updateUI() {
        document.getElementById('hunger-bar').style.width = `${this.hunger}%`;
        document.getElementById('energy-bar').style.width = `${this.energy}%`;
        document.getElementById('hygiene-bar').style.width = `${this.hygiene}%`;
        document.getElementById('token-display').innerText = this.dailyTokens;
        document.getElementById('credit-display').innerText = this.credits;
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

setInterval(() => playerStats.decay(), 2000);

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

// ==========================================
// 2. SECRET TERMINAL & NAOMI BOSS SHOWDOWN
// ==========================================
let bossHP = 100;
let isFinalBoss = false;

function submitPasscode() {
    const input = document.getElementById('terminal-input').value.trim().toUpperCase();
    closeModal('terminal-modal');

    if (input === "DONTTRUSTNAOMI") {
        isFinalBoss = true;
        bossHP = 1000; // 1,000 Game Showdown!
        document.getElementById('battle-title').innerText = "NAOMI 1,000-GAME SHOWDOWN";
        document.getElementById('battle-desc').innerText = "Defeat Naomi to restore trapped souls and win $1 Billion!";
        document.getElementById('battle-modal').classList.remove('hidden');
        updateBossUI();
    } else {
        showNotification("INVALID ACCESS CODE!");
    }
}

function startNaomiBattle(reason) {
    isFinalBoss = false;
    bossHP = 100;
    document.getElementById('battle-title').innerText = "NAOMI ENFORCEMENT BATTLE";
    document.getElementById('battle-desc').innerText = reason;
    document.getElementById('battle-modal').classList.remove('hidden');
    updateBossUI();
}

function attackNaomi() {
    const dmg = isFinalBoss ? 25 : 20;
    bossHP -= dmg;
    if (bossHP <= 0) {
        closeModal('battle-modal');
        if (isFinalBoss) {
            playerStats.credits += 1000000000;
            playerStats.updateUI();
            showNotification("YOU DEFEATED NAOMI! SOULS RESTORED & $1 BILLION CREDITS WON!", 5000);
        } else {
            showNotification("Naomi backed off! Keep your hygiene clean!");
        }
    }
    updateBossUI();
}

function updateBossUI() {
    const max = isFinalBoss ? 1000 : 100;
    const pct = Math.max(0, (bossHP / max) * 100);
    document.getElementById('boss-hp-bar').style.width = `${pct}%`;
    document.getElementById('boss-hp-text').innerText = `${bossHP} / ${max}`;
}

// ==========================================
// 3. SHOP & MACHINES (INCL. 3 NEW MACHINES)
// ==========================================
const naomiShop = {
    steak: { name: "Steak", cost: 50, type: "food", val: 40, color: "#ff7043" },
    snack: { name: "Snack", cost: 15, type: "food", val: 15, color: "#ffca28" },
    soap: { name: "Soap", cost: 30, type: "hygiene", val: 100, color: "#29b6f6" },
    bed: { name: "Bed", cost: 200, type: "bed", val: 0, color: "#ab47bc" }
};

function buyFromNaomi(key) {
    const item = naomiShop[key];
    if (playerStats.credits < item.cost) { showNotification("Not enough credits!"); return; }
    const emptyIdx = playerStats.hotbar.findIndex(s => s === null);
    if (emptyIdx === -1) { showNotification("Hotbar full!"); return; }

    playerStats.credits -= item.cost;
    playerStats.hotbar[emptyIdx] = { ...item };
    playerStats.updateUI();
    showNotification(`Bought ${item.name}!`);
}

const machinePlays = {};
function playMachine(name, cost, win) {
    if ((machinePlays[name] || 0) >= 3) { showNotification("Machine out of order today! Sleep in bed."); return; }
    if (playerStats.dailyTokens < cost) { showNotification("Not enough Tokens!"); return; }

    playerStats.dailyTokens -= cost;
    playerStats.energy = Math.max(0, playerStats.energy - 8);
    machinePlays[name] = (machinePlays[name] || 0) + 1;
    playerStats.credits += win;
    playerStats.updateUI();
    showNotification(`Played ${name}! +${win} Credits!`);
}

function resetMachinePlayLimits() { for (let k in machinePlays) machinePlays[k] = 0; }

// ==========================================
// 4. 3 PLAYABLE CANVAS MINIGAMES (Flappy, Dodge, Catch)
// ==========================================
// A. Flappy Bird
const fCtx = document.getElementById('flappyCanvas').getContext('2d');
let fBird = { y: 180, vy: 0 }, fPipes = [], fScore = 0, fTimer = null;

function startFlappy() {
    if (playerStats.dailyTokens < 30) { showNotification("Need 30 Tokens!"); return; }
    playerStats.dailyTokens -= 30; playerStats.updateUI();
    document.getElementById('flappy-modal').classList.remove('hidden');
    fBird.y = 180; fBird.vy = 0; fPipes = []; fScore = 0;
    if (fTimer) clearInterval(fTimer);
    fTimer = setInterval(runFlappy, 1000/60);
}

function runFlappy() {
    fBird.vy += 0.4; fBird.y += fBird.vy;
    if (fPipes.length === 0 || fPipes[fPipes.length - 1].x < 200) {
        fPipes.push({ x: 360, top: Math.random() * 180 + 30, passed: false });
    }
    fPipes.forEach(p => p.x -= 2.5);
    fPipes.forEach(p => {
        if (!p.passed && p.x < 60) { p.passed = true; fScore++; playerStats.credits += 15; playerStats.updateUI(); }
        if (60 > p.x && 60 < p.x + 40 && (fBird.y < p.top || fBird.y > p.top + 110)) { clearInterval(fTimer); closeModal('flappy-modal'); }
    });
    fCtx.fillStyle = '#70c5ce'; fCtx.fillRect(0, 0, 360, 380);
    fPipes.forEach(p => { fCtx.fillStyle = '#2e7d32'; fCtx.fillRect(p.x, 0, 40, p.top); fCtx.fillRect(p.x, p.top + 110, 40, 380); });
    fCtx.fillStyle = '#ffca28'; fCtx.beginPath(); fCtx.arc(60, fBird.y, 12, 0, Math.PI*2); fCtx.fill();
}

// B. Cyber Dodge (New Playable Game 1)
const dCtx = document.getElementById('dodgeCanvas').getContext('2d');
let dPlayerX = 160, dObs = [], dScore = 0, dTimer = null;

function startDodge() {
    if (playerStats.dailyTokens < 30) { showNotification("Need 30 Tokens!"); return; }
    playerStats.dailyTokens -= 30; playerStats.updateUI();
    document.getElementById('dodge-modal').classList.remove('hidden');
    dPlayerX = 160; dObs = []; dScore = 0;
    if (dTimer) clearInterval(dTimer);
    dTimer = setInterval(runDodge, 1000/60);
}

function runDodge() {
    if (Math.random() < 0.05) dObs.push({ x: Math.random() * 320, y: 0, speed: Math.random() * 3 + 2 });
    dObs.forEach(o => o.y += o.speed);
    dObs.forEach((o, i) => {
        if (o.y > 350 && Math.abs(o.x - dPlayerX) < 30) { clearInterval(dTimer); closeModal('dodge-modal'); }
        if (o.y > 380) { dObs.splice(i, 1); dScore++; playerStats.credits += 10; playerStats.updateUI(); }
    });
    dCtx.fillStyle = '#050515'; dCtx.fillRect(0, 0, 360, 380);
    dCtx.fillStyle = '#00d2ff'; dCtx.fillRect(dPlayerX, 340, 40, 20);
    dCtx.fillStyle = '#ff0055'; dObs.forEach(o => dCtx.fillRect(o.x, o.y, 25, 25));
}

// C. Neon Catch (New Playable Game 2)
const cCtx = document.getElementById('catchCanvas').getContext('2d');
let cPaddleX = 150, cItems = [], cScore = 0, cTimer = null;

function startCatch() {
    if (playerStats.dailyTokens < 30) { showNotification("Need 30 Tokens!"); return; }
    playerStats.dailyTokens -= 30; playerStats.updateUI();
    document.getElementById('catch-modal').classList.remove('hidden');
    cPaddleX = 150; cItems = []; cScore = 0;
    if (cTimer) clearInterval(cTimer);
    cTimer = setInterval(runCatch, 1000/60);
}

function runCatch() {
    if (Math.random() < 0.04) cItems.push({ x: Math.random() * 330, y: 0 });
    cItems.forEach(it => it.y += 3);
    cItems.forEach((it, i) => {
        if (it.y > 340 && it.x > cPaddleX - 10 && it.x < cPaddleX + 60) {
            cItems.splice(i, 1); cScore++; playerStats.credits += 20; playerStats.updateUI();
        } else if (it.y > 380) cItems.splice(i, 1);
    });
    cCtx.fillStyle = '#100515'; cCtx.fillRect(0, 0, 360, 380);
    cCtx.fillStyle = '#ff0055'; cCtx.fillRect(cPaddleX, 350, 60, 15);
    cCtx.fillStyle = '#ffcc00'; cItems.forEach(it => { cCtx.beginPath(); cCtx.arc(it.x, it.y, 8, 0, Math.PI*2); cCtx.fill(); });
}

// KEYBOARD CONTROL FOR MINIGAMES & MOVEMENT
window.addEventListener('keydown', e => {
    if (e.code === 'Space') {
        if (!document.getElementById('flappy-modal').classList.contains('hidden')) fBird.vy = -6.5;
    }
    if (e.key === 'a' || e.key === 'ArrowLeft') { dPlayerX = Math.max(0, dPlayerX - 18); cPaddleX = Math.max(0, cPaddleX - 18); }
    if (e.key === 'd' || e.key === 'ArrowRight') { dPlayerX = Math.min(320, dPlayerX + 18); cPaddleX = Math.min(300, cPaddleX + 18); }
    if (e.key >= '1' && e.key <= '9') selectSlot(parseInt(e.key) - 1);
    if (e.key.toLowerCase() === 'e') checkInteraction();
});

// ==========================================
// 5. CANVAS WORLD & 2X DOUBLED CABINETS
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

const player = { x: 600, y: 500, w: 80, h: 80, speed: 7.5 };

// WORLD OBJECTS (INCLUDES 3 NEW NORMAL GAMES & 2 NEW PLAYABLES)
const worldObjects = [
    { id: 'naomi', name: "Naomi's Counter", x: 600, y: 80, w: 360, h: 140 },
    { id: 'flappy', name: "FLAPPY BIRD", x: 100, y: 260, w: 160, h: 240, color: '#ffca28' },
    { id: 'dodge', name: "CYBER DODGE", x: 300, y: 260, w: 160, h: 240, color: '#00d2ff' },
    { id: 'catch', name: "NEON CATCH", x: 500, y: 260, w: 160, h: 240, color: '#ff0055' },

    // NORMAL GAMES (Token -> Credit Rewards)
    { id: 'm1', name: "Cyber Racer", x: 100, y: 560, w: 160, h: 240, color: '#2196f3', cost: 100, win: 50 },
    { id: 'm2', name: "Neon Fighter", x: 300, y: 560, w: 160, h: 240, color: '#e91e63', cost: 100, win: 75 },
    { id: 'm3', name: "Galaxy Blaster", x: 500, y: 560, w: 160, h: 240, color: '#9c27b0', cost: 100, win: 60 },
    { id: 'm4', name: "Speed Demon", x: 700, y: 560, w: 160, h: 240, color: '#ff9800', cost: 100, win: 80 },
    { id: 'm5', name: "Zombie Strike", x: 900, y: 560, w: 160, h: 240, color: '#4caf50', cost: 120, win: 100 },

    { id: 'terminal', name: "Secret Terminal", x: 1200, y: 100, w: 140, h: 140 },
    { id: 'bed', name: "Rest Bed", x: 1250, y: 560, w: 220, h: 150 }
];

const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function checkDistanceToNaomi() {
    return Math.hypot((player.x + 40) - (600 + 180), (player.y + 40) - (80 + 70));
}

function checkInteraction() {
    let near = null;
    worldObjects.forEach(obj => {
        const dist = Math.hypot((obj.x + obj.w/2) - (player.x + player.w/2), (obj.y + obj.h/2) - (player.y + player.h/2));
        if (dist < 180) near = obj;
    });

    if (!near) return;
    if (near.id === 'naomi') document.getElementById('shop-modal').classList.remove('hidden');
    else if (near.id === 'flappy') startFlappy();
    else if (near.id === 'dodge') startDodge();
    else if (near.id === 'catch') startCatch();
    else if (near.id.startsWith('m')) playMachine(near.name, near.cost, near.win);
    else if (near.id === 'terminal') document.getElementById('terminal-modal').classList.remove('hidden');
    else if (near.id === 'bed') playerStats.sleep();
}

function drawWorld() {
    ctx.fillStyle = '#0a0a10'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    worldObjects.forEach(obj => {
        if (obj.id === 'naomi') {
            ctx.fillStyle = '#5c3a21'; ctx.fillRect(obj.x, obj.y + 40, obj.w, obj.h - 40);
            ctx.fillStyle = '#e91e63'; ctx.beginPath(); ctx.arc(obj.x + obj.w/2, obj.y - 10, 36, 0, Math.PI*2); ctx.fill();
        } else if (obj.id === 'terminal') {
            ctx.fillStyle = '#002200'; ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 3; ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
        } else if (obj.id === 'bed' && playerStats.hasBedPlaced) {
            ctx.fillStyle = '#2196f3'; ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
        } else if (obj.color) {
            ctx.fillStyle = '#15151e'; ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = obj.color; ctx.lineWidth = 5; ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
        }
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Courier New'; ctx.textAlign = 'center';
        ctx.fillText(obj.name, obj.x + obj.w/2, obj.y - 10);
    });

    // Draw Player
    ctx.fillStyle = '#00ffcc'; ctx.fillRect(player.x, player.y, player.w, player.h);
}

function gameLoop() {
    if (!playerStats.isDead) {
        if (keys['w'] || keys['arrowup']) player.y = Math.max(20, player.y - player.speed);
        if (keys['s'] || keys['arrowdown']) player.y = Math.min(canvas.height - player.h - 20, player.y + player.speed);
        if (keys['a'] || keys['arrowleft']) player.x = Math.max(20, player.x - player.speed);
        if (keys['d'] || keys['arrowright']) player.x = Math.min(canvas.width - player.w - 20, player.x + player.speed);
    }
    drawWorld();
    requestAnimationFrame(gameLoop);
}

playerStats.updateUI();
requestAnimationFrame(gameLoop);
