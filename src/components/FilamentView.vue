<script setup>
import { ref, computed, watch } from 'vue'
import { filaments, materialTypes, brands, MATERIAL_COLOR, DIFFICULTY_COLOR } from '../data/filaments.js'

const selectedMaterial = ref('全部')
const selectedBrand = ref('全部')
const selectedScenario = ref('全部')
const searchQuery = ref('')
const activeId = ref(filaments[0]?.id || null)
const detailModalOpen = ref(false)

const SCENARIO_OPTIONS = ['全部', '新手友好', '高速打印', '展示外观', '功能强度', '耐候户外', '柔性件', '树脂精细']

const BRAND_PRIORITY = {
  拓竹: 120,
  eSUN: 118,
  创想三维: 116,
  PolyMaker: 112,
  SUNLU: 110,
  杰魔: 108,
  闪铸: 104,
  QIDI: 102,
  Anycubic: 100,
  Elegoo: 98,
  黑格: 96,
  Tronxy: 94,
  Geeetech: 92,
  Phrozen: 90,
  SirayaTech: 88,
  UniFormation: 86,
  科宝利: 84,
}

const MATERIAL_PRIORITY = {
  PLA: 100,
  'PLA+': 98,
  PETG: 96,
  光固化树脂: 94,
  TPU: 92,
  ASA: 90,
  ABS: 88,
  'ABS+': 87,
  'PLA-CF': 84,
  'PETG-CF': 82,
  'PET-CF': 80,
  PA: 78,
  'PA-CF': 76,
  PC: 74,
  HIPS: 70,
  支撑材料: 68,
}

function matColor(mat) {
  return MATERIAL_COLOR[mat] || '#aeaeb2'
}

function diffStyle(difficulty) {
  return DIFFICULTY_COLOR[difficulty] || { bg: '#f5f5f7', color: '#6e6e73' }
}

function normalizeText(value) {
  return String(value || '').toLowerCase()
}

function matchesScenario(item, scenario) {
  if (scenario === '全部') return true
  if (scenario === '新手友好') return item.difficulty === '简单'
  if (scenario === '高速打印') return (item.speedMax || 0) >= 180 || /高速/.test(item.tips) || item.tags.some(tag => tag.includes('高速'))
  if (scenario === '展示外观') return item.tags.some(tag => /丝绸|哑光|光泽|展示|渐变|木纹|金属/.test(tag))
  if (scenario === '功能强度') return ['PETG', 'ABS', 'ABS+', 'ASA', 'PA', 'PA-CF', 'PC', 'PETG-CF'].includes(item.material)
  if (scenario === '耐候户外') return ['ASA', 'PETG', 'PC'].includes(item.material)
  if (scenario === '柔性件') return item.material === 'TPU'
  if (scenario === '树脂精细') return !!item.isResin
  return true
}

function getBrandPriority(brand) {
  return BRAND_PRIORITY[brand] || 40
}

function getMaterialPriority(material) {
  return MATERIAL_PRIORITY[material] || 40
}

function compareItems(a, b) {
  const byBrand = getBrandPriority(b.brand) - getBrandPriority(a.brand)
  if (byBrand !== 0) return byBrand

  const byMaterial = getMaterialPriority(b.material) - getMaterialPriority(a.material)
  if (byMaterial !== 0) return byMaterial

  const byDifficulty = ({ 简单: 3, 中等: 2, 困难: 1 }[b.difficulty] || 0) - ({ 简单: 3, 中等: 2, 困难: 1 }[a.difficulty] || 0)
  if (byDifficulty !== 0) return byDifficulty

  return `${a.brand} ${a.variant}`.localeCompare(`${b.brand} ${b.variant}`, 'zh-Hans-CN')
}

const sortedBrands = computed(() =>
  [...brands].sort((a, b) => {
    if (a === '全部') return -1
    if (b === '全部') return 1
    const diff = getBrandPriority(b) - getBrandPriority(a)
    if (diff !== 0) return diff
    return a.localeCompare(b, 'zh-Hans-CN')
  })
)

