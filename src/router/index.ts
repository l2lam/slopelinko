import { createRouter, createWebHistory } from 'vue-router'
import StartScreen from '../views/StartScreen.vue'
import GameScreen from '../views/GameScreen.vue'
import EndScreen from '../views/EndScreen.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'start',
      component: StartScreen,
    },
    {
      path: '/game',
      name: 'game',
      component: GameScreen,
    },
    {
      path: '/end',
      name: 'end',
      component: EndScreen,
    },
  ],
})

export default router
