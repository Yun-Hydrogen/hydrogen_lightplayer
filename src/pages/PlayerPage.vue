<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getConfig, subscribeConfig } from '../utils/storage'

const router = useRouter()

const audioUrl = ref('')
const audioName = ref('')
const lyricName = ref('')
const lyricText = ref('')
const coverUrl = ref('')
const coverName = ref('')
const coverFit = ref('cover')
const coverAlign = ref('center center')
const songTitle = ref('音乐标题')
const songDesc = ref('歌曲信息')
const bgUrl = ref('')
const bgName = ref('')
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
const progressBarWidth = ref(0)
const shimmerSize = 42
const audioEl = ref(null)
const isPlaying = ref(false)
const duration = ref(0)
const currentTime = ref(0)
const lyrics = ref([])

const hasConfig = computed(() => Boolean(audioUrl.value && lyricText.value))

const activeIndex = computed(() => {
  if (!lyrics.value.length) return -1
  const now = currentTime.value
  let idx = -1
  for (let i = 0; i < lyrics.value.length; i += 1) {
    if (lyrics.value[i].timeSec <= now + 0.05) {
      idx = i
    } else {
      break
    }
  }
  return idx
})

const currentLine = computed(() => {
  if (!lyrics.value.length) return '未加载歌词'
  if (activeIndex.value < 0) return '准备好了，点击播放'
  return lyrics.value[activeIndex.value]?.text || ''
})

const progress = computed(() => {
  if (!duration.value) return 0
  return Math.min(100, Math.max(0, (currentTime.value / duration.value) * 100))
})

const progressFillColors = computed(() => {
  if (progressFillMode.value === 'gradient') {
    return {
      start: progressFillStart.value || '#22d3ee',
      end: progressFillEnd.value || '#2563eb',
    }
  }
  const solid = progressFillStart.value || '#22d3ee'
  return { start: solid, end: solid }
})

const hexToRgba = (hex, alpha) => {
  if (!hex) return `rgba(34, 211, 238, ${alpha})`
  const raw = hex.replace('#', '').trim()
  const normalized = raw.length === 3
    ? raw.split('').map((c) => c + c).join('')
    : raw.padEnd(6, '0')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const progressStyle = computed(() => ({
  '--progress': `${progress.value}%`,
  '--fill-start': hexToRgba(progressFillColors.value.start, Math.min(1, Math.max(0, progressFillOpacity.value / 100))),
  '--fill-end': hexToRgba(progressFillColors.value.end, Math.min(1, Math.max(0, progressFillOpacity.value / 100))),
  '--thumb-color': progressFillColors.value.end,
  '--shimmer-duration': `${Math.max(0.5, Number(progressShimmerDuration.value) || 5)}s`,
  '--shimmer-size': `${shimmerSize}px`,
  '--shimmer-end': `${Math.max(0, progressBarWidth.value * (progress.value / 100) - shimmerSize)}px`,
}))

const shimmerVisible = computed(() =>
  progressBarWidth.value > 0 &&
  progressBarWidth.value * (progress.value / 100) > shimmerSize
)

const progressClasses = computed(() => ({
  shimmer: progressShimmer.value && hasConfig.value && shimmerActive.value && shimmerVisible.value,
  'no-thumb': !showProgressThumb.value,
  'thumb-glow': progressThumbGlow.value && showProgressThumb.value && hasConfig.value,
  square: progressTrackStyle.value === 'square',
}))

const progressBarRef = ref(null)
let isSeeking = false
const shimmerActive = ref(false)
let shimmerTimer = null
let shimmerOffTimer = null
let progressResizeObserver = null

const updateProgressWidth = () => {
  if (!progressBarRef.value) return
  progressBarWidth.value = progressBarRef.value.getBoundingClientRect().width
}

const stopShimmerCycle = () => {
  shimmerActive.value = false
  if (shimmerTimer) {
    clearInterval(shimmerTimer)
    shimmerTimer = null
  }
  if (shimmerOffTimer) {
    clearTimeout(shimmerOffTimer)
    shimmerOffTimer = null
  }
}

const startShimmerCycle = () => {
  stopShimmerCycle()
  if (!progressShimmer.value || !hasConfig.value) return
  const durationMs = Math.max(500, Number(progressShimmerDuration.value || 5) * 1000)
  const delayMs = Math.max(0, Number(progressShimmerDelay.value || 0) * 1000)
  const totalMs = durationMs + delayMs
  shimmerActive.value = true
  shimmerOffTimer = setTimeout(() => {
    shimmerActive.value = false
  }, durationMs)
  shimmerTimer = setInterval(() => {
    shimmerActive.value = true
    if (shimmerOffTimer) {
      clearTimeout(shimmerOffTimer)
    }
    shimmerOffTimer = setTimeout(() => {
      shimmerActive.value = false
    }, durationMs)
  }, totalMs)
}

const applySeekByEvent = (event) => {
  if (!progressBarRef.value || !duration.value) return
  const rect = progressBarRef.value.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const newTime = ratio * duration.value
  audioEl.value.currentTime = newTime
  currentTime.value = newTime
}

const onSeekPointerDown = (event) => {
  if (!hasConfig.value || !duration.value || !audioEl.value) return
  isSeeking = true
  applySeekByEvent(event)
  window.addEventListener('pointermove', onSeekPointerMove)
  window.addEventListener('pointerup', onSeekPointerUp)
}

const onSeekPointerMove = (event) => {
  if (!isSeeking) return
  applySeekByEvent(event)
}

const onSeekPointerUp = () => {
  isSeeking = false
  window.removeEventListener('pointermove', onSeekPointerMove)
  window.removeEventListener('pointerup', onSeekPointerUp)
}

const formatTime = (value) => {
  if (!Number.isFinite(value)) return '00:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const parseLyrics = (text) => {
  const timeRegex = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\](.*)/
  const lines = text.split(/\r?\n/)
  const parsed = []

  lines.forEach((line) => {
    const match = timeRegex.exec(line)
    if (!match) return
    const minutes = Number(match[1]) || 0
    const seconds = Number(match[2]) || 0
    const millis = Number(match[3]?.padEnd(3, '0')) || 0
    const timeSec = minutes * 60 + seconds + millis / 1000
    const content = match[4].trim()
    parsed.push({ timeSec, text: content || '...' })
  })

  return parsed.sort((a, b) => a.timeSec - b.timeSec)
}

