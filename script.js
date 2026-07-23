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
    placedBed: null,
    isDead: false,

    decay() {
        if (this.isDead) return;

        this.hunger = Math.max(0, this.hunger - 0.3);
        this.energy = Math.max(0, this.energy - 0.25);
        this.hygiene = Math.max(0, this.hygiene - 0.2);

        if (this.hunger <= 0) {
            triggerGameOver("You passed out from severe starvation!");
            return;
        }

        if (this.hygiene < 15 && checkDistanceToNaomi() < 220) {
            startNaomiBattle("RULE VIOLATION: Poor Hygiene near Naomi's Counter!");
        }

        this.updateUI();
    },

    sleep() {
        if (!this.placedBed) { showNotification("Buy and place a bed first!"); return; }
        this.energy = this.maxEnergy;
        this.dailyTokens = 1000;
        resetMachinePlayLimits();
        this.updateUI();
        showNotification("Slept well! Daily tokens & energy restored.");
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
    setTimeout(() => el.classList.remove('show'), 2500);
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
        showNotification(`Ate ${item.name}! +${item.val} Hunger.`);
        playerStats.hotbar[idx] = null;
        playerStats.updateUI();
        return true;
    } else if (item.type === "hygiene") {
        playerStats.hygiene = playerStats.maxHygiene;
        showNotification(`Used ${item.name}! Hygiene restored.`);
        playerStats.hotbar[idx] = null;
        playerStats.updateUI();
        return true;
    } else if (item.type === "bed") {
        if (playerStats.placedBed) {
            showNotification("Bed is already placed!");
            return true;
        }
        playerStats.placedBed = { x: player.x - 40, y: player.y + 60, w: 160, h: 100 };
        playerStats.hotbar[idx] = null;
        playerStats.updateUI();
        showNotification("Bed placed! Press E near it to sleep.");
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

const storyDialogue = [
    {
        header: ">_ TERMINAL LOG #01",
        body: "I have to be quick... well done for figuring out the binary code from the high score boards.\n\nYou think you've only been trapped here a few months, don't you?",
        btn: "Read Next"
    },
    {
        header: ">_ TERMINAL LOG #02",
        body: "Look around you... each machine houses the soul of a person who attempted this challenge before you.\n\nThey are trapped in these cabinets for all eternity... and if you don't escape, you will become a machine too.",
        btn: "Ask question..."
    },
    {
        header: ">_ PLAYER INPUT LOG",
        body: "You type into the terminal: 'How long have we actually been in here?'\n\nFFB responds:\n'10 YEARS.'",
        btn: "What?!"
    },
    {
        header: ">_ TERMINAL LOG #03",
        body: "Any day now, you will become N40M1's next servant for all eternity.\n\nThere is only one way out: You must challenge N40M1 to a 1,000-Game Showdown and beat her at every game!",
        btn: "Challenge N40M1!"
    }
];

function submitPasscode() {
    const input = document.getElementById('terminal-input').value.trim().toUpperCase();
    if (input === "DONTTRUSTNAOMI") {
        closeModal('terminal-modal');
        storyStep = 0;
        showStoryStep();
    } else {
        showNotification("INVALID ACCESS CODE!");
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
    document.getElementById('battle-desc').innerText = "Naomi grins: 'Be warned! If you lose, your soul is mine forever!'";
    document.getElementById('battle-modal').classList.remove('hidden');
    updateBossUI();
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
    const dmg = isFinalBoss ? 50 : 25;
    bossHP -= dmg;
    if (bossHP <= 0) {
        closeModal('battle-modal');
        if (isFinalBoss) {
            triggerVictoryEnding();
        } else {
            showNotification("Naomi backed off! Maintain hygiene!");
        }
    }
    updateBossUI();
}

function updateBossUI() {
    const max = isFinalBoss ? 1000 : 100;
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
        All trapped souls are released from the arcade cabinets and turn back into human beings.<br>
        In the distance, you see 'FFB' step out... It's <strong>FREDDY FAZBEAR</strong>! He blows you a kiss and waves goodbye as everyone escapes!<br><br>
        The time-dilation lifts: exactly 1 year has passed outside. You walk free with <strong>$1 BILLION CREDITS!</strong>
    `;
    document.getElementById('gameover-modal').classList.remove('hidden');
}

// ==========================================
// 4. SHOP & MACHINES
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
    showNotification(`Bought ${item.name}! Check hotbar.`);
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
    showNotification(`Played ${name}! +${win} Credits! Score: FFB [BINARY CLUE]`);
}

function resetMachinePlayLimits() { for (let k in machinePlays) machinePlays[k] = 0; }

// ==========================================
// 5. PLAYABLE MINIGAMES
// ==========================================
// Flappy Bird
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

// Cyber Dodge
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

// Neon Catch
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

// KEYBOARD CONTROLS
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
// 6. RENDER WORLD & CANVAS GRAPHICS
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

const player = { x: 600, y: 500, w: 80, h: 80, speed: 7.5 };

const worldObjects = [
    { id: 'naomi', name: "Naomi's Counter", x: 600, y: 80, w: 360, h: 140 },
    { id: 'flappy', name: "FLAPPY BIRD", x: 100, y: 260, w: 160, h: 240, color: '#ffca28' },
    { id: 'dodge', name: "CYBER DODGE", x: 300, y: 260, w: 160, h: 240, color: '#00d2ff' },
    { id: 'catch', name: "NEON CATCH", x: 500, y: 260, w: 160, h: 240, color: '#ff0055' },

    { id: 'm1', name: "Dig Dug", x: 100, y: 560, w: 160, h: 240, color: '#2196f3', cost: 10, win: 20 },
    { id: 'm2', name: "OutRun 2", x: 300, y: 560, w: 160, h: 240, color: '#e91e63', cost: 10, win: 25 },
    { id: 'm3', name: "NBA Hoops", x: 500, y: 560, w: 160, h: 240, color: '#9c27b0', cost: 10, win: 30 },
    { id: 'm4', name: "Time Crisis", x: 700, y: 560, w: 160, h: 240, color: '#ff9800', cost: 10, win: 35 },

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
        if (distBed < 180) {
            playerStats.sleep();
            return;
        }
    }

    if (!near) return;
    if (near.id === 'naomi') document.getElementById('shop-modal').classList.remove('hidden');
    else if (near.id === 'flappy') startFlappy();
    else if (near.id === 'dodge') startDodge();
    else if (near.id === 'catch') startCatch();
    else if (near.id === 'cursed') document.getElementById('cursed-modal').classList.remove('hidden');
    else if (near.id.startsWith('m')) playMachine(near.name, near.cost, near.win);
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
    drawPlayerSprite();
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
