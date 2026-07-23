// Game State Tracker
const state = {
  day: 1,
  tokens: 1000,
  credits: 0,
  timeDilationAbility: false,
  hasBed: false,
  discoveredFFB: false,
  unlockedCabinet: false,
  naomiChallenged: false,
  gamesWonAgainstNaomi: 0,
  gamesLostToNaomi: 0
};

// DOM Elements
const statDay = document.getElementById('stat-day');
const statTokens = document.getElementById('stat-tokens');
const statCredits = document.getElementById('stat-credits');
const statTime = document.getElementById('stat-time');
const storyText = document.getElementById('story-text');
const choicesContainer = document.getElementById('choices-container');

// Helper to update the UI Bar
function updateUI() {
  statDay.innerText = state.day;
  statTokens.innerText = state.tokens;
  statCredits.innerText = state.credits;
  statTime.innerText = state.timeDilationAbility ? "Active (10% Speed)" : "Off";
}

// Helper to print text to story window
function renderText(text) {
  storyText.innerHTML = `<p>${text}</p>`;
}

// Helper to render choice buttons
function renderChoices(choices) {
  choicesContainer.innerHTML = '';
  choices.forEach(choice => {
    const button = document.createElement('button');
    button.className = 'btn';
    button.innerText = choice.text;
    button.onclick = choice.action;
    choicesContainer.appendChild(button);
  });
}

// --- STORY SCENES ---

// Scene 1: Introduction
function sceneStart() {
  updateUI();
  renderText(
    "Welcome to the $1 Billion Arcade Challenge. The rules are simple: Survive 1 year alone inside a boarded-up Dave & Buster's. Every day you receive 1,000 non-transferable tokens. Play arcade games to win credits, and trade those credits with N40M1 (Naomi), the robot clerk, for necessities."
  );

  renderChoices([
    { text: "Explore the arcade games", action: sceneArcadeFloor },
    { text: "Visit N40M1 at the Credit Counter", action: sceneCounter },
    { text: "Look around for anything unusual", action: sceneSecretCabinet }
  ]);
}

// Scene 2: Arcade Floor
function sceneArcadeFloor() {
  renderText(
    "You walk past endless rows of flashing arcades. You can play quick, low-cost games like Skee-Ball, or go for high-stakes games like Flappy Bird."
  );

  let choices = [
    {
      text: "Play Skee-Ball (Costs 10 Tokens, Wins 50 Credits)",
      action: () => {
        if (state.tokens >= 10) {
          state.tokens -= 10;
          state.credits += 50;
          updateUI();
          renderText("You score nicely on Skee-Ball and pocket 50 credits!");
        } else {
          renderText("You don't have enough tokens left today!");
        }
        renderChoices([
          { text: "Keep playing games", action: sceneArcadeFloor },
          { text: "Go somewhere else", action: sceneStart }
        ]);
      }
    },
    {
      text: "Play Flappy Bird Arcade (Costs 100 Tokens, Wins 500 Credits)",
      action: () => {
        if (state.tokens >= 100) {
          state.tokens -= 100;
          state.credits += 500;
          updateUI();
          renderText("High stakes pay off! You hit the jackpot for 500 credits!");
        } else {
          renderText("You don't have enough tokens left today!");
        }
        renderChoices([
          { text: "Keep playing games", action: sceneArcadeFloor },
          { text: "Go somewhere else", action: sceneStart }
        ]);
      }
    }
  ];

  if (state.day >= 60 && !state.discoveredFFB) {
    choices.push({
      text: "Inspect high score boards closely...",
      action: sceneDiscoverFFB
    });
  }

  choices.push({ text: "Back to main area", action: sceneStart });
  renderChoices(choices);
}

// Scene 3: Credit Counter
function sceneCounter() {
  renderText(
    "N40M1 stands behind the counter with a metallic, mechanical smile. 'Greetings! Exchange your earned credits for survival supplies here.'"
  );

  renderChoices([
    {
      text: "Buy Full-Course Steak Meal (200 Credits)",
      action: () => {
        if (state.credits >= 200) {
          state.credits -= 200;
          updateUI();
          renderText("N40M1 hands you a delicious steak dinner. Perfect energy for surviving!");
        } else {
          renderText("N40M1 shakes her head. 'Insufficient credits.'");
        }
        renderChoices([{ text: "Back", action: sceneCounter }]);
      }
    },
    {
      text: "Buy Comfortable Bed Setup (1,000 Credits)",
      action: () => {
        if (state.credits >= 1000) {
          state.credits -= 1000;
          state.hasBed = true;
          updateUI();
          renderText("You bought a mattress and bedding! Sleep quality improved significantly.");
        } else {
          renderText("N40M1 shakes her head. 'Insufficient credits.'");
        }
        renderChoices([{ text: "Back", action: sceneCounter }]);
      }
    },
    {
      text: "Advance to the next day / Rest",
      action: () => {
        state.day += 30; // Jump days forward for story progression
        state.tokens = 1000;
        updateUI();
        if (state.day < 60) {
          renderText("Days roll by seamlessly. You eat, sleep, play games, and hoard credits.");
          renderChoices([{ text: "Continue", action: sceneStart }]);
        } else if (state.day >= 60 && !state.discoveredFFB) {
          renderText("A couple of months have passed. Your living situation is comfortable, but you notice something strange on the game scoreboards...");
          renderChoices([{ text: "Investigate scoreboards", action: sceneDiscoverFFB }]);
        } else {
          renderText(`Day ${state.day}: You rest up and receive your daily 1,000 token refresh.`);
          renderChoices([{ text: "Continue", action: sceneStart }]);
        }
      }
    },
    { text: "Leave counter", action: sceneStart }
  ]);
}

