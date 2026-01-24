import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import PlayerPage from '../pages/PlayerPage.vue'
import SettingsPage from '../pages/SettingsPage.vue'
import LrcMakePage from '../pages/LrcMakePage.vue'

const routes = [
  { path: '/', name: 'player', component: PlayerPage },
  { path: '/settings', name: 'settings', component: SettingsPage },
  { path: '/lrcmake', name: 'lrcmake', component: LrcMakePage },
]

const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:'
const useHashHistory = typeof window !== 'undefined'
  ? (isFileProtocol || import.meta.env.BASE_URL === './')
  : false

const router = createRouter({
  history: useHashHistory ? createWebHashHistory() : createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
