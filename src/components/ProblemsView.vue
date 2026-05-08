<template>
  <div class="problems-page">

    <!-- Hero -->
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-eyebrow">3D 打印 · 故障排查</p>
        <h1 class="hero-title">遇到问题了？<br><em>这里帮你解决。</em></h1>
        <p class="hero-desc">收录 {{ problems.length }} 个常见打印失败场景，点击卡片查看分步解决方案。</p>
      </div>
    </section>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-inner">
        <div class="search-wrap" :class="{ focused: searchFocused }">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.4"/>
            <path d="M10 10l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索，如「翘边」「拉丝」「堵嘴」…"
            class="search-input"
            @focus="searchFocused = true"
            @blur="searchFocused = false"
            @keydown.escape="searchQuery = ''"
          />
          <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="filters">
          <button
            v-for="cat in categories"
            :key="cat"
            :class="['filter-btn', { active: activeCategory === cat }]"
            @click="activeCategory = cat"
          >{{ cat }}</button>
        </div>

        <!-- 难度图例 -->
        <div class="legend">
          <span class="legend-item"><span class="dot dot-normal"></span>常见</span>
          <span class="legend-item"><span class="dot dot-urgent"></span>紧急</span>
          <span class="legend-item"><span class="dot dot-warn"></span>需处理</span>
          <span class="legend-item"><span class="dot dot-advanced"></span>进阶</span>
        </div>

        <span class="result-count">{{ filteredProblems.length }} 个结果</span>
      </div>
    </div>

    <!-- Grid -->
    <main class="grid-wrap">
      <div v-if="filteredProblems.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <p class="empty-title">没有找到「{{ searchQuery }}」</p>
        <p class="empty-desc">试试其他关键词，比如「翘边」「堵嘴」「拉丝」</p>
        <button class="empty-reset" @click="searchQuery = ''; activeCategory = '全部'">清除筛选</button>
      </div>

      <TransitionGroup v-else name="card" tag="div" class="problems-grid">
        <article
          v-for="(problem, index) in filteredProblems"
          :key="problem.id"
          class="problem-card"
          :style="{ '--card-color': problem.color, '--delay': Math.min(index, 12) * 0.03 + 's' }"
          @click="$emit('go-detail', problem.id)"
        >
          <div class="card-image" :style="{ background: problem.bgGradient }">
            <span class="card-emoji"><img :src="problem.images" alt="icon" style="width: 100%; height: 100%; object-fit: contain;" /></span>
            <div class="card-glow" :style="{ background: problem.color }"></div>
            <span class="card-difficulty" :class="'diff-' + diffClass(problem.difficulty)">{{ problem.difficulty }}</span>
          </div>
          <div class="card-body">
            <div class="card-category">{{ problem.category }}</div>
            <h3 class="card-title" v-html="highlight(problem.title)"></h3>
            <p class="card-subtitle" v-html="highlight(problem.subtitle)"></p>
            <div class="card-arrow">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M2.5 7.5h10M8.5 3.5l4 4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        </article>
      </TransitionGroup>
    </main>

    <!-- 耗材参数速查表 -->
    <section class="temp-section">
      <div class="temp-inner">
        <h2 class="temp-title"><span>🌡️</span> 耗材参数速查表</h2>
        <p class="temp-sub">常用耗材的推荐打印参数</p>
        <div class="temp-grid">
          <div v-for="m in materials" :key="m.name" class="temp-card" :style="{ '--mc': m.color }">
            <div class="temp-name">{{ m.name }}</div>
            <div class="temp-rows">
              <div class="temp-row"><span class="temp-label">喷嘴</span><span class="temp-val">{{ m.nozzle }}</span></div>
              <div class="temp-row"><span class="temp-label">热床</span><span class="temp-val">{{ m.bed }}</span></div>
              <div class="temp-row"><span class="temp-label">风扇</span><span class="temp-val">{{ m.fan }}</span></div>
              <div class="temp-row"><span class="temp-label">速度</span><span class="temp-val">{{ m.speed }}</span></div>
            </div>
            <div class="temp-tip">{{ m.tip }}</div>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { problems, categories } from '@/data/problems.js'

defineEmits(['go-detail', 'open-auth'])

const activeCategory = ref('全部')
const searchQuery = ref('')
const searchFocused = ref(false)

const filteredProblems = computed(() => {
  let list = problems
  if (activeCategory.value !== '全部') list = list.filter(p => p.category === activeCategory.value)
  const q = searchQuery.value.trim().toLowerCase()
  if (q) list = list.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.subtitle.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    p.causes.some(c => c.toLowerCase().includes(q))
  )
  return list
})

const highlight = (text) => {
  const q = searchQuery.value.trim()
  if (!q) return text
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>')
}

const diffClass = (d) => {
  if (d === '紧急') return 'urgent'
  if (d === '需处理') return 'warn'
  if (d === '进阶') return 'advanced'
  return 'normal'
}