const filtered = computed(() =>
  filaments.filter((item) => {
    if (selectedMaterial.value !== '全部' && item.material !== selectedMaterial.value) return false
    if (selectedBrand.value !== '全部' && item.brand !== selectedBrand.value) return false
    if (!matchesScenario(item, selectedScenario.value)) return false

    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return true

    return [
      item.brand,
      item.brandFull,
      item.material,
      item.variant,
      item.tips,
      ...(item.tags || []),
    ].some((field) => normalizeText(field).includes(q))
  }).sort(compareItems)
)

const activeFilament = computed(() => {
  const found = filtered.value.find((item) => item.id === activeId.value)
  return found || filtered.value[0] || null
})

const filterSummary = computed(() => {
  if (selectedScenario.value !== '全部') return `当前按“${selectedScenario.value}”优先筛选`
  if (selectedMaterial.value !== '全部') return `当前聚焦 ${selectedMaterial.value} 材料`
  if (selectedBrand.value !== '全部') return `当前只看 ${selectedBrand.value}`
  return '点击卡片查看完整参数、使用场景和打印建议'
})

const compareCandidates = computed(() => {
  if (!activeFilament.value) return []
  return filtered.value
    .filter((item) => item.id !== activeFilament.value.id && item.material === activeFilament.value.material)
    .slice(0, 3)
})

const materialInsights = computed(() => {
  const item = activeFilament.value
  if (!item) return []

  if (item.isResin) {
    return [
      { label: '适用方向', value: '高细节模型 / 手办 / 外观件' },
      { label: '首调参数', value: `普通层曝光 ${item.exposureTime}s` },
      { label: '最常见风险', value: '支撑失败、表面发白、后处理过度' },
    ]
  }

  return [
    { label: '开打推荐', value: `${item.nozzleRec}°C / 热床 ${item.bedRec}°C` },
    { label: '建议速度', value: `${item.speedRec} mm/s` },
    { label: '冷却策略', value: item.fanSpeed === 0 ? '建议关闭风扇' : `风扇 ${item.fanSpeed}%` },
  ]
})

const materialUseCases = computed(() => {
  const item = activeFilament.value
  if (!item) return []

  if (item.isResin) return ['高细节外观件', '小尺寸精密模型', '需要细纹理和锐边的展示件']
  if (item.material === 'PLA' || item.material === 'PLA+') return ['新手入门件', '日常模型', '桌面展示件']
  if (item.material === 'PETG') return ['功能件', '需要一定韧性的结构件', '半透明外壳']
  if (item.material === 'ABS' || item.material === 'ABS+' || item.material === 'ASA') return ['封闭环境功能件', '汽车周边', '耐热耐候结构件']
  if (item.material === 'TPU') return ['缓冲垫', '防滑套', '柔性保护件']
  if (item.material.includes('CF') || item.material === 'PA' || item.material === 'PC') return ['高强度功能件', '夹具工装', '高要求结构件']
  return ['通用打印件', '功能验证件', '小批量打样']
})

function openFilament(item) {
  activeId.value = item.id
  detailModalOpen.value = true
}

function closeDetailModal() {
  detailModalOpen.value = false
}

function resetFilters() {
  selectedMaterial.value = '全部'
  selectedBrand.value = '全部'
  selectedScenario.value = '全部'
  searchQuery.value = ''
}

watch(filtered, (list) => {
  if (!list.length) {
    activeId.value = null
    detailModalOpen.value = false
    return
  }
  if (!list.some((item) => item.id === activeId.value)) activeId.value = list[0].id
}, { immediate: true })
</script>