const revokeObjectUrl = (url) => {
  if (url) {
    URL.revokeObjectURL(url)
  }
}

const loadConfig = async () => {
  try {
    const stored = await getConfig()
    if (!stored) {
      revokeObjectUrl(audioUrl.value)
      revokeObjectUrl(coverUrl.value)
      revokeObjectUrl(bgUrl.value)
      audioUrl.value = ''
      audioName.value = ''
      lyricName.value = ''
      lyricText.value = ''
      lyrics.value = []
      coverUrl.value = ''
      coverName.value = ''
      coverFit.value = 'cover'
      coverAlign.value = 'center center'
      songTitle.value = '音乐标题'
      songDesc.value = '歌曲信息'
      bgUrl.value = ''
      bgName.value = ''
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
      return
    }

    audioName.value = stored.audioName || ''
    lyricName.value = stored.lyricName || ''
    lyricText.value = stored.lyricText || ''
    lyrics.value = lyricText.value ? parseLyrics(lyricText.value) : []
    coverName.value = stored.coverName || ''
    coverFit.value = stored.coverFit || 'cover'
    coverAlign.value = stored.coverAlign || 'center center'
    songTitle.value = stored.songTitle || '音乐标题'
    songDesc.value = stored.songDesc || '歌曲信息'
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
    bgName.value = stored.bgName || ''
    bgFit.value = stored.bgFit || 'cover'
    bgAlign.value = stored.bgAlign || 'center center'
    bgDark.value = stored.bgDark ?? 0.35
    bgBlur.value = stored.bgBlur ?? 8

    if (stored.audioBlob) {
      revokeObjectUrl(audioUrl.value)
      audioUrl.value = URL.createObjectURL(stored.audioBlob)
    } else {
      revokeObjectUrl(audioUrl.value)
      audioUrl.value = ''
    }

    if (stored.coverBlob) {
      revokeObjectUrl(coverUrl.value)
      coverUrl.value = URL.createObjectURL(stored.coverBlob)
    } else {
      revokeObjectUrl(coverUrl.value)
      coverUrl.value = ''
    }

    if (stored.bgBlob) {
      revokeObjectUrl(bgUrl.value)
      bgUrl.value = URL.createObjectURL(stored.bgBlob)
    } else {
      revokeObjectUrl(bgUrl.value)
      bgUrl.value = ''
    }
  } catch (err) {
    console.error('读取配置失败', err)
  }
}

