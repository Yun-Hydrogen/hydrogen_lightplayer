import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = mode === 'development' ? '/' : (env.VITE_BASE || './')
  return {
    base,
    plugins: [vue(), vueDevTools(), viteSingleFile()],
  }
})
