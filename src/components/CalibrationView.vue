<script setup>
import { computed, ref } from 'vue'
import { problems } from '@/data/problems.js'

const emit = defineEmits(['go-detail'])

const tracks = [
  {
    id: 'baseline',
    name: '基础校准',
    desc: '先把挤出、首层、温度稳定性校准到位。',
    items: ['estep-calibration', 'first-layer-lines', 'pid-tuning'],
  },
  {
    id: 'quality',
    name: '质量优化',
    desc: '减少转角鼓包、尺寸误差和表面瑕疵。',
    items: ['pressure-advance', 'tolerance-calibration', 'layer-height-guide'],
  },
  {
    id: 'materials',
    name: '材料专项',
    desc: '针对收缩、吸湿和特殊材料做补偿。',
    items: ['shrinkage-tolerance', 'filament-storage', 'cf-filament'],
  },
  {
    id: 'firmware',
    name: '固件与进阶',
    desc: '适合准备上 Klipper 或高加速度打印的人。',
    items: ['klipper-setup', 'pressure-advance', 'pid-tuning'],
  },
]

const quickChecks = [
  {
    title: '先校什么？',
    text: '建议顺序：E步 -> 首层/Z偏移 -> PID -> 流量/尺寸 -> 压力提前。',
  },
  {
    title: '多久复查一次？',
    text: '更换喷嘴、热端、挤出机、固件或耗材品牌后，都建议重新校准。',
  },
  {
    title: '什么时候别急着调参数？',
    text: '出现周期性异常、噪音、打滑时，先查机械松动和堵头，再做软件校准。',
  },
]

const selectedTrack = ref('baseline')

const problemMap = new Map(problems.map((problem) => [problem.id, problem]))

const selectedTrackData = computed(() => tracks.find((track) => track.id === selectedTrack.value) ?? tracks[0])
const selectedProblems = computed(() =>
  selectedTrackData.value.items
    .map((id) => problemMap.get(id))
    .filter(Boolean)
)
</script>

<template>
  <div class="calibration-page">
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <span class="hero-tag">Calibration Hub</span>
          <h1 class="hero-title">把机器调顺，再谈更快更漂亮。</h1>
          <p class="hero-desc">
            这里把 3D 打印里最值得优先做的校准项收在一起，按阶段给你一个更稳的调机路径。
          </p>
        </div>
        <div class="hero-panel">
          <div class="hero-panel-title">推荐调机顺序</div>
          <ol class="hero-steps">
            <li>E步与挤出一致性</li>
            <li>首层与 Z 偏移</li>
            <li>喷嘴 / 热床 PID</li>
            <li>流量与尺寸精度</li>
            <li>压力提前与高速质量</li>
          </ol>
        </div>
      </div>
    </section>

    <section class="tracks-section">
      <div class="section-head">
        <h2>校准路线</h2>
        <p>按你的阶段挑一条走，里面都已经串好了建议顺序。</p>
      </div>
      <div class="track-tabs">
        <button
          v-for="track in tracks"
          :key="track.id"
          :class="['track-tab', { active: selectedTrack === track.id }]"
          @click="selectedTrack = track.id"
        >
          <span class="track-name">{{ track.name }}</span>
          <span class="track-desc">{{ track.desc }}</span>
        </button>
      </div>

      <div class="card-grid">
        <article
          v-for="problem in selectedProblems"
          :key="problem.id"
          class="cal-card"
          :style="{ '--accent': problem.color }"
          @click="emit('go-detail', problem.id)"
        >
          <div class="cal-card-top">
            <span class="emoji">{{ problem.emoji }}</span>
            <span class="badge">{{ problem.difficulty }}</span>
          </div>
          <h3>{{ problem.title }}</h3>
          <p>{{ problem.description }}</p>
          <div class="cal-card-footer">
            <span>{{ problem.subtitle }}</span>
            <span class="arrow">查看步骤 →</span>
          </div>
        </article>
      </div>
    </section>

    <section class="checks-section">
      <div class="section-head">
        <h2>调机提醒</h2>
        <p>这三件事能帮你少走很多弯路。</p>
      </div>
      <div class="checks-grid">
        <div v-for="item in quickChecks" :key="item.title" class="check-card">
          <div class="check-title">{{ item.title }}</div>
          <p>{{ item.text }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.calibration-page { min-height: 100vh; background: #f5f5f7; color: #1d1d1f; }

.hero {
  padding: 44px 24px 30px;
  background:
    radial-gradient(circle at top right, rgba(255, 148, 77, 0.2), transparent 32%),
    linear-gradient(135deg, #faf7f1 0%, #f1f3f5 100%);
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
.hero-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 420px);
  gap: 18px;
  align-items: stretch;
}
.hero-copy, .hero-panel {
  background: rgba(255,255,255,0.7);
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 24px;
  padding: 26px;
  backdrop-filter: blur(10px);
}
.hero-tag {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 999px;
  background: #1d1d1f;
  color: #fff;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 14px;
}
.hero-title {
  font-size: clamp(30px, 5vw, 48px);
  line-height: 1.04;
  letter-spacing: -0.04em;
  margin-bottom: 14px;
}
.hero-desc {
  max-width: 54ch;
  font-size: 15px;
  line-height: 1.75;
  color: #5f6368;
}
.hero-panel-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 12px;
}
.hero-steps {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 10px;
  color: #43474d;
  line-height: 1.5;
}

.tracks-section, .checks-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 24px 60px;
}
.section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.section-head h2 {
  font-size: 22px;
  letter-spacing: -0.03em;
}
.section-head p {
  color: #6e6e73;
  font-size: 14px;
}

.track-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.track-tab {
  text-align: left;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #fff;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}
.track-tab:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(0,0,0,0.08);
}
.track-tab.active {
  border-color: #1d1d1f;
  box-shadow: 0 12px 32px rgba(29,29,31,0.12);
}
.track-name {
  display: block;
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 8px;
}
.track-desc {
  display: block;
  font-size: 13px;
  color: #6e6e73;
  line-height: 1.55;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.cal-card {
  background: #fff;
  border: 1px solid rgba(0,0,0,0.06);
  border-top: 3px solid var(--accent);
  border-radius: 22px;
  padding: 18px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.cal-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 36px rgba(0,0,0,0.1);
}
.cal-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.emoji {
  font-size: 28px;
  line-height: 1;
}
.badge {
  padding: 5px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 14%, white);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
}
.cal-card h3 {
  font-size: 18px;
  letter-spacing: -0.02em;
  margin-bottom: 10px;
}
.cal-card p {
  color: #5f6368;
  font-size: 14px;
  line-height: 1.65;
  margin-bottom: 16px;
}
.cal-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: #6e6e73;
}
.arrow {
  color: var(--accent);
  font-weight: 700;
  white-space: nowrap;
}

.checks-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.check-card {
  background: linear-gradient(180deg, #ffffff 0%, #fbfbfb 100%);
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 20px;
  padding: 20px;
}
.check-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 10px;
}
.check-card p {
  color: #5f6368;
  font-size: 14px;
  line-height: 1.65;
}

@media (max-width: 980px) {
  .hero-inner,
  .track-tabs,
  .card-grid,
  .checks-grid {
    grid-template-columns: 1fr 1fr;
  }
  .hero-copy {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .hero,
  .tracks-section,
  .checks-section {
    padding-left: 16px;
    padding-right: 16px;
  }
  .hero-inner,
  .track-tabs,
  .card-grid,
  .checks-grid {
    grid-template-columns: 1fr;
  }
  .section-head {
    flex-direction: column;
    align-items: start;
  }
}
</style>
