<template>
  <div class="mobile-container">
    <!-- 顶部标题和按钮卡片 - 占页面高度的1/5 -->
    <header class="top-card">
      <div class="title-section">
        <h1>歌词制作</h1>
        <div class="button-section">
          <button class="export-btn" :class="{ 'export-lrc-button': allCompleted }" @click="exportLrc" :disabled="!lines.length">导出 LRC</button>
          <button class="back-btn" @click="goBack">返回</button>
        </div>
      </div>
    </header>

    <!-- 中间时间轴卡片 - 占页面高度的3/5 -->
    <section class="timeline-card" :class="{ 'all-completed': allCompleted }" ref="timelineRef">
      <div class="timeline-header">
        <div class="timeline-title">时间轴</div>
        <div class="timeline-status" v-if="allCompleted">🎉 全部完成</div>
      </div>

      <div v-if="!lines.length" class="empty-tip">请粘贴歌词或加载文本，然后加载音频开始打轴。</div>

      <div v-for="(line, idx) in lines" :key="idx" :ref="setRowRef(idx)"
           :class="['timeline-row', { active: idx === currentIndex, completed: line.time != null, discharging: dischargingSet.has(idx) } ]"
           @click="selectLine(idx)">
        <div class="index">{{ idx + 1 }}</div>
        <input class="time-input" :value="line.time != null ? formatTime(line.time) : ''" readonly />
        <div class="text-input">{{ line.text }}</div>
      </div>
    </section>

    <!-- 底部操作卡片 - 剩余高度 -->
    <div class="bottom-card">
      <div class="input-section">
        <textarea class="lyrics-textarea" v-model="rawLyrics" placeholder="在此粘贴歌词，每行一句"></textarea>
        <button class="generate-btn" @click="parseRawLyrics(rawLyrics)">生成歌词行</button>
      </div>

      <div class="controls-section">
        <div class="audio-controls-top">
          <div class="audio-input-wrapper">
            <input id="audio-input" class="audio-input" type="file" accept="audio/*" @change="onAudioSelected" :class="{ 'has-file': audioLoaded }" />
            <label class="audio-input-label" for="audio-input" v-show="!audioLoaded"></label>
            <span class="audio-filename" v-if="audioName && audioLoaded">{{ audioName }}</span>
          </div>
          <button class="play-btn" @click="togglePlay">{{ isPlaying ? '暂停' : '播放' }}</button>
        </div>

        <div class="action-buttons">
          <button class="stamp-btn" @click="stampCurrent" :disabled="!audioLoaded || !lines.length">打轴</button>
          <button class="delete-btn" @click="deleteTimestamp" :disabled="!lines.length">回退</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// Data
const rawLyrics = ref('');
const lines = ref([]); // { text, time }
const currentIndex = ref(0);
const timelineRef = ref(null);
const rowRefs = ref([]);
const audioEl = ref(new Audio());
const audioLoaded = ref(false);
const isPlaying = ref(false);
const audioName = ref('lyrics');
const dischargingSet = ref(new Set());

