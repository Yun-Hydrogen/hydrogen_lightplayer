import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import PlayerPage from '../pages/PlayerPage.vue'
import SettingsPage from '../pages/SettingsPage.vue'
import LrcMakePage from '../pages/LrcMakePage.vue'
import LrcMakeMobilePage from '../pages/LrcMakeMobilePage.vue'

const routes = [
  { path: '/', name: 'player', component: PlayerPage, meta: { title: 'Hydrogen Light Player - 播放器' } },
  { path: '/settings', name: 'settings', component: SettingsPage, meta: { title: 'Hydrogen Light Player - 配置' } },
  { path: '/lrcmake', name: 'lrcmake', component: LrcMakePage, meta: { title: 'Hydrogen Light Player - 歌词制作' } },
  { path: '/lrcmakemobile', name: 'lrcmakemobile', component: LrcMakeMobilePage, meta: { title: 'Hydrogen Light Player - 移动端歌词制作' } },
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

// Global navigation guard to set page title
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title;
  } else {
    document.title = 'Hydrogen Light Player'; // Default title
  }
  next();
});

export default router