<template>
  <div class="filament-page">
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-badge">耗材参数库</div>
        <h1 class="hero-title">先选耗材，再看推荐值和常见坑</h1>
        <p class="hero-sub">收录 {{ filaments.length }} 种主流耗材，左侧快速定位，右侧查看完整参数、适用场景和常见问题。</p>
        <div class="search-wrap">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.4"/>
            <path d="M10.5 10.5l3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          <input v-model="searchQuery" class="search-input" placeholder="搜索品牌、材料、特性或使用场景…" />
        </div>
      </div>
    </section>

    <section class="content">
      <div class="filter-grid">
        <div class="filter-block">
          <span class="filter-label">材料</span>
          <div class="chips">
            <button
              v-for="m in materialTypes"
              :key="m"
              :class="['chip', { active: selectedMaterial === m }]"
              :style="selectedMaterial === m && m !== '全部' ? { background: matColor(m) + '18', color: matColor(m), borderColor: matColor(m) + '55' } : {}"
              @click="selectedMaterial = m"
            >{{ m }}</button>
          </div>
        </div>

        <div class="filter-block">
          <span class="filter-label">使用目标</span>
          <div class="chips">
            <button
              v-for="scenario in SCENARIO_OPTIONS"
              :key="scenario"
              :class="['chip', { active: selectedScenario === scenario }]"
              @click="selectedScenario = scenario"
            >{{ scenario }}</button>
          </div>
        </div>

        <div class="filter-block">
          <span class="filter-label">品牌</span>
          <div class="chips">
            <button
              v-for="b in sortedBrands"
              :key="b"
              :class="['chip', { active: selectedBrand === b }]"
              @click="selectedBrand = b"
            >{{ b }}</button>
          </div>
        </div>
      </div>

      <div class="results-meta">
        <div>
          <div class="results-count">{{ filtered.length }} 条结果</div>
          <div class="results-sub">{{ filterSummary }}</div>
        </div>
        <button
          v-if="selectedMaterial !== '全部' || selectedBrand !== '全部' || selectedScenario !== '全部' || searchQuery"
          class="reset-btn"
          @click="resetFilters"
        >清除筛选</button>
      </div>

      <div v-if="filtered.length" class="grid-shell">
        <div class="cards-grid">
          <article
            v-for="item in filtered"
            :key="item.id"
            class="material-card"
            @click="openFilament(item)"
          >
            <div class="material-card-head">
              <div class="material-card-kicker">
                <span class="mat-dot" :style="{ background: matColor(item.material) }"></span>
                <span class="material-chip" :style="{ color: matColor(item.material), background: matColor(item.material) + '12' }">{{ item.material }}</span>
              </div>
              <span class="diff-badge" :style="{ background: diffStyle(item.difficulty).bg, color: diffStyle(item.difficulty).color }">{{ item.difficulty }}</span>
            </div>

            <div class="material-card-title">{{ item.brand }}</div>
            <div class="material-card-variant">{{ item.variant }}</div>
            <div class="material-card-meta">{{ item.brandFull }} · {{ item.source }}</div>

            <div v-if="!item.isResin" class="mini-stats">
              <div class="mini-stat">
                <span class="mini-stat-label">喷嘴</span>
                <span class="mini-stat-value">{{ item.nozzleRec }}°C</span>
              </div>
              <div class="mini-stat">
                <span class="mini-stat-label">热床</span>
                <span class="mini-stat-value">{{ item.bedRec }}°C</span>
              </div>
              <div class="mini-stat">
                <span class="mini-stat-label">速度</span>
                <span class="mini-stat-value">{{ item.speedRec }}</span>
              </div>
            </div>
            <div v-else class="mini-stats">
              <div class="mini-stat">
                <span class="mini-stat-label">曝光</span>
                <span class="mini-stat-value">{{ item.exposureTime }}s</span>
              </div>
              <div class="mini-stat">
                <span class="mini-stat-label">底层</span>
                <span class="mini-stat-value">{{ item.bottomExposure }}s</span>
              </div>
              <div class="mini-stat">
                <span class="mini-stat-label">抬升</span>
                <span class="mini-stat-value">{{ item.liftSpeed }}</span>
              </div>
            </div>

            <div class="tag-row">
              <span v-for="tag in item.tags.slice(0, 2)" :key="tag" class="tag">{{ tag }}</span>
            </div>

            <div class="material-card-footer">
              <span class="material-card-tip">{{ item.isResin ? '查看曝光与后处理建议' : '查看完整参数与烘干建议' }}</span>
              <span class="material-card-arrow">查看详情</span>
            </div>
          </article>
        </div>
      </div>

      <Transition name="modal-fade">
        <div v-if="detailModalOpen && activeFilament" class="detail-modal-backdrop" @click.self="closeDetailModal">
          <div class="detail-modal">
            <div class="detail-modal-headbar">
              <div>
                <div class="detail-modal-kicker">耗材详情</div>
                <div class="detail-modal-sub">推荐值、使用场景和打印建议都在这里</div>
              </div>
              <button class="detail-modal-close" @click="closeDetailModal" aria-label="关闭详情">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
              </button>
            </div>

            <div class="detail-modal-scroll">
              <div class="detail-head">
                <div class="detail-head-main">
                  <div class="detail-head-row">
                    <div class="detail-kicker" :style="{ color: matColor(activeFilament.material) }">{{ activeFilament.material }}</div>
                    <span class="detail-source">{{ activeFilament.source }}</span>
                  </div>
                  <h2 class="detail-title">{{ activeFilament.brand }} {{ activeFilament.variant }}</h2>
                  <p class="detail-sub">{{ activeFilament.brandFull }}</p>
                </div>
                <span class="diff-badge large" :style="{ background: diffStyle(activeFilament.difficulty).bg, color: diffStyle(activeFilament.difficulty).color }">{{ activeFilament.difficulty }}</span>
              </div>

              <div class="hero-stat-grid">
                <div v-for="insight in materialInsights" :key="insight.label" class="hero-stat-card">
                  <div class="hero-stat-label">{{ insight.label }}</div>
                  <div class="hero-stat-value">{{ insight.value }}</div>
                </div>
              </div>

              <div class="detail-section">
                <div class="detail-section-title">完整参数</div>
                <div class="params-grid">
                  <template v-if="!activeFilament.isResin">
                    <div class="param-item">
                      <div class="param-name">喷嘴温度</div>
                      <div class="param-val">{{ activeFilament.nozzleRec }}°C</div>
                      <div class="param-range">范围 {{ activeFilament.nozzle[0] }}–{{ activeFilament.nozzle[1] }}°C</div>
                    </div>
                    <div class="param-item">
                      <div class="param-name">热床温度</div>
                      <div class="param-val">{{ activeFilament.bedRec }}°C</div>
                      <div class="param-range">范围 {{ activeFilament.bed[0] }}–{{ activeFilament.bed[1] }}°C</div>
                    </div>
                    <div class="param-item">
                      <div class="param-name">推荐速度</div>
                      <div class="param-val">{{ activeFilament.speedRec }} <span class="param-unit">mm/s</span></div>
                      <div class="param-range">最高 {{ activeFilament.speedMax }}mm/s</div>
                    </div>
                    <div class="param-item">
                      <div class="param-name">风扇速度</div>
                      <div class="param-val">{{ activeFilament.fanSpeed }}<span class="param-unit">%</span></div>
                      <div class="param-range">{{ activeFilament.fanSpeed === 0 ? '建议关闭' : activeFilament.fanSpeed === 100 ? '全速开启' : '部分冷却' }}</div>
                    </div>
                    <div class="param-item">
                      <div class="param-name">直驱回抽</div>
                      <div class="param-val">{{ activeFilament.retractDirect }} <span class="param-unit">mm</span></div>
                      <div class="param-range">直驱挤出机</div>
                    </div>
                    <div class="param-item">
                      <div class="param-name">Bowden回抽</div>
                      <div class="param-val">{{ activeFilament.retractBowden === 0 ? '禁用' : activeFilament.retractBowden + ' mm' }}</div>
                      <div class="param-range">远程送料管</div>
                    </div>
                  </template>
                  <template v-else>
                    <div class="param-item">
                      <div class="param-name">普通层曝光</div>
                      <div class="param-val">{{ activeFilament.exposureTime }} <span class="param-unit">s</span></div>
                      <div class="param-range">推荐值</div>
                    </div>
                    <div class="param-item">
                      <div class="param-name">底层曝光</div>
                      <div class="param-val">{{ activeFilament.bottomExposure }} <span class="param-unit">s</span></div>
                      <div class="param-range">底板附着</div>
                    </div>
                    <div class="param-item">
                      <div class="param-name">底层层数</div>
                      <div class="param-val">{{ activeFilament.bottomLayers }} <span class="param-unit">层</span></div>
                      <div class="param-range">首层支撑</div>
                    </div>
                    <div class="param-item">
                      <div class="param-name">抬升速度</div>
                      <div class="param-val">{{ activeFilament.liftSpeed }} <span class="param-unit">mm/min</span></div>
                      <div class="param-range">离型速度</div>
                    </div>
                  </template>
                </div>
              </div>

              <div class="detail-grid">
                <section class="detail-section soft">
                  <div class="detail-section-title">推荐使用场景</div>
                  <div class="use-case-list">
                    <span v-for="useCase in materialUseCases" :key="useCase" class="use-case-pill">{{ useCase }}</span>
                  </div>
                </section>
              </div>

              <section class="detail-section tips-panel">
                <div class="detail-section-title">打印建议</div>
                <p class="tips-text">{{ activeFilament.tips }}</p>
              </section>

              <section v-if="compareCandidates.length" class="detail-section compare-panel">
                <div class="detail-section-title">同材料对比</div>
                <div class="compare-list">
                  <button
                    v-for="candidate in compareCandidates"
                    :key="candidate.id"
                    class="compare-item"
                    @click="openFilament(candidate)"
                  >
                    <span class="compare-type" :style="{ color: matColor(candidate.material), background: matColor(candidate.material) + '12' }">{{ candidate.material }}</span>
                    <span class="compare-name">{{ candidate.brand }} {{ candidate.variant }}</span>
                    <span class="compare-meta">{{ candidate.nozzleRec || candidate.exposureTime }}{{ candidate.isResin ? 's' : '°C' }}</span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </Transition>

      <div v-if="!filtered.length" class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">没有找到匹配的耗材</div>
        <div class="empty-sub">试试按材料、场景或品牌缩小范围，或者清除当前筛选。</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.filament-page { min-height: 100vh; background: transparent; color: var(--lab-text); }

