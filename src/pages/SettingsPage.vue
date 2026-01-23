<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { clearConfig, getConfig, saveConfig } from '../utils/storage'

const router = useRouter()

const audioName = ref('')
const audioBlob = ref(null)
const lyricName = ref('')
const lyricText = ref('')
const coverName = ref('')
const coverBlob = ref(null)
const coverUrl = ref('')
const coverFit = ref('cover')
const coverAlign = ref('center center')
const songTitle = ref('音乐标题')
const songDesc = ref('歌曲信息')
const bgName = ref('')
const bgBlob = ref(null)
const bgUrl = ref('')
const bgFit = ref('cover')
const bgAlign = ref('center center')
const bgDark = ref(0.35)
const bgBlur = ref(8)
const lyricsPosition = ref('left')
const timeLayout = ref('default')
const showCurrentTime = ref(true)
const showTotalTime = ref(true)
const progressShimmer = ref(false)
const status = ref('')
const toastVisible = ref(false)
const toastMessage = ref('')
const toastProgress = ref(100)
const confirmClear = ref(false)
const coverPreviewKey = ref(0)
const isFitOpen = ref(false)
const isCoverFitOpen = ref(false)
const isLyricsOpen = ref(false)
const isTimeOpen = ref(false)

const fitOptions = [
  { value: 'cover', label: '覆盖（cover）' },
  { value: 'contain', label: '包含（contain）' },
  { value: 'fill', label: '拉伸（fill）' },
]
const alignOptions = [
  { value: 'left top', label: '左上' },
  { value: 'center top', label: '中上' },
  { value: 'right top', label: '右上' },
  { value: 'left center', label: '左' },
  { value: 'center center', label: '中' },
  { value: 'right center', label: '右' },
  { value: 'left bottom', label: '左下' },
  { value: 'center bottom', label: '中下' },
  { value: 'right bottom', label: '右下' },
]
const coverFitOptions = [
  { value: 'cover', label: '覆盖（cover）' },
  { value: 'contain', label: '包含（contain）' },
  { value: 'fill', label: '拉伸（fill）' },
]
const lyricsOptions = [
  { value: 'left', label: '歌词在左侧' },
  { value: 'right', label: '歌词在右侧' },
]
const timeLayoutOptions = [
  { value: 'default', label: '已播左 / 总时右' },
  { value: 'swap', label: '已播右 / 总时左' },
]

const hasAudio = computed(() => Boolean(audioBlob.value))
const hasLyric = computed(() => Boolean(lyricText.value))
const hasCover = computed(() => Boolean(coverBlob.value))
const hasBackground = computed(() => Boolean(bgBlob.value))

const revokeObjectUrl = (url) => {
  if (url) {
    URL.revokeObjectURL(url)
  }
}

const updateBackgroundPreview = (blob) => {
  revokeObjectUrl(bgUrl.value)
  bgUrl.value = blob ? URL.createObjectURL(blob) : ''
}

const updateCoverPreview = (blob) => {
  revokeObjectUrl(coverUrl.value)
  coverUrl.value = blob ? URL.createObjectURL(blob) : ''
}

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, 'utf-8')
  })

let toastTimer = null
let clearTimer = null

const showToast = (message) => {
  toastMessage.value = message
  toastVisible.value = true
  toastProgress.value = 100
  if (toastTimer) {
    clearInterval(toastTimer)
    toastTimer = null
  }
  const duration = 2800
  const step = 50
  let elapsed = 0
  toastTimer = setInterval(() => {
    elapsed += step
    toastProgress.value = Math.max(0, 100 - (elapsed / duration) * 100)
    if (elapsed >= duration) {
      clearInterval(toastTimer)
      toastTimer = null
      toastVisible.value = false
    }
  }, step)
}


const onAudioSelect = (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  audioName.value = file.name
  audioBlob.value = file
  status.value = '音频已读取'
}

