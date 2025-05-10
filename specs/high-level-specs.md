## 🎮 P25 Game Summary [nume tbd]

A 2D side-scrolling **auto-runner** game built using Phaser.js. The player takes on the role of a **Romanian voter** navigating an increasingly absurd and threatening political landscape on the way to the **voting booth**. Along the way, they must **avoid obstacles** and **free fellow citizens** trapped in webs of misinformation, propaganda, and populism using symbolic **power-ups**.

The game is both satirical and civic-minded, aiming to **encourage voter participation** in the second round of the 2025 Romanian presidential elections, especially among those aligned with **pro-European, democratic values**.

---

## 🧑‍💼 Main Character: The Voter

* Auto-runs from left to right.
* Symbolizes the engaged, informed citizen.
* Can **jump** over obstacles (propaganda threats).
* Can activate **power-ups** (assigned keys/buttons) to free groups of NPCs from traps.

---

## 🕹️ Core Gameplay Loop

1. **Run**: The voter moves forward continuously; terrain and scenes scroll in from the right.
2. **Avoid**: The player must jump over threats like misinformation signs, disinformation drones, or protest mobs.
3. **Rescue**: When a group of NPCs appears trapped in a propaganda scene, the player must use the correct power-up:

   * `Q`: Fact-Check Flashlight
   * `W`: Constitutional Compass
   * `E`: Critical Thinking Burst
4. **Score**: Each rescue adds to the "Freed Voters" counter.
5. **Finale**: The player reaches a **voting booth**. They cast their vote and get a final score based on how many people they liberated.

---

## ⚡️ Power-Ups & Symbolism

### 1. **Fact-Check Flashlight**

* Visual: A beam of light pierces a dark area.
* Use Case: Frees NPCs from the "Dark Web of Lies."
* Symbolism: Enlightenment, media literacy, combating online disinformation.

### 2. **Constitutional Compass**

* Visual: Glowing compass reorients slogans.
* Use Case: Breaks authoritarian slogans and guides trapped NPCs back.
* Symbolism: Rule of law, European democratic values.

### 3. **Critical Thinking**

* Visual: A wave of mental clarity or a brain-light spark.
* Use Case: Breaks hypnotic populist promises and frees mesmerized citizens.
* Symbolism: Rational thinking, rejecting emotional manipulation.

---

## 🧨 Threats / Obstacles

These appear as physical or visual threats that must be jumped over or avoided.

* **Contradictory Campaign Slogans**: Flip-flop between nationalism and Europeanism.
* **Fake News Flyers**: Spiraling toward the player.
* **Conspiracy Drones**: Hovering agents of confusion.
* **Populist Posters**: Large signs with emotional, hollow promises.
* **Obedience Walls**: Banners shouting authoritarian phrases

---

## 👥 Rescue Scenes (Mini-Events)

Each rescue scene consists of a **group of undecided/trapped citizens**.

### Scene A — *Dark Web of Lies*

* Visual: A dimly lit zone, tangled wires or shadowy fog.
* Rescue Tool: Fact-Check Flashlight

### Scene B — *Wall of Obedience*

* Visual: Large authoritarian slogans pulsating.
* Rescue Tool: Constitutional Compass

### Scene C — *Hypnotic Populist Promises*

* Visual: Glittering, animated speech bubbles offering unrealistic benefits.
* Rescue Tool: Critical Thinking

---

## 📊 UI Elements

* **Score**: Total number of NPCs freed.
* **Special Power Buttons**: Displayed at top-right of screen.

---

## 🎯 Win Condition & End Screen

* Reaching the **voting booth** triggers a slow-motion cutscene.
* Final screen shows:

  * "You voted!"
  * Number of citizens you helped liberate.
  * Optional: Epilogue title based on your score (e.g., "Civic Hero", "Barely Escaped the Lies").

---

## 🛠️ Technical Implementation Notes

* Left-to-right Phaser auto-runner with timed obstacle generation.
* Player can trigger context-sensitive actions (rescue powers) when near an event.
* Trap scenes are modular, with custom visuals and logic.
* Mobile and keyboard-friendly control scheme.

---

If you have suggestions for more power-ups, want to define difficulty scaling, or need feedback on level pacing or UI mockups, just let me know!