const togglePlay = async () => {
  const el = audioEl.value
  if (!el) return
  if (el.paused) {
    try {
      await el.play()
      isPlaying.value = true
    } catch (err) {
      console.error('无法播放音频', err)
    }
  } else {
    el.pause()
    isPlaying.value = false
  }
}

const handleTimeUpdate = () => {
  if (!audioEl.value) return
  currentTime.value = audioEl.value.currentTime
}

const onLoadedMetadata = () => {
  if (!audioEl.value) return
  duration.value = audioEl.value.duration
}

const onEnded = () => {
  isPlaying.value = false
}

const onSeek = (event) => {
  if (!audioEl.value || !duration.value) return
  const value = Number(event.target.value)
  const newTime = (value / 100) * duration.value
  audioEl.value.currentTime = newTime
  currentTime.value = newTime
}

const seekBySeconds = (delta) => {
  if (!audioEl.value || !duration.value) return
  const next = Math.min(duration.value, Math.max(0, audioEl.value.currentTime + delta))
  audioEl.value.currentTime = next
  currentTime.value = next
}

const goSettings = () => {
  router.push('/settings')
}

const bgImageStyle = computed(() => ({
  backgroundImage: bgUrl.value ? `url(${bgUrl.value})` : 'none',
  backgroundSize: bgFit.value,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: bgAlign.value,
  filter: bgUrl.value ? `blur(${bgBlur.value}px)` : 'none',
}))

const coverStyle = computed(() => ({
  objectFit: coverFit.value,
  objectPosition: coverAlign.value,
}))

const bgDimStyle = computed(() => ({
  background: `rgba(0, 0, 0, ${bgDark.value})`,
}))

const lyricsOnRight = computed(() => lyricsPosition.value === 'right')

const leftTimeVisible = computed(() => {
  if (timeLayout.value === 'swap') return showTotalTime.value
  return showCurrentTime.value
})

const rightTimeVisible = computed(() => {
  if (timeLayout.value === 'swap') return showCurrentTime.value
  return showTotalTime.value
})

const leftTimeText = computed(() => {
  if (!leftTimeVisible.value) return ''
  return timeLayout.value === 'swap' ? formatTime(duration.value) : formatTime(currentTime.value)
})

const rightTimeText = computed(() => {
  if (!rightTimeVisible.value) return ''
  return timeLayout.value === 'swap' ? formatTime(currentTime.value) : formatTime(duration.value)
})

let unsubscribe = null

onMounted(async () => {
  await loadConfig()
  unsubscribe = subscribeConfig(loadConfig)
  updateProgressWidth()
  if (progressBarRef.value && typeof ResizeObserver !== 'undefined') {
    progressResizeObserver = new ResizeObserver(() => updateProgressWidth())
    progressResizeObserver.observe(progressBarRef.value)
  } else {
    window.addEventListener('resize', updateProgressWidth)
  }
})

watch(
  [progressShimmer, progressShimmerDuration, progressShimmerDelay, hasConfig],
  () => {
    startShimmerCycle()
  }
)

onBeforeUnmount(() => {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  stopShimmerCycle()
  if (progressResizeObserver && progressBarRef.value) {
    progressResizeObserver.unobserve(progressBarRef.value)
    progressResizeObserver.disconnect()
    progressResizeObserver = null
  } else {
    window.removeEventListener('resize', updateProgressWidth)
  }
  revokeObjectUrl(audioUrl.value)
  revokeObjectUrl(coverUrl.value)
  revokeObjectUrl(bgUrl.value)
})
</script>