.hero {
  background:
    radial-gradient(circle at top right, rgba(255, 189, 89, 0.22), transparent 32%),
    radial-gradient(circle at left 40%, rgba(116, 185, 255, 0.16), transparent 30%),
    linear-gradient(135deg, #121316 0%, #1f242b 100%);
  padding: 56px 24px 44px;
}
.hero-inner { max-width: 1260px; margin: 0 auto; }
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.88);
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
  letter-spacing: 0.08em;
  margin-bottom: 16px;
}
.hero-title {
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #fff;
  margin-bottom: 12px;
}
.hero-sub {
  max-width: 760px;
  font-size: 15px;
  line-height: 1.7;
  color: rgba(255,255,255,0.64);
  margin-bottom: 26px;
}
.search-wrap { position: relative; max-width: 640px; }
.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255,255,255,0.38);
  pointer-events: none;
}
.search-input {
  width: 100%;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 14px;
  padding: 13px 16px 13px 40px;
  color: #fff;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: all 0.18s;
}
.search-input::placeholder { color: rgba(255,255,255,0.34); }
.search-input:focus {
  background: rgba(255,255,255,0.14);
  border-color: rgba(255,255,255,0.28);
}

.content { max-width: 1260px; margin: 0 auto; padding: 28px 24px 60px; }