const onLyricSelect = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  lyricName.value = file.name
  status.value = '正在读取歌词...'
  try {
    lyricText.value = await readFileAsText(file)
    status.value = '歌词已读取'
  } catch (err) {
    console.error('读取歌词失败', err)
    status.value = '读取歌词失败'
  }
}

const onBackgroundSelect = (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  bgName.value = file.name
  bgBlob.value = file
  updateBackgroundPreview(file)
  status.value = '背景图片已读取'
}

const onCoverSelect = (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  coverName.value = file.name
  coverBlob.value = file
  updateCoverPreview(file)
  status.value = '封面已读取'
}

const handleSave = async () => {
  if (!audioBlob.value || !lyricText.value) {
    status.value = '请先选择音频和歌词文件'
    return
  }

  const payload = {
    audioName: audioName.value,
    audioBlob: audioBlob.value,
    lyricName: lyricName.value,
    lyricText: lyricText.value,
    coverName: coverName.value,
    coverBlob: coverBlob.value,
    coverFit: coverFit.value,
    coverAlign: coverAlign.value,
    songTitle: songTitle.value || '音乐标题',
    songDesc: songDesc.value || '歌曲信息',
    bgName: bgName.value,
    bgBlob: bgBlob.value,
    bgFit: bgFit.value,
    bgAlign: bgAlign.value,
    bgDark: Number(bgDark.value) || 0,
    bgBlur: Number(bgBlur.value) || 0,
    lyricsPosition: lyricsPosition.value,
    timeLayout: timeLayout.value,
    showCurrentTime: Boolean(showCurrentTime.value),
    showTotalTime: Boolean(showTotalTime.value),
    progressShimmer: Boolean(progressShimmer.value),
    updatedAt: Date.now(),
  }

  try {
    await saveConfig(payload)
    status.value = '配置已保存'
    showToast('配置已保存')
  } catch (err) {
    console.error('保存配置失败', err)
    status.value = '保存配置失败'
  }
}

const handleClear = async () => {
  if (!confirmClear.value) {
    confirmClear.value = true
    status.value = '再次点击以确认'
    if (clearTimer) {
      clearTimeout(clearTimer)
    }
    clearTimer = setTimeout(() => {
      confirmClear.value = false
      clearTimer = null
    }, 3000)
    return
  }
  try {
    await clearConfig()
    audioName.value = ''
    audioBlob.value = null
    lyricName.value = ''
    lyricText.value = ''
    coverName.value = ''
    coverBlob.value = null
    updateCoverPreview(null)
    coverFit.value = 'cover'
    coverAlign.value = 'center center'
    songTitle.value = '音乐标题'
    songDesc.value = '歌曲信息'
    bgName.value = ''
    bgBlob.value = null
    updateBackgroundPreview(null)
    bgFit.value = 'cover'
    bgAlign.value = 'center center'
    bgDark.value = 0.35
    bgBlur.value = 8
    lyricsPosition.value = 'left'
    timeLayout.value = 'default'
    showCurrentTime.value = true
    showTotalTime.value = true
    progressShimmer.value = false
    status.value = '配置已清除'
    confirmClear.value = false
    if (clearTimer) {
      clearTimeout(clearTimer)
      clearTimer = null
    }
    window.location.assign('/')
  } catch (err) {
    console.error('清除配置失败', err)
    status.value = '清除配置失败'
  }
}

const goPlayer = () => {
  router.push('/')
}

const toggleFit = () => {
  isFitOpen.value = !isFitOpen.value
}

const selectFit = (value) => {
  bgFit.value = value
  isFitOpen.value = false
}

const selectBgAlign = (value) => {
  bgAlign.value = value
}

const toggleCoverFit = () => {
  isCoverFitOpen.value = !isCoverFitOpen.value
}

const selectCoverFit = (value) => {
  coverFit.value = value
  isCoverFitOpen.value = false
}

const selectCoverAlign = (value) => {
  coverAlign.value = value
}