<template>
  <main class="page">
    <div class="bg-image" :style="bgImageStyle" aria-hidden="true"></div>
    <div class="bg-dim" :style="bgDimStyle" aria-hidden="true"></div>

    <div class="layout" :class="{ 'lyrics-right': lyricsOnRight }">
      <section class="lyrics-panel card">
        <div class="panel-header">
          <div>
          </div>
        </div>

        <div v-if="hasConfig" class="lyrics-body">
          <div class="now-line" :class="{ empty: !lyrics.length }">
            <span>{{ currentLine }}</span>
          </div>

          <div class="lyrics" v-if="lyrics.length">
            <div
              v-for="(line, index) in lyrics"
              :key="`${line.timeSec}-${index}`"
              :class="['lyric-line', { active: index === activeIndex } ]"
            >
              <span class="stamp">{{ formatTime(line.timeSec) }}</span>
              <span class="text">{{ line.text }}</span>
            </div>
          </div>
          <p v-else class="placeholder">未加载歌词，请前往配置页上传歌词。</p>
        </div>

        <div v-else class="empty">
          <p>当前未配置音频与歌词。</p>
          <button class="pill" type="button" @click="goSettings">前往配置</button>
        </div>
      </section>

      <section class="right-column">
        <div class="info-panel card" :class="{ disabled: !hasConfig }">
          <div class="info-top">
            <div class="cover" aria-hidden="true">
              <img v-if="coverUrl" :src="coverUrl" alt="音乐封面" :style="coverStyle" />
              <div v-else class="cover-fallback">
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <circle cx="60" cy="60" r="58" fill="rgba(56,189,248,0.15)" />
                  <path
                    d="M78 26v42.5a16 16 0 1 1-8-13.8V40l-28 6.6v30.4a16 16 0 1 1-8-13.8V36.4L78 26z"
                    fill="#7dd3fc"
                  />
                </svg>
              </div>
            </div>

            <div class="info-text">
              <div class="title-row">
                <h2>{{ songTitle }}</h2>
                <span class="tag" v-if="!hasConfig">未配置</span>
              </div>
              <p class="desc">{{ songDesc }}</p>
              <div class="info-divider" aria-hidden="true"></div>
              <div class="info-bottom">
                <div class="progress-row">
                  <span v-if="leftTimeVisible" class="time left">{{ leftTimeText }}</span>
                  <div
                    v-if="progressRenderer === 'native'"
                    class="progress native"
                    :class="progressClasses"
                    :style="progressStyle"
                  >
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      :value="progress"
                      :disabled="!hasConfig || !duration"
                      @input="onSeek"
                    />
                  </div>
                  <div
                    v-else
                    ref="progressBarRef"
                    class="progress custom"
                    :class="progressClasses"
                    :style="progressStyle"
                    role="slider"
                    aria-label="播放进度"
                    :aria-valuenow="Math.round(progress)"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    @pointerdown="onSeekPointerDown"
                  >
                    <div class="progress-track">
                      <div class="progress-fill"></div>
                      <div v-if="showProgressThumb" class="progress-thumb"></div>
                    </div>
                  </div>
                  <span v-if="rightTimeVisible" class="time right">{{ rightTimeText }}</span>
                </div>

                <div class="transport">
                  <button
                    class="icon-btn"
                    type="button"
                    :disabled="!hasConfig || !duration"
                    aria-label="快退 5 秒"
                    @click="seekBySeconds(-5)"
                  >
                    <svg viewBox="0 0 1024 1024" aria-hidden="true">
                      <path
                        d="M512 0C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0z m316.8 828.8c-41.2 41.2-89.1 73.5-142.4 96C631.2 948.2 572.5 960 512 960s-119.2-11.8-174.4-35.2c-53.3-22.6-101.3-54.9-142.4-96-41.2-41.2-73.5-89.1-96-142.4C75.8 631.2 64 572.5 64 512s11.8-119.2 35.2-174.4c22.6-53.3 54.9-101.3 96-142.4 41.2-41.2 89.1-73.5 142.4-96C392.8 75.8 451.5 64 512 64s119.2 11.8 174.4 35.2c53.3 22.6 101.3 54.9 142.4 96 41.2 41.2 73.5 89.1 96 142.4C948.2 392.8 960 451.5 960 512s-11.8 119.2-35.2 174.4c-22.5 53.3-54.8 101.2-96 142.4z"
                        fill="currentColor"
                      />
                      <path
                        d="M768 305.3v413.3c0 6.8-8 10.5-13.2 6.1L550.9 551v167.7c0 6.8-8 10.5-13.2 6.1L304 525.6V704h-64V320h64v178.4l233.7-199.1c5.2-4.4 13.2-0.7 13.2 6.1V473l203.9-173.7c5.2-4.5 13.2-0.8 13.2 6z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <button
                    class="icon-btn primary"
                    type="button"
                    :disabled="!hasConfig || !duration"
                    aria-label="播放或暂停"
                    @click="togglePlay"
                  >
                    <svg v-if="isPlaying" viewBox="0 0 1024 1024" aria-hidden="true">
                      <path
                        d="M512 64c60.5 0 119.2 11.8 174.4 35.2 53.3 22.6 101.3 54.9 142.4 96 41.2 41.2 73.5 89.1 96 142.4C948.2 392.8 960 451.5 960 512s-11.8 119.2-35.2 174.4c-22.6 53.3-54.9 101.3-96 142.4-41.2 41.2-89.1 73.5-142.4 96C631.2 948.2 572.5 960 512 960s-119.2-11.8-174.4-35.2c-53.3-22.6-101.3-54.9-142.4-96-41.2-41.2-73.5-89.1-96-142.4C75.8 631.2 64 572.5 64 512s11.8-119.2 35.2-174.4c22.6-53.3 54.9-101.3 96-142.4 41.2-41.2 89.1-73.5 142.4-96C392.8 75.8 451.5 64 512 64m0-64C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0z"
                        fill="currentColor"
                      />
                      <path
                        d="M427 752h-56c-2.2 0-4-1.8-4-4V276c0-2.2 1.8-4 4-4h56c2.2 0 4 1.8 4 4v472c0 2.2-1.8 4-4 4zM652 752h-56c-2.2 0-4-1.8-4-4V276c0-2.2 1.8-4 4-4h56c2.2 0 4 1.8 4 4v472c0 2.2-1.8 4-4 4z"
                        fill="currentColor"
                      />
                    </svg>
                    <svg v-else viewBox="0 0 1024 1024" aria-hidden="true">
                      <path
                        d="M512 64c60.5 0 119.2 11.8 174.4 35.2 53.3 22.6 101.3 54.9 142.4 96 41.2 41.2 73.5 89.1 96 142.4C948.2 392.8 960 451.5 960 512s-11.8 119.2-35.2 174.4c-22.6 53.3-54.9 101.3-96 142.4-41.2 41.2-89.1 73.5-142.4 96C631.2 948.2 572.5 960 512 960s-119.2-11.8-174.4-35.2c-53.3-22.6-101.3-54.9-142.4-96-41.2-41.2-73.5-89.1-96-142.4C75.8 631.2 64 572.5 64 512s11.8-119.2 35.2-174.4c22.6-53.3 54.9-101.3 96-142.4 41.2-41.2 89.1-73.5 142.4-96C392.8 75.8 451.5 64 512 64m0-64C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0z"
                        fill="currentColor"
                      />
                      <path
                        d="M809.7 508.5L357.9 259.3c-2.7-1.5-5.9 0.5-5.9 3.5v498.4c0 3 3.3 5 5.9 3.5l451.7-249.2c2.8-1.5 2.8-5.5 0.1-7z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <button
                    class="icon-btn"
                    type="button"
                    :disabled="!hasConfig || !duration"
                    aria-label="快进 5 秒"
                    @click="seekBySeconds(5)"
                  >
                    <svg viewBox="0 0 1024 1024" aria-hidden="true">
                      <path
                        d="M0 512c0 282.8 229.2 512 512 512s512-229.2 512-512S794.8 0 512 0 0 229.2 0 512z m99.2 174.4C75.8 631.2 64 572.5 64 512s11.8-119.2 35.2-174.4c22.6-53.3 54.9-101.3 96-142.4 41.2-41.2 89.1-73.5 142.4-96C392.8 75.8 451.5 64 512 64s119.2 11.8 174.4 35.2c53.3 22.6 101.3 54.9 142.4 96 41.2 41.2 73.5 89.1 96 142.4C948.2 392.8 960 451.5 960 512s-11.8 119.2-35.2 174.4c-22.6 53.3-54.9 101.3-96 142.4-41.2 41.2-89.1 73.5-142.4 96C631.2 948.2 572.5 960 512 960s-119.2-11.8-174.4-35.2c-53.3-22.6-101.3-54.9-142.4-96-41.2-41.2-73.5-89.1-96-142.4z"
                        fill="currentColor"
                      />
                      <path
                        d="M256 305.3v413.3c0 6.8 8 10.5 13.2 6.1L473.1 551v167.7c0 6.8 8 10.5 13.2 6.1L720 525.6V704h64V320h-64v178.4L486.3 299.2c-5.2-4.4-13.2-0.7-13.2 6.1V473L269.2 299.2c-5.2-4.4-13.2-0.7-13.2 6.1z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <audio
      ref="audioEl"
      :src="audioUrl"
      @timeupdate="handleTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @ended="onEnded"
    />
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24px;
  position: relative;
  overflow: hidden;
  color: #e5e7eb;
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

