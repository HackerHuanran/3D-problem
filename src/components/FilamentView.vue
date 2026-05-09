<script setup>
import { ref, computed } from 'vue'
import { filaments, materialTypes, brands, MATERIAL_COLOR, DIFFICULTY_COLOR } from '../data/filaments.js'

const selectedMaterial = ref('全部')
const selectedBrand    = ref('全部')
const searchQuery      = ref('')
const expandedId       = ref(null)

const filtered = computed(() => {
  return filaments.filter(f => {
    if (selectedMaterial.value !== '全部' && f.material !== selectedMaterial.value) return false
    if (selectedBrand.value    !== '全部' && f.brand    !== selectedBrand.value)    return false
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      return (
        f.brand.toLowerCase().includes(q) ||
        f.brandFull.toLowerCase().includes(q) ||
        f.material.toLowerCase().includes(q) ||
        f.variant.toLowerCase().includes(q) ||
        f.tags.some(t => t.includes(q))
      )
    }
    return true
  })
})

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

function matColor(mat) {
  return MATERIAL_COLOR[mat] || '#aeaeb2'
}
function diffStyle(d) {
  return DIFFICULTY_COLOR[d] || { bg: '#f5f5f7', color: '#6e6e73' }
}
</script>

<template>
  <div class="filament-page">
    <!-- Hero -->
    <div class="hero">
      <div class="hero-inner">
        <div class="hero-badge">耗材参数库</div>
        <h1 class="hero-title">找到你的完美参数</h1>
        <p class="hero-sub">收录 {{ filaments.length }} 种主流耗材 · 覆盖 {{ brands.length - 1 }} 大品牌 · 持续更新</p>
        <div class="search-wrap">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.4"/>
            <path d="M10.5 10.5l3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="搜索品牌、材料或特性…"
          />
        </div>
      </div>
    </div>

    <div class="content">
      <!-- 材料筛选 -->
      <div class="filter-group">
        <span class="filter-label">材料</span>
        <div class="chips">
          <button
            v-for="m in materialTypes" :key="m"
            :class="['chip', { active: selectedMaterial === m }]"
            :style="selectedMaterial === m && m !== '全部' ? { background: matColor(m) + '22', color: matColor(m), borderColor: matColor(m) + '55' } : {}"
            @click="selectedMaterial = m"
          >{{ m }}</button>
        </div>
      </div>

      <!-- 品牌筛选 -->
      <div class="filter-group">
        <span class="filter-label">品牌</span>
        <div class="chips">
          <button
            v-for="b in brands" :key="b"
            :class="['chip', { active: selectedBrand === b }]"
            @click="selectedBrand = b"
          >{{ b }}</button>
        </div>
      </div>

      <!-- 结果计数 -->
      <div class="results-meta">
        <span class="results-count">{{ filtered.length }} 条结果</span>
        <button v-if="selectedMaterial !== '全部' || selectedBrand !== '全部' || searchQuery" class="reset-btn" @click="selectedMaterial='全部'; selectedBrand='全部'; searchQuery=''">清除筛选</button>
      </div>

      <!-- 卡片列表 -->
      <div v-if="filtered.length" class="cards">
        <div
          v-for="f in filtered"
          :key="f.id"
          class="card"
          :class="{ expanded: expandedId === f.id }"
        >
          <!-- 卡片头 -->
          <div class="card-head" @click="toggleExpand(f.id)">
            <div class="card-left">
              <div class="mat-dot" :style="{ background: matColor(f.material) }"></div>
              <div class="card-titles">
                <div class="card-name">{{ f.brand }} <span class="card-variant">{{ f.variant }}</span></div>
                <div class="card-material">{{ f.material }}</div>
              </div>
            </div>
            <div class="card-right">
              <span class="diff-badge" :style="{ background: diffStyle(f.difficulty).bg, color: diffStyle(f.difficulty).color }">{{ f.difficulty }}</span>
              <div class="card-params-peek" v-if="!f.isResin">
                <span class="param-peek">{{ f.nozzleRec }}°C</span>
                <span class="param-peek-sep">/</span>
                <span class="param-peek">床{{ f.bedRec }}°C</span>
              </div>
              <div class="card-params-peek" v-else>
                <span class="param-peek">曝光{{ f.exposureTime }}s</span>
              </div>
              <svg class="expand-arrow" :class="{ open: expandedId === f.id }" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>

          <!-- 展开详情 -->
          <Transition name="expand">
            <div v-if="expandedId === f.id" class="card-detail">
              <div class="tags-row">
                <span v-for="tag in f.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>

              <!-- FDM参数表 -->
              <template v-if="!f.isResin">
                <div class="params-grid">
                  <div class="param-item">
                    <div class="param-name">喷嘴温度</div>
                    <div class="param-val">{{ f.nozzleRec }}°C</div>
                    <div class="param-range">范围 {{ f.nozzle[0] }}–{{ f.nozzle[1] }}°C</div>
                  </div>
                  <div class="param-item">
                    <div class="param-name">热床温度</div>
                    <div class="param-val">{{ f.bedRec }}°C</div>
                    <div class="param-range">范围 {{ f.bed[0] }}–{{ f.bed[1] }}°C</div>
                  </div>
                  <div class="param-item">
                    <div class="param-name">推荐速度</div>
                    <div class="param-val">{{ f.speedRec }} <span class="param-unit">mm/s</span></div>
                    <div class="param-range">最高 {{ f.speedMax }}mm/s</div>
                  </div>
                  <div class="param-item">
                    <div class="param-name">风扇速度</div>
                    <div class="param-val">{{ f.fanSpeed }}<span class="param-unit">%</span></div>
                    <div class="param-range">{{ f.fanSpeed === 0 ? '建议关闭' : f.fanSpeed === 100 ? '全速开启' : '部分冷却' }}</div>
                  </div>
                  <div class="param-item">
                    <div class="param-name">直驱回抽</div>
                    <div class="param-val">{{ f.retractDirect }} <span class="param-unit">mm</span></div>
                    <div class="param-range">直驱挤出机</div>
                  </div>
                  <div class="param-item">
                    <div class="param-name">Bowden回抽</div>
                    <div class="param-val">{{ f.retractBowden === 0 ? '禁用' : f.retractBowden + ' mm' }}</div>
                    <div class="param-range">远程送料管</div>
                  </div>
                </div>
              </template>

              <!-- 光固化参数表 -->
              <template v-else>
                <div class="params-grid">
                  <div class="param-item">
                    <div class="param-name">普通层曝光</div>
                    <div class="param-val">{{ f.exposureTime }} <span class="param-unit">s</span></div>
                    <div class="param-range">参考值</div>
                  </div>
                  <div class="param-item">
                    <div class="param-name">底层曝光</div>
                    <div class="param-val">{{ f.bottomExposure }} <span class="param-unit">s</span></div>
                    <div class="param-range">底层固化</div>
                  </div>
                  <div class="param-item">
                    <div class="param-name">底层层数</div>
                    <div class="param-val">{{ f.bottomLayers }} <span class="param-unit">层</span></div>
                    <div class="param-range">底板附着</div>
                  </div>
                  <div class="param-item">
                    <div class="param-name">抬升速度</div>
                    <div class="param-val">{{ f.liftSpeed }} <span class="param-unit">mm/min</span></div>
                    <div class="param-range">离型速度</div>
                  </div>
                </div>
              </template>

              <div class="tips-box">
                <div class="tips-label">打印技巧</div>
                <p class="tips-text">{{ f.tips }}</p>
              </div>
              <div class="source-row">
                <span class="source-tag">{{ f.source }}</span>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">没有找到匹配的耗材</div>
        <div class="empty-sub">试试调整筛选条件或清除搜索关键词</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filament-page { min-height: 100vh; background: #f5f5f7; }

/* Hero */
.hero { background: linear-gradient(135deg, #1d1d1f 0%, #3a3a3c 100%); padding: 56px 24px 48px; }
.hero-inner { max-width: 1280px; margin: 0 auto; }
.hero-badge { display: inline-block; background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.85); font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 100px; letter-spacing: 0.08em; margin-bottom: 16px; }
.hero-title { font-size: clamp(26px, 4vw, 40px); font-weight: 800; color: #fff; letter-spacing: -0.03em; margin-bottom: 10px; }
.hero-sub { font-size: 15px; color: rgba(255,255,255,0.55); margin-bottom: 28px; }
.search-wrap { position: relative; max-width: 600px; }
.search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.4); pointer-events: none; }
.search-input { width: 100%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 12px 16px 12px 40px; color: #fff; font-size: 15px; font-family: inherit; outline: none; transition: all 0.2s; }
.search-input::placeholder { color: rgba(255,255,255,0.35); }
.search-input:focus { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); }

/* Content */
.content { max-width: 1280px; margin: 0 auto; padding: 32px 24px 60px; }

/* Filters */
.filter-group { margin-bottom: 16px; display: flex; align-items: flex-start; gap: 12px; }
.filter-label { font-size: 12px; color: #aeaeb2; letter-spacing: 0.05em; font-weight: 600; margin-top: 8px; flex-shrink: 0; width: 28px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { padding: 5px 12px; border-radius: 100px; border: 1px solid rgba(0,0,0,0.12); background: #fff; color: #6e6e73; font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.chip:hover { border-color: rgba(0,0,0,0.25); color: #1d1d1f; }
.chip.active { background: #1d1d1f; color: #fff; border-color: #1d1d1f; }

/* Results meta */
.results-meta { display: flex; align-items: center; gap: 12px; margin: 20px 0 16px; }
.results-count { font-size: 13px; color: #aeaeb2; }
.reset-btn { background: transparent; border: none; color: #ff6b6b; font-size: 13px; font-family: inherit; cursor: pointer; padding: 0; }
.reset-btn:hover { text-decoration: underline; }

/* Cards */
.cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.card { background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid rgba(0,0,0,0.07); transition: box-shadow 0.2s; }
.card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.card.expanded { box-shadow: 0 4px 24px rgba(0,0,0,0.1); }

.card-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; cursor: pointer; gap: 12px; }
.card-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.mat-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.card-titles { min-width: 0; }
.card-name { font-size: 15px; font-weight: 600; color: #1d1d1f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-variant { font-weight: 400; color: #6e6e73; }
.card-material { font-size: 12px; color: #aeaeb2; margin-top: 2px; }
.card-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.diff-badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 100px; white-space: nowrap; }
.card-params-peek { display: flex; align-items: center; gap: 4px; }
.param-peek { font-size: 13px; color: #6e6e73; font-variant-numeric: tabular-nums; }
.param-peek-sep { color: #c7c7cc; font-size: 12px; }
.expand-arrow { color: #aeaeb2; transition: transform 0.2s; flex-shrink: 0; }
.expand-arrow.open { transform: rotate(180deg); }

/* Detail */
.card-detail { padding: 0 18px 20px; border-top: 1px solid rgba(0,0,0,0.06); }
.tags-row { display: flex; flex-wrap: wrap; gap: 6px; padding-top: 16px; margin-bottom: 16px; }
.tag { font-size: 12px; color: #6e6e73; background: #f5f5f7; border-radius: 6px; padding: 3px 8px; }

.params-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; margin-bottom: 16px; }
.param-item { background: #f5f5f7; border-radius: 12px; padding: 12px 14px; }
.param-name { font-size: 11px; color: #aeaeb2; margin-bottom: 4px; letter-spacing: 0.03em; }
.param-val { font-size: 20px; font-weight: 700; color: #1d1d1f; line-height: 1.2; letter-spacing: -0.02em; }
.param-unit { font-size: 13px; font-weight: 400; color: #6e6e73; }
.param-range { font-size: 11px; color: #aeaeb2; margin-top: 3px; }

.tips-box { background: rgba(253,203,110,0.1); border: 1px solid rgba(253,203,110,0.25); border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; }
.tips-label { font-size: 11px; font-weight: 700; color: #d4a017; margin-bottom: 6px; letter-spacing: 0.05em; }
.tips-text { font-size: 13px; color: #4a3800; line-height: 1.7; }

.source-row { display: flex; justify-content: flex-end; }
.source-tag { font-size: 11px; color: #aeaeb2; background: #f5f5f7; padding: 3px 8px; border-radius: 6px; }

/* Transition */
.expand-enter-active, .expand-leave-active { transition: all 0.22s ease; overflow: hidden; }
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
.expand-enter-to, .expand-leave-from { opacity: 1; max-height: 600px; }

/* Empty */
.empty-state { text-align: center; padding: 64px 20px; }
.empty-icon { font-size: 40px; margin-bottom: 16px; }
.empty-title { font-size: 17px; font-weight: 600; color: #1d1d1f; margin-bottom: 8px; }
.empty-sub { font-size: 14px; color: #aeaeb2; }

@media (max-width: 900px) {
  .cards { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .filter-group { gap: 8px; }
  .filter-label { display: none; }
  .card-params-peek { display: none; }
  .params-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
