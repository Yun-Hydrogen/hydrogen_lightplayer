<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const audioName = ref('')
const audioUrl = ref('')
const rawLyrics = ref('')
const lines = ref([])
const currentIndex = ref(0)
const isPlaying = ref(false)
const audioEl = ref(null)
const timelineRef = ref(null)
const rowRefs = ref([])
const dischargingSet = ref(new Set())
const pressedIndex = ref(-1)

const revokeObjectUrl = (url) => {
  if (url) {
    URL.revokeObjectURL(url)
  }
}

const onAudioSelect = (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  audioName.value = file.name
  revokeObjectUrl(audioUrl.value)
  audioUrl.value = URL.createObjectURL(file)
  if (audioEl.value) {
    audioEl.value.load()
  }
}

const splitLyrics = () => {
  const raw = rawLyrics.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  lines.value = raw.map((text) => ({ text, time: null }))
  currentIndex.value = 0
  rowRefs.value = []
}

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return ''
  const total = Math.max(0, seconds)
  const minutes = Math.floor(total / 60)
  const secs = Math.floor(total % 60)
  const cent = Math.floor((total - Math.floor(total)) * 100)
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cent).padStart(2, '0')}`
}

const parseTime = (value) => {
  const match = String(value).trim().match(/^(\d{1,2}):(\d{1,2})(?:\.(\d{1,2}))?$/)
  if (!match) return null
  const minutes = Number(match[1])
  const seconds = Number(match[2])
  const cent = Number(match[3] || 0)
  if (Number.isNaN(minutes) || Number.isNaN(seconds) || Number.isNaN(cent)) return null
  return minutes * 60 + seconds + cent / 100
}

const centerRowInView = async (idx) => {
  await nextTick()
  const container = timelineRef.value
  const row = rowRefs.value[idx]
  if (!container || !row) return
  const target = row.offsetTop - container.clientHeight + row.offsetHeight / 16
  container.scrollTo({ top: Math.max(0, target), behavior: 'smooth', duration: 450 })
}

const stampCurrent = async () => {
  if (!audioEl.value) return
  if (!lines.value.length) return
  const idx = currentIndex.value
  if (!lines.value[idx]) return
  lines.value[idx].time = audioEl.value.currentTime
  const nextIdx = Math.min(lines.value.length - 1, idx + 1)
  currentIndex.value = nextIdx
  await centerRowInView(nextIdx)
}


const deleteTimestamp = async () => {
  let targetIndex = currentIndex.value
  let line = lines.value[targetIndex]

  // If current line has no time, try previous line
  if (line && line.time == null) {
    if (targetIndex > 0) {
      targetIndex--
      line = lines.value[targetIndex]
    } else {
      return // No previous line to delete
    }
  }

  if (!line || line.time == null) return

  // Move visual focus to target
  currentIndex.value = targetIndex
  
  // Start discharging animation
  dischargingSet.value.add(targetIndex)

  // Clear data immediately, animation only for visuals
  line.time = null

  // Scroll row to center of viewport
  await centerRowInView(targetIndex)

  setTimeout(() => {
    dischargingSet.value.delete(targetIndex)
  }, 750)
}

const togglePlay = async () => {
  if (!audioEl.value) return
  try {
    if (audioEl.value.paused) {
      await audioEl.value.play()
      isPlaying.value = true
    } else {
      audioEl.value.pause()
      isPlaying.value = false
    }
  } catch (err) {
    console.error('无法播放音频', err)
  }
}

const onEnded = () => {
  isPlaying.value = false
}

const exportLrc = () => {
  if (!lines.value.length) return
  const content = lines.value
    .map((line) => {
      if (line.time == null) {
        return line.text
      }
      return `[${formatTime(line.time)}]${line.text}`
    })
    .join('\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${audioName.value || 'lyrics'}.lrc`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const progressText = computed(() => {
  if (!lines.value.length) return '0 / 0'
  return `${Math.min(currentIndex.value + 1, lines.value.length)} / ${lines.value.length}`
})