.layout {
  position: relative;
  z-index: 2;
  display: flex;
  gap: 20px;
  min-height: calc(100vh - 48px);
}

.layout.lyrics-right {
  flex-direction: row-reverse;
}

.card {
  background: linear-gradient(135deg, rgba(22, 31, 55, 0.9), rgba(18, 23, 38, 0.95));
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 18px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
}

.lyrics-panel {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 48px);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 12px;
}

.eyebrow {
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9ca3af;
  font-size: 12px;
  margin: 0 0 6px;
}

h2 {
  margin: 0;
  font-size: 22px;
  letter-spacing: -0.02em;
}

.lyrics-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow: hidden;
}

.now-line {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  font-size: 18px;
  color: #e0f2fe;
  min-height: 44px;
  display: flex;
  align-items: center;
  transition: background 200ms ease;
}

.now-line.empty {
  color: #94a3b8;
}

.lyrics {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: rgba(56, 189, 248, 0.6) transparent;
}

.lyrics::-webkit-scrollbar {
  width: 8px;
}

.lyrics::-webkit-scrollbar-track {
  background: transparent;
}

.lyrics::-webkit-scrollbar-thumb {
  background: rgba(56, 189, 248, 0.45);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.lyrics::-webkit-scrollbar-thumb:hover {
  background: rgba(56, 189, 248, 0.7);
}

.lyric-line {
  display: grid;
  grid-template-columns: 80px 1fr;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  color: #cbd5e1;
  transition: background 150ms ease, color 150ms ease;
}

.lyric-line .stamp {
  font-size: 12px;
  color: #94a3b8;
}

.lyric-line .text {
  font-size: 15px;
  line-height: 1.4;
}

.lyric-line.active {
  background: rgba(34, 211, 238, 0.1);
  color: #e0f2fe;
}

.placeholder {
  color: #94a3b8;
  margin: 10px 0 0;
}

.empty {
  text-align: center;
  padding: 32px 20px;
  border: 1px dashed rgba(148, 163, 184, 0.25);
  border-radius: 12px;
}

.right-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: calc(100vh - 48px);
}

