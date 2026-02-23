<template>
  <div class="end-container">
    <div class="glass-panel results-panel">
      
      <div v-if="winners.length > 0" class="winner-section">
        <h1 class="winner-title" v-if="winners.length === 1">🎉 WINNER 🎉</h1>
        <h1 class="winner-title" v-else>🎉 IT'S A TIE! 🎉</h1>
        
        <h2 v-for="w in winners" :key="w.id" class="winner-name">🏆 {{ w.name }} 🏆</h2>
        <div class="winner-score" v-if="winners[0]">{{ winners[0].score }} pts</div>
      </div>

      <div class="standings">
        <h3>Final Standings</h3>
        <div class="player-list">
          <div 
            v-for="player in sortedPlayers" 
            :key="player.id" 
            class="player-row" 
            :class="{ isWinner: winners.length > 0 && player.score === winners[0]?.score }"
          >
            <span class="rank">#{{ getRank(player) }}</span>
            <span class="name">{{ player.name }}</span>
            <span class="score">{{ player.score }}</span>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="glass-btn primary" @click="playAgain">Play Again Same Players</button>
        <button class="glass-btn" @click="$router.push('/')">Main Menu</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { gameState, resetGame } from '../store/gameStore'

const router = useRouter()

const sortedPlayers = computed(() => {
  return [...gameState.players].sort((a, b) => b.score - a.score)
})

const getRank = (player: typeof gameState.players[0]) => {
  // Find index of first player with this score
  const firstIndex = sortedPlayers.value.findIndex(p => p.score === player.score)
  return firstIndex + 1
}

const winners = computed(() => {
  if (sortedPlayers.value.length === 0) return []
  const topPlayer = sortedPlayers.value[0]
  if (!topPlayer) return []
  
  const topScore = topPlayer.score
  return sortedPlayers.value.filter(p => p.score === topScore)
})

const playAgain = () => {
  resetGame()
  router.push('/game')
}
</script>

<style scoped>
.end-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 1rem;
}

.results-panel {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  text-align: center;
}

.winner-section {
  animation: bounceIn 1s cubic-bezier(0.36, 0, 0.66, -0.56) forwards;
}

@keyframes bounceIn {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.winner-title {
  color: var(--accent-color);
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.winner-name {
  font-size: 3rem;
  font-weight: 800;
  text-shadow: 0 4px 10px rgba(0,0,0,0.3);
  margin-bottom: 0.5rem;
}

.winner-score {
  font-size: 1.5rem;
  font-family: monospace;
  background: rgba(0,0,0,0.2);
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 12px;
}

.standings {
  background: rgba(0,0,0,0.1);
  padding: 1.5rem;
  border-radius: 16px;
}

.standings h3 {
  margin-bottom: 1rem;
  color: var(--accent-color);
}

.player-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.player-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255,255,255,0.05);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 1.1rem;
}

.player-row.isWinner {
  background: rgba(255, 222, 89, 0.2);
  border: 1px solid var(--accent-color);
  font-weight: bold;
}

.rank {
  font-family: monospace;
  opacity: 0.8;
  width: 30px;
}

.name {
  flex: 1;
  text-align: left;
}

.score {
  font-family: monospace;
  font-weight: bold;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}
</style>