// Helpers
const formatTime = (ms) => {
  if (ms == null) return '';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

const allCompleted = computed(() => lines.value.length > 0 && lines.value.every(l => l.time != null));
const progressText = computed(() => {
  const total = lines.value.length;
  const done = lines.value.filter(l => l.time != null).length;
  return `已打轴 ${done} / ${total}`;
});

// Row refs helper
const setRowRef = (i) => (el) => { rowRefs.value[i] = el; };

const centerRowInView = async (index) => {
  await nextTick();
  const container = timelineRef.value;
  const el = rowRefs.value[index];
  if (!container || !el) return;
  const containerRect = container.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const currentScroll = container.scrollTop;
  const offset = el.offsetTop - container.offsetTop;
  const target = offset - (container.clientHeight / 2) + (el.clientHeight / 2);
  container.scrollTo({ top: target, behavior: 'smooth' });
};

// Audio handlers
const onAudioSelected = (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  audioName.value = file.name.replace(/\.[^.]+$/, '');
  const url = URL.createObjectURL(file);
  audioEl.value.src = url;
  audioLoaded.value = true;
  audioEl.value.onended = () => { isPlaying.value = false; };
};

const togglePlay = async () => {
  if (!audioLoaded.value) return;
  try {
    if (audioEl.value.paused) {
      await audioEl.value.play();
      isPlaying.value = true;
    } else {
      audioEl.value.pause();
      isPlaying.value = false;
    }
  } catch (err) {
    console.error('播放失败', err);
  }
};

const selectLine = (idx) => {
  currentIndex.value = idx;
  centerRowInView(idx);
};

const stampCurrent = () => {
  if (!lines.value.length || !audioLoaded.value) return;
  const timeMs = Math.floor((audioEl.value.currentTime || 0) * 1000);
  lines.value[currentIndex.value].time = timeMs;
  // move to next
  const next = Math.min(lines.value.length - 1, currentIndex.value + 1);
  currentIndex.value = next;
  centerRowInView(currentIndex.value);
};

const deleteTimestamp = () => {
  if (!lines.value.length) return;
  // Prefer to clear current index; if empty, move back one and clear that
  let idx = currentIndex.value;
  if (lines.value[idx].time == null && idx > 0) idx = idx - 1;
  if (idx < 0) return;
  lines.value[idx].time = null;
  // trigger visual discharging
  dischargingSet.value.add(idx);
  setTimeout(() => {
    dischargingSet.value.delete(idx);
  }, 750);
  currentIndex.value = idx;
  centerRowInView(idx);
};

const exportLrc = () => {
  if (!lines.value.length) return;
  const content = lines.value.map(line => {
    if (line.time == null) return line.text;
    return `[${formatTime(line.time)}]${line.text}`;
  }).join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${audioName.value || 'lyrics'}.lrc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const goBack = () => router.push('/settings');

// For demo: parse rawLyrics if provided (simple split by line)
const parseRawLyrics = (text) => {
  const arr = (text || '').split(/\r?\n/).filter(Boolean).map(t => ({ text: t, time: null }));
  lines.value = arr;
  currentIndex.value = 0;
  rowRefs.value = [];
};

// Expose a simple way to set lyrics from other pages for testing
onMounted(() => {
  const isMobileUA = /Mobi|Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');
  const wide = window.innerWidth > 600;
  if (!isMobileUA && wide) {
    router.replace('/lrcmake');
  }
  // if there's prefilled rawLyrics, parse it
  if (rawLyrics.value) parseRawLyrics(rawLyrics.value);
});
</script>

<style scoped>
/* Mobile-first design for lyric making page with fixed layout */
.mobile-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(180deg, #071021 0%, #0b1224 100%);
  color: #e6eef6;
  padding: 12px;
  box-sizing: border-box;
  overflow: hidden; /* Prevent scrolling */
  gap: 12px;
}

/* Top card with title and buttons - takes 1/5 of screen */
.top-card {
  height: 10%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  background: rgba(15, 23, 42, 0.7);
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  box-sizing: border-box;
}

.title-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.title-section h1 {
  margin: 0;
  font-size: 20px;
  color: #e6eef6;
  letter-spacing: -0.01em;
}

.button-section {
  display: flex;
  gap: 10px;
  margin-left: auto; /* Ensures buttons are pushed to the right */
}

.export-btn, .back-btn {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: linear-gradient(135deg, #66ccff, #66ccff);
  color: #0b1224;
  border-radius: 10px;
  padding: 8px 16px;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease, opacity 160ms ease;
  font-size: 13px;
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.back-btn {
  background: transparent;
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.5);
}

/* Middle timeline card - takes 3/5 of screen */
.timeline-card {
  height: 65%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: rgba(15, 23, 42, 0.7);
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  box-sizing: border-box;
  overflow: auto; /* Allow scrolling only within this card */
  scrollbar-width: thin;
  scrollbar-color: rgba(96, 165, 250, 0.6) transparent;
}

.timeline-card.all-completed {
  border-color: rgba(34, 197, 94, 0.7); /* Green glow effect */
  box-shadow: 0 0 15px rgba(34, 197, 94, 0.3);
}

/* Add transition for smooth change between states */
.timeline-card {
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.timeline-card::-webkit-scrollbar {
  width: 6px;
}

.timeline-card::-webkit-scrollbar-track {
  background: transparent;
}

.timeline-card::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(96, 165, 250, 0.6), rgba(79, 70, 229, 0.6));
  border-radius: 10px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.timeline-title {
  color: #cbd5e1;
  font-size: 14px;
  font-weight: 700;
}

.timeline-status {
  color: #86efac;
  font-size: 12px;
}

.empty-tip {
  color: #9fb3d8;
  text-align: center;
  padding: 28px 8px;
  font-size: 14px;
}

/* Timeline row styling - consistent with desktop version */
.timeline-row {
  display: grid;
  grid-template-columns: 36px 92px 1fr;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border-radius: 10px;
  background-color: rgba(255,255,255,0.02);
  background-image: linear-gradient(90deg, rgba(91,196,225,0.18), rgba(50,194,69,0.16));
  background-repeat: no-repeat;
  background-size: 0% 100%;
  background-position: left;
  border: 1px solid rgba(255,255,255,0.03);
  position: relative;
  overflow: hidden;
  transition: border-color 750ms cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 750ms cubic-bezier(0.25,0.46,0.45,0.94), background-size 750ms cubic-bezier(0.25,0.46,0.45,0.94);
  min-height: 56px;
  margin-bottom: 8px;
}

.timeline-row.active {
  border-color: rgba(102,204,255,0.85);
  box-shadow: 0 0 0 2px rgba(102, 204, 255, 0.25), 0 0 16px rgba(102, 204, 255, 0.35);
}

.timeline-row.completed {
  background-image: linear-gradient(90deg, rgba(91,196,225,1), rgba(50,194,69,1)); 
  background-size: 100% 100%;
}

.timeline-row.discharging {
  background-image: linear-gradient(to left, rgba(244,135,19,1), rgba(255,46,46,1)); 
  background-size: 0% 100% !important;
}

.index {
  color: #94a3b8;
  font-size: 12px;
  justify-self: center;
  font-weight: 700;
}

.time-input {
  text-align: center;
  background: rgba(255,255,255,0.03);
  color: #dbeafe;
  border: none;
  border-radius: 8px;
  padding: 0 10px;
  width: 100%;
  box-sizing: border-box;
  font-size: 13px;
  height: 36px;
}

.text-input {
  font-size: 14px;
  word-break: break-word;
  overflow: hidden;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.bottom-card {
  height: 25%;
  display: flex;
  gap: 12px;
  padding: 16px;
  background: rgba(15, 23, 42, 0.7);
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  box-sizing: border-box;
}

.input-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lyrics-textarea {
  flex: 1;
  width: 100%;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 8px;
  color: #e2e8f0;
  padding: 8px;
  font-size: 12px;
  resize: none;
  box-sizing: border-box;
  font-family: inherit;
  /* Custom scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: rgba(96, 165, 250, 0.6) transparent;
}

.lyrics-textarea::-webkit-scrollbar {
  width: 6px;
}

.lyrics-textarea::-webkit-scrollbar-track {
  background: transparent;
}

.lyrics-textarea::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(96, 165, 250, 0.6), rgba(79, 70, 229, 0.6));
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.lyrics-textarea::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(96, 165, 250, 0.85), rgba(79, 70, 229, 0.85));
}

.generate-btn {
  width: 100%;
  background: #66ccff;
  color: #0b1224;
  border: none;
  border-radius: 8px;
  padding: 6px;
  font-weight: bold;
  font-size: 12px;
  cursor: pointer;
}

.controls-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.audio-controls-top {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.audio-input-wrapper {
  position: relative;
  width: 100%;
  height: 36px;
}

.audio-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}

.audio-input.has-file {
  z-index: 0; /* Lower z-index when file is selected so filename is visible */
}

.audio-input-label {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 12px;
  pointer-events: none;
  z-index: 1;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 10px;
}

.audio-input-label::before {
  content: '请选择乐曲~';
}

.audio-filename {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 12px;
  pointer-events: none;
  z-index: 1;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 10px;
}

.audio-input:hover + .audio-input-label {
  background: rgba(15, 23, 42, 0.7);
  border-color: rgba(148, 163, 184, 0.6);
}

.audio-input:active + .audio-input-label {
  transform: scale(0.98);
  background: rgba(15, 23, 42, 0.5);
}

.audio-filename {
  pointer-events: none;
}

.play-btn {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  border-radius: 8px;
  padding: 8px;
  font-size: 12px;
  cursor: pointer;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  height: 85%;
}

.stamp-btn, .delete-btn {
  flex: 1;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 10px;
  font-size: 12px;
  cursor: pointer;
  height: 100%;
}

.stamp-btn {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.4);
  color: #d1fae5;
}

.delete-btn {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
  color: #fecaca;
}

.stamp-btn:disabled, .delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Animation for export button */
.export-btn {
  box-shadow: 0 0 0 rgba(102, 204, 255, 0); /* No shadow by default */
  transition: transform 120ms ease, box-shadow 0.3s ease, opacity 160ms ease;
}

.export-btn.export-lrc-button {
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

/* Responsive adjustments */
@media (max-width: 480px) {
  .mobile-container {
    padding: 8px;
    gap: 8px;
  }
  
  .top-card {
    padding: 12px;
  }
  
  .title-section h1 {
    font-size: 18px;
  }
  
  .export-btn, .back-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .timeline-card {
    padding: 12px;
  }
  
  .timeline-row {
    padding: 10px;
    grid-template-columns: 30px 80px 1fr;
    min-height: 50px;
  }
  
  .bottom-card {
    padding: 12px;
    gap: 8px;
  }
  
  .lyrics-textarea, .audio-input, .play-btn, .stamp-btn, .delete-btn {
    font-size: 11px;
    padding: 5px;
  }
  
  .generate-btn {
    padding: 5px;
    font-size: 11px;
  }
}
</style>