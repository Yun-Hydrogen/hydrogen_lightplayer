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
const showProgressThumb = ref(true)
const progressThumbGlow = ref(false)
const progressTrackStyle = ref('rounded')
const progressFillMode = ref('solid')
const progressFillStart = ref('#22d3ee')
const progressFillEnd = ref('#2563eb')
const progressRenderer = ref('custom')
const progressFillOpacity = ref(100)
const progressShimmerDuration = ref(5)
const progressShimmerDelay = ref(0.5)
const showCover = ref(true)
const showSongInfo = ref(true)
const infoPanelPosition = ref('separate')
const infoCoverSide = ref('left')
const showPlaybackControls = ref(true)
const isColorPickerOpen = ref(false)
const colorPickerTarget = ref('start')
const hsvH = ref(190)
const hsvS = ref(85)
const hsvV = ref(85)
const hexInput = ref('#22d3ee')
const rgbR = ref(34)
const rgbG = ref(211)
const rgbB = ref(238)
const hsvInputH = ref(190)
const hsvInputS = ref(85)
const hsvInputV = ref(85)
const svPanelRef = ref(null)
const huePanelRef = ref(null)
const status = ref('')
const toastVisible = ref(false)
const toastMessage = ref('')
const toastProgress = ref(100)
const confirmClear = ref(false)
const coverPreviewKey = ref(0)

const fitOptions = [
  { value: 'cover', label: '覆盖' },
  { value: 'contain', label: '包含' },
  { value: 'fill', label: '拉伸' },
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
  { value: 'cover', label: '覆盖' },
  { value: 'contain', label: '包含' },
  { value: 'fill', label: '拉伸' },
]
const lyricsOptions = [
  { value: 'left', label: '歌词在左侧' },
  { value: 'right', label: '歌词在右侧' },
]
const timeLayoutOptions = [
  { value: 'default', label: '已播左 / 总时右' },
  { value: 'swap', label: '已播右 / 总时左' },
]
const progressTrackOptions = [
  { value: 'rounded', label: '圆角直线' },
  { value: 'square', label: '方形直线' },
]
const progressFillOptions = [
  { value: 'solid', label: '固定颜色' },
  { value: 'gradient', label: '渐变颜色' },
]
const progressRendererOptions = [
  { value: 'custom', label: 'neo进度条' },
  { value: 'native', label: '原生滑条' },
]
const infoPanelPositionOptions = [
  { value: 'separate', label: '单独一侧' },
  { value: 'lyrics-top', label: '与歌词同侧（上方）' },
  { value: 'lyrics-bottom', label: '与歌词同侧（下方）' },
]
const infoCoverSideOptions = [
  { value: 'left', label: '封面在左' },
  { value: 'right', label: '封面在右' },
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
    showProgressThumb: Boolean(showProgressThumb.value),
    progressThumbGlow: Boolean(progressThumbGlow.value),
    progressTrackStyle: progressTrackStyle.value,
    progressFillMode: progressFillMode.value,
    progressFillStart: progressFillStart.value,
    progressFillEnd: progressFillEnd.value,
    progressRenderer: progressRenderer.value,
    progressFillOpacity: Number(progressFillOpacity.value) || 100,
    progressShimmerDuration: Number(progressShimmerDuration.value) || 5,
    progressShimmerDelay: Number(progressShimmerDelay.value) || 0,
    showCover: Boolean(showCover.value),
    showSongInfo: Boolean(showSongInfo.value),
    infoPanelPosition: infoPanelPosition.value,
    infoCoverSide: infoCoverSide.value,
    showPlaybackControls: Boolean(showPlaybackControls.value),
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
    showProgressThumb.value = true
    progressThumbGlow.value = false
    progressTrackStyle.value = 'rounded'
    progressFillMode.value = 'solid'
    progressFillStart.value = '#22d3ee'
    progressFillEnd.value = '#2563eb'
    progressRenderer.value = 'custom'
    progressFillOpacity.value = 100
    progressShimmerDuration.value = 5
    progressShimmerDelay.value = 0.5
    showCover.value = true
    infoPanelPosition.value = 'separate'
    showPlaybackControls.value = true
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

const selectBgAlign = (value) => {
  bgAlign.value = value
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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const rgbToHex = (r, g, b) =>
  `#${[r, g, b]
    .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`

const hexToRgb = (hex) => {
  if (!hex) return null
  const raw = hex.replace('#', '').trim()
  const normalized = raw.length === 3
    ? raw.split('').map((c) => c + c).join('')
    : raw.padEnd(6, '0')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
  return { r, g, b }
}

const rgbToHsv = (r, g, b) => {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  let h = 0
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6
    } else if (max === gn) {
      h = (bn - rn) / delta + 2
    } else {
      h = (rn - gn) / delta + 4
    }
    h = Math.round(h * 60)
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : delta / max
  const v = max
  return { h, s: Math.round(s * 100), v: Math.round(v * 100) }
}

const hsvToRgb = (h, s, v) => {
  const sat = s / 100
  const val = v / 100
  const c = val * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = val - c
  let r = 0
  let g = 0
  let b = 0
  if (h >= 0 && h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

const syncInputsFromHsv = () => {
  const rgb = hsvToRgb(hsvH.value, hsvS.value, hsvV.value)
  rgbR.value = rgb.r
  rgbG.value = rgb.g
  rgbB.value = rgb.b
  hsvInputH.value = hsvH.value
  hsvInputS.value = hsvS.value
  hsvInputV.value = hsvV.value
  hexInput.value = rgbToHex(rgb.r, rgb.g, rgb.b)
}

const applyColorToTarget = () => {
  if (colorPickerTarget.value === 'start') {
    progressFillStart.value = hexInput.value
  } else {
    progressFillEnd.value = hexInput.value
  }
}

const applyHsv = (h, s, v) => {
  hsvH.value = clamp(h, 0, 360)
  hsvS.value = clamp(s, 0, 100)
  hsvV.value = clamp(v, 0, 100)
  syncInputsFromHsv()
  applyColorToTarget()
}

const applyRgb = (r, g, b) => {
  const clampedR = clamp(r, 0, 255)
  const clampedG = clamp(g, 0, 255)
  const clampedB = clamp(b, 0, 255)
  const hsv = rgbToHsv(clampedR, clampedG, clampedB)
  hsvH.value = hsv.h
  hsvS.value = hsv.s
  hsvV.value = hsv.v
  syncInputsFromHsv()
  applyColorToTarget()
}

const applyHex = (value) => {
  const rgb = hexToRgb(value)
  if (!rgb) return
  applyRgb(rgb.r, rgb.g, rgb.b)
}

const openColorPicker = (target) => {
  colorPickerTarget.value = target
  const current = target === 'start' ? progressFillStart.value : progressFillEnd.value
  const rgb = hexToRgb(current) || { r: 34, g: 211, b: 238 }
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
  hsvH.value = hsv.h
  hsvS.value = hsv.s
  hsvV.value = hsv.v
  syncInputsFromHsv()
  isColorPickerOpen.value = true
}

const closeColorPicker = () => {
  isColorPickerOpen.value = false
}

const updateSvFromEvent = (event) => {
  if (!svPanelRef.value) return
  const rect = svPanelRef.value.getBoundingClientRect()
  const x = clamp(event.clientX - rect.left, 0, rect.width)
  const y = clamp(event.clientY - rect.top, 0, rect.height)
  const s = Math.round((x / rect.width) * 100)
  const v = Math.round(100 - (y / rect.height) * 100)
  applyHsv(hsvH.value, s, v)
}

const updateHueFromEvent = (event) => {
  if (!huePanelRef.value) return
  const rect = huePanelRef.value.getBoundingClientRect()
  const y = clamp(event.clientY - rect.top, 0, rect.height)
  const h = Math.round((y / rect.height) * 360)
  applyHsv(h, hsvS.value, hsvV.value)
}

const onSvPointerDown = (event) => {
  updateSvFromEvent(event)
  const move = (evt) => updateSvFromEvent(evt)
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

const onHuePointerDown = (event) => {
  updateHueFromEvent(event)
  const move = (evt) => updateHueFromEvent(evt)
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

const svPanelStyle = computed(() => ({
  background: `hsl(${hsvH.value} 100% 50%)`,
}))

const svCursorStyle = computed(() => ({
  left: `${hsvS.value}%`,
  top: `${100 - hsvV.value}%`,
}))

const hueCursorStyle = computed(() => ({
  top: `${(hsvH.value / 360) * 100}%`,
}))

const onDocumentClick = (event) => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (!target.closest('.color-picker') && !target.closest('.color-row')) {
    isColorPickerOpen.value = false
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
    showProgressThumb.value = stored.showProgressThumb ?? true
    progressThumbGlow.value = stored.progressThumbGlow ?? false
    progressTrackStyle.value = stored.progressTrackStyle || 'rounded'
    progressFillMode.value = stored.progressFillMode || 'solid'
    progressFillStart.value = stored.progressFillStart || '#22d3ee'
    progressFillEnd.value = stored.progressFillEnd || '#2563eb'
    progressRenderer.value = stored.progressRenderer || 'custom'
    progressFillOpacity.value = stored.progressFillOpacity ?? 100
    progressShimmerDuration.value = stored.progressShimmerDuration ?? 5
    progressShimmerDelay.value = stored.progressShimmerDelay ?? 0.5
    showCover.value = stored.showCover ?? true
    showSongInfo.value = stored.showSongInfo ?? true
    infoPanelPosition.value = stored.infoPanelPosition || 'separate'
    infoCoverSide.value = stored.infoCoverSide || 'left'
    showPlaybackControls.value = stored.showPlaybackControls ?? true
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

        <section class="group" :class="{ 'has-open-select': isColorPickerOpen }">
          <div class="group-title">音乐信息&控制区</div>
          <div class="options wide">
            <div class="option">
              <label>位置</label>
              <div
                class="toggle-group vertical"
                :style="{
                  '--count': infoPanelPositionOptions.length,
                  '--active-index': infoPanelPositionOptions.findIndex((item) => item.value === infoPanelPosition),
                }"
              >
                <span class="toggle-slider" aria-hidden="true"></span>
                <button
                  v-for="item in infoPanelPositionOptions"
                  :key="item.value"
                  type="button"
                  :class="['toggle-item', { active: item.value === infoPanelPosition }]"
                  @click="infoPanelPosition = item.value"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>
            <div class="option">
              <label>封面位置</label>
              <div
                class="toggle-group"
                :style="{
                  '--count': infoCoverSideOptions.length,
                  '--active-index': infoCoverSideOptions.findIndex((item) => item.value === infoCoverSide),
                }"
              >
                <span class="toggle-slider" aria-hidden="true"></span>
                <button
                  v-for="item in infoCoverSideOptions"
                  :key="item.value"
                  type="button"
                  :class="['toggle-item', { active: item.value === infoCoverSide }]"
                  @click="infoCoverSide = item.value"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>
          </div>
          <div class="toggles">
            <label class="toggle">
              <input type="checkbox" v-model="showCover" />
              <span class="switch"></span>
              <span>显示歌曲封面</span>
            </label>
            <label class="toggle">
              <input type="checkbox" v-model="showSongInfo" />
              <span class="switch"></span>
              <span>显示歌曲信息</span>
            </label>
            <label class="toggle">
              <input type="checkbox" v-model="showPlaybackControls" />
              <span class="switch"></span>
              <span>显示播放控件</span>
            </label>
          </div>
        </section>

        <section class="group">
          <div class="group-title">封面设置</div>
          <div class="cover-config">
            <div class="options wide">
              <div class="option">
                <label>封面拉伸方式</label>
                <div
                  class="toggle-group"
                  :style="{
                    '--count': coverFitOptions.length,
                    '--active-index': coverFitOptions.findIndex((item) => item.value === coverFit),
                  }"
                >
                  <span class="toggle-slider" aria-hidden="true"></span>
                  <button
                    v-for="item in coverFitOptions"
                    :key="item.value"
                    type="button"
                    :class="['toggle-item', { active: item.value === coverFit }]"
                    @click="coverFit = item.value"
                  >
                    {{ item.label }}
                  </button>
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
          <div class="group-title">背景</div>
          <div class="options wide">
            <div class="option">
              <label>拉伸方式</label>
              <div
                class="toggle-group"
                :style="{
                  '--count': fitOptions.length,
                  '--active-index': fitOptions.findIndex((item) => item.value === bgFit),
                }"
              >
                <span class="toggle-slider" aria-hidden="true"></span>
                <button
                  v-for="item in fitOptions"
                  :key="item.value"
                  type="button"
                  :class="['toggle-item', { active: item.value === bgFit }]"
                  @click="bgFit = item.value"
                >
                  {{ item.label }}
                </button>
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

        <section class="group" :class="{ 'has-open-select': isColorPickerOpen }">
          <div class="group-title">进度条样式</div>
          <div class="options wide">
            <div class="option">
              <label>渲染方式</label>
              <div
                class="toggle-group"
                :style="{
                  '--count': progressRendererOptions.length,
                  '--active-index': progressRendererOptions.findIndex((item) => item.value === progressRenderer),
                }"
              >
                <span class="toggle-slider" aria-hidden="true"></span>
                <button
                  v-for="item in progressRendererOptions"
                  :key="item.value"
                  type="button"
                  :class="['toggle-item', { active: item.value === progressRenderer }]"
                  @click="progressRenderer = item.value"
                >
                  {{ item.label }}
                </button>
              </div>
              <p class="option-note">原生滑条已废弃，建议使用重写的 neo 滑条。</p>
            </div>
            <div class="option">
              <label>时间显示布局</label>
              <div
                class="toggle-group"
                :style="{
                  '--count': timeLayoutOptions.length,
                  '--active-index': timeLayoutOptions.findIndex((item) => item.value === timeLayout),
                }"
              >
                <span class="toggle-slider" aria-hidden="true"></span>
                <button
                  v-for="item in timeLayoutOptions"
                  :key="item.value"
                  type="button"
                  :class="['toggle-item', { active: item.value === timeLayout }]"
                  @click="timeLayout = item.value"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>
            <div class="option">
              <label>进度条外观</label>
              <div
                class="toggle-group"
                :style="{
                  '--count': progressTrackOptions.length,
                  '--active-index': progressTrackOptions.findIndex((item) => item.value === progressTrackStyle),
                }"
              >
                <span class="toggle-slider" aria-hidden="true"></span>
                <button
                  v-for="item in progressTrackOptions"
                  :key="item.value"
                  type="button"
                  :class="['toggle-item', { active: item.value === progressTrackStyle }]"
                  @click="progressTrackStyle = item.value"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>
            <div class="option">
              <label>填充颜色模式</label>
              <div
                class="toggle-group"
                :style="{
                  '--count': progressFillOptions.length,
                  '--active-index': progressFillOptions.findIndex((item) => item.value === progressFillMode),
                }"
              >
                <span class="toggle-slider" aria-hidden="true"></span>
                <button
                  v-for="item in progressFillOptions"
                  :key="item.value"
                  type="button"
                  :class="['toggle-item', { active: item.value === progressFillMode }]"
                  @click="progressFillMode = item.value"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>
            <div class="option">
              <label>渐变起始色</label>
              <div class="color-row">
                <button
                  class="color-preview"
                  type="button"
                  :style="{ background: progressFillStart }"
                  @click.stop="openColorPicker('start')"
                ></button>
                <input
                  class="color-input"
                  type="text"
                  v-model.trim="progressFillStart"
                  @change="applyHex(progressFillStart)"
                />
              </div>
              <transition name="color-pop">
                <div
                  v-if="isColorPickerOpen && colorPickerTarget === 'start'"
                  class="color-picker"
                  @click.stop
                >
                <div class="picker-row">
                  <div
                    ref="svPanelRef"
                    class="sv-panel"
                    :style="svPanelStyle"
                    @pointerdown="onSvPointerDown"
                  >
                    <span class="sv-cursor" :style="svCursorStyle"></span>
                  </div>
                  <div
                    ref="huePanelRef"
                    class="hue-panel"
                    @pointerdown="onHuePointerDown"
                  >
                    <span class="hue-cursor" :style="hueCursorStyle"></span>
                  </div>
                </div>
                <div class="picker-inputs">
                  <div class="picker-field">
                    <label>HEX</label>
                    <input class="color-input" type="text" v-model.trim="hexInput" @change="applyHex(hexInput)" />
                  </div>
                  <div class="picker-field">
                    <label>RGB</label>
                    <div class="picker-grid">
                      <input type="number" min="0" max="255" v-model.number="rgbR" @change="applyRgb(rgbR, rgbG, rgbB)" />
                      <input type="number" min="0" max="255" v-model.number="rgbG" @change="applyRgb(rgbR, rgbG, rgbB)" />
                      <input type="number" min="0" max="255" v-model.number="rgbB" @change="applyRgb(rgbR, rgbG, rgbB)" />
                    </div>
                  </div>
                  <div class="picker-field">
                    <label>HSV</label>
                    <div class="picker-grid">
                      <input type="number" min="0" max="360" v-model.number="hsvInputH" @change="applyHsv(hsvInputH, hsvInputS, hsvInputV)" />
                      <input type="number" min="0" max="100" v-model.number="hsvInputS" @change="applyHsv(hsvInputH, hsvInputS, hsvInputV)" />
                      <input type="number" min="0" max="100" v-model.number="hsvInputV" @change="applyHsv(hsvInputH, hsvInputS, hsvInputV)" />
                    </div>
                  </div>
                </div>
                  <div class="picker-actions">
                    <button class="ghost small" type="button" @click="closeColorPicker">完成</button>
                  </div>
                </div>
              </transition>
            </div>
            <div class="option" v-if="progressFillMode === 'gradient'">
              <label>渐变终止色</label>
              <div class="color-row">
                <button
                  class="color-preview"
                  type="button"
                  :style="{ background: progressFillEnd }"
                  @click.stop="openColorPicker('end')"
                ></button>
                <input
                  class="color-input"
                  type="text"
                  v-model.trim="progressFillEnd"
                  @change="applyHex(progressFillEnd)"
                />
              </div>
              <transition name="color-pop">
                <div
                  v-if="isColorPickerOpen && colorPickerTarget === 'end'"
                  class="color-picker"
                  @click.stop
                >
                <div class="picker-row">
                  <div
                    ref="svPanelRef"
                    class="sv-panel"
                    :style="svPanelStyle"
                    @pointerdown="onSvPointerDown"
                  >
                    <span class="sv-cursor" :style="svCursorStyle"></span>
                  </div>
                  <div
                    ref="huePanelRef"
                    class="hue-panel"
                    @pointerdown="onHuePointerDown"
                  >
                    <span class="hue-cursor" :style="hueCursorStyle"></span>
                  </div>
                </div>
                <div class="picker-inputs">
                  <div class="picker-field">
                    <label>HEX</label>
                    <input class="color-input" type="text" v-model.trim="hexInput" @change="applyHex(hexInput)" />
                  </div>
                  <div class="picker-field">
                    <label>RGB</label>
                    <div class="picker-grid">
                      <input type="number" min="0" max="255" v-model.number="rgbR" @change="applyRgb(rgbR, rgbG, rgbB)" />
                      <input type="number" min="0" max="255" v-model.number="rgbG" @change="applyRgb(rgbR, rgbG, rgbB)" />
                      <input type="number" min="0" max="255" v-model.number="rgbB" @change="applyRgb(rgbR, rgbG, rgbB)" />
                    </div>
                  </div>
                  <div class="picker-field">
                    <label>HSV</label>
                    <div class="picker-grid">
                      <input type="number" min="0" max="360" v-model.number="hsvInputH" @change="applyHsv(hsvInputH, hsvInputS, hsvInputV)" />
                      <input type="number" min="0" max="100" v-model.number="hsvInputS" @change="applyHsv(hsvInputH, hsvInputS, hsvInputV)" />
                      <input type="number" min="0" max="100" v-model.number="hsvInputV" @change="applyHsv(hsvInputH, hsvInputS, hsvInputV)" />
                    </div>
                  </div>
                </div>
                  <div class="picker-actions">
                    <button class="ghost small" type="button" @click="closeColorPicker">完成</button>
                  </div>
                </div>
              </transition>
            </div>
            <div class="option">
              <label>进度条填充不透明度</label>
              <input type="range" min="0" max="100" step="1" v-model.number="progressFillOpacity" />
              <span>{{ progressFillOpacity }}%</span>
            </div>
            <div class="option">
              <label>闪光周期（秒）</label>
              <input type="range" min="1" max="12" step="0.5" v-model.number="progressShimmerDuration" />
              <span>{{ progressShimmerDuration.toFixed(1) }}s</span>
            </div>
            <div class="option">
              <label>每周期等待（秒）</label>
              <input type="range" min="0" max="6" step="0.5" v-model.number="progressShimmerDelay" />
              <span>{{ progressShimmerDelay.toFixed(1) }}s</span>
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
              <input type="checkbox" v-model="showProgressThumb" />
              <span class="switch"></span>
              <span>显示进度指示点</span>
            </label>
            <label class="toggle">
              <input type="checkbox" v-model="progressThumbGlow" />
              <span class="switch"></span>
              <span>指示点发光效果</span>
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
              <div
                class="toggle-group"
                :style="{
                  '--count': lyricsOptions.length,
                  '--active-index': lyricsOptions.findIndex((item) => item.value === lyricsPosition),
                }"
              >
                <span class="toggle-slider" aria-hidden="true"></span>
                <button
                  v-for="item in lyricsOptions"
                  :key="item.value"
                  type="button"
                  :class="['toggle-item', { active: item.value === lyricsPosition }]"
                  @click="lyricsPosition = item.value"
                >
                  {{ item.label }}
                </button>
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
  --theme-color: #66ccff;
  --theme-soft: rgba(102, 204, 255, 0.2);
  --theme-strong: rgba(102, 204, 255, 0.9);
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
  width: min(1500px, 100%);
  position: relative;
  z-index: 2;
  color: #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  column-count: 4;
  column-gap: 16px;
  width: 100%;
  column-fill: balance;
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
  box-sizing: border-box;
  margin-bottom: 16px;
  break-inside: avoid;
  -webkit-column-break-inside: avoid;
  page-break-inside: avoid;
  position: relative;
  z-index: 1;
}