const materials = [
  { name: 'PLA',   color: '#5cba7a', nozzle: '190–220°C', bed: '55–65°C',   fan: '100%',  speed: '40–100mm/s', tip: '最易打印，新手首选' },
  { name: 'PETG',  color: '#74b9ff', nozzle: '230–245°C', bed: '70–85°C',   fan: '50%',   speed: '30–60mm/s',  tip: '韧性强，耐热耐化学腐蚀' },
  { name: 'ABS',   color: '#ff6b6b', nozzle: '230–250°C', bed: '100–110°C', fan: '关闭',  speed: '30–60mm/s',  tip: '需封闭箱，气味较大' },
  { name: 'ASA',   color: '#fdcb6e', nozzle: '240–260°C', bed: '90–110°C',  fan: '关闭',  speed: '30–60mm/s',  tip: '耐紫外线，户外零件首选' },
  { name: 'TPU',   color: '#a29bfe', nozzle: '220–240°C', bed: '30–60°C',   fan: '100%',  speed: '20–30mm/s',  tip: '柔性材料，建议用直驱机' },
  { name: 'PA尼龙', color: '#e17055', nozzle: '240–270°C', bed: '70–90°C',  fan: '30–50%',speed: '30–50mm/s',  tip: '极易受潮，打印前务必烘干' },
]
</script>