// Scene 4: Mysterious Arcade Cabinet
function sceneSecretCabinet() {
  if (!state.unlockedCabinet) {
    renderText(
      "In a dark corner sits an unbranded, mysterious black arcade cabinet. It doesn't take regular tokens—it requires **1,000 tokens** for a single play."
    );

    let choices = [];
    if (state.discoveredFFB) {
      choices.push({ text: "Type in 14-digit password on the coin screen", action: sceneSolvePuzzle });
    }
    choices.push({ text: "Walk away for now", action: sceneStart });

    renderChoices(choices);
  } else {
    sceneArcadeTerminal();
  }
}

// Scene 5: Discovering FFB Binary Code
function sceneDiscoverFFB() {
  state.discoveredFFB = true;
  renderText(
    "You check games like Dig Dug, OutRun 2, NBA Hoops, and Time Crisis. A 3-letter initial keeps taking spot #2: **FFB**. The scores are weird binary numbers: 1, 10, 110, 1000, 1010...\n\nRepresenting numbers 1 through 14, taking the first letter of each game in numerical order spells out a message: **DONTTRUSTNAOMI**."
  );

  renderChoices([
    { text: "Head straight to the 1,000-Token Mysterious Machine", action: sceneSecretCabinet }
  ]);
}

// Scene 6: Unlocking the Terminal
function sceneSolvePuzzle() {
  state.unlockedCabinet = true;
  renderText(
    "You insert 1,000 tokens and enter **DONTTRUSTNAOMI** (14 digits).\n\nThe screen turns pitch black. Red text flashes:\n\n*'I have to be quick. Well done figuring out the riddle. You think you've been here a couple of months... but you've already been trapped here for OVER 10 YEARS due to N40M1's time dilation. Every machine here houses the trapped soul of someone who attempted this challenge. You will become one too unless you beat N40M1 at every game.'*"
  );

  renderChoices([
    { text: "Ask the screen: 'Who are you?'", action: sceneFFBIdentity }
  ]);
}

// Scene 7: FFB's Identity & The Objective
function sceneFFBIdentity() {
  renderText(
    "The screen replies: *'I am FFB — Freddy Fazbear. To break the curse, you must challenge N40M1. Beat her in the arcade games. If you lose more than 100 games, she gets your soul forever. Win, and everyone is freed.'*"
  );

  renderChoices([
    { text: "Gain Special Ability: Slow Down Time to 10% Speed", action: () => {
        state.timeDilationAbility = true;
        updateUI();
        scenePrepareForBoss();
      } 
    }
  ]);
}

// Scene 8: Final Battle Setup
function scenePrepareForBoss() {
  renderText(
    "Equipped with the ability to slow down time to 10% speed, you walk up to N40M1. 'We challenge you, N40M1! Robber of destiny, unmaker of life, to beat us at these games!'"
  );

  renderChoices([
    { text: "Begin the Ultimate Arcade Showdown against N40M1!", action: sceneBossBattle }
  ]);
}

// Scene 9: Boss Battle Mechanics
function sceneBossBattle() {
  state.naomiChallenged = true;
  renderText(
    `N40M1 smiles sinisterly: 'Very well! But lose 100 games, and your soul is mine.'\n\n**Battle Progress:**\nGames Won: ${state.gamesWonAgainstNaomi} / 900\nGames Lost: ${state.gamesLostToNaomi} / 100`
  );

  renderChoices([
    {
      text: "Use Time Dilation (10% Speed) to Play Arcade Matches",
      action: () => {
        // High win probability with time dilation active
        state.gamesWonAgainstNaomi += 300;
        state.gamesLostToNaomi += 10;
        
        if (state.gamesWonAgainstNaomi >= 900) {
          sceneVictory();
        } else {
          sceneBossBattle();
        }
      }
    }
  ]);
}

// Scene 10: Climax & Ending
function sceneVictory() {
  renderText(
    "With time slowed down, your precision is absolute. You dominate every single arcade cabinet!\n\nN40M1 shrieks as sparks fly—**SHE EXPLODES!**\n\nAcross the arcade, the glowing machines transform back into thousands of human beings. Off in the distance, **Freddy Fazbear (FFB)** blows you a kiss and waves goodbye as everyone vanishes home.\n\nThe boarded doors burst open. Reverting N40M1's curse fixes the time dilation—exactly 1 real year has passed. You walk out into the sunlight and collect your **$1 Billion**!"
  );

  renderChoices([
    { text: "Play Again from Day 1", action: () => location.reload() }
  ]);
}

// Launch Game on Load
sceneStart();
