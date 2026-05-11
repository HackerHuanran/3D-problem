<template>
  <div class="problems-page">

    <!-- Hero -->
    <section class="hero">
      <!-- 背景滚动标题流 -->
      <div class="hero-bg-scroll" aria-hidden="true">
        <div class="scroll-row row-1">
          <span v-for="t in scrollRow1" :key="t.key" class="scroll-tag" :style="{ fontSize: t.size + 'px', opacity: t.opacity }">{{ t.text }}</span>
        </div>
        <div class="scroll-row row-2">
          <span v-for="t in scrollRow2" :key="t.key" class="scroll-tag" :style="{ fontSize: t.size + 'px', opacity: t.opacity }">{{ t.text }}</span>
        </div>
        <div class="scroll-row row-3">
          <span v-for="t in scrollRow3" :key="t.key" class="scroll-tag" :style="{ fontSize: t.size + 'px', opacity: t.opacity }">{{ t.text }}</span>
        </div>
        <div class="scroll-row row-4">
          <span v-for="t in scrollRow4" :key="t.key" class="scroll-tag" :style="{ fontSize: t.size + 'px', opacity: t.opacity }">{{ t.text }}</span>
        </div>
      </div>
      <div class="hero-inner">
        <p class="hero-eyebrow">{{ t('p.eyebrow') }}</p>
        <h1 class="hero-title">{{ t('p.h1a') }}<br><em>{{ t('p.h1b') }}</em></h1>
        <p class="hero-desc">{{ t('p.desc', { n: allProblems.length }) }}</p>
        <button class="share-btn" @click="$emit(currentUser ? 'go-submit' : 'open-auth', currentUser ? undefined : 'login')">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v9M3.5 6l4-5 4 5M2 12h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          提交打印问题
        </button>
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
            :placeholder="t('p.search')"
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
          <div class="filter-row">
            <span class="filter-row-label">类型</span>
            <div class="filter-chips">
              <button
                v-for="pt in PRINTER_TYPES"
                :key="pt"
                :class="['filter-btn', { active: activePrinterType === pt }]"
                @click="activePrinterType = pt"
              >{{ pt }}</button>
            </div>
          </div>
          <div class="filter-row">
            <span class="filter-row-label">分类</span>
            <div class="filter-chips">
              <button
                v-for="cat in categories"
                :key="cat"
                :class="['filter-btn', { active: activeCategory === cat && !showFavOnly }]"
                @click="showFavOnly = false; activeCategory = cat"
              >{{ catLabel(cat) }}</button>
              <button
                v-if="props.currentUser"
                :class="['filter-btn', 'fav-filter-btn', { active: showFavOnly }]"
                @click="showFavOnly = !showFavOnly; activeCategory = '全部'"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M8 13.5C5 12 1 9 1 5.5a3.5 3.5 0 0 1 7 0 3.5 3.5 0 0 1 7 0c0 3.5-4.5 6.5-7 8z"
                    :fill="showFavOnly ? '#ff6b6b' : 'none'"
                    :stroke="showFavOnly ? '#ff6b6b' : 'currentColor'"
                    stroke-width="1.4" stroke-linejoin="round"/>
                </svg>
                我的收藏
                <span v-if="favorites.size > 0" class="fav-count">{{ favorites.size }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 难度图例 -->
        <div class="legend">
          <span class="legend-item"><span class="dot dot-normal"></span>{{ t('p.d.normal') }}</span>
          <span class="legend-item"><span class="dot dot-urgent"></span>{{ t('p.d.urgent') }}</span>
          <span class="legend-item"><span class="dot dot-warn"></span>{{ t('p.d.warn') }}</span>
          <span class="legend-item"><span class="dot dot-advanced"></span>{{ t('p.d.advanced') }}</span>
        </div>

        <span class="result-count">{{ t('p.results', { n: filteredProblems.length }) }}</span>
      </div>
    </div>

    <!-- 热门故障 -->
    <section class="hot-section" v-if="encounterReady">
      <div class="hot-inner">
        <div class="hot-header">
          <span class="hot-title">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1C5 4 2 5 2 8a5 5 0 0010 0c0-2-1.5-3.5-2-5C9 5 8.5 6.5 7 7c.5-2-1-4-0-6z" fill="#ff6b6b"/>
            </svg>
            {{ Object.keys(encounterCounts).length > 0 ? '热门故障' : '编辑推荐' }}
          </span>
          <span class="hot-sub">{{ Object.keys(encounterCounts).length > 0 ? '最多人遇到的问题' : '最常见的打印难题' }}</span>
        </div>
        <div class="hot-scroll">
          <div
            v-for="(p, i) in hotProblems" :key="p.id"
            class="hot-card"
            :style="{ '--hc': p.color }"
            @click="$emit('go-detail', p.id)"
          >
            <div class="hot-rank" :class="i < 3 ? 'rank-top' : ''">{{ i + 1 }}</div>
            <div class="hot-emoji" :style="{ background: p.bgGradient }">
              <img v-if="metaMap[p.id]?.image_url || p.image_url" :src="metaMap[p.id]?.image_url || p.image_url" style="width:100%;height:100%;object-fit:cover;border-radius:12px" loading="lazy" />
              <span v-else>{{ p.emoji }}</span>
            </div>
            <div class="hot-info">
              <div class="hot-name">{{ p.title }}</div>
              <div class="hot-meta">
                <span class="hot-category">{{ p.category }}</span>
                <span v-if="encounterCounts[p.id]" class="hot-count">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="#ff6b6b"><path d="M8 2C5.8 2 4 3.8 4 6c0 3.5 4 8 4 8s4-4.5 4-8c0-2.2-1.8-4-4-4z"/></svg>
                  {{ encounterCounts[p.id] }}人遇到
                </span>
              </div>
            </div>
            <svg class="hot-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </section>

    <!-- Grid -->
    <main class="grid-wrap">
      <div v-if="filteredProblems.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <p class="empty-title">{{ t('p.emptyTitle', { q: searchQuery }) }}</p>
        <p class="empty-desc">{{ t('p.emptyDesc') }}</p>
        <button class="empty-reset" @click="searchQuery = ''; activeCategory = '全部'">{{ t('p.clearFilter') }}</button>
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
            <span class="card-emoji">
              <img v-if="metaMap[problem.id]?.image_url || problem.image_url" :src="metaMap[problem.id]?.image_url || problem.image_url" alt="" style="width:100%;height:100%;object-fit:cover;" loading="lazy" />
              <span v-else class="card-emoji-icon">{{ problem.emoji }}</span>
            </span>
            <div class="card-glow" :style="{ background: problem.color }"></div>
            <span class="card-difficulty" :class="'diff-' + diffClass(problem.difficulty)">{{ diffLabel(problem.difficulty) }}</span>
            <button class="fav-btn" :class="{ active: favorites.has(problem.id) }" @click="handleFav($event, problem.id)" :title="favorites.has(problem.id) ? '取消收藏' : '收藏'">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 13.5C5 12 1 9 1 5.5a3.5 3.5 0 0 1 7 0 3.5 3.5 0 0 1 7 0c0 3.5-4.5 6.5-7 8z"
                  :fill="favorites.has(problem.id) ? '#ff6b6b' : 'rgba(255,255,255,0.6)'"
                  :stroke="favorites.has(problem.id) ? '#ff6b6b' : 'rgba(255,255,255,0.8)'"
                  stroke-width="1.4" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <div class="card-body">
            <div class="card-category">{{ problem.category }}</div>
            <h3 class="card-title" v-html="highlight(problem.title)"></h3>
            <p class="card-subtitle" v-html="highlight(problem.subtitle)"></p>
            <div class="card-footer">
              <span v-if="encounterCounts[problem.id]" class="encounter-badge">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2C5.8 2 4 3.8 4 6c0 3.5 4 8 4 8s4-4.5 4-8c0-2.2-1.8-4-4-4z"/></svg>
                {{ encounterCounts[problem.id] }}人遇到过
              </span>
              <div class="card-arrow">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M2.5 7.5h10M8.5 3.5l4 4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </article>
      </TransitionGroup>
    </main>

    <!-- 耗材参数速查表 -->
    <section class="temp-section">
      <div class="temp-inner">
        <h2 class="temp-title"><span>🌡️</span> {{ t('p.matTitle') }}</h2>
        <p class="temp-sub">{{ t('p.matSub') }}</p>
        <div class="temp-grid">
          <div v-for="m in materials" :key="m.name" class="temp-card" :style="{ '--mc': m.color }">
            <div class="temp-name">{{ m.name }}</div>
            <div class="temp-rows">
              <div class="temp-row"><span class="temp-label">{{ t('p.nozzle') }}</span><span class="temp-val">{{ m.nozzle }}</span></div>
              <div class="temp-row"><span class="temp-label">{{ t('p.bed') }}</span><span class="temp-val">{{ m.bed }}</span></div>
              <div class="temp-row"><span class="temp-label">{{ t('p.fan') }}</span><span class="temp-val">{{ m.fan }}</span></div>
              <div class="temp-row"><span class="temp-label">{{ t('p.speed') }}</span><span class="temp-val">{{ m.speed }}</span></div>
            </div>
            <div class="temp-tip">{{ t(m.tipKey) }}</div>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { problems } from '@/data/problems.js'
import { useLocale } from '@/composables/useLocale.js'
import { useUserProblems } from '@/composables/useUserProblems.js'
import { useCommunity } from '@/composables/useCommunity.js'
import { useFavorites } from '@/composables/useFavorites.js'
import { useProblemMeta } from '@/composables/useProblemMeta.js'

const props = defineProps({ currentUser: Object })
const emit = defineEmits(['go-detail', 'open-auth', 'go-submit'])

const { userProblems, fetchUserProblems } = useUserProblems()
const { getEncounterCounts } = useCommunity()
const { favorites, fetchFavorites, toggleFavorite } = useFavorites()
const { metaMap, fetchProblemMeta } = useProblemMeta()

const showFavOnly = ref(false)

const handleFav = async (e, problemId) => {
  e.stopPropagation()
  if (!props.currentUser) { emit('open-auth', 'login'); return }
  await toggleFavorite(problemId, props.currentUser.id)
}

watch(() => props.currentUser, (user) => {
  if (user) fetchFavorites(user.id)
  else { favorites.value = new Set(); showFavOnly.value = false }
}, { immediate: true })

const encounterCounts = ref({})
const encounterReady  = ref(false)

onMounted(async () => {
  fetchUserProblems()
  fetchProblemMeta()
  const ids = problems.map(p => p.id)
  encounterCounts.value = await getEncounterCounts(ids)
  encounterReady.value = true
  if (props.currentUser) fetchFavorites(props.currentUser.id)
})

// 热门排行：按遇到人数排序取 Top 6；无数据时用编辑推荐前 6 条
const hotProblems = computed(() => {
  const hasData = Object.keys(encounterCounts.value).length > 0
  if (hasData) {
    return [...problems]
      .filter(p => encounterCounts.value[p.id] > 0)
      .sort((a, b) => (encounterCounts.value[b.id] || 0) - (encounterCounts.value[a.id] || 0))
      .slice(0, 6)
  }
  return problems.slice(0, 6)
})

const { t } = useLocale()

// 把所有问题标题打散成4行，每行有不同尺寸和透明度，重复2次填满宽度
const ALL_TITLES = problems.map(p => p.title)

function makeRow(indices, sizes, opacities) {
  const base = indices.map((i, j) => ({
    text: ALL_TITLES[i % ALL_TITLES.length],
    size: sizes[j % sizes.length],
    opacity: opacities[j % opacities.length],
  }))
  // 复制两份保证无缝滚动
  return [...base, ...base].map((t, k) => ({ ...t, key: k }))
}

const scrollRow1 = makeRow(
  [0,5,10,15,20,25,30,2,7,12],
  [28, 18, 36, 22, 14, 30],
  [0.18, 0.08, 0.13, 0.06]
)
const scrollRow2 = makeRow(
  [3,8,13,18,23,28,1,6,11,16,21,26],
  [14, 32, 20, 12, 26, 16],
  [0.10, 0.16, 0.07, 0.12]
)
const scrollRow3 = makeRow(
  [4,9,14,19,24,29,0,5,10,15],
  [22, 13, 34, 18, 11, 28],
  [0.14, 0.07, 0.18, 0.05]
)
const scrollRow4 = makeRow(
  [2,7,12,17,22,27,32,4,9,14,19],
  [16, 26, 11, 30, 20, 13],
  [0.08, 0.15, 0.06, 0.11]
)

const activeCategory    = ref('全部')
const activePrinterType = ref('全部')
const searchQuery       = ref('')
const searchFocused     = ref(false)

const PRINTER_TYPES = ['全部', 'FDM', 'SLA 光固化']

const allProblems = computed(() => [...userProblems.value, ...problems])

const categories = computed(() => {
  const cats = allProblems.value.map(p => p.category).filter(Boolean)
  return ['全部', ...new Set(cats)]
})

const filteredProblems = computed(() => {
  let list = allProblems.value
  if (showFavOnly.value) list = list.filter(p => favorites.value.has(p.id))
  if (activeCategory.value !== '全部') list = list.filter(p => p.category === activeCategory.value)
  if (activePrinterType.value !== '全部') {
    const isSLA = activePrinterType.value === 'SLA 光固化'
    list = list.filter(p => isSLA ? p.printerType === 'SLA' : p.printerType !== 'SLA')
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) list = list.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.subtitle?.toLowerCase().includes(q) ||
    p.description?.toLowerCase().includes(q) ||
    p.causes?.some(c => c.toLowerCase().includes(q))
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

const diffLabel = (d) => {
  if (d === '紧急') return t('p.d.urgent')
  if (d === '需处理') return t('p.d.warn')
  if (d === '进阶') return t('p.d.advanced')
  return t('p.d.normal')
}

const catLabel = (c) => {
  if (c === '全部') return t('p.all')
  return c
}

const materials = [
  { name: 'PLA',   color: '#5cba7a', nozzle: '190–220°C', bed: '55–65°C',   fan: '100%',  speed: '40–100mm/s', tipKey: 'p.matTip.pla' },
  { name: 'PETG',  color: '#74b9ff', nozzle: '230–245°C', bed: '70–85°C',   fan: '50%',   speed: '30–60mm/s',  tipKey: 'p.matTip.petg' },
  { name: 'ABS',   color: '#ff6b6b', nozzle: '230–250°C', bed: '100–110°C', fan: '关闭',  speed: '30–60mm/s',  tipKey: 'p.matTip.abs' },
  { name: 'ASA',   color: '#fdcb6e', nozzle: '240–260°C', bed: '90–110°C',  fan: '关闭',  speed: '30–60mm/s',  tipKey: 'p.matTip.asa' },
  { name: 'TPU',   color: '#a29bfe', nozzle: '220–240°C', bed: '30–60°C',   fan: '100%',  speed: '20–30mm/s',  tipKey: 'p.matTip.tpu' },
  { name: 'PA尼龙', color: '#e17055', nozzle: '240–270°C', bed: '70–90°C',  fan: '30–50%',speed: '30–50mm/s',  tipKey: 'p.matTip.pa' },
]
</script>

<style scoped>
.problems-page { min-height: 100vh; background: #f5f5f7; color: #1d1d1f; font-family: -apple-system,'PingFang SC','Helvetica Neue',sans-serif; }

.hero { padding: 64px 24px 48px; text-align: center; position: relative; overflow: hidden; }
.hero-inner { max-width: 640px; margin: 0 auto; position: relative; z-index: 2; }
.hero-eyebrow { font-size: 12px; letter-spacing: 0.12em; color: #6e6e73; margin-bottom: 16px; text-transform: uppercase; }
.hero-title { font-size: clamp(2.2rem,6vw,3.8rem); font-weight: 700; line-height: 1.08; letter-spacing: -0.03em; margin-bottom: 20px; color: #1d1d1f; }
.hero-title em { font-style: normal; background: linear-gradient(135deg,#ff6b6b 0%,#ff9500 50%,#ff2d55 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.hero-desc { font-size: 16px; color: #6e6e73; line-height: 1.7; margin-bottom: 20px; }
.share-btn { display: inline-flex; align-items: center; gap: 8px; padding: 11px 24px; background: #1d1d1f; color: #fff; border: none; border-radius: 100px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 0.15s; }
.share-btn:hover { background: #3a3a3c; }

/* 背景滚动标题 */
.hero-bg-scroll { position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; justify-content: space-around; pointer-events: none; overflow: hidden; }
.scroll-row { display: flex; align-items: center; gap: 32px; white-space: nowrap; will-change: transform; }
.scroll-tag { color: #1d1d1f; font-weight: 700; letter-spacing: -0.02em; flex-shrink: 0; }

.row-1 { animation: marquee-left 22s linear infinite; }
.row-2 { animation: marquee-right 30s linear infinite; }
.row-3 { animation: marquee-left 18s linear infinite; }
.row-4 { animation: marquee-right 26s linear infinite; }

@keyframes marquee-left  { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes marquee-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }

.toolbar { padding: 12px 24px; position: sticky; top: 52px; z-index: 50; background: rgba(245,245,247,0.92); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-bottom: 1px solid rgba(0,0,0,0.07); }
.toolbar-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.search-wrap { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 9px 14px; flex: 1; min-width: 180px; max-width: 280px; transition: border-color 0.2s, box-shadow 0.2s; }
.search-wrap.focused { border-color: rgba(0,0,0,0.22); box-shadow: 0 0 0 3px rgba(0,0,0,0.04); }
.search-icon { color: #aeaeb2; flex-shrink: 0; transition: color 0.2s; }
.search-wrap.focused .search-icon { color: #6e6e73; }
.search-input { background: transparent; border: none; outline: none; color: #1d1d1f; font-size: 14px; font-family: inherit; flex: 1; min-width: 0; }
.search-input::placeholder { color: #c7c7cc; }
.search-clear { background: transparent; border: none; color: #aeaeb2; cursor: pointer; padding: 0; display: flex; align-items: center; flex-shrink: 0; transition: color 0.15s; }
.search-clear:hover { color: #6e6e73; }

.filters { display: flex; flex-direction: column; gap: 8px; }
.filter-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.filter-row-label { font-size: 11px; color: #aeaeb2; font-weight: 600; letter-spacing: 0.05em; white-space: nowrap; width: 24px; flex-shrink: 0; }
.filter-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-btn { background: transparent; border: 1px solid rgba(0,0,0,0.12); color: #6e6e73; padding: 6px 14px; border-radius: 100px; font-size: 13px; cursor: pointer; transition: all 0.18s; font-family: inherit; white-space: nowrap; }
.filter-btn:hover { border-color: rgba(0,0,0,0.22); color: #1d1d1f; }
.filter-btn.active { background: #1d1d1f; border-color: #1d1d1f; color: #fff; font-weight: 500; }
.fav-filter-btn { display: flex; align-items: center; gap: 5px; }
.fav-filter-btn.active { background: #ff6b6b; border-color: #ff6b6b; color: #fff; }
.fav-count { background: rgba(255,255,255,0.3); border-radius: 100px; padding: 1px 6px; font-size: 11px; font-weight: 600; }

.legend { display: flex; gap: 10px; flex-wrap: wrap; }
.legend-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #aeaeb2; white-space: nowrap; }
.dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.dot-normal   { background: #6e6e73; }
.dot-urgent   { background: #e03131; }
.dot-warn     { background: #7048e8; }
.dot-advanced { background: #1971c2; }
.result-count { margin-left: auto; font-size: 12px; color: #aeaeb2; white-space: nowrap; }

.grid-wrap { padding: 28px 24px 60px; }
.problems-grid { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill,minmax(230px,1fr)); gap: 14px; position: relative; }

.problem-card { background: #fff; border-radius: 18px; overflow: hidden; cursor: pointer; transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease; animation: cardIn 0.45s ease both; animation-delay: var(--delay); border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
@keyframes cardIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
.problem-card:hover { transform: translateY(-6px) scale(1.015); box-shadow: 0 16px 48px rgba(0,0,0,0.12),0 0 0 1px rgba(0,0,0,0.06); }
.problem-card:active { transform: scale(0.98); transition-duration: 0.1s; }

.card-image { position: relative; height: 180px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.card-emoji { position: relative; z-index: 2; transition: transform 0.3s ease; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.card-emoji-icon { font-size: 66px; line-height: 1; filter: drop-shadow(0 6px 18px rgba(0,0,0,0.4)); font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; }
.problem-card:hover .card-emoji { transform: scale(1.05) translateY(-3px); }
.card-glow { position: absolute; width: 110px; height: 110px; border-radius: 50%; opacity: 0.2; filter: blur(36px); z-index: 1; transition: opacity 0.3s, transform 0.3s; }
.problem-card:hover .card-glow { opacity: 0.4; transform: scale(1.3); }
.card-difficulty { position: absolute; top: 11px; right: 11px; font-size: 10px; font-weight: 600; padding: 3px 9px; border-radius: 100px; z-index: 3; letter-spacing: 0.04em; background: rgba(255,255,255,0.92); backdrop-filter: blur(8px); box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
.fav-btn { position: absolute; bottom: 10px; right: 10px; z-index: 3; background: rgba(0,0,0,0.25); border: none; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.18s, transform 0.15s; backdrop-filter: blur(4px); }
.fav-btn:hover { background: rgba(0,0,0,0.4); transform: scale(1.12); }
.fav-btn.active { background: rgba(255,255,255,0.25); }
.diff-normal   { color: #6e6e73; }
.diff-urgent   { color: #e03131; }
.diff-warn     { color: #7048e8; }
.diff-advanced { color: #1971c2; }

.card-body { padding: 17px 19px 19px; }
.card-category { font-size: 10px; color: var(--card-color); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 5px; font-weight: 600; }
.card-title { font-size: 15px; font-weight: 600; color: #1d1d1f; margin: 0 0 4px; letter-spacing: -0.01em; line-height: 1.3; }
.card-subtitle { font-size: 12px; color: #6e6e73; line-height: 1.45; margin: 0 0 10px; }
.card-footer { display: flex; align-items: center; justify-content: space-between; }
.encounter-badge { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #aeaeb2; }
.card-arrow { color: var(--card-color); display: flex; align-items: center; opacity: 0.6; transition: transform 0.2s, opacity 0.2s; }
.problem-card:hover .card-arrow { transform: translateX(3px); opacity: 1; }

:deep(mark) { background: rgba(255,200,0,0.3); color: #7a5a00; border-radius: 3px; padding: 0 2px; font-style: normal; }

.empty-state { max-width: 280px; margin: 80px auto; text-align: center; }
.empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.5; }
.empty-title { font-size: 16px; font-weight: 600; color: #1d1d1f; margin-bottom: 6px; }
.empty-desc { font-size: 13px; color: #6e6e73; line-height: 1.6; margin-bottom: 18px; }
.empty-reset { background: #fff; border: 1px solid rgba(0,0,0,0.1); color: #007aff; padding: 8px 20px; border-radius: 100px; font-size: 13px; font-family: inherit; cursor: pointer; }
.empty-reset:hover { background: #f5f5f7; }

.card-enter-active { transition: all 0.22s ease; }
.card-leave-active { transition: all 0.16s ease; position: absolute; }
.card-enter-from, .card-leave-to { opacity: 0; transform: scale(0.94); }
.card-move { transition: transform 0.28s ease; }

/* 耗材表 */
.temp-section { padding: 0 24px 80px; }
.temp-inner { max-width: 1200px; margin: 0 auto; }
.temp-title { display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 600; color: #1d1d1f; margin-bottom: 6px; letter-spacing: -0.01em; }
.temp-sub { font-size: 13px; color: #6e6e73; margin-bottom: 18px; }
.temp-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(170px,1fr)); gap: 12px; }
.temp-card { background: #fff; border: 1px solid rgba(0,0,0,0.06); border-top: 2px solid var(--mc); border-radius: 14px; padding: 16px; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.temp-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
.temp-name { font-size: 15px; font-weight: 700; color: var(--mc); margin-bottom: 12px; }
.temp-rows { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.temp-row { display: flex; justify-content: space-between; }
.temp-label { font-size: 11px; color: #aeaeb2; }
.temp-val { font-size: 12px; font-weight: 500; color: #1d1d1f; }
.temp-tip { font-size: 11px; color: #6e6e73; line-height: 1.5; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.06); }

/* 热门故障 */
.hot-section { padding: 0 24px 8px; }
.hot-inner { max-width: 1200px; margin: 0 auto; }
.hot-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px; }
.hot-title { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 700; color: #1d1d1f; }
.hot-sub { font-size: 12px; color: #aeaeb2; }
.hot-scroll { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.hot-card {
  display: flex; align-items: center; gap: 12px;
  background: #fff; border-radius: 14px; padding: 12px 14px;
  border: 1px solid rgba(0,0,0,0.07); cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
}
.hot-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-1px); }
.hot-rank { width: 20px; font-size: 13px; font-weight: 800; color: #c7c7cc; flex-shrink: 0; text-align: center; }
.hot-rank.rank-top { color: #ff6b6b; }
.hot-emoji { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; overflow: hidden; }
.hot-info { flex: 1; min-width: 0; }
.hot-name { font-size: 13px; font-weight: 600; color: #1d1d1f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
.hot-meta { display: flex; align-items: center; gap: 8px; }
.hot-category { font-size: 11px; color: #aeaeb2; background: #f5f5f7; padding: 2px 7px; border-radius: 100px; }
.hot-count { display: flex; align-items: center; gap: 3px; font-size: 11px; color: #ff6b6b; }
.hot-arrow { color: #c7c7cc; flex-shrink: 0; transition: transform 0.2s; }
.hot-card:hover .hot-arrow { transform: translateX(3px); color: var(--hc); }

@media (max-width: 900px) {
  .hot-scroll { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  /* 移动端导航变为两行共约 84px */
  .toolbar { top: 84px; }
}
@media (max-width: 640px) {
  .hero { padding: 40px 20px 28px; }
  .toolbar { top: 84px; padding: 10px 16px; }
  .toolbar-inner { flex-direction: column; align-items: stretch; gap: 8px; }
  .search-wrap { max-width: 100%; }
  .result-count, .legend { display: none; }
  .filter-row-label { display: none; }
  .filter-chips { overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none; padding-bottom: 2px; }
  .filter-chips::-webkit-scrollbar { display: none; }
  .filter-btn { padding: 5px 12px; font-size: 12px; white-space: nowrap; }
  .search-input { font-size: 16px; }
  .grid-wrap { padding: 16px 16px 40px; }
  .problems-grid { grid-template-columns: repeat(2,1fr); gap: 10px; }
  .card-image { height: 148px; }
  .card-emoji-icon { font-size: 52px; }
  .card-body { padding: 13px 15px 15px; }
  .card-title { font-size: 14px; }
  .hot-scroll { grid-template-columns: 1fr; }
  .temp-section { padding: 0 16px 60px; }
  .temp-grid { grid-template-columns: repeat(2,1fr); }
}
</style>