.filter-grid {
  display: grid;
  gap: 14px;
  margin-bottom: 18px;
}
.filter-block {
  background: var(--lab-surface);
  border: 1px solid var(--lab-line);
  border-radius: 18px;
  padding: 16px 18px;
  box-shadow: var(--lab-shadow-sm);
}
.filter-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #8d8d92;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid var(--lab-line);
  background: rgba(246, 249, 253, 0.96);
  color: var(--lab-text-soft);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.chip:hover { border-color: var(--lab-line-strong); color: var(--lab-text); }
.chip.active {
  background: linear-gradient(135deg, var(--lab-accent) 0%, var(--lab-accent-2) 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 10px 22px rgba(37, 104, 232, 0.16);
}

.results-meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin: 16px 0 18px;
}
.results-count {
  font-size: 20px;
  font-weight: 700;
  color: #1d1d1f;
  letter-spacing: -0.02em;
}
.results-sub {
  margin-top: 4px;
  font-size: 13px;
  color: #8d8d92;
}
.reset-btn {
  border: none;
  background: transparent;
  color: #c44b38;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
}
.reset-btn:hover { text-decoration: underline; }

.grid-shell {
  position: relative;
}
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}
.material-card {
  background: var(--lab-surface-strong);
  border: 1px solid var(--lab-line);
  border-radius: 18px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.18s;
  min-height: 218px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--lab-shadow-sm);
}
.material-card:hover {
  border-color: rgba(37, 104, 232, 0.22);
  box-shadow: var(--lab-shadow);
  transform: translateY(-2px);
}
.material-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.material-card-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
}
.material-chip {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 5px 9px;
}
.mat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.material-card-title {
  margin-top: 18px;
  font-size: 18px;
  font-weight: 800;
  color: #17181b;
  line-height: 1.2;
}
.material-card-variant {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #67676d;
  line-height: 1.45;
}
.material-card-meta {
  margin-top: 8px;
  font-size: 12px;
  color: #9a9aa1;
}
.mini-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}
.mini-stat {
  background: rgba(245, 249, 253, 0.96);
  border-radius: 12px;
  padding: 10px 8px;
  text-align: center;
  border: 1px solid rgba(57, 86, 120, 0.08);
}
.mini-stat-label {
  display: block;
  font-size: 11px;
  color: #8d8d92;
  margin-bottom: 5px;
}
.mini-stat-value {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #212227;
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.tag {
  display: inline-flex;
  align-items: center;
  background: rgba(245, 249, 253, 0.96);
  color: var(--lab-text-soft);
  font-size: 12px;
  border-radius: 8px;
  padding: 4px 8px;
  border: 1px solid rgba(57, 86, 120, 0.08);
}
.material-card-footer {
  margin-top: auto;
  padding-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.material-card-tip {
  font-size: 12px;
  color: #8c8c93;
  line-height: 1.5;
}
.material-card-arrow {
  font-size: 12px;
  font-weight: 700;
  color: #1f242b;
  white-space: nowrap;
}

.detail-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 18, 24, 0.56);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 40;
}
.detail-modal {
  width: min(980px, 100%);
  max-height: min(90vh, 980px);
  background: linear-gradient(180deg, #f6f7fa 0%, #f2f3f7 100%);
  border: 1px solid rgba(255,255,255,0.45);
  border-radius: 28px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.26);
  overflow: hidden;
}
.detail-modal-headbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 14px;
  background: rgba(255,255,255,0.76);
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
.detail-modal-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #8d8d92;
  margin-bottom: 6px;
}
.detail-modal-sub {
  font-size: 13px;
  color: #666870;
}
.detail-modal-close {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 12px;
  background: #fff;
  color: #50525a;
  cursor: pointer;
  flex-shrink: 0;
}
.detail-modal-close:hover {
  background: #f0f1f5;
}
.detail-modal-scroll {
  max-height: calc(90vh - 72px);
  overflow-y: auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  background: linear-gradient(145deg, #ffffff 0%, #fbfbfc 100%);
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 22px;
  padding: 16px 18px;
}
.detail-head-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.detail-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 0;
}
.detail-source {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  color: #7f8087;
  background: #f3f4f7;
  border-radius: 999px;
  padding: 4px 8px;
}
.detail-title {
  font-size: 24px;
  line-height: 1.18;
  letter-spacing: -0.03em;
  margin-bottom: 6px;
  color: #17181b;
}
.detail-sub {
  font-size: 12px;
  color: #8d8d92;
}
.diff-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 999px;
  white-space: nowrap;
}
.diff-badge.large { padding: 6px 11px; font-size: 12px; }

