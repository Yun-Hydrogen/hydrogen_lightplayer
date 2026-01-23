import { createRouter, createWebHistory } from 'vue-router'
import PlayerPage from '../pages/PlayerPage.vue'
import SettingsPage from '../pages/SettingsPage.vue'

const routes = [
  { path: '/', name: 'player', component: PlayerPage },
  { path: '/settings', name: 'settings', component: SettingsPage },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