.group.has-open-select {
  z-index: 100;
}

.group.emphasis {
  background: #0b1224;
  border-color: rgba(59, 130, 246, 0.45);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.5);
}

@media (max-width: 1200px) {
  .group-grid {
    column-count: 3;
  }
}

@media (max-width: 900px) {
  .group-grid {
    column-count: 2;
  }
}

@media (max-width: 600px) {
  .group-grid {
    column-count: 1;
  }
}

.group-grid .group:nth-child(1) {
  animation-delay: 20ms;
}

.group-grid .group:nth-child(2) {
  animation-delay: 70ms;
}

.group-grid .group:nth-child(3) {
  animation-delay: 120ms;
}

.group-grid .group:nth-child(4) {
  animation-delay: 170ms;
}

.group-grid .group:nth-child(5) {
  animation-delay: 220ms;
}

.group-grid .group:nth-child(6) {
  animation-delay: 270ms;
}

.group-grid .group:nth-child(7) {
  animation-delay: 320ms;
}

.group-grid .group:nth-child(8) {
  animation-delay: 370ms;
}

.group-grid .group:nth-child(9) {
  animation-delay: 420ms;
}

.group-grid .group:nth-child(10) {
  animation-delay: 470ms;
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
  border-color: var(--theme-strong);
  box-shadow: 0 0 0 2px var(--theme-soft);
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
  border-color: var(--theme-color);
  background: rgba(102, 204, 255, 0.08);
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
  position: relative;
}