.hero-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.hero-stat-card {
  background: #fff;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 18px;
  padding: 16px;
}
.hero-stat-label {
  font-size: 11px;
  color: #8d8d92;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.hero-stat-value {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
  color: #1d1d1f;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.detail-section {
  background: #fff;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 20px;
  padding: 18px 20px;
}
.detail-section.soft {
  background: linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%);
}
.detail-section-title {
  font-size: 14px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 14px;
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.param-item {
  background: #f5f5f7;
  border-radius: 14px;
  padding: 14px;
}
.param-name {
  font-size: 11px;
  color: #8d8d92;
  letter-spacing: 0.04em;
  margin-bottom: 5px;
}
.param-val {
  font-size: 22px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: #1d1d1f;
}
.param-unit {
  font-size: 13px;
  font-weight: 500;
  color: #6e6e73;
}
.param-range {
  margin-top: 5px;
  font-size: 11px;
  color: #9a9aa1;
}

.use-case-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.use-case-pill {
  background: #f5f5f7;
  color: #515158;
  font-size: 13px;
  border-radius: 999px;
  padding: 7px 11px;
}

.linked-problem-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.linked-problem-item {
  background: #f5f5f7;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  color: #3f4045;
}

.check-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.check-item {
  background: #f5f5f7;
  border-radius: 14px;
  padding: 12px 13px;
}
.check-label {
  font-size: 11px;
  color: #8d8d92;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
.check-value {
  font-size: 13px;
  line-height: 1.6;
  color: #303136;
}

.tips-panel {
  background: linear-gradient(180deg, rgba(255, 241, 204, 0.55) 0%, rgba(255,255,255,1) 100%);
  border-color: rgba(240, 192, 76, 0.22);
}
.tips-text {
  font-size: 14px;
  line-height: 1.75;
  color: #4b4b52;
}
.tips-text.mobile { margin-top: 10px; }

.compare-panel { padding-bottom: 14px; }
.compare-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.compare-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 8px;
  background: #f5f5f7;
  border: none;
  border-radius: 14px;
  padding: 12px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}
.compare-item:hover { background: #ededf1; }
.compare-type {
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  padding: 4px 8px;
}
.compare-name {
  font-size: 13px;
  color: #1d1d1f;
  font-weight: 600;
  line-height: 1.45;
}
.compare-meta {
  font-size: 12px;
  color: #8d8d92;
}

.empty-state {
  text-align: center;
  padding: 72px 20px;
}
.empty-icon {
  font-size: 40px;
  margin-bottom: 14px;
}
.empty-title {
  font-size: 18px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 8px;
}
.empty-sub {
  font-size: 14px;
  color: #8d8d92;
}

.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-to, .modal-fade-leave-from {
  opacity: 1;
}

@media (max-width: 1100px) {
  .cards-grid { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); }
  .hero-stat-grid,
  .params-grid,
  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .compare-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .cards-grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
  .detail-modal {
    width: 100%;
    max-height: 100vh;
    border-radius: 22px;
  }
}

@media (max-width: 768px) {
  .hero { padding: 38px 16px 30px; }
  .content { padding: 20px 16px 44px; }
  .cards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .material-card {
    min-height: 206px;
    padding: 14px;
  }
  .mini-stats {
    gap: 6px;
  }
  .mini-stat {
    padding: 9px 6px;
  }
  .detail-modal-backdrop {
    padding: 10px;
    align-items: flex-end;
  }
  .detail-modal {
    border-radius: 22px 22px 0 0;
  }
  .detail-modal-scroll {
    padding: 14px;
  }
  .detail-head {
    padding: 14px 15px;
  }
  .chips {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: 2px;
  }
  .chips::-webkit-scrollbar { display: none; }
  .results-meta {
    flex-direction: column;
    align-items: flex-start;
  }
  .hero-stat-grid,
  .params-grid {
    grid-template-columns: 1fr;
  }
  .compare-list {
    grid-template-columns: 1fr;
  }
}
</style>