const allCompleted = computed(() => {
  return lines.value.length > 0 && lines.value.every(line => line.time !== null);
})

const handleRowPointerDown = (index) => {
  currentIndex.value = index
  pressedIndex.value = index
  const clear = () => {
    pressedIndex.value = -1
    window.removeEventListener('pointerup', clear)
  }
  window.addEventListener('pointerup', clear)
}

const onHotkey = (event) => {
  if (event.target && event.target instanceof HTMLElement) {
    const tag = event.target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
  }
  if (event.key === 'Enter' || event.key.toLowerCase() === 'k') {
    event.preventDefault()
    stampCurrent()
  } else if (event.key === 'Delete') {
    event.preventDefault()
    deleteTimestamp()
  }
}

const goSettings = () => {
  router.push('/settings')
}

onBeforeUnmount(() => {
  revokeObjectUrl(audioUrl.value)
  window.removeEventListener('keydown', onHotkey)
})

onMounted(() => {
  window.addEventListener('keydown', onHotkey)
})


</script>

<template>
  <main class="page">
    <section class="panel">
      <header class="header-card">
        <div>
          <p class="eyebrow">Hydrogen Light Player</p>
          <div class="title-row">
            <h1>歌词制作工具</h1>
            <span class="sub inline">上传音频, 输入歌词, 打时间轴 ,搞定就导出！</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="pill" :class="{ 'export-lrc-button': allCompleted }" type="button" :disabled="!lines.length" @click="exportLrc">导出 LRC</button>
          <button class="ghost" type="button" @click="goSettings">返回配置页</button>
        </div>
      </header>

      <div class="content">
        <section class="group timeline-section" :class="{ 'all-completed': allCompleted }">
          <div class="group-title">时间轴列表</div>
          <div ref="timelineRef" class="timeline">
            <div v-if="!lines.length" class="empty">暂无歌词行，请先生成。</div>              <div v-else-if="allCompleted" class="all-completed-notice">🎉 全部完成！</div>            <div
              v-for="(line, index) in lines"
              :key="`${line.text}-${index}`"
              class="timeline-row"
              :class="{
                active: index === currentIndex,
                pressed: index === pressedIndex,
                completed: line.time != null,
                discharging: dischargingSet.has(index)
              }"
              :ref="(el) => { rowRefs[index] = el }"
              @pointerdown="handleRowPointerDown(index)"
            >
              <span class="index">{{ index + 1 }}</span>
              <input
                class="time-input"
                type="text"
                :value="line.time == null ? '' : formatTime(line.time)"
                placeholder="00:00.00"
                @change="(e) => {
                  const parsed = parseTime(e.target.value)
                  if (parsed == null) return
                  line.time = parsed
                }"
              />
              <input
                class="text-input"
                type="text"
                v-model="line.text"
              />
              <button class="ghost small" type="button" @click="currentIndex = index">设为当前</button>
            </div>
          </div>
        </section>

        <div class="right-col">
          <section class="group">
            <div class="group-title">音频与歌词</div>
            <div class="upload-row">
              <label class="file-card">
                <div>
                  <p class="label">音频文件</p>
                  <p class="hint">支持 mp3 / wav / flac</p>
                  <p class="filename" v-if="audioName">{{ audioName }}</p>
                </div>
                <input type="file" accept="audio/*" @change="onAudioSelect" />
              </label>
              <div class="player quick-controls">
                <audio ref="audioEl" :src="audioUrl" @ended="onEnded" />
                <button class="pill" type="button" :disabled="!audioUrl" @click="togglePlay">
                  {{ isPlaying ? '暂停' : '播放' }}
                </button>
                <button class="ghost stamp" type="button" :disabled="!audioUrl || !lines.length" @click="stampCurrent">
                  打时间轴
                </button>
                <button class="ghost danger" type="button" :disabled="!lines.length" @click="deleteTimestamp">
                  回退
                </button>
                <span class="progress">进度：{{ progressText }}</span>
                <span class="hint inline">快捷键：Enter / K 打时间轴，del 回退当前时间轴</span>
              </div>
            </div>

            <div class="grid">
              <div class="field">
                <label>歌词内容（每行一句）</label>
                <div class="lyrics-row">
                  <textarea v-model.trim="rawLyrics" rows="12" placeholder="在此粘贴歌词，每行一句"></textarea>
                  <div class="lyrics-actions">
                    <button class="pill" type="button" @click="splitLyrics">生成歌词行</button>
                    <p class="hint">点击“打时间轴”会为当前行写入播放时间，并自动跳到下一行。</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  position: relative;
  overflow: hidden;
  color: #e5e7eb;
  background: #0b1224;
}

