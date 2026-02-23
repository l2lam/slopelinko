import { reactive } from 'vue'

export interface Player {
    id: string
    name: string
    score: number
}

interface GameState {
    roundsToPlay: number
    currentRound: number
    timeLimitPerTurn: number
    players: Player[]
    currentPlayerIndex: number
}

export const gameState = reactive<GameState>({
    roundsToPlay: 5,
    currentRound: 1,
    timeLimitPerTurn: 30,
    players: [
        { id: '1', name: 'Player 1', score: 0 },
        { id: '2', name: 'Player 2', score: 0 }
    ],
    currentPlayerIndex: 0
})

export const resetGame = () => {
    gameState.currentRound = 1
    gameState.currentPlayerIndex = 0
    gameState.players.forEach(p => p.score = 0)
}
