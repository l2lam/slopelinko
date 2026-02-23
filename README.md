# Mr. Lam's Slopelinko 🕹️📉

A dynamic, multi-player educational video game built with [Vue 3](https://vuejs.org/) and [Matter.js](https://brm.io/matter-js/).

## 🎯 Purpose

"Mr. Lam's Slopelinko" is designed to teach high school students about the graphical effects of manipulating the slope (`m`) and y-intercept (`b`) in a linear equation ($y = mx + b$). Disguised as a competitive turn-based game, students must quickly calculate or visualize the resulting line on a Cartesian plane to guide a falling ball into high-scoring buckets (or avoid negative scoring traps) before a strict time limit expires.

## 🕹️ Gameplay Rules

1. **Pre-game**: Players determine the number of rounds, set the time limit per turn, and add their names. Up to 8 players can join a game.
2. **The Turn**: On a player's turn, they are presented with a blank Cartesian plane (whose zoom scale varies randomly each turn).
3. **Commit or Time Out**: The player must enter a slope (`m`) and y-intercept (`b`) and commit it before the timer runs out.
4. **The Drop**: Once committed (or timed out), the line matching the equation $y = mx + b$ is drawn onto the screen, and a ball drops from a random horizontal coordinate at the top of the canvas.
5. **Scoring**: The ball rolls down the player's line. At the bottom of the screen are randomly generated buckets of varying widths. Depending on which bucket the ball lands in, players might gain points (e.g., `100`), lose points (e.g., `-50`), double their current score (`2X`), earn interest (`+10%`), or go completely bankrupt!
6. **Winning**: After the designated number of rounds, the player with the highest total score is serenaded on the final End Screen.

## 🏗️ Architecture

### Tech Stack

- **Frontend Framework**: Vue 3 (Composition API, `<script setup>`)
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Vanilla CSS utilizing a sleek Glassmorphism aesthetic and animated gradients.
- **Physics Engine**: Matter.js (2D Rigid Body simulation)

### Key Components

- `src/store/gameStore.ts`: A centralized reactive Vue store that holds current turn timers, player states, round metrics, and scoring logic without relying on heavy external state managers like Pinia.
- `src/views/StartScreen.vue`: Handles configuration bindings and dynamically spins up the player array.
- `src/views/GameScreen.vue`: The overarching gameplay orchestrator. This view manages the turn timer intervals, calculates the resulting scores based on bucket hits, and determines when to cycle to the next player or round.
- `src/components/PhysicsCanvas.vue`: The Matter.js wrapper. All graphical scaling, grid drawing, and physics engine manipulations (dropping the static ball, swapping line colliders, generating randomized buckets, and dispatching collision events) occur securely encapsulated within this component.

## 🛠️ Development Setup

Clone the repository and install dependencies:

```bash
npm install
npm run dev
```

Run `npm run build` to output the production optimized bundle to the `/dist` directory.