const getAlignIcon = (value) => {
  switch (value) {
    case 'left top':
      return '↖'
    case 'center top':
      return '↑'
    case 'right top':
      return '↗'
    case 'left center':
      return '←'
    case 'center center':
      return '●'
    case 'right center':
      return '→'
    case 'left bottom':
      return '↙'
    case 'center bottom':
      return '↓'
    case 'right bottom':
      return '↘'
    default:
      return '●'
  }
}

const toggleLyrics = () => {
  isLyricsOpen.value = !isLyricsOpen.value
}

const selectLyrics = (value) => {
  lyricsPosition.value = value
  isLyricsOpen.value = false
}

const toggleTimeLayout = () => {
  isTimeOpen.value = !isTimeOpen.value
}

const selectTimeLayout = (value) => {
  timeLayout.value = value
  isTimeOpen.value = false
}

const onDocumentClick = (event) => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (!target.closest('.select')) {
    isFitOpen.value = false
    isCoverFitOpen.value = false
    isLyricsOpen.value = false
    isTimeOpen.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', onDocumentClick)
  try {
    const stored = await getConfig()
    if (!stored) return
    audioName.value = stored.audioName || ''
    audioBlob.value = stored.audioBlob || null
    lyricName.value = stored.lyricName || ''
    lyricText.value = stored.lyricText || ''
    coverName.value = stored.coverName || ''
    coverBlob.value = stored.coverBlob || null
    coverFit.value = stored.coverFit || 'cover'
    coverAlign.value = stored.coverAlign || 'center center'
    updateCoverPreview(stored.coverBlob || null)
    songTitle.value = stored.songTitle || '音乐标题'
    songDesc.value = stored.songDesc || '歌曲信息'
    bgName.value = stored.bgName || ''
    bgBlob.value = stored.bgBlob || null
    updateBackgroundPreview(stored.bgBlob || null)
    bgFit.value = stored.bgFit || 'cover'
    bgAlign.value = stored.bgAlign || 'center center'
    bgDark.value = stored.bgDark ?? 0.35
    bgBlur.value = stored.bgBlur ?? 8
    lyricsPosition.value = stored.lyricsPosition || 'left'
    timeLayout.value = stored.timeLayout || 'default'
    showCurrentTime.value = stored.showCurrentTime ?? true
    showTotalTime.value = stored.showTotalTime ?? true
    progressShimmer.value = stored.progressShimmer ?? false
  } catch (err) {
    console.error('读取配置失败', err)
  }

})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  if (toastTimer) {
    clearInterval(toastTimer)
    toastTimer = null
  }
  if (clearTimer) {
    clearTimeout(clearTimer)
    clearTimer = null
  }
  revokeObjectUrl(coverUrl.value)
  revokeObjectUrl(bgUrl.value)
})

const bgImageStyle = computed(() => ({
  backgroundImage: bgUrl.value ? `url(${bgUrl.value})` : 'none',
  backgroundSize: bgFit.value,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: bgAlign.value,
  filter: bgUrl.value ? `blur(${bgBlur.value}px)` : 'none',
}))

const bgDimStyle = computed(() => ({
  background: `rgba(0, 0, 0, ${bgDark.value})`,
}))

const coverPreviewStyle = computed(() => ({
  objectFit: coverFit.value,
  objectPosition: coverAlign.value,
}))

const coverPreviewBgStyle = computed(() => ({
  backgroundImage: coverUrl.value ? `url(${coverUrl.value})` : 'none',
  backgroundSize: coverFit.value,
  backgroundPosition: coverAlign.value,
  backgroundRepeat: 'no-repeat',
}))

watch(
  () => coverBlob.value,
  (value) => {
    updateCoverPreview(value)
  }
)

watch(
  [() => coverUrl.value, () => coverFit.value, () => coverAlign.value],
  () => {
    coverPreviewKey.value += 1
  }
)

watch(
  () => coverName.value,
  () => {
    if (!coverName.value && !coverBlob.value) {
      updateCoverPreview(null)
    }
  }
)
</script>

