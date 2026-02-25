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
      <div class="physics-wrapper">
        <div class="equation-display glass-panel">
          <h2 v-if="isCommitted">y = {{ currentM }}x {{ currentB >= 0 ? '+' : '- ' }}{{ Math.abs(currentB) }}</h2>
          <h2 v-else class="placeholder">Awaiting Equation...</h2>
        </div>
        <div class="canvas-overlay-container">
          <PhysicsCanvas 
            class="physics-view"
            :m="currentM" 
            :b="currentB" 
            :is-committed="isCommitted" 
            :scale-param="scaleParam"
            @ball-result="handleBallResult"
          />
          <div class="overlay-bounds">
            <div v-for="award in floatingAwards" :key="award.id"
                 class="floating-award"
                 :class="{ positive: award.diff > 0, negative: award.diff < 0, huge: Math.abs(award.diff) > 500 }"
                 :style="{ left: award.x + 'px', top: award.y + 'px' }">
              {{ award.diff > 0 ? '+' : '' }}{{ award.diff }}
            </div>
          </div>
        </div>
      </div>

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
            <input type="number" class="glass-input" v-model.number="currentB" step="1" :min="minB" :max="maxB" />
          </label>
          <div v-if="currentB < minB || currentB > maxB" class="warning-text">
            ⚠️ Y-Intercept must be between {{ minB }} and {{ maxB }}.
          </div>
          <button class="glass-btn primary commit-btn" @click="commitTurn" :disabled="currentB < minB || currentB > maxB">Commit Line!</button>
        </div>
        
        <div class="waiting-message" v-else>
          <h3>The ball is rolling...</h3>
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
import { BUCKET_TYPES, BUCKET_POINTS } from '../constants'

const router = useRouter()

const currentM = ref(1)
const currentB = ref(0)
const isCommitted = ref(false)
const scaleParam = ref(20) // randomized per turn
const timeLeft = ref(gameState.timeLimitPerTurn)

const floatingAwards = ref<{ id: number, diff: number, x: number, y: number }[]>([])

const minB = computed(() => Math.ceil(-300 / scaleParam.value))
const maxB = computed(() => Math.floor(300 / scaleParam.value))

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

const playTone = (frequency: number, type: OscillatorType, duration: number) => {
  try {
    const audioCtxCtor = window.AudioContext || (window as any).webkitAudioContext
    if (!audioCtxCtor) return
    const audioCtx = new audioCtxCtor()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()
    
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime)
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration)
    
    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    
    oscillator.start()
    oscillator.stop(audioCtx.currentTime + duration)
  } catch(e) { console.warn('Audio play failed', e) }
}

const playScoreSound = (diff: number, points: number) => {
    if (diff > 0) {
        playTone(600, 'sine', 0.3)
        setTimeout(() => playTone(800, 'sine', 0.5), 100)
    } else if (points === BUCKET_POINTS[BUCKET_TYPES.BANKRUPT]) {
        playTone(400, 'sine', 0.2)
        setTimeout(() => playTone(600, 'sine', 0.2), 150)
        setTimeout(() => playTone(1200, 'sine', 0.4), 300)
    } else if (diff < 0) {
        playTone(200, 'square', 0.6)
    } else if (diff === 0 && points !== 0) {
        playTone(300, 'sine', 0.2)
    }
}

const handleBallResult = (payload: { points: number, x: number, y: number }) => {
  if (!currentPlayer.value) return
  
  const oldScore = currentPlayer.value.score
  const { points } = payload
  
  if (points === BUCKET_POINTS[BUCKET_TYPES.MULTIPLY_2X]) {
    // 2x double current score
    currentPlayer.value.score *= 2
  } else if (points === BUCKET_POINTS[BUCKET_TYPES.INTEREST_10_PERCENT]) {
    // +10%
    currentPlayer.value.score = Math.floor(currentPlayer.value.score * 1.1)
  } else if (points === BUCKET_POINTS[BUCKET_TYPES.INTEREST_20_PERCENT]) {
    // +20%
    currentPlayer.value.score = Math.floor(currentPlayer.value.score * 1.2)
  } else if (points === BUCKET_POINTS[BUCKET_TYPES.PENALTY_15_PERCENT]) {
    // -15%
    currentPlayer.value.score = Math.floor(currentPlayer.value.score * 0.85)
  } else if (points === BUCKET_POINTS[BUCKET_TYPES.BANKRUPT]) {
    // bankrupt
    currentPlayer.value.score = 0
  } else {
    currentPlayer.value.score += points
  }

  const diff = currentPlayer.value.score - oldScore

  if (points !== 0 || diff !== 0) {
    const awardId = Date.now()
    floatingAwards.value.push({ id: awardId, diff, x: payload.x, y: payload.y })
    playScoreSound(diff, points)
    
    setTimeout(() => {
      floatingAwards.value = floatingAwards.value.filter(a => a.id !== awardId)
    }, 2500)
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

.physics-wrapper {
  flex: 3;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.equation-display {
  text-align: center;
  padding: 0.5rem;
}

.equation-display h2 {
  font-family: 'Outfit', monospace;
  font-size: 2rem;
  letter-spacing: 2px;
  margin: 0;
  color: var(--accent-color);
}

.equation-display .placeholder {
  opacity: 0.5;
  font-style: italic;
}

.physics-view {
  flex: 1;
}

.canvas-overlay-container {
  position: relative;
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
}

.overlay-bounds {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 800px;
  height: 600px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 100;
}

.floating-award {
  position: absolute;
  pointer-events: none;
  font-family: 'Outfit', sans-serif;
  font-weight: 900;
  font-size: 3rem;
  text-shadow: 0 0 10px rgba(0,0,0,0.8), 2px 2px 0 #000;
  animation: floatUp 2s ease-out forwards;
  z-index: 100;
  transform: translate(-50%, -50%);
  text-align: center;
}

.floating-award.positive {
  color: #4ade80; /* green */
}

.floating-award.negative {
  color: #f87171; /* red */
}

.floating-award.huge {
  font-size: 5rem;
  animation: floatUpHuge 2s ease-out forwards;
}

@keyframes floatUp {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, calc(-50% - 120px)) scale(1.2); }
}

@keyframes floatUpHuge {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  10% { transform: translate(-50%, -50%) scale(1.5); }
  100% { opacity: 0; transform: translate(-50%, calc(-50% - 180px)) scale(1); }
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

.warning-text {
  color: var(--danger-color, #ff5e5e);
  font-size: 0.9rem;
  text-align: center;
  font-weight: bold;
}

.commit-btn {
  margin-top: 1rem;
  font-size: 1.5rem;
}

.commit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
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