.info-panel {
  padding: 20px;
  padding-bottom: 10px;
  height: auto;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.info-panel.disabled {
  opacity: 0.9;
}

.info-top {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.cover {
  flex: 0 0 160px;
  max-width: 160px;
  aspect-ratio: 1 / 1;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover img {
  width: 100%;
  height: 100%;
}

.cover-fallback svg {
  width: 72px;
  height: 72px;
}

.info-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 0px;
}

.title-row h2 {
  font-size: 24px;
  font-weight: 700;
}

.tag {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.2);
}

.desc {
  margin: 0;
  color: #cbd5e1;
  font-size: 14px;
}

.info-divider {
  height: 1px;
  width: 100%;
  background: rgba(148, 163, 184, 0.25);
}

.progress-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 6px;
}

.info-bottom {
  display: flex;
  flex-direction: column;
  gap: -5px;
}

.time {
  font-size: 12px;
  color: #cbd5e1;
  font-variant-numeric: tabular-nums;
  line-height: 12px;
  white-space: nowrap;
}

.time.left {
  text-align: left;
}

.time.right {
  text-align: right;
}

.progress {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 6px;
  border-radius: 999px;
}

.progress.square {
  border-radius: 0;
}

.progress.square .progress-track,
.progress.square .progress-fill {
  border-radius: 0;
}

.progress.custom {
  cursor: pointer;
}

.progress.custom .progress-track {
  position: relative;
  width: 100%;
  height: 6px;
  border-radius: inherit;
  background: rgba(148, 163, 184, 0.25);
  overflow: hidden;
}

.progress.custom .progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--progress, 0%);
  background: linear-gradient(
    90deg,
    var(--fill-start, #22d3ee) 0%,
    var(--fill-end, #22d3ee) 100%
  );
  border-radius: inherit;
  z-index: 1;
}

.progress.custom .progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: var(--shimmer-size, 42px);
  opacity: 0;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.75) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  z-index: 2;
}

