import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import PlayerPage from '../pages/PlayerPage.vue'
import SettingsPage from '../pages/SettingsPage.vue'

const routes = [
  { path: '/', name: 'player', component: PlayerPage },
  { path: '/settings', name: 'settings', component: SettingsPage },
]

const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:'

const router = createRouter({
  history: isFileProtocol ? createWebHashHistory() : createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