.option label {
  font-weight: 600;
}

.option-note {
  margin: 2px 0 0;
  color: #94a3b8;
  font-size: 12px;
}

.align-grid {
  display: grid;
  grid-template-columns: repeat(3, 30px);
  grid-template-rows: repeat(3, 30px);
  gap: 8px;
  justify-content: start;
}

.align-item {
  width: 30px;
  height: 30px;
  border-radius: 10px;
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
  border-color: rgba(102, 204, 255, 0.7);
}

.align-item.active {
  color: #0b1224;
  background: linear-gradient(135deg, #66ccff, #66ccff);
  border-color: transparent;
  box-shadow: 0 10px 24px rgba(102, 204, 255, 0.25);
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
  background: linear-gradient(90deg, #66ccff, #66ccff);
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
  background: #66ccff;
  box-shadow: 0 0 0 4px rgba(102, 204, 255, 0.2);
  border: 2px solid rgba(15, 23, 42, 0.8);
}

.option input[type='range']::-webkit-slider-thumb:hover {
  background: #66ccff;
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
  background: #66ccff;
  border: 2px solid rgba(15, 23, 42, 0.8);
  box-shadow: 0 0 0 4px rgba(102, 204, 255, 0.2);
}

.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-preview {
  width: 38px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  box-shadow: inset 0 0 0 2px rgba(15, 23, 42, 0.35);
  cursor: pointer;
}

.color-input {
  flex: 1;
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 10px;
  padding: 8px 10px;
  font-family: inherit;
}

.color-input:focus {
  outline: none;
  border-color: var(--theme-strong);
  box-shadow: 0 0 0 2px var(--theme-soft);
}

.color-picker {
  margin-top: 10px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.3);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.45);
  display: grid;
  gap: 12px;
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  z-index: 20;
  width: min(360px, 100%);
}

