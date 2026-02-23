<template>
  <div class="game-container">
    <div class="header glass-panel">
      <div class="round-info">Round: {{ gameState.currentRound }} / {{ gameState.roundsToPlay }}</div>
      <div class="scores" style="flex: 1; justify-content: center;">
        <div v-for="(p, i) in gameState.players" :key="p.id" 
             class="score-pill" :class="{ active: i === gameState.currentPlayerIndex }">
          {{ p.name }}: {{ p.score }}
        </div>
      </div>
      <button class="glass-btn small-btn" @click="quitGame">⚙️ Settings</button>
    </div>

    <div class="main-play-area">
      <PhysicsCanvas 
        class="physics-view"
        :m="currentM" 
        :b="currentB" 
        :is-committed="isCommitted" 
        :scale-param="scaleParam"
        @ball-result="handleBallResult"
      />

      <div class="control-panel glass-panel">
        <div class="turn-indicator" v-if="currentPlayer">
          <h2>{{ currentPlayer.name }}'s Turn!</h2>
          <div class="timer" :class="{ danger: timeLeft <= 5 }">Time: {{ timeLeft }}s</div>
        </div>

        <div class="inputs" v-if="!isCommitted">
          <label>
            Slope (m):
            <input type="number" class="glass-input" v-model.number="currentM" step="0.1" />
          </label>
          <label>
            Y-Intercept (b):
            <input type="number" class="glass-input" v-model.number="currentB" step="1" />
          </label>
          <button class="glass-btn primary commit-btn" @click="commitTurn">Commit Line!</button>
        </div>
        
        <div class="waiting-message" v-else>
          <h3>Rolling...</h3>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { gameState } from '../store/gameStore'
import PhysicsCanvas from '../components/PhysicsCanvas.vue'

const router = useRouter()

const currentM = ref(1)
const currentB = ref(0)
const isCommitted = ref(false)
const scaleParam = ref(20) // randomized per turn
const timeLeft = ref(gameState.timeLimitPerTurn)

let timerInterval: number | undefined

const currentPlayer = computed(() => gameState.players[gameState.currentPlayerIndex])

const startTurn = () => {
  currentM.value = 1
  currentB.value = 0
  isCommitted.value = false
  timeLeft.value = gameState.timeLimitPerTurn
  scaleParam.value = Math.floor(Math.random() * 30) + 10 // random scale between 10 and 40
  
  clearInterval(timerInterval)
  timerInterval = window.setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      commitTurn()
    }
  }, 1000)
}

const commitTurn = () => {
  if (isCommitted.value) return
  isCommitted.value = true
  clearInterval(timerInterval)
}

const quitGame = () => {
  if (confirm("Are you sure you want to quit to settings? All progress will be lost.")) {
    clearInterval(timerInterval)
    router.push('/')
  }
}

const handleBallResult = (points: number) => {
  if (!currentPlayer.value) return
  if (points === -1000) {
    // 2x double current score
    currentPlayer.value.score *= 2
  } else if (points === -1001) {
    // +10%
    currentPlayer.value.score = Math.floor(currentPlayer.value.score * 1.1)
  } else if (points === -5000) {
    // bankrupt
    currentPlayer.value.score = 0
  } else {
    currentPlayer.value.score += points
  }

  // Next turn logic
  setTimeout(() => {
    gameState.currentPlayerIndex++
    if (gameState.currentPlayerIndex >= gameState.players.length) {
      gameState.currentPlayerIndex = 0
      gameState.currentRound++
    }

    if (gameState.currentRound > gameState.roundsToPlay) {
      router.push('/end')
    } else {
      startTurn()
    }
  }, 2000)
}

onMounted(() => {
  if (gameState.players.length === 0) {
    // user refreshed on game screen
    router.push('/')
    return
  }
  startTurn()
})

onUnmounted(() => {
  clearInterval(timerInterval)
})
</script>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 1rem;
  gap: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
}

.round-info {
  font-family: 'Outfit', sans-serif;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--accent-color);
}

.scores {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.score-pill {
  background: rgba(0,0,0,0.2);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  transition: all 0.3s;
}

.score-pill.active {
  background: var(--accent-color);
  color: #333;
  transform: scale(1.1);
  box-shadow: 0 0 10px var(--accent-color);
}

.main-play-area {
  display: flex;
  flex: 1;
  gap: 1rem;
  overflow: hidden;
}

.physics-view {
  flex: 3;
  height: 100%;
}

.control-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  min-width: 300px;
}

.turn-indicator {
  text-align: center;
}

.turn-indicator h2 {
  color: var(--accent-color);
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.timer {
  font-size: 1.5rem;
  font-weight: bold;
  font-family: monospace;
  background: rgba(0,0,0,0.2);
  display: inline-block;
  padding: 0.5rem 1.5rem;
  border-radius: 12px;
}

.timer.danger {
  color: var(--danger-color);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.inputs {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.inputs label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-weight: 600;
}

.inputs input {
  font-size: 1.5rem;
  text-align: center;
}

.commit-btn {
  margin-top: 1rem;
  font-size: 1.5rem;
}

.waiting-message {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-color);
  animation: pulse 1s infinite alternate;
}
</style>