<template>
  <main class="page">
    <div class="bg-image" :style="bgImageStyle" aria-hidden="true"></div>
    <div class="bg-dim" :style="bgDimStyle" aria-hidden="true"></div>

    <section class="panel">
      <header class="header-card">
        <div>
          <p class="eyebrow">Hydrogen Light Player</p>
          <div class="title-row">
            <h1>播放器配置页</h1>
            <span class="sub inline">选择本地音频与歌词文件并个性化配置播放器。</span>
          </div>
        </div>
        <button class="ghost" type="button" @click="goPlayer">返回播放器</button>
      </header>

      <div class="group-grid">
        <section class="group span-2">
          <div class="group-title">资源加载</div>
          <div class="uploader">
            <label class="file-card">
              <div>
                <p class="label">音频文件</p>
                <p class="hint">支持 mp3 / wav / flac</p>
                <p class="filename" v-if="audioName">{{ audioName }}</p>
              </div>
              <input type="file" accept="audio/*" @change="onAudioSelect" />
            </label>

            <label class="file-card">
              <div>
                <p class="label">歌词文件</p>
                <p class="hint">LRC / LYC，包含时间轴</p>
                <p class="filename" v-if="lyricName">{{ lyricName }}</p>
              </div>
              <input type="file" accept=".lrc,.lyc,text/plain" @change="onLyricSelect" />
            </label>

            <label class="file-card">
              <div>
                <p class="label">音乐封面</p>
                <p class="hint">png / jpg / webp</p>
                <p class="filename" v-if="coverName">{{ coverName }}</p>
              </div>
              <input type="file" accept="image/*" @change="onCoverSelect" />
            </label>

            <label class="file-card">
              <div>
                <p class="label">背景图片</p>
                <p class="hint">png / jpg / webp</p>
                <p class="filename" v-if="bgName">{{ bgName }}</p>
              </div>
              <input type="file" accept="image/*" @change="onBackgroundSelect" />
            </label>
          </div>
        </section>

        <section class="group">
          <div class="group-title">音乐信息</div>
          <div class="details">
            <div class="field">
              <label>音乐标题</label>
              <input v-model.trim="songTitle" type="text" placeholder="音乐标题" />
            </div>
            <div class="field">
              <label>歌曲简介</label>
              <textarea v-model.trim="songDesc" rows="3" placeholder="歌曲信息"></textarea>
            </div>
          </div>
        </section>

        <section class="group">
          <div class="group-title">封面设置</div>
          <div class="cover-config">
            <div class="options wide">
              <div class="option">
                <label>封面拉伸方式</label>
                <div class="select" :class="{ open: isCoverFitOpen }">
                  <button class="select-trigger" type="button" @click.stop="toggleCoverFit">
                    <span>{{ coverFitOptions.find((item) => item.value === coverFit)?.label }}</span>
                    <span class="arrow"></span>
                  </button>
                  <ul v-if="isCoverFitOpen" class="select-menu">
                    <li
                      v-for="item in coverFitOptions"
                      :key="item.value"
                      :class="['select-item', { active: item.value === coverFit } ]"
                      @click="selectCoverFit(item.value)"
                    >
                      {{ item.label }}
                    </li>
                  </ul>
                </div>
              </div>
              <div class="option">
                <label>封面对齐</label>
                <div class="align-grid" role="group" aria-label="封面对齐">
                  <button
                    v-for="item in alignOptions"
                    :key="`cover-${item.value}`"
                    type="button"
                    :class="['align-item', { active: item.value === coverAlign, center: item.value === 'center center' } ]"
                    :aria-label="item.label"
                    @click="selectCoverAlign(item.value)"
                  >
                    {{ getAlignIcon(item.value) }}
                  </button>
                </div>
              </div>
            </div>
            <div class="cover-preview">
              <div class="preview-frame">
                <div
                  v-if="coverUrl"
                  :key="coverPreviewKey"
                  class="preview-image"
                  :style="coverPreviewBgStyle"
                  role="img"
                  aria-label="封面预览"
                ></div>
                <div v-else class="preview-empty">未选择封面</div>
              </div>
            </div>
          </div>
        </section>

        <section class="group span-2">
          <div class="group-title">播放与背景</div>
          <div class="options wide">
            <div class="option">
              <label>拉伸方式</label>
              <div class="select" :class="{ open: isFitOpen }">
                <button class="select-trigger" type="button" @click.stop="toggleFit">
                  <span>{{ fitOptions.find((item) => item.value === bgFit)?.label }}</span>
                  <span class="arrow"></span>
                </button>
                <ul v-if="isFitOpen" class="select-menu">
                  <li
                    v-for="item in fitOptions"
                    :key="item.value"
                    :class="['select-item', { active: item.value === bgFit } ]"
                    @click="selectFit(item.value)"
                  >
                    {{ item.label }}
                  </li>
                </ul>
              </div>
            </div>
            <div class="option">
              <label>背景对齐</label>
              <div class="align-grid" role="group" aria-label="背景对齐">
                <button
                  v-for="item in alignOptions"
                  :key="`bg-${item.value}`"
                  type="button"
                  :class="['align-item', { active: item.value === bgAlign, center: item.value === 'center center' } ]"
                  :aria-label="item.label"
                  @click="selectBgAlign(item.value)"
                >
                  {{ getAlignIcon(item.value) }}
                </button>
              </div>
            </div>
            <div class="option">
              <label>背景变暗</label>
              <input type="range" min="0" max="0.8" step="0.05" v-model.number="bgDark" />
              <span>{{ bgDark.toFixed(2) }}</span>
            </div>
            <div class="option">
              <label>背景模糊</label>
              <input type="range" min="0" max="24" step="1" v-model.number="bgBlur" />
              <span>{{ bgBlur }}px</span>
            </div>
          </div>
        </section>

        <section class="group">
          <div class="group-title">进度条样式</div>
          <div class="options wide">
            <div class="option">
              <label>时间显示布局</label>
              <div class="select" :class="{ open: isTimeOpen }">
                <button class="select-trigger" type="button" @click.stop="toggleTimeLayout">
                  <span>{{ timeLayoutOptions.find((item) => item.value === timeLayout)?.label }}</span>
                  <span class="arrow"></span>
                </button>
                <ul v-if="isTimeOpen" class="select-menu">
                  <li
                    v-for="item in timeLayoutOptions"
                    :key="item.value"
                    :class="['select-item', { active: item.value === timeLayout } ]"
                    @click="selectTimeLayout(item.value)"
                  >
                    {{ item.label }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div class="toggles">
            <label class="toggle">
              <input type="checkbox" v-model="showCurrentTime" />
              <span class="switch"></span>
              <span>显示已播放时间</span>
            </label>
            <label class="toggle">
              <input type="checkbox" v-model="showTotalTime" />
              <span class="switch"></span>
              <span>显示总时长</span>
            </label>
            <label class="toggle">
              <input type="checkbox" v-model="progressShimmer" />
              <span class="switch"></span>
              <span>进度条闪光效果</span>
            </label>
          </div>
        </section>

        <section class="group">
          <div class="group-title">歌词面板设置</div>
          <div class="options wide">
            <div class="option">
              <label>歌词面板位置</label>
              <div class="select" :class="{ open: isLyricsOpen }">
                <button class="select-trigger" type="button" @click.stop="toggleLyrics">
                  <span>{{ lyricsOptions.find((item) => item.value === lyricsPosition)?.label }}</span>
                  <span class="arrow"></span>
                </button>
                <ul v-if="isLyricsOpen" class="select-menu">
                  <li
                    v-for="item in lyricsOptions"
                    :key="item.value"
                    :class="['select-item', { active: item.value === lyricsPosition } ]"
                    @click="selectLyrics(item.value)"
                  >
                    {{ item.label }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

      </div>

      <section class="group emphasis">
        <div class="group-title">保存配置</div>
        <div class="status">
          <span>音频：{{ hasAudio ? '已选择' : '未选择' }}</span>
          <span>歌词：{{ hasLyric ? '已选择' : '未选择' }}</span>
          <span>封面：{{ hasCover ? '已选择' : '未选择' }}</span>
          <span>背景：{{ hasBackground ? '已选择' : '未选择' }}</span>
          <span v-if="status">{{ status }}</span>
        </div>

        <div class="actions">
          <button class="pill" type="button" @click="handleSave">保存配置</button>
          <button
            class="ghost"
            :class="{ danger: confirmClear }"
            type="button"
            @click="handleClear"
          >
            {{ confirmClear ? '再次点击以确认' : '清除配置' }}
          </button>
        </div>
      </section>
    </section>

    <transition name="toast">
      <div v-if="toastVisible" class="toast" role="status" aria-live="polite">
        <span>{{ toastMessage }}</span>
        <div class="toast-bar" :style="{ width: `${toastProgress}%` }"></div>
      </div>
    </transition>
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
}

.bg-image {
  position: fixed;
  inset: 0;
  z-index: 0;
  transform: scale(1.05);
  transition: filter 200ms ease;
}

.bg-dim {
  position: fixed;
  inset: 0;
  z-index: 1;
  transition: background 200ms ease;
}

.panel {
  width: min(1400px, 100%);
  position: relative;
  z-index: 2;
  color: #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 18px;
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

.sub.inline {
  font-size: 12px;
  color: #94a3b8;
}

.group-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(240px, 1fr));
  gap: 16px;
  align-items: start;
  width: 100%;
}