.picker-row {
  display: grid;
  grid-template-columns: 1fr 22px;
  gap: 10px;
}

.sv-panel {
  position: relative;
  height: 140px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.35);
  cursor: crosshair;
}

.sv-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #fff, rgba(255, 255, 255, 0));
}

.sv-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, #000, rgba(0, 0, 0, 0));
}

.sv-cursor {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.5);
  transform: translate(-6px, -6px);
  z-index: 2;
}

.hue-panel {
  position: relative;
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    #ff0000 0%,
    #ff7f00 16.6%,
    #ffff00 33.3%,
    #00ff00 50%,
    #00ffff 66.6%,
    #0000ff 83.3%,
    #ff00ff 100%
  );
  border: 1px solid rgba(148, 163, 184, 0.35);
  cursor: pointer;
}

.hue-cursor {
  position: absolute;
  left: 50%;
  width: 18px;
  height: 6px;
  border-radius: 999px;
  background: #fff;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.6);
}

.picker-inputs {
  display: grid;
  gap: 10px;
}

.picker-field {
  display: grid;
  gap: 6px;
  color: #cbd5e1;
  font-size: 12px;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.picker-grid input {
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 8px;
  padding: 6px 8px;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.picker-actions {
  display: flex;
  justify-content: flex-end;
}

.ghost.small {
  padding: 6px 12px;
  font-size: 12px;
}

.color-pop-enter-active,
.color-pop-leave-active {
  transition: opacity 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.color-pop-enter-from,
.color-pop-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
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
  background: linear-gradient(135deg, #66ccff, #66ccff);
}

.toggle input:checked + .switch::after {
  transform: translateX(20px);
  background: #0b1224;
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

.pill:hover {
  box-shadow: 0 10px 30px rgba(102, 204, 255, 0.35);
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
  border-color: var(--theme-strong);
  box-shadow: 0 0 0 2px var(--theme-soft);
}

.toggle-group {
  --pad: 6px;
  --gap: 6px;
  display: grid;
  position: relative;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 12px;
  padding: var(--pad);
  gap: var(--gap);
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.toggle-group:not(.vertical) {
  grid-template-columns: repeat(var(--count), minmax(0, 1fr));
  align-items: stretch;
}

.toggle-group.vertical {
  grid-template-rows: repeat(var(--count), minmax(44px, auto));
}

.toggle-slider {
  position: absolute;
  z-index: 0;
  background: var(--theme-color);
  border-radius: 8px;
  box-shadow: 0 6px 14px rgba(102, 204, 255, 0.25);
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.toggle-group:not(.vertical) .toggle-slider {
  top: var(--pad);
  left: var(--pad);
  height: calc(100% - var(--pad) * 2);
  width: calc((100% - var(--pad) * 2 - (var(--count) - 1) * var(--gap)) / var(--count));
  transform: translateX(calc(var(--active-index) * (100% + var(--gap))));
}

.toggle-group.vertical .toggle-slider {
  top: var(--pad);
  left: var(--pad);
  right: var(--pad);
  height: calc((100% - var(--pad) * 2 - (var(--count) - 1) * var(--gap)) / var(--count));
  transform: translateY(calc(var(--active-index) * (100% + var(--gap))));
}

.toggle-item {
  position: relative;
  z-index: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: color 180ms ease, transform 180ms ease;
  white-space: normal;
  text-align: center;
  line-height: 1.3;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  min-width: 0;
}

.toggle-item:hover {
  color: #e2e8f0;
}

.toggle-item.active {
  color: #0b1224;
  font-weight: 700;
  transform: translateY(-1px);
}

.toggle-group.vertical .toggle-item {
  padding: 10px 14px;
  min-height: 44px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