<style scoped>
.problems-page { min-height: 100vh; background: #000; color: #f5f5f7; font-family: -apple-system,'PingFang SC','Helvetica Neue',sans-serif; }

.hero { padding: 64px 24px 48px; text-align: center; }
.hero-inner { max-width: 640px; margin: 0 auto; }
.hero-eyebrow { font-size: 12px; letter-spacing: 0.12em; color: #6e6e73; margin-bottom: 16px; text-transform: uppercase; }
.hero-title { font-size: clamp(2.2rem,6vw,3.8rem); font-weight: 700; line-height: 1.08; letter-spacing: -0.03em; margin-bottom: 20px; color: #f5f5f7; }
.hero-title em { font-style: normal; background: linear-gradient(135deg,#ff6b6b 0%,#ffb347 50%,#ff6b9d 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.hero-desc { font-size: 16px; color: #6e6e73; line-height: 1.7; }

/* Toolbar — top:52px 配合 App.vue 导航栏高度 */
.toolbar { padding: 12px 24px; position: sticky; top: 52px; z-index: 50; background: rgba(0,0,0,0.92); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-bottom: 0.5px solid rgba(255,255,255,0.07); }
.toolbar-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.search-wrap { display: flex; align-items: center; gap: 8px; background: #1c1c1e; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 9px 14px; flex: 1; min-width: 180px; max-width: 280px; transition: border-color 0.2s, box-shadow 0.2s; }
.search-wrap.focused { border-color: rgba(255,255,255,0.22); box-shadow: 0 0 0 3px rgba(255,255,255,0.04); }
.search-icon { color: #48484a; flex-shrink: 0; transition: color 0.2s; }
.search-wrap.focused .search-icon { color: #86868b; }
.search-input { background: transparent; border: none; outline: none; color: #f5f5f7; font-size: 14px; font-family: inherit; flex: 1; min-width: 0; }
.search-input::placeholder { color: #3a3a3c; }
.search-clear { background: transparent; border: none; color: #48484a; cursor: pointer; padding: 0; display: flex; align-items: center; flex-shrink: 0; transition: color 0.15s; }
.search-clear:hover { color: #86868b; }

.filters { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-btn { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #6e6e73; padding: 6px 14px; border-radius: 100px; font-size: 13px; cursor: pointer; transition: all 0.18s; font-family: inherit; white-space: nowrap; }
.filter-btn:hover { border-color: rgba(255,255,255,0.22); color: #aeaeb2; }
.filter-btn.active { background: #f5f5f7; border-color: #f5f5f7; color: #1d1d1f; font-weight: 500; }

.legend { display: flex; gap: 10px; flex-wrap: wrap; }
.legend-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #48484a; white-space: nowrap; }
.dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.dot-normal   { background: rgba(255,255,255,0.35); }
.dot-urgent   { background: #ff6b6b; }
.dot-warn     { background: #a29bfe; }
.dot-advanced { background: #74b9ff; }
.result-count { margin-left: auto; font-size: 12px; color: rgba(255,255,255,0.18); white-space: nowrap; }

.grid-wrap { padding: 28px 24px 60px; }
.problems-grid { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill,minmax(230px,1fr)); gap: 14px; position: relative; }

.problem-card { background: #1c1c1e; border-radius: 18px; overflow: hidden; cursor: pointer; transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease; animation: cardIn 0.45s ease both; animation-delay: var(--delay); border: 0.5px solid rgba(255,255,255,0.05); }
@keyframes cardIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
.problem-card:hover { transform: translateY(-6px) scale(1.015); box-shadow: 0 20px 56px rgba(0,0,0,0.6),0 0 0 0.5px rgba(255,255,255,0.1); }
.problem-card:active { transform: scale(0.98); transition-duration: 0.1s; }

.card-image { position: relative; height: 180px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.card-emoji { font-size: 66px; position: relative; z-index: 2; transition: transform 0.3s ease; line-height: 1; filter: drop-shadow(0 6px 18px rgba(0,0,0,0.4)); font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; }
.problem-card:hover .card-emoji { transform: scale(1.12) translateY(-4px); }
.card-glow { position: absolute; width: 110px; height: 110px; border-radius: 50%; opacity: 0.2; filter: blur(36px); z-index: 1; transition: opacity 0.3s, transform 0.3s; }
.problem-card:hover .card-glow { opacity: 0.4; transform: scale(1.3); }
.card-difficulty { position: absolute; top: 11px; right: 11px; font-size: 10px; padding: 3px 9px; border-radius: 100px; z-index: 3; letter-spacing: 0.04em; backdrop-filter: blur(8px); }
.diff-normal   { background: rgba(255,255,255,0.1);  color: rgba(255,255,255,0.55); }
.diff-urgent   { background: rgba(232,92,92,0.22);   color: #ff6b6b; }
.diff-warn     { background: rgba(162,155,254,0.18); color: #a29bfe; }
.diff-advanced { background: rgba(116,185,255,0.18); color: #74b9ff; }

.card-body { padding: 17px 19px 19px; }
.card-category { font-size: 10px; color: var(--card-color); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 5px; font-weight: 600; }
.card-title { font-size: 15px; font-weight: 600; color: #f5f5f7; margin: 0 0 4px; letter-spacing: -0.01em; line-height: 1.3; }
.card-subtitle { font-size: 12px; color: #6e6e73; line-height: 1.45; margin: 0 0 14px; }
.card-arrow { color: var(--card-color); display: flex; align-items: center; opacity: 0.6; transition: transform 0.2s, opacity 0.2s; }
.problem-card:hover .card-arrow { transform: translateX(3px); opacity: 1; }

:deep(mark) { background: rgba(255,214,0,0.26); color: #ffd60a; border-radius: 3px; padding: 0 2px; font-style: normal; }

.empty-state { max-width: 280px; margin: 80px auto; text-align: center; }
.empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.5; }
.empty-title { font-size: 16px; font-weight: 600; color: #e5e5ea; margin-bottom: 6px; }
.empty-desc { font-size: 13px; color: #48484a; line-height: 1.6; margin-bottom: 18px; }
.empty-reset { background: #1c1c1e; border: 1px solid rgba(255,255,255,0.1); color: #2997ff; padding: 8px 20px; border-radius: 100px; font-size: 13px; font-family: inherit; cursor: pointer; }
.empty-reset:hover { background: #2c2c2e; }

.card-enter-active { transition: all 0.22s ease; }
.card-leave-active { transition: all 0.16s ease; position: absolute; }
.card-enter-from, .card-leave-to { opacity: 0; transform: scale(0.94); }
.card-move { transition: transform 0.28s ease; }

/* 耗材表 */
.temp-section { padding: 0 24px 80px; }
.temp-inner { max-width: 1200px; margin: 0 auto; }
.temp-title { display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 600; color: #f5f5f7; margin-bottom: 6px; letter-spacing: -0.01em; }
.temp-sub { font-size: 13px; color: #48484a; margin-bottom: 18px; }
.temp-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(170px,1fr)); gap: 12px; }
.temp-card { background: #1c1c1e; border: 0.5px solid rgba(255,255,255,0.06); border-top: 2px solid var(--mc); border-radius: 14px; padding: 16px; transition: transform 0.2s, border-color 0.2s; }
.temp-card:hover { transform: translateY(-2px); border-color: var(--mc); }
.temp-name { font-size: 15px; font-weight: 700; color: var(--mc); margin-bottom: 12px; }
.temp-rows { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.temp-row { display: flex; justify-content: space-between; }
.temp-label { font-size: 11px; color: #48484a; }
.temp-val { font-size: 12px; font-weight: 500; color: #aeaeb2; }
.temp-tip { font-size: 11px; color: #6e6e73; line-height: 1.5; padding-top: 10px; border-top: 0.5px solid rgba(255,255,255,0.06); }

@media (max-width: 640px) {
  .hero { padding: 40px 20px 28px; }
  .toolbar { top: 52px; padding: 10px 16px; }
  .search-wrap { max-width: 100%; }
  .result-count, .legend { display: none; }
  .grid-wrap { padding: 16px 16px 40px; }
  .problems-grid { grid-template-columns: repeat(2,1fr); gap: 10px; }
  .card-image { height: 148px; }
  .card-emoji { font-size: 52px; }
  .card-body { padding: 13px 15px 15px; }
  .card-title { font-size: 14px; }
  .temp-section { padding: 0 16px 60px; }
  .temp-grid { grid-template-columns: repeat(2,1fr); }
}
</style>