.panel {
  width: min(1400px, 100%);
  height: calc(100vh - 64px);
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 16px;
  min-height: 0;
}

.header-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(22, 31, 55, 0.9), rgba(18, 23, 38, 0.95));
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.eyebrow {
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9ca3af;
  font-size: 12px;
  margin: 0 0 6px;
}

h1 {
  margin: 0;
  font-size: 24px;
  letter-spacing: -0.02em;
}

.title-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.sub {
  margin: 0;
  color: #cbd5e1;
  font-size: 14px;
}

.group {
  padding: 16px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.25);
  display: grid;
  gap: 12px;
}

.group.emphasis {
  border-color: rgba(102, 204, 255, 0.4);
  background: rgba(15, 23, 42, 0.85);
}

.group-title {
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.uploader {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.upload-row {
  display: grid;
  grid-template-columns: minmax(260px, 360px) minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}

.content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  min-height: 0;
}

.right-col {
  display: grid;
  gap: 16px;
  min-height: 0;
}

.file-card {
  position: relative;
  border: 1px dashed rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  padding: 14px 14px;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
  background: rgba(255, 255, 255, 0.02);
  width: min(320px, 100%);
}

.file-card:hover {
  border-color: #66ccff;
  background: rgba(102, 204, 255, 0.08);
}

.file-card input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.label {
  margin: 0;
  font-weight: 600;
}

.hint {
  margin: 6px 0;
  color: #94a3b8;
  font-size: 13px;
}

.filename {
  margin: 6px 0 0;
  color: #e5e7eb;
  font-size: 13px;
  word-break: break-all;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.lyrics-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
}

.lyrics-actions {
  display: grid;
  gap: 8px;
  align-content: start;
}

.lyrics-actions .hint {
  margin: 0;
  max-width: 180px;
}

.field {
  display: grid;
  gap: 8px;
  color: #cbd5e1;
  font-size: 13px;
}

.field label {
  font-weight: 600;
}

.field textarea,
.field input {
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 12px;
  padding: 10px 12px;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.actions {
  display: flex;
  gap: 10px;
}

.pill {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: linear-gradient(135deg, #66ccff, #66ccff);
  color: #0b1224;
  border-radius: 999px;
  padding: 10px 18px;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease, opacity 160ms ease;
}

.pill.export-lrc-button {
  box-shadow: 0 0 15px rgba(102, 204, 255, 0.8);
  animation: pulse-blue 2s infinite;
}

@keyframes pulse-blue {
  0%, 100% {
    box-shadow: 0 0 15px rgba(102, 204, 255, 0.8);
  }
  50% {
    box-shadow: 0 0 25px rgba(102, 204, 255, 1);
  }
}

.pill:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ghost {
  border: 1px solid rgba(148, 163, 184, 0.5);
  background: transparent;
  color: #e2e8f0;
  border-radius: 999px;
  padding: 8px 16px;
  cursor: pointer;
  transition: transform 120ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.ghost.small {
  padding: 6px 12px;
  font-size: 12px;
}

.player {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.quick-controls {
  align-items: center;
}

.ghost.stamp {
  padding: 12px 20px;
  font-size: 14px;
  border-radius: 999px;
  border-color: rgba(134, 239, 172, 0.6);
  color: #d1fae5;
  background: rgba(34, 197, 94, 0.12);
  box-shadow: 0 0 0 0 rgba(78, 252, 255, 0.25);
  transition: transform 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.ghost.stamp:hover {
  border-color: rgba(134, 239, 172, 0.9);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
}

.ghost.stamp:active {
  transform: scale(0.98);
}

.ghost.danger {
  padding: 12px 20px;
  font-size: 14px;
  border-radius: 999px;
  border-color: rgba(248, 113, 113, 0.6);
  color: #fecaca;
  background: rgba(239, 68, 68, 0.12);
  box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.25);
  transition: transform 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.ghost.danger:hover {
  border-color: rgba(248, 113, 113, 0.9);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

.ghost.danger:active {
  transform: scale(0.98);
}

.hint.inline {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
}

.progress {
  color: #94a3b8;
  font-size: 12px;
}

.timeline {
  display: grid;
  gap: 10px;
  overflow: auto;
  padding-right: 4px;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: rgba(56, 189, 248, 0.6) transparent;
}

.timeline::-webkit-scrollbar {
  width: 8px;
}

.timeline::-webkit-scrollbar-track {
  background: transparent;
}

.timeline::-webkit-scrollbar-thumb {
  background: rgba(56, 189, 248, 0.45);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.timeline::-webkit-scrollbar-thumb:hover {
  background: rgba(56, 189, 248, 0.7);
}

.timeline-row {
  display: grid;
  grid-template-columns: 40px 110px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 14px 14px;
  border-radius: 10px;
  background-color: rgba(15, 23, 42, 0.55);
  background-image: linear-gradient(to right, rgba(91, 196, 225, 0.834), rgba(50, 194, 69, 0.79));
  background-repeat: no-repeat;
  background-size: 0% 100%;
  background-position: left;
  border: 1px solid rgba(148, 163, 184, 0.2);
  position: relative;
  overflow: hidden;
  transition: border-color 750ms cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 750ms cubic-bezier(0.25, 0.46, 0.45, 0.94), background-size 750ms cubic-bezier(0.25, 0.46, 0.45, 0.94), background-color 750ms cubic-bezier(0.25, 0.46, 0.45, 0.94), background-image 750ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  min-height: 56px;
}

.timeline-row.active {
  border-color: rgba(102, 204, 255, 0.9);
  box-shadow: 0 0 0 2px rgba(102, 204, 255, 0.25), 0 0 16px rgba(102, 204, 255, 0.35);
}

.timeline-row.pressed {
  background-size: 100% 100%;
}

.timeline-row.completed {
  background-size: 100% 100%;
  background-color: rgba(15, 23, 42, 0.55);
}

.timeline-row.discharging {
  background-image: linear-gradient(to left,rgba(244, 135, 19, 0.874), rgba(255, 46, 46, 0.973));
  background-size: 0% 100% !important;
}

.index {
  color: #94a3b8;
  font-size: 12px;
  justify-self: center;
  font-weight: 600;
}

.time-input {
  text-align: center;
}

.timeline-row input {
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  border: none;
  border-radius: 8px;
  padding: 0 12px;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
  font-size: 13px;
  line-height: 1.3;
  align-self: center;
  height: 36px;
  margin: 0;
}

.timeline-row input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.35);
}

.time-input,
.text-input,
.timeline-row .ghost.small {
  align-self: center;
}

.timeline-row .ghost.small {
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}


.timeline-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  transition: border-color 0.3s ease;
}

.timeline-section.all-completed {
  border-color: rgba(34, 197, 94, 0.7); /* Green glow effect */
  box-shadow: 0 0 15px rgba(34, 197, 94, 0.3);
}

.timeline-section .timeline {
  flex: 1;
  min-height: 0;
}

.empty {
  padding: 16px;
  text-align: center;
  color: #94a3b8;
}

.all-completed-notice {
  padding: 8px;
  text-align: center;
  color: #4ade80;
  font-weight: bold;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 8px;
  margin-bottom: 10px;
}

@media (max-width: 900px) {
  .timeline-row {
    grid-template-columns: 32px 100px 1fr;
    grid-template-rows: auto auto;
  }

  .timeline-row button {
    grid-column: 1 / -1;
    justify-self: end;
  }
}
</style>
