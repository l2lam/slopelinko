<template>
  <div class="start-container">
    <div class="glass-panel config-panel">
      <h1 class="title-text">Mr. Lam's Slopelinko</h1>
      
      <div class="settings-group">
        <label>
          <span class="label-text">Number of Rounds:</span>
          <input type="number" class="glass-input" v-model.number="gameState.roundsToPlay" min="1" max="50" />
        </label>
        
        <label>
          <span class="label-text">Time Limit per Turn (sec):</span>
          <input type="number" class="glass-input" v-model.number="gameState.timeLimitPerTurn" min="5" max="120" />
        </label>
      </div>

      <div class="players-section">
        <h2>Players</h2>
        <div class="player-list">
          <div v-for="(player, index) in gameState.players" :key="player.id" class="player-item">
            <span class="player-number">P{{ index + 1 }}</span>
            <input type="text" class="glass-input flex-1" v-model="player.name" placeholder="Player Name" />
            <button class="glass-btn remove-btn" @click="removePlayer(index)" v-if="gameState.players.length > 2">✖</button>
          </div>
        </div>
        
        <button class="glass-btn add-player-btn" @click="addPlayer" v-if="gameState.players.length < 8">+ Add Player</button>
      </div>

      <button class="glass-btn primary start-btn" @click="startGame">Start Game 🕹️</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { gameState, resetGame } from '../store/gameStore'

const router = useRouter()

const addPlayer = () => {
  const newId = Date.now().toString()
  gameState.players.push({
    id: newId,
    name: `Player ${gameState.players.length + 1}`,
    score: 0
  })
}

const removePlayer = (index: number) => {
  if (gameState.players.length > 2) {
    gameState.players.splice(index, 1)
  }
}

const startGame = () => {
  resetGame()
  router.push('/game')
}
</script>

<style scoped>
.start-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 1rem;
}

.config-panel {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.title-text {
  margin-bottom: 0;
  color: var(--accent-color);
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  border-radius: 16px;
}

.settings-group label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label-text {
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  font-size: 1.1rem;
}

.players-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  border-radius: 16px;
}

.player-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.player-number {
  font-family: 'Outfit', sans-serif;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  min-width: 40px;
  text-align: center;
}

.flex-1 {
  flex: 1;
}

.remove-btn {
  padding: 0.5rem 0.75rem;
  background: rgba(255, 94, 94, 0.2);
  color: var(--danger-color);
  border-color: var(--danger-color);
}

.remove-btn:hover {
  background: var(--danger-color);
  color: white;
}

.add-player-btn {
  align-self: flex-start;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
}

.start-btn {
  margin-top: 1rem;
  font-size: 1.5rem;
  padding: 1rem;
}
</style>