.group {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  padding: 16px;
  background: rgba(15, 23, 42, 0.55);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.35);
  animation: flyIn 820ms ease both;
  display: block;
  width: 100%;
  margin: 0;
}

.group.span-2 {
  grid-column: span 2;
}

.group.emphasis {
  background: #0b1224;
  border-color: rgba(59, 130, 246, 0.45);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.5);
}

@media (max-width: 960px) {
  .group-grid {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .group.span-2 {
    grid-column: span 1;
  }
}

@media (max-width: 1024px) {
  .group-grid {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
}

@media (max-width: 720px) {
  .group-grid {
    grid-template-columns: 1fr;
  }
}

.group:nth-child(1) {
  animation-delay: 20ms;
}

.group:nth-child(2) {
  animation-delay: 70ms;
}

.group:nth-child(3) {
  animation-delay: 120ms;
}

.group:nth-child(4) {
  animation-delay: 170ms;
}

.group:nth-child(5) {
  animation-delay: 220ms;
}

.group-title {
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 12px;
}

.uploader {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  justify-items: center;
}

.details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  justify-items: stretch;
}

.field {
  display: grid;
  gap: 6px;
  color: #cbd5e1;
  font-size: 13px;
  width: 100%;
}

.field label {
  font-weight: 600;
}

.field input,
.field textarea {
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 12px;
  padding: 10px 12px;
  font-family: inherit;
  resize: vertical;
  width: 100%;
  box-sizing: border-box;
}

.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: rgba(56, 189, 248, 0.9);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.file-card {
  position: relative;
  border: 1px dashed rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  padding: 14px 14px;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
  background: rgba(255, 255, 255, 0.02);
  width: min(260px, 100%);
}

.file-card:hover {
  border-color: #7dd3fc;
  background: rgba(125, 211, 252, 0.08);
}

.file-card:active {
  transform: translateY(1px) scale(0.99);
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

.status {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  color: #94a3b8;
  font-size: 13px;
}

.options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  justify-items: stretch;
}

.options.wide {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.option {
  display: grid;
  gap: 6px;
  color: #cbd5e1;
  font-size: 13px;
  width: 100%;
  min-width: 0;
}

.option label {
  font-weight: 600;
}

.align-grid {
  display: grid;
  grid-template-columns: repeat(3, 40px);
  grid-template-rows: repeat(3, 40px);
  gap: 8px;
  justify-content: start;
}

.align-item {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.6);
  color: #cbd5e1;
  font-size: 18px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: border-color 160ms ease, box-shadow 160ms ease, color 160ms ease;
}

.align-item.center {
  font-size: 14px;
}

.align-item:hover {
  border-color: rgba(56, 189, 248, 0.7);
}

.align-item.active {
  color: #0b1224;
  background: linear-gradient(135deg, #22d3ee, #2563eb);
  border-color: transparent;
  box-shadow: 0 10px 24px rgba(34, 211, 238, 0.25);
}

.cover-preview {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.cover-config {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.preview-frame {
  width: 170px;
  height: 170px;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.35);
  display: grid;
  place-items: center;
  margin: 0 auto;
}

.preview-image {
  width: 100%;
  height: 100%;
  display: block;
}

.preview-empty {
  color: #94a3b8;
  font-size: 12px;
}

.toast {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 30;
  min-width: 200px;
  padding: 12px 16px 16px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #e2e8f0;
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.45);
  overflow: hidden;
}

.toast-bar {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 3px;
  background: linear-gradient(90deg, #22d3ee, #2563eb);
  transition: width 50ms linear;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.option input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.25);
  outline: none;
  width: 100%;
  box-sizing: border-box;
  max-width: 100%;
}

.option input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #22d3ee;
  box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.2);
  border: 2px solid rgba(15, 23, 42, 0.8);
}