.progress.custom.shimmer .progress-fill::after {
  opacity: 1;
  animation: shimmer var(--shimmer-duration, 5s) linear infinite;
}

.progress.custom .progress-thumb {
  position: absolute;
  top: 50%;
  left: var(--progress, 0%);
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--thumb-color, #22d3ee);
  border: 2px solid rgba(15, 23, 42, 0.8);
  box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.2);
  z-index: 3;
}

.progress.custom.no-thumb .progress-thumb {
  display: none;
}

.progress.custom.thumb-glow .progress-thumb {
  animation: thumbPulse 1.4s ease-in-out infinite;
}

@keyframes thumbPulse {
  0%,
  100% {
    box-shadow: 0 0 4px rgba(15, 23, 42, 0.4), 0 0 10px var(--thumb-color, #22d3ee);
  }
  50% {
    box-shadow: 0 0 2px rgba(15, 23, 42, 0.2), 0 0 14px var(--thumb-color, #22d3ee);
  }
}

.progress input[type='range'] {
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: inherit;
  background: linear-gradient(
      90deg,
      var(--fill-start, #22d3ee) 0%,
      var(--fill-end, #22d3ee) var(--progress, 0%),
      rgba(148, 163, 184, 0.25) var(--progress, 0%),
      rgba(148, 163, 184, 0.25) 100%
    );
  outline: none;
  transition: background 120ms ease;
}

.progress input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--fill-end, #22d3ee);
  box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.2);
  border: 2px solid rgba(15, 23, 42, 0.8);
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}

.progress input[type='range']::-webkit-slider-thumb:hover {
  background: #38bdf8;
  transform: scale(1.05);
}

.progress input[type='range']::-moz-range-track {
  height: 6px;
  background: rgba(148, 163, 184, 0.25);
  border-radius: inherit;
}

.progress input[type='range']::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--fill-end, #22d3ee);
  border: 2px solid rgba(15, 23, 42, 0.8);
  box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.2);
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}

.progress.no-thumb input[type='range']::-webkit-slider-thumb {
  width: 0;
  height: 0;
  border: 0;
  box-shadow: none;
  background: transparent;
}

.progress.no-thumb input[type='range']::-moz-range-thumb {
  width: 0;
  height: 0;
  border: 0;
  box-shadow: none;
  background: transparent;
}

.progress.thumb-glow input[type='range']::-webkit-slider-thumb {
  box-shadow: 0 0 6px var(--fill-end, #22d3ee), 0 0 16px var(--fill-end, #22d3ee);
}

.progress.thumb-glow input[type='range']::-moz-range-thumb {
  box-shadow: 0 0 6px var(--fill-end, #22d3ee), 0 0 16px var(--fill-end, #22d3ee);
}

.progress.native.shimmer::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  height: 6px;
  width: var(--progress, 0%);
  transform: translateY(-50%);
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.6) 45%,
    rgba(255, 255, 255, 0) 90%
  );
  background-size: 200% 100%;
  animation: shimmer 5s linear infinite;
  pointer-events: none;
}

@keyframes shimmer {
  0% {
    transform: translateX(calc(var(--shimmer-size, 30px) * -1));
    opacity: 0;
  }
  80% {
    opacity: 1;
  }
  100% {
    transform: translateX(var(--shimmer-end, 0px));
    opacity: 0;
  }
}

.transport {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.icon-btn {
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  color: #e2e8f0;
  display: grid;
  place-items: center;
  cursor: pointer;
  padding: 0;
  transition: opacity 120ms ease, color 160ms ease;
}

.icon-btn svg {
  width: 30px;
  height: 30px;
}

.icon-btn.primary {
  width: 52px;
  height: 52px;
  color: #7dd3fc;
}

.icon-btn:hover {
  color: #bae6fd;
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
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

.ghost:hover {
  border-color: rgba(56, 189, 248, 0.9);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
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
  transform: translateY(-1px);
  box-shadow: 0 10px 30px rgba(37, 99, 235, 0.35);
}

.pill:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

@media (max-width: 960px) {
  .layout {
    flex-direction: column;
  }

  .lyrics-panel,
  .right-column {
    height: auto;
  }

  .info-panel {
    height: auto;
  }

}
</style>