.option input[type='range']::-webkit-slider-thumb:hover {
  background: #38bdf8;
}

.option input[type='range']::-moz-range-track {
  height: 6px;
  background: rgba(148, 163, 184, 0.25);
  border-radius: 999px;
}

.option input[type='range']::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #22d3ee;
  border: 2px solid rgba(15, 23, 42, 0.8);
  box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.2);
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.toggles {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #cbd5e1;
  font-size: 13px;
  cursor: pointer;
}

.toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch {
  width: 42px;
  height: 22px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.35);
  position: relative;
  transition: background 160ms ease;
}

.switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #e2e8f0;
  transition: transform 160ms ease, background 160ms ease;
}

.toggle input:checked + .switch {
  background: linear-gradient(135deg, #22d3ee, #2563eb);
}

.toggle input:checked + .switch::after {
  transform: translateX(20px);
  background: #0b1224;
}

.pill {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: linear-gradient(135deg, #22d3ee, #2563eb);
  color: #0b1224;
  border-radius: 999px;
  padding: 10px 18px;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease, opacity 160ms ease;
}

.pill:hover {
  box-shadow: 0 10px 30px rgba(37, 99, 235, 0.35);
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

.ghost.danger {
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  border-color: transparent;
  color: #fff;
}

.ghost:hover {
  border-color: rgba(56, 189, 248, 0.9);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.select {
  position: relative;
  width: 100%;
  max-width: 100%;
}

.select-trigger {
  width: 100%;
  text-align: left;
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 10px;
  padding: 8px 36px 8px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 120ms ease;
  box-sizing: border-box;
  max-width: 100%;
}

.select-trigger:hover {
  transform: translateY(-1px);
}

.select.open .select-trigger {
  border-color: rgba(56, 189, 248, 0.9);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.arrow {
  width: 8px;
  height: 8px;
  border-right: 2px solid #7dd3fc;
  border-bottom: 2px solid #7dd3fc;
  transform: rotate(45deg);
  transition: transform 160ms ease;
  margin-left: 8px;
}

.select.open .arrow {
  transform: rotate(-135deg);
}

.select-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 12px;
  padding: 6px;
  z-index: 10;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.45);
  animation: floatIn 140ms ease;
}

.select-item {
  padding: 8px 10px;
  border-radius: 8px;
  color: #cbd5e1;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}

.select-item:hover {
  background: rgba(56, 189, 248, 0.15);
  color: #e0f2fe;
}

.select-item.active {
  background: rgba(56, 189, 248, 0.2);
  color: #e0f2fe;
}

@keyframes floatIn {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes flyIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 700px) {
  .actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
