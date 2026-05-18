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
        <div class="hero-total">
          <span class="hero-total-label">{{ t('p.totalLabel') }}</span>
          <div class="hero-total-value">
            <strong>{{ allProblems.length }}</strong>
            <span>{{ t('p.totalSuffix') }}</span>
          </div>
        </div>

        <div class="hero-actions">
          <button class="hero-path-btn primary" @click="activateWorkbench('diagnosis')">
            <span class="hero-path-title">{{ t('p.pathDiagTitle') }}</span>
            <span class="hero-path-sub">{{ t('p.pathDiagSub') }}</span>
          </button>
          <button class="hero-path-btn" @click="activateWorkbench('search')">
            <span class="hero-path-title">{{ t('p.pathSearchTitle') }}</span>
            <span class="hero-path-sub">{{ t('p.pathSearchSub') }}</span>
          </button>
        </div>

        <button class="share-btn" @click="$emit(currentUser ? 'go-submit' : 'open-auth', currentUser ? undefined : 'login')">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v9M3.5 6l4-5 4 5M2 12h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          {{ t('p.submitProblem') }}
        </button>
      </div>
    </section>

    <section id="workbench" class="workbench-section">
      <div class="workbench-shell">
        <div class="workbench-head" :class="{ compact: isMobile }">
          <div>
            <p v-if="!isMobile" class="workbench-kicker">{{ t('p.quickEntry') }}</p>
            <h2 class="workbench-title">{{ isMobile ? t('p.pathSearchTitle') : t('p.startMethod') }}</h2>
            <p class="workbench-subtitle">{{ workbenchTitle }}</p>
            <p class="workbench-desc">{{ workbenchDesc }}</p>
          </div>
          <div v-if="!isMobile" class="workbench-switch">
            <button
              :class="['workbench-tab', { active: workbenchMode === 'diagnosis' }]"
              @click="activateWorkbench('diagnosis', false)"
            >
              {{ t('p.modeDiagnosis') }}
            </button>
            <button
              :class="['workbench-tab', { active: workbenchMode === 'search' }]"
              @click="activateWorkbench('search', false)"
            >
              {{ t('p.modeSearch') }}
            </button>
          </div>
        </div>

        <div v-if="workbenchMode === 'search'" class="workbench-card search-card">
          <div class="search-main-row">
            <div class="search-wrap search-wrap-wide" :class="{ focused: searchFocused }">
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
            <div class="search-meta">
              <span class="result-count static">{{ t('p.results', { n: libraryTotal }) }}</span>
              <button v-if="hasActiveSearchFilters" class="clear-filters-btn" @click="resetSearchFilters">{{ t('p.clearFilters') }}</button>
            </div>
          </div>

          <div class="filters filters-inline">
            <div class="filter-row">
              <span class="filter-row-label">{{ t('p.filterType') }}</span>
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
              <span class="filter-row-label">{{ t('p.filterCategory') }}</span>
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
                  {{ t('p.myFavorites') }}
                  <span v-if="favorites.size > 0" class="fav-count">{{ favorites.size }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="workbench-card" :class="{ 'mobile-diagnosis-card': isMobile }">
          <div v-if="isMobile" class="mobile-diagnosis-head">
            <div>
              <p class="mobile-diagnosis-kicker">{{ t('p.modeDiagnosis') }}</p>
              <h3 class="mobile-diagnosis-title">{{ t('p.modeDiagnosisTitle') }}</h3>
              <p class="mobile-diagnosis-desc">{{ t('p.modeDiagnosisDesc') }}</p>
            </div>
            <button class="mobile-diagnosis-back" @click="activateWorkbench('search', false)">
              返回搜索
            </button>
          </div>
          <div class="diagnosis-panel diagnosis-panel-home">
            <div class="diag-step">
              <span class="diag-label">1. 出问题的阶段</span>
              <div class="diag-options">
                <button
                  v-for="stage in DIAG_STAGES"
                  :key="stage.id"
                  :class="['diag-option', { active: selectedDiagStage === stage.id }]"
                  @click="selectDiagStage(stage.id)"
                >
                  {{ stage.label }}
                </button>
              </div>
            </div>

            <div class="diag-step">
              <span class="diag-label">2. 打印方式和材料</span>
              <div class="diag-options">
                <button
                  v-for="printer in DIAG_PRINTERS"
                  :key="printer.id"
                  :class="['diag-option', 'soft', { active: selectedDiagPrinter === printer.id }]"
                  @click="selectedDiagPrinter = printer.id"
                >
                  {{ printer.label }}
                </button>
              </div>
              <div class="diag-options compact">
                <button
                  v-for="material in DIAG_MATERIALS"
                  :key="material.id"
                  :class="['diag-option', 'soft', { active: selectedDiagMaterial === material.id }]"
                  @click="selectedDiagMaterial = material.id"
                >
                  {{ material.label }}
                </button>
              </div>
            </div>

            <div class="diag-step">
              <span class="diag-label">3. 你看到的现象</span>
              <div class="diag-options">
                <button
                  v-for="symptom in currentSymptoms"
                  :key="symptom.id"
                  :class="['diag-option', 'soft', { active: selectedSymptomId === symptom.id }]"
                  @click="selectedSymptomId = symptom.id"
                >
                  {{ symptom.label }}
                </button>
              </div>
            </div>

            <div v-if="currentClues.length" class="diag-step">
              <span class="diag-label">4. 再补充几个线索</span>
              <div class="diag-options">
                <button
                  v-for="clue in currentClues"
                  :key="clue.id"
                  :class="['diag-option', 'soft', 'clue', { active: selectedClueIds.includes(clue.id) }]"
                  @click="toggleDiagClue(clue.id)"
                >
                  {{ clue.label }}
                </button>
              </div>
            </div>

            <div v-if="topDiagnosis" class="diag-result">
              <div class="diag-result-head">
                <span class="diag-result-tag">评分式匹配</span>
                <button class="diag-reset-btn" @click="resetDiagnosis">重置诊断</button>
              </div>
              <div class="diag-result-body">
                <div class="diag-primary">
                  <div class="diag-primary-top">
                    <span class="diag-emoji">{{ topDiagnosis.problem.emoji }}</span>
                    <div class="diag-primary-meta">
                      <div class="diag-problem-title">{{ topDiagnosis.problem.title }}</div>
                      <div class="diag-problem-subtitle">{{ topDiagnosis.problem.subtitle }}</div>
                      <div class="diag-problem-match">
                        <span class="diag-match-chip" :class="topDiagnosis.tone">{{ topDiagnosis.matchLabel }}</span>
                        <span class="diag-match-score">{{ topDiagnosis.score }} 分</span>
                        <span class="diag-match-stage">{{ currentStageLabel }}</span>
                      </div>
                    </div>
                  </div>
                <p class="diag-primary-desc">{{ topDiagnosis.summary }}</p>
                <div class="diag-meta-row">
                  <span class="diag-meta-pill">排查顺序：{{ topDiagnosis.checkOrder }}</span>
                  <span class="diag-meta-pill">预计耗时：{{ topDiagnosis.timeEstimate }}</span>
                </div>
                <ul class="diag-reasons">
                  <li v-for="reason in topDiagnosis.matchedReasons" :key="reason">{{ reason }}</li>
                </ul>
                <div class="diag-actions">
                  <button class="diag-open-btn" @click="$emit('go-detail', topDiagnosis.problem.id)">查看完整方案</button>
                    <p class="diag-first-action">{{ topDiagnosis.firstAction }}</p>
                  </div>
                </div>

                <div class="diag-secondary">
                  <div class="diag-secondary-title">备选候选</div>
                  <div class="diag-secondary-list">
                    <button
                      v-for="alt in alternativeDiagnoses"
                      :key="alt.problem.id"
                      class="diag-alt-card"
                      @click="$emit('go-detail', alt.problem.id)"
                    >
                      <div class="diag-alt-top">
                        <span class="diag-alt-name">{{ alt.problem.emoji }} {{ alt.problem.title }}</span>
                        <span class="diag-match-chip small" :class="alt.tone">{{ alt.matchLabel }}</span>
                      </div>
                      <div class="diag-alt-meta">
                        <span>顺序：{{ alt.checkOrder }}</span>
                        <span>耗时：{{ alt.timeEstimate }}</span>
                      </div>
                      <p class="diag-alt-text">{{ alt.summary }}</p>
                      <span class="diag-alt-arrow">查看方案 →</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

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
      <div v-if="diagnosisListFilterActive && topDiagnosis" class="list-sync-banner">
        <div class="list-sync-copy">
          <span class="list-sync-kicker">诊断联动</span>
          <p class="list-sync-title">下方问题库已按本次诊断结果联动展示。</p>
          <p class="list-sync-desc">当前按诊断优先级展示 {{ libraryTotal }} 个最相关的问题卡片，越靠前越建议先看。</p>
        </div>
        <div class="list-sync-actions">
          <button class="list-sync-btn active">{{ t('p.resultOnlyRelated') }}</button>
          <button class="list-sync-btn" @click="diagnosisListFilterActive = false">{{ t('p.resultAll') }}</button>
        </div>
      </div>
      <div v-else-if="topDiagnosis && workbenchMode === 'diagnosis'" class="list-sync-banner muted">
        <div class="list-sync-copy">
          <span class="list-sync-kicker">问题库</span>
          <p class="list-sync-title">当前展示全部问题库。</p>
          <p class="list-sync-desc">如果你想只看和这次诊断最相关的问题，可以重新联动下方列表。</p>
        </div>
        <div class="list-sync-actions">
          <button class="list-sync-btn" @click="diagnosisListFilterActive = true">{{ t('p.resultRelink') }}</button>
        </div>
      </div>

      <div v-if="libraryLoading" class="empty-state">
        <div class="empty-icon">⏳</div>
        <p class="empty-title">正在加载问题库…</p>
        <p class="empty-desc">正在根据当前筛选条件拉取问题列表。</p>
      </div>

      <div v-else-if="displayProblems.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <p class="empty-title">{{ t('p.emptyTitle', { q: searchQuery }) }}</p>
        <p class="empty-desc">{{ t('p.emptyDesc') }}</p>
        <button class="empty-reset" @click="resetSearchFilters">{{ t('p.clearFilter') }}</button>
      </div>

      <TransitionGroup v-else name="card" tag="div" class="problems-grid">
        <article
          v-for="(problem, index) in paginatedProblems"
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
            <div v-if="activeDiagnosisMeta(problem.id)" class="card-diagnosis-row">
              <span class="card-diagnosis-rank">推荐第 {{ activeDiagnosisMeta(problem.id).rank }}</span>
              <span class="card-diagnosis-match" :class="activeDiagnosisMeta(problem.id).tone">{{ activeDiagnosisMeta(problem.id).matchLabel }}</span>
            </div>
            <h3 class="card-title" v-html="highlight(problem.title)"></h3>
            <p class="card-subtitle" v-html="highlight(problem.subtitle)"></p>
            <div v-if="problem.stages?.length || problem.estimatedTime" class="card-structure-row">
              <span v-if="problem.stages?.length" class="card-structure-pill">{{ t('p.cardStage', { v: stageLabel(problem.stages[0]) }) }}</span>
              <span v-if="problem.estimatedTime" class="card-structure-pill soft">{{ problem.estimatedTime }}</span>
            </div>
            <p v-if="activeDiagnosisMeta(problem.id)" class="card-diagnosis-reason">{{ activeDiagnosisMeta(problem.id).reason }}</p>
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

      <div v-if="totalPages > 1" class="pagination">
        <button class="page-btn nav" :disabled="currentPage === 1" @click="currentPage--">上一页</button>
        <button
          v-for="page in visiblePageNumbers"
          :key="page"
          :class="['page-btn', { active: currentPage === page }]"
          @click="currentPage = page"
        >
          {{ page }}
        </button>
        <button class="page-btn nav" :disabled="currentPage === totalPages" @click="currentPage++">下一页</button>
      </div>
    </main>

    <section class="filament-entry-section">
      <div class="filament-entry-card">
        <div class="filament-entry-copy">
          <span class="filament-entry-kicker">耗材参数库</span>
          <h2 class="filament-entry-title">材料别在首页里顺手看，直接进参数库会更快</h2>
          <p class="filament-entry-desc">
            按材料、品牌、使用场景筛选，查看推荐参数、真实评价、风险提示和适配建议。
          </p>
          <div class="filament-entry-tags">
            <span class="filament-entry-tag">PLA / PETG / TPU / 树脂</span>
            <span class="filament-entry-tag">真实评价</span>
            <span class="filament-entry-tag">风险标签</span>
          </div>
        </div>
        <button class="filament-entry-btn" @click="$emit('go-filament')">
          去耗材参数库
        </button>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useLocale } from '@/composables/useLocale.js'
import { useUserProblems } from '@/composables/useUserProblems.js'
import { useCommunity } from '@/composables/useCommunity.js'
import { useFavorites } from '@/composables/useFavorites.js'
import { useProblemMeta } from '@/composables/useProblemMeta.js'
import { searchProblemLibrary, getAllProblemSummaries } from '@/composables/useProblemLibrary.js'

const props = defineProps({ currentUser: Object })
const emit = defineEmits(['go-detail', 'open-auth', 'go-submit', 'go-filament'])

const { userProblems, fetchUserProblems } = useUserProblems()
const { getEncounterCounts } = useCommunity()
const { favorites, fetchFavorites, toggleFavorite } = useFavorites()
const { metaMap, fetchProblemMeta } = useProblemMeta()

const showFavOnly = ref(false)
const currentPage = ref(1)
const pageSize = 12
const isMobile = ref(false)
const workbenchMode = ref('search')
const diagnosisListFilterActive = ref(true)
const libraryItems = ref([])
const libraryTotal = ref(0)
const libraryLoading = ref(false)

function syncViewportMode() {
  if (typeof window === 'undefined') return
  const nextIsMobile = window.innerWidth <= 768
  const wasMobile = isMobile.value
  isMobile.value = nextIsMobile

  if (!wasMobile && nextIsMobile) {
    workbenchMode.value = 'search'
    diagnosisListFilterActive.value = false
  }
}

const handleFav = async (e, problemId) => {
  e.stopPropagation()
  if (!props.currentUser) { emit('open-auth', 'login'); return }
  const wasFav = favorites.value.has(problemId)
  await toggleFavorite(problemId, props.currentUser.id)
  if (showFavOnly.value && wasFav) {
    libraryItems.value = libraryItems.value.filter(item => item.id !== problemId)
    libraryTotal.value = Math.max(0, libraryTotal.value - 1)
    const maxPage = Math.max(1, Math.ceil(libraryTotal.value / pageSize))
    if (!libraryItems.value.length && currentPage.value > 1) {
      currentPage.value = Math.min(currentPage.value, maxPage)
    }
  }
}

watch(() => props.currentUser, (user) => {
  if (user) fetchFavorites(user.id)
  else { favorites.value = new Set(); showFavOnly.value = false }
  currentPage.value = 1
}, { immediate: true })

watch([showFavOnly], () => {
  currentPage.value = 1
})

const encounterCounts = ref({})
const encounterReady  = ref(false)

onMounted(async () => {
  syncViewportMode()
  window.addEventListener('resize', syncViewportMode, { passive: true })
  fetchUserProblems()
  fetchProblemMeta()
  const ids = getAllProblemSummaries().map(p => p.id)
  encounterCounts.value = await getEncounterCounts(ids)
  encounterReady.value = true
  if (props.currentUser) fetchFavorites(props.currentUser.id)
  await loadLibraryPage()
})

onUnmounted(() => {
  window.removeEventListener('resize', syncViewportMode)
})

// 热门排行：按遇到人数排序取 Top 6；无数据时用编辑推荐前 6 条
const hotProblems = computed(() => {
  const baseProblems = getAllProblemSummaries()
  const hasData = Object.keys(encounterCounts.value).length > 0
  if (hasData) {
    return [...baseProblems]
      .filter(p => encounterCounts.value[p.id] > 0)
      .sort((a, b) => (encounterCounts.value[b.id] || 0) - (encounterCounts.value[a.id] || 0))
      .slice(0, 6)
  }
  return baseProblems.slice(0, 6)
})

const { t } = useLocale()

// 把所有问题标题打散成4行，每行有不同尺寸和透明度，重复2次填满宽度
const ALL_TITLES = getAllProblemSummaries().map(p => p.title)

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

const DIAG_STAGES = [
  { id: 'before', label: '刚开始就失败' },
  { id: 'first-layer', label: '第一层异常' },
  { id: 'mid-print', label: '打印到一半出事' },
  { id: 'surface', label: '能打完但质量差' },
]

const DIAG_PRINTERS = [
  { id: 'all', label: '不限机型' },
  { id: 'FDM', label: 'FDM' },
  { id: 'SLA', label: 'SLA 光固化' },
]

const DIAG_MATERIALS = [
  { id: 'any', label: '不限材料' },
  { id: 'pla', label: 'PLA' },
  { id: 'petg', label: 'PETG' },
  { id: 'abs-asa', label: 'ABS / ASA' },
  { id: 'tpu', label: 'TPU' },
  { id: 'resin', label: '树脂' },
]

const CANDIDATE_META_BY_PROBLEM = {
  'no-extrusion': { checkOrder: '先查供料，再查喷嘴，再查 Z 高度', timeEstimate: '约 5 分钟' },
  'clogged-nozzle': { checkOrder: '先冷拔，再清喷嘴，再换喷嘴', timeEstimate: '约 10 分钟' },
  'filament-tangle': { checkOrder: '先看线盘，再理料路，再重试挤出', timeEstimate: '约 3 分钟' },
  'first-layer-lines': { checkOrder: '先打首层测试，再调 Z 偏移，再复查网格', timeEstimate: '约 8 分钟' },
  'warped-bed': { checkOrder: '先查床网格，再查局部高低差', timeEstimate: '约 10 分钟' },
  'first-layer-not-sticking': { checkOrder: '先清洁热床，再降速，再调温度', timeEstimate: '约 5 分钟' },
  'warping': { checkOrder: '先稳首层，再加 Brim，再控环境温差', timeEstimate: '约 8 分钟' },
  'cooling-vs-adhesion': { checkOrder: '先调风扇，再复查首层附着', timeEstimate: '约 5 分钟' },
  'resin-exposure': { checkOrder: '先打曝光测试，再微调底层与普通层', timeEstimate: '约 15 分钟' },
  'resin-fep-failure': { checkOrder: '先查 FEP 状态，再查离型阻力', timeEstimate: '约 10 分钟' },
  'resin-warping': { checkOrder: '先查支撑，再查摆放角度', timeEstimate: '约 12 分钟' },
  'elephant-foot': { checkOrder: '先抬 Z，再降床温，再做补偿', timeEstimate: '约 6 分钟' },
  'tolerance-calibration': { checkOrder: '先打尺寸块，再调 Flow，再调 XY', timeEstimate: '约 15 分钟' },
  'layer-shift': { checkOrder: '先查碰撞，再查皮带，再降加速度', timeEstimate: '约 10 分钟' },
  'motor-stall': { checkOrder: '先查负载，再查电流与散热', timeEstimate: '约 12 分钟' },
  'printing-noise': { checkOrder: '先定位噪音轴，再查润滑和阻力', timeEstimate: '约 10 分钟' },
  'spaghetti': { checkOrder: '先停机清理，再回看失效起点', timeEstimate: '约 8 分钟' },
  'support-optimization': { checkOrder: '先看切片预览，再补支撑策略', timeEstimate: '约 12 分钟' },
  'extruder-clicking': { checkOrder: '先看堵头，再查温度，再查回抽', timeEstimate: '约 8 分钟' },
  'heat-creep': { checkOrder: '先查热端散热，再做长时验证', timeEstimate: '约 12 分钟' },
  'resin-suction-cup': { checkOrder: '先查吸盘腔，再补泄压孔与角度', timeEstimate: '约 15 分钟' },
  'stringing': { checkOrder: '先降温，再调回抽，再提 travel', timeEstimate: '约 10 分钟' },
  'wet-filament': { checkOrder: '先烘干，再复打对比件', timeEstimate: '约 30-60 分钟' },
  'petg-stringing': { checkOrder: '先压温度，再控速度与回抽', timeEstimate: '约 10 分钟' },
  'blobs-zits': { checkOrder: '先看接缝，再查停顿，再调回抽', timeEstimate: '约 10 分钟' },
  'seam-visible': { checkOrder: '先改接缝位置，再复打立面件', timeEstimate: '约 8 分钟' },
  'pressure-advance': { checkOrder: '先打测试塔，再填入最佳值', timeEstimate: '约 20 分钟' },
  'shrinkage-tolerance': { checkOrder: '先测材料收缩，再做孔径补偿', timeEstimate: '约 15 分钟' },
  'estep-calibration': { checkOrder: '先测 100mm 挤出，再修正 E 步', timeEstimate: '约 15 分钟' },
  'top-surface-rough': { checkOrder: '先加顶层，再查流量与顶面速度', timeEstimate: '约 8 分钟' },
  'under-extrusion': { checkOrder: '先查喷嘴，再查送丝，再查温度', timeEstimate: '约 10 分钟' },
  'missing-thin-details': { checkOrder: '先查摆放，再查特征尺寸与层高', timeEstimate: '约 12 分钟' },
  'resin-wash-cure': { checkOrder: '先减清洗固化，再看后处理节奏', timeEstimate: '约 10 分钟' },
}

const DIAGNOSIS_MAP = {
  before: [
    {
      id: 'before-no-extrusion',
      label: '喷嘴完全不出丝',
      printers: ['FDM'],
      clues: [
        { id: 'drive_clicking', label: '挤出机在打滑或咔咔响' },
        { id: 'filament_stuck', label: '耗材在线盘或进料口卡住' },
        { id: 'bed_too_close', label: '喷嘴像压在热床上' },
        { id: 'stops_midway', label: '一开始有丝，后来突然没有' },
      ],
      candidates: [
        {
          problemId: 'no-extrusion',
          baseScore: 76,
          printers: ['FDM'],
          materials: ['any'],
          summary: '起始阶段完全不出丝时，最常见就是送丝链路受阻、喷嘴堵死，或首层高度压得过低。',
          firstAction: '先手动预热并推进耗材，确认挤出机是否真的能正常出丝。',
          clueBonuses: { drive_clicking: 10, filament_stuck: 8, bed_too_close: 7, stops_midway: 4 },
          clueReasons: {
            drive_clicking: '你提到挤出机打滑，这通常意味着喷嘴出口或送丝路径受阻。',
            filament_stuck: '你提到耗材卡住，优先要排查线盘和进料通道。',
            bed_too_close: '喷嘴贴床太近会直接把出料口“封住”，开头尤其明显。',
            stops_midway: '如果是先出后停，也要同时怀疑局部堵头或热蠕变。',
          },
        },
        {
          problemId: 'clogged-nozzle',
          baseScore: 66,
          printers: ['FDM'],
          materials: ['any'],
          summary: '如果机器在加热正常的情况下仍然难以挤出，喷嘴部分堵塞是第二高概率问题。',
          firstAction: '尝试做一次冷拔，先判断喷嘴里是否有积碳或异物。',
          clueBonuses: { drive_clicking: 7, stops_midway: 7, filament_stuck: 2 },
          clueReasons: {
            drive_clicking: '打滑又推不动时，经常就是喷嘴内阻过大。',
            stops_midway: '中途逐渐不出丝，很像部分堵塞在加重。',
          },
        },
        {
          problemId: 'filament-tangle',
          baseScore: 58,
          printers: ['FDM'],
          materials: ['any'],
          summary: '如果喷嘴和温度都正常，但耗材被线盘打结或绕死，也会表现成“突然没丝”。',
          firstAction: '先检查线盘有没有交叉绕线、死结或过紧的阻力点。',
          clueBonuses: { filament_stuck: 10, stops_midway: 5 },
          clueReasons: {
            filament_stuck: '线盘卡死和进料通道受阻，是这类问题的强线索。',
          },
        },
      ],
    },
    {
      id: 'before-first-layer-lines',
      label: '线条断断续续、宽窄不一',
      printers: ['FDM'],
      clues: [
        { id: 'center_ok_edge_bad', label: '中间还行，边缘特别差' },
        { id: 'edge_ok_center_bad', label: '边缘正常，中间异常' },
        { id: 'first_layer_fast', label: '第一层速度打得很快' },
        { id: 'dirty_bed', label: '热床有残胶、油污或灰' },
      ],
      candidates: [
        {
          problemId: 'first-layer-lines',
          baseScore: 74,
          printers: ['FDM'],
          materials: ['any'],
          summary: '首层线条宽窄不一，通常比“不粘床”更像 Z 偏移不准或热床补偿还没校到位。',
          firstAction: '先打印一圈首层，边打边用 Baby Step 微调 Z 偏移。',
          clueBonuses: { first_layer_fast: 4, dirty_bed: 3, center_ok_edge_bad: 5, edge_ok_center_bad: 5 },
          clueReasons: {
            center_ok_edge_bad: '边缘和中间差异明显，常常说明热床平面补偿还不一致。',
            edge_ok_center_bad: '中间和边缘表现相反，也是在提示热床网格需要复查。',
          },
        },
        {
          problemId: 'warped-bed',
          baseScore: 68,
          printers: ['FDM'],
          materials: ['any'],
          summary: '如果首层局部过挤、局部悬空，而且问题总出现在固定区域，热床平面误差概率很高。',
          firstAction: '先做床网格调平，重点看异常区域是不是持续偏高或偏低。',
          clueBonuses: { center_ok_edge_bad: 9, edge_ok_center_bad: 9 },
          clueReasons: {
            center_ok_edge_bad: '不同区域差异固定出现时，优先看热床是否局部翘曲。',
            edge_ok_center_bad: '这种空间分布比切片问题更像热床本身不平。',
          },
        },
        {
          problemId: 'first-layer-not-sticking',
          baseScore: 58,
          printers: ['FDM'],
          materials: ['any'],
          summary: '如果线条一边打、一边被带走，也可能是附着不足，而不是纯粹的几何不平。',
          firstAction: '先彻底清洁热床，再把首层速度降到 25% 到 50%。',
          clueBonuses: { dirty_bed: 8, first_layer_fast: 6 },
          clueReasons: {
            dirty_bed: '热床污染会让线条看起来断断续续，尤其是局部沾不住时。',
          },
        },
      ],
    },
    {
      id: 'before-not-sticking',
      label: '第一层直接粘不上热床',
      printers: ['FDM'],
      clues: [
        { id: 'peels_immediately', label: '刚挤出来就被喷嘴带走' },
        { id: 'bed_oily', label: '热床可能有手油或残留' },
        { id: 'cold_room', label: '房间有风或环境偏冷' },
        { id: 'petg_or_abs', label: '正在打 PETG / ABS 这类更挑热床的料' },
      ],
      candidates: [
        {
          problemId: 'first-layer-not-sticking',
          baseScore: 78,
          printers: ['FDM'],
          materials: ['any'],
          summary: '这是最典型的首层附着失败，常见原因就是热床不干净、温度不够或首层节奏太激进。',
          firstAction: '先清洁热床，再把第一层速度降到正常速度的 25% 到 50%。',
          clueBonuses: { peels_immediately: 8, bed_oily: 9, petg_or_abs: 4, cold_room: 4 },
          clueReasons: {
            peels_immediately: '线条刚出来就被带走，是附着力不够的典型表现。',
            bed_oily: '手油和残胶会显著破坏第一层附着。',
          },
        },
        {
          problemId: 'warping',
          baseScore: 63,
          printers: ['FDM'],
          materials: ['any'],
          summary: '如果不是立刻脱，而是打着打着边角掀起，它会更像翘边在前期就已经开始。',
          firstAction: '尝试加 Brim，并检查第一层风扇和热床温度。',
          clueBonuses: { cold_room: 8, petg_or_abs: 5 },
          clueReasons: {
            cold_room: '环境温差大时，边角更容易在初期就开始抬起。',
          },
        },
        {
          problemId: 'cooling-vs-adhesion',
          baseScore: 56,
          printers: ['FDM'],
          materials: ['pla', 'petg', 'abs-asa', 'tpu'],
          summary: '有些情况不是床脏，而是冷却和附着之间的平衡错了，尤其在风扇过早开启时。',
          firstAction: '先把第一层风扇关掉或延后，再观察附着是否明显变好。',
          clueBonuses: { cold_room: 6, petg_or_abs: 3 },
        },
      ],
    },
    {
      id: 'before-resin-platform',
      label: '树脂首层不上平台、总粘 FEP',
      printers: ['SLA'],
      clues: [
        { id: 'winter_resin', label: '树脂和环境温度偏低' },
        { id: 'new_resin', label: '刚换了新树脂或颜色' },
        { id: 'plate_recent', label: '刚换膜或重新装过平台' },
        { id: 'small_supports', label: '底部接触面积很小' },
      ],
      candidates: [
        {
          problemId: 'resin-exposure',
          baseScore: 74,
          printers: ['SLA'],
          materials: ['resin'],
          summary: '树脂首层不上平台时，曝光不足是最常见原因，尤其是换树脂、换颜色之后。',
          firstAction: '先把底层曝光和普通层曝光分别往上小步增加，再做测试片。',
          clueBonuses: { winter_resin: 6, new_resin: 9, small_supports: 3 },
          clueReasons: {
            new_resin: '树脂品牌、颜色一换，曝光窗口往往也会跟着变化。',
          },
        },
        {
          problemId: 'resin-fep-failure',
          baseScore: 66,
          printers: ['SLA'],
          materials: ['resin'],
          summary: '如果之前正常，换膜或拆装后突然粘 FEP，也要高度怀疑膜张力和离型状态。',
          firstAction: '检查 FEP 是否过松、发白、划伤，确认安装张力正常。',
          clueBonuses: { plate_recent: 8, small_supports: 4 },
        },
        {
          problemId: 'resin-warping',
          baseScore: 61,
          printers: ['SLA'],
          materials: ['resin'],
          summary: '如果模型底部接触太小、支撑策略又弱，首层虽然成型，后面也可能被拉脱。',
          firstAction: '先增大底部接触和支撑强度，再考虑调整摆放角度。',
          clueBonuses: { small_supports: 8 },
        },
      ],
    },
  ],
  'first-layer': [
    {
      id: 'layer-warping',
      label: '边角慢慢翘起来',
      printers: ['FDM'],
      clues: [
        { id: 'corners_only', label: '主要是四角先抬起' },
        { id: 'abs_like', label: '正在打 ABS / ASA 这类高收缩料' },
        { id: 'fan_too_early', label: '首层风扇开得太早' },
        { id: 'enclosure_none', label: '机器没有封闭箱' },
      ],
      candidates: [
        {
          problemId: 'warping',
          baseScore: 78,
          printers: ['FDM'],
          materials: ['any'],
          summary: '边角在前几层慢慢翘起，就是标准的翘边模式，热应力和附着不足经常一起出现。',
          firstAction: '先加 Brim，并检查热床温度和首层风扇是不是开太早。',
          clueBonuses: { corners_only: 8, abs_like: 6, fan_too_early: 6, enclosure_none: 5 },
        },
        {
          problemId: 'first-layer-not-sticking',
          baseScore: 63,
          printers: ['FDM'],
          materials: ['any'],
          summary: '如果第一层本来就没坐稳，后面出现翘边只是更晚暴露出来的结果。',
          firstAction: '回头先把首层压实、清洁和速度这几个基础项重新做稳。',
          clueBonuses: { fan_too_early: 3, corners_only: 2 },
        },
        {
          problemId: 'warped-bed',
          baseScore: 57,
          printers: ['FDM'],
          materials: ['any'],
          summary: '若总是固定某一角翘得最厉害，也要排除热床局部高低差。',
          firstAction: '重点检查老是出问题的那几个角是否始终更难压实。',
          clueBonuses: { corners_only: 5 },
        },
      ],
    },
    {
      id: 'layer-elephant',
      label: '底层被压得太宽、像象脚',
      printers: ['FDM'],
      clues: [
        { id: 'only_bottom', label: '只有底部 1 到 3 层明显变胖' },
        { id: 'tight_fit', label: '导致卡扣、孔位都偏紧' },
        { id: 'bed_hot', label: '热床温度开得偏高' },
        { id: 'first_layer_squish', label: '首层压得很扁很亮' },
      ],
      candidates: [
        {
          problemId: 'elephant-foot',
          baseScore: 78,
          printers: ['FDM'],
          materials: ['any'],
          summary: '只在底部几层向外鼓，几乎就是象脚效应，本质上是首层受压或过热。',
          firstAction: '先把 Z 偏移略微抬高一点，再尝试把热床温度降低 5°C。',
          clueBonuses: { only_bottom: 10, tight_fit: 5, bed_hot: 6, first_layer_squish: 8 },
        },
        {
          problemId: 'first-layer-lines',
          baseScore: 60,
          printers: ['FDM'],
          materials: ['any'],
          summary: '如果不只是底部变宽，而是整个首层都很乱，也可能是首层高度根本没校准好。',
          firstAction: '重新打印首层测试，先把线条压实程度调到均匀。',
          clueBonuses: { first_layer_squish: 5 },
        },
        {
          problemId: 'tolerance-calibration',
          baseScore: 53,
          printers: ['FDM'],
          materials: ['any'],
          summary: '如果你最终关心的是配合尺寸，那还需要在基础几何校准之后再做尺寸补偿。',
          firstAction: '首层问题解决后，再打尺寸块看整体误差是否还存在。',
          clueBonuses: { tight_fit: 4 },
        },
      ],
    },
    {
      id: 'layer-bed-shape',
      label: '有的地方太挤，有的地方悬空',
      printers: ['FDM'],
      clues: [
        { id: 'same_region', label: '总是固定区域出问题' },
        { id: 'mesh_old', label: '很久没重做床网格' },
        { id: 'manual_level', label: '只能手拧调平，没有自动补偿' },
        { id: 'glass_or_large_bed', label: '热床面积大或使用玻璃板' },
      ],
      candidates: [
        {
          problemId: 'warped-bed',
          baseScore: 76,
          printers: ['FDM'],
          materials: ['any'],
          summary: '首层表现跟位置强绑定时，热床平面误差通常比切片和耗材更值得优先怀疑。',
          firstAction: '先做床网格调平，确认四角和中间的首层状态是否一致。',
          clueBonuses: { same_region: 10, mesh_old: 6, manual_level: 5, glass_or_large_bed: 4 },
        },
        {
          problemId: 'first-layer-lines',
          baseScore: 67,
          printers: ['FDM'],
          materials: ['any'],
          summary: '如果问题不是固定区域，而是整体都时好时坏，也要回头看 Z 偏移和首层速度。',
          firstAction: '一边打首层测试一边做 Baby Step 微调，排除纯参数问题。',
          clueBonuses: { mesh_old: 2, manual_level: 3 },
        },
        {
          problemId: 'first-layer-not-sticking',
          baseScore: 57,
          printers: ['FDM'],
          materials: ['any'],
          summary: '局部悬空有时也会被床面污染放大，看似不平，实则是附着力分布不均。',
          firstAction: '先清洁热床，再看异常区域是否仍然固定存在。',
          clueBonuses: { same_region: 3 },
        },
      ],
    },
    {
      id: 'layer-resin-peel',
      label: '树脂底层拉断、模型粘在 FEP',
      printers: ['SLA'],
      clues: [
        { id: 'supports_thin', label: '支撑偏细、底座偏小' },
        { id: 'lift_fast', label: '抬升速度比较快' },
        { id: 'cold_resin', label: '树脂偏冷或房间偏冷' },
        { id: 'new_fep', label: '刚换了 FEP 膜' },
      ],
      candidates: [
        {
          problemId: 'resin-fep-failure',
          baseScore: 76,
          printers: ['SLA'],
          materials: ['resin'],
          summary: '底层粘 FEP、拉断时，离型阻力和 FEP 状态往往是头号嫌疑。',
          firstAction: '先检查膜张力、表面状态和抬升动作，再决定是否调曝光。',
          clueBonuses: { new_fep: 9, lift_fast: 6, supports_thin: 3 },
        },
        {
          problemId: 'resin-exposure',
          baseScore: 68,
          printers: ['SLA'],
          materials: ['resin'],
          summary: '如果树脂底层本身强度不够，被拉起时就更容易断开。',
          firstAction: '把底层曝光先往上调一档，再做小面积测试。',
          clueBonuses: { cold_resin: 6, supports_thin: 2 },
        },
        {
          problemId: 'resin-warping',
          baseScore: 60,
          printers: ['SLA'],
          materials: ['resin'],
          summary: '摆放角度和支撑结构太弱时，模型也可能在前几层就被拉变形。',
          firstAction: '增加底部支撑和接触面积，重新安排摆放角度。',
          clueBonuses: { supports_thin: 8 },
        },
      ],
    },
  ],
  'mid-print': [
    {
      id: 'mid-shift',
      label: '某一层突然整体错位',
      printers: ['FDM'],
      clues: [
        { id: 'fast_print', label: '打印速度或加速度设得很高' },
        { id: 'one_axis', label: '只在 X 或 Y 单一方向偏移' },
        { id: 'collision', label: '听到喷嘴撞到模型' },
        { id: 'belt_loose', label: '皮带摸起来偏松' },
      ],
      candidates: [
        {
          problemId: 'layer-shift',
          baseScore: 80,
          printers: ['FDM'],
          materials: ['any'],
          summary: '单层或某几层突然整体错位，是最典型的层移表现，通常和皮带、碰撞、加速度直接相关。',
          firstAction: '先查皮带张力和喷嘴是否会撞模型，再考虑降速度和加速度。',
          clueBonuses: { fast_print: 6, one_axis: 8, collision: 9, belt_loose: 9 },
        },
        {
          problemId: 'motor-stall',
          baseScore: 66,
          printers: ['FDM'],
          materials: ['any'],
          summary: '如果不是偶发，而是高速段频繁丢步，也要考虑电机负载过高或电流设置不合适。',
          firstAction: '排除皮带后，继续检查电机温度、电流和驱动散热。',
          clueBonuses: { fast_print: 8, one_axis: 4 },
        },
        {
          problemId: 'printing-noise',
          baseScore: 54,
          printers: ['FDM'],
          materials: ['any'],
          summary: '若层移前伴随异常噪音、震动增加，也可以顺手排查机械阻力和润滑状态。',
          firstAction: '观察异常噪音是否只发生在某一轴或某一段运动路径。',
          clueBonuses: { collision: 3, belt_loose: 2 },
        },
      ],
    },
    {
      id: 'mid-spaghetti',
      label: '模型倒了，开始打意大利面',
      printers: ['FDM'],
      clues: [
        { id: 'base_detached', label: '底部已经脱离热床' },
        { id: 'tall_model', label: '模型比较高或比较细' },
        { id: 'support_failed', label: '看起来像支撑先倒了' },
        { id: 'long_print', label: '这是个很长时间的打印任务' },
      ],
      candidates: [
        {
          problemId: 'spaghetti',
          baseScore: 79,
          printers: ['FDM'],
          materials: ['any'],
          summary: '模型一旦脱落而机器继续运动，就会迅速进入“意大利面”状态，这是结果性最强的一类失败。',
          firstAction: '先立刻停机，清理喷嘴和热床，再回查脱落前那一层的附着和碰撞。',
          clueBonuses: { base_detached: 10, tall_model: 4, support_failed: 5, long_print: 3 },
        },
        {
          problemId: 'warping',
          baseScore: 60,
          printers: ['FDM'],
          materials: ['any'],
          summary: '如果是底部先慢慢翘起，后面才整体被带倒，根因仍可能是早期翘边埋下的隐患。',
          firstAction: '检查失败件底部是否已经明显变形、边角抬起。',
          clueBonuses: { base_detached: 6 },
        },
        {
          problemId: 'support-optimization',
          baseScore: 56,
          printers: ['FDM', 'SLA'],
          materials: ['any', 'resin'],
          summary: '若倒塌从悬空面或支撑区开始，支撑布局和密度本身就是重点排查方向。',
          firstAction: '回看切片预览，确认失败位置的支撑是否过少或接触太弱。',
          clueBonuses: { support_failed: 9, tall_model: 3 },
        },
      ],
    },
    {
      id: 'mid-clicking',
      label: '挤出机咔咔响、出丝越来越差',
      printers: ['FDM'],
      clues: [
        { id: 'retraction_heavy', label: '回抽设得比较激进' },
        { id: 'temp_low', label: '喷嘴温度压得很低' },
        { id: 'after_long_print', label: '通常长时间打印后才出现' },
        { id: 'soft_filament', label: '正在打 TPU 或偏软的料' },
      ],
      candidates: [
        {
          problemId: 'extruder-clicking',
          baseScore: 78,
          printers: ['FDM'],
          materials: ['any'],
          summary: '“咔咔响 + 出丝变差”说明送丝阻力已经超过挤出机极限，本身就是一个很强的独立信号。',
          firstAction: '先检查喷嘴是否部分堵塞，再确认温度和回抽是不是过激。',
          clueBonuses: { retraction_heavy: 6, temp_low: 6, after_long_print: 4, soft_filament: 4 },
        },
        {
          problemId: 'clogged-nozzle',
          baseScore: 69,
          printers: ['FDM'],
          materials: ['any'],
          summary: '如果点挤也不顺畅，或者挤出明显变细，喷嘴堵塞仍是非常高概率的根因。',
          firstAction: '先做冷拔或更换喷嘴，确认问题是否立刻缓解。',
          clueBonuses: { temp_low: 5, after_long_print: 5 },
        },
        {
          problemId: 'heat-creep',
          baseScore: 60,
          printers: ['FDM'],
          materials: ['pla', 'tpu'],
          summary: '长时间打印后越来越糟、特别是在 PLA 上，很像热蠕变让耗材在热断区提前变软卡住。',
          firstAction: '检查热端散热和风扇，确认热量没有向上爬。',
          clueBonuses: { after_long_print: 8, soft_filament: 3 },
        },
      ],
    },
    {
      id: 'mid-resin-drop',
      label: '树脂件半路脱落、底部开裂',
      printers: ['SLA'],
      clues: [
        { id: 'hollow_model', label: '模型中空或大平面很多' },
        { id: 'large_cross', label: '某些层截面积突然很大' },
        { id: 'supports_weak', label: '支撑感觉偏少或偏细' },
        { id: 'thick_resin', label: '树脂比较黏或天气较冷' },
      ],
      candidates: [
        {
          problemId: 'resin-suction-cup',
          baseScore: 77,
          printers: ['SLA'],
          materials: ['resin'],
          summary: '中空件或大平面在树脂打印中容易形成吸盘效应，拉力一大就会半路脱落。',
          firstAction: '先检查是否存在吸盘腔体，并增加泄压孔或调整摆放角度。',
          clueBonuses: { hollow_model: 10, large_cross: 8, thick_resin: 3 },
        },
        {
          problemId: 'resin-warping',
          baseScore: 66,
          printers: ['SLA'],
          materials: ['resin'],
          summary: '如果支撑不均或模型受力不平衡，也会在中段逐渐拉裂、翘曲后掉落。',
          firstAction: '增强关键受力区域的支撑，并避免长悬臂独自受力。',
          clueBonuses: { supports_weak: 8, large_cross: 4 },
        },
        {
          problemId: 'resin-exposure',
          baseScore: 59,
          printers: ['SLA'],
          materials: ['resin'],
          summary: '层间强度不足时，模型虽然能起步，但在中段受力变大后会出现开裂或脱落。',
          firstAction: '适度提高曝光并用小测试件验证层间强度。',
          clueBonuses: { thick_resin: 5 },
        },
      ],
    },
  ],
  surface: [
    {
      id: 'surface-stringing',
      label: '模型之间到处拉丝',
      printers: ['FDM'],
      clues: [
        { id: 'popping_sound', label: '打印时有噼啪爆裂声' },
        { id: 'travel_worse', label: '跨空走线越多越严重' },
        { id: 'stored_long', label: '耗材开封很久了' },
        { id: 'high_temp_profile', label: '当前温度设得偏高' },
      ],
      candidates: [
        {
          problemId: 'stringing',
          baseScore: 74,
          printers: ['FDM'],
          materials: ['pla', 'petg', 'tpu', 'any'],
          summary: '空移时出现细丝，第一怀疑永远是温度、回抽和走线路径没有配平。',
          firstAction: '先降喷嘴温度 5°C，再小步增加回抽做测试。',
          clueBonuses: { travel_worse: 8, high_temp_profile: 7, stored_long: 3 },
        },
        {
          problemId: 'wet-filament',
          baseScore: 70,
          printers: ['FDM'],
          materials: ['pla', 'petg', 'tpu', 'abs-asa'],
          summary: '如果拉丝还伴随噼啪声、表面起泡，那根因会更偏向耗材受潮。',
          firstAction: '先把耗材烘干，再用同一份切片重新打对比件。',
          clueBonuses: { popping_sound: 10, stored_long: 8, high_temp_profile: 2 },
        },
        {
          problemId: 'petg-stringing',
          baseScore: 65,
          printers: ['FDM'],
          materials: ['petg'],
          summary: '如果你正在打 PETG，它天生就比 PLA 更容易拉丝，需要更保守地调温度和回抽。',
          firstAction: '在 PETG 上先别追求极高速度，优先把温度和 travel 调顺。',
          clueBonuses: { high_temp_profile: 5, travel_worse: 4 },
        },
      ],
    },
    {
      id: 'surface-blobs',
      label: '表面有疙瘩、接缝鼓包',
      printers: ['FDM'],
      clues: [
        { id: 'same_spot', label: '总在同一竖直接缝位置出现' },
        { id: 'high_speed_corner', label: '高速转角处最明显' },
        { id: 'pause_hiccup', label: '机器偶尔有短暂停顿' },
        { id: 'after_retract', label: '每次回抽切换后更明显' },
      ],
      candidates: [
        {
          problemId: 'blobs-zits',
          baseScore: 77,
          printers: ['FDM'],
          materials: ['any'],
          summary: '表面随机小疙瘩大多和压力释放、接缝停顿或回抽切换不顺有关。',
          firstAction: '先检查切片中的接缝位置和回抽，再观察机器有没有短暂停顿。',
          clueBonuses: { same_spot: 6, pause_hiccup: 8, after_retract: 7, high_speed_corner: 4 },
        },
        {
          problemId: 'seam-visible',
          baseScore: 66,
          printers: ['FDM'],
          materials: ['any'],
          summary: '如果疙瘩几乎全都长在同一条竖线，它更像接缝位置策略暴露了自己。',
          firstAction: '调整接缝位置模式，看看问题是否从一条线转移或减轻。',
          clueBonuses: { same_spot: 10, after_retract: 3 },
        },
        {
          problemId: 'pressure-advance',
          baseScore: 63,
          printers: ['FDM'],
          materials: ['any'],
          summary: '高速转角鼓包明显时，说明喷嘴内压力补偿可能还没调到位。',
          firstAction: '打印 PA / LA 测试塔，先看转角鼓包是否能被明显压下去。',
          clueBonuses: { high_speed_corner: 10, pause_hiccup: 2 },
        },
      ],
    },
    {
      id: 'surface-size',
      label: '尺寸不准，孔太紧或外形偏大',
      printers: ['FDM'],
      clues: [
        { id: 'outer_big', label: '外形整体偏大' },
        { id: 'holes_small', label: '孔位总是偏小' },
        { id: 'material_switch', label: '换了材料或品牌后更明显' },
        { id: 'flow_suspect', label: '怀疑流量一直偏多或偏少' },
      ],
      candidates: [
        {
          problemId: 'tolerance-calibration',
          baseScore: 76,
          printers: ['FDM'],
          materials: ['any'],
          summary: '尺寸问题大多数不是单点 bug，而是流量、步进和几何补偿没有一起对齐。',
          firstAction: '先打 20mm 校准块量尺寸，再调 Flow Rate 和 XY 步进。',
          clueBonuses: { outer_big: 6, holes_small: 7, flow_suspect: 6, material_switch: 3 },
        },
        {
          problemId: 'shrinkage-tolerance',
          baseScore: 67,
          printers: ['FDM'],
          materials: ['pla', 'petg', 'abs-asa', 'tpu'],
          summary: '如果是换材料后才明显偏差，材料收缩率和孔径补偿更值得重点看。',
          firstAction: '按当前材料重新测一块尺寸件，再单独做收缩补偿。',
          clueBonuses: { material_switch: 9, holes_small: 5 },
        },
        {
          problemId: 'estep-calibration',
          baseScore: 61,
          printers: ['FDM'],
          materials: ['any'],
          summary: '如果尺寸误差在很多模型上都系统性复现，那挤出机基础 E 步也要回头校一遍。',
          firstAction: '先验证 100mm 挤出是否准确，再继续微调流量。',
          clueBonuses: { flow_suspect: 8, outer_big: 3 },
        },
      ],
    },
    {
      id: 'surface-top-rough',
      label: '顶面发毛、有孔洞或表面很糙',
      printers: ['FDM'],
      clues: [
        { id: 'few_top_layers', label: '顶层层数设置可能偏少' },
        { id: 'underextrude_feel', label: '整体看起来像欠挤' },
        { id: 'wet_sound', label: '伴随受潮那种爆裂声' },
        { id: 'large_flat_top', label: '大平面顶面最明显' },
      ],
      candidates: [
        {
          problemId: 'top-surface-rough',
          baseScore: 75,
          printers: ['FDM'],
          materials: ['any'],
          summary: '顶面粗糙、遮不住下方填充时，最先要看顶层厚度、流量和铺展是否够用。',
          firstAction: '先增加顶层层数，再适度检查流量和顶面速度。',
          clueBonuses: { few_top_layers: 10, large_flat_top: 5, underextrude_feel: 4 },
        },
        {
          problemId: 'under-extrusion',
          baseScore: 67,
          printers: ['FDM'],
          materials: ['any'],
          summary: '如果不只是顶面，连外壁也有稀疏感，那真正的根因更可能是系统性欠挤出。',
          firstAction: '检查喷嘴、送丝器和温度，确认是不是整体供料不足。',
          clueBonuses: { underextrude_feel: 9, large_flat_top: 3 },
        },
        {
          problemId: 'wet-filament',
          baseScore: 59,
          printers: ['FDM'],
          materials: ['pla', 'petg', 'tpu', 'abs-asa'],
          summary: '受潮时顶面也会发毛、起泡和不连贯，只是容易被误认成单纯的流量问题。',
          firstAction: '先烘干耗材，再观察顶面闭合是否明显改善。',
          clueBonuses: { wet_sound: 10 },
        },
      ],
    },
    {
      id: 'surface-resin-detail',
      label: '树脂细节丢失、表面发软发糊',
      printers: ['SLA'],
      clues: [
        { id: 'tiny_features', label: '主要丢的是细小文字或尖角' },
        { id: 'wash_long', label: '清洗或二次固化时间偏长' },
        { id: 'new_resin_color', label: '换了颜色更深或更浅的树脂' },
        { id: 'soft_touch', label: '摸起来偏软、边缘不利落' },
      ],
      candidates: [
        {
          problemId: 'missing-thin-details',
          baseScore: 76,
          printers: ['SLA'],
          materials: ['resin'],
          summary: '细节丢失时，最常见是最小特征超出工艺极限，或切片和摆放方式没照顾到这些小结构。',
          firstAction: '先检查摆放角度和最小特征尺寸，再确认切片层高与抗锯齿设置。',
          clueBonuses: { tiny_features: 10, soft_touch: 3 },
        },
        {
          problemId: 'resin-exposure',
          baseScore: 69,
          printers: ['SLA'],
          materials: ['resin'],
          summary: '曝光不合适时，细节会发糊、边缘变钝，换树脂颜色后尤其容易发生。',
          firstAction: '重新打曝光测试片，不要沿用旧树脂的参数。',
          clueBonuses: { new_resin_color: 9, soft_touch: 6 },
        },
        {
          problemId: 'resin-wash-cure',
          baseScore: 58,
          printers: ['SLA'],
          materials: ['resin'],
          summary: '如果成型时还行，但洗完或固化后发软变形，后处理节奏也可能是罪魁祸首。',
          firstAction: '缩短清洗和固化时间，避免过洗或固化不均。',
          clueBonuses: { wash_long: 10, soft_touch: 4 },
        },
      ],
    },
  ],
}

const selectedDiagStage = ref(DIAG_STAGES[0].id)
const selectedDiagPrinter = ref('all')
const selectedDiagMaterial = ref('any')
const selectedSymptomId = ref('')
const selectedClueIds = ref([])

const allProblems = computed(() => getAllProblemSummaries(userProblems.value))
const problemsById = computed(() => new Map(allProblems.value.map((problem) => [problem.id, problem])))

function selectDiagStage(stageId) {
  selectedDiagStage.value = stageId
  diagnosisListFilterActive.value = true
}

function activateWorkbench(mode, shouldScroll = true) {
  workbenchMode.value = mode
  if (mode === 'search') diagnosisListFilterActive.value = false
  else if (mode === 'diagnosis' && topDiagnosis.value) diagnosisListFilterActive.value = true
  if (shouldScroll) {
    document.getElementById('workbench')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function stageLabel(stageId) {
  return DIAG_STAGES.find((stage) => stage.id === stageId)?.label || stageId || ''
}

function materialMatches(candidateMaterials = [], selectedMaterial) {
  return candidateMaterials.includes('any') || candidateMaterials.includes(selectedMaterial)
}

function printerMatches(candidatePrinters = [], selectedPrinter) {
  return selectedPrinter === 'all' || candidatePrinters.includes(selectedPrinter)
}

function scoreTone(score) {
  if (score >= 88) return { tone: 'high', label: '高匹配' }
  if (score >= 76) return { tone: 'mid', label: '较高匹配' }
  return { tone: 'soft', label: '可疑候选' }
}

const currentSymptoms = computed(() =>
  (DIAGNOSIS_MAP[selectedDiagStage.value] || []).filter((symptom) =>
    selectedDiagPrinter.value === 'all' || symptom.printers.includes(selectedDiagPrinter.value)
  )
)

const currentSymptom = computed(() =>
  currentSymptoms.value.find((item) => item.id === selectedSymptomId.value) || currentSymptoms.value[0] || null
)

const currentClues = computed(() => currentSymptom.value?.clues || [])

watch(currentSymptoms, (symptoms) => {
  if (!symptoms.length) {
    selectedSymptomId.value = ''
    selectedClueIds.value = []
    return
  }
  if (!symptoms.some((symptom) => symptom.id === selectedSymptomId.value)) {
    selectedSymptomId.value = symptoms[0].id
  }
}, { immediate: true })

watch(currentSymptom, () => {
  selectedClueIds.value = []
})

watch(workbenchMode, (mode) => {
  if (mode === 'search') diagnosisListFilterActive.value = false
  else if (mode === 'diagnosis' && topDiagnosis.value) diagnosisListFilterActive.value = true
})

const currentStageLabel = computed(() =>
  DIAG_STAGES.find((stage) => stage.id === selectedDiagStage.value)?.label || ''
)

function toggleDiagClue(clueId) {
  const next = new Set(selectedClueIds.value)
  if (next.has(clueId)) next.delete(clueId)
  else next.add(clueId)
  selectedClueIds.value = [...next]
  diagnosisListFilterActive.value = true
}

function resetDiagnosis() {
  selectedDiagStage.value = DIAG_STAGES[0].id
  selectedDiagPrinter.value = 'all'
  selectedDiagMaterial.value = 'any'
  selectedClueIds.value = []
  workbenchMode.value = 'diagnosis'
  diagnosisListFilterActive.value = true
}

const rankedDiagnoses = computed(() => {
  if (!currentSymptom.value) return []

  return currentSymptom.value.candidates
    .map((candidate) => {
      const problem = problemsById.value.get(candidate.problemId)
      if (!problem) return null

      let score = candidate.baseScore
      const matchedReasons = [candidate.summary]

      if (selectedDiagPrinter.value !== 'all' && printerMatches(candidate.printers, selectedDiagPrinter.value)) {
        score += 6
        matchedReasons.push(`更符合 ${selectedDiagPrinter.value} 机型常见的故障表现。`)
      }

      if (selectedDiagMaterial.value !== 'any' && materialMatches(candidate.materials, selectedDiagMaterial.value)) {
        score += 5
        const materialLabel = DIAG_MATERIALS.find((item) => item.id === selectedDiagMaterial.value)?.label || selectedDiagMaterial.value
        matchedReasons.push(`在 ${materialLabel} 这类材料上也很常见。`)
      }

      selectedClueIds.value.forEach((clueId) => {
        if (candidate.clueBonuses?.[clueId]) {
          score += candidate.clueBonuses[clueId]
          matchedReasons.push(candidate.clueReasons?.[clueId] || `与你补充的线索更吻合。`)
        }
      })

      const { tone, label } = scoreTone(score)
      const candidateMeta = CANDIDATE_META_BY_PROBLEM[candidate.problemId] || {}

      return {
        problem,
        score,
        tone,
        matchLabel: label,
        summary: candidate.summary,
        firstAction: candidate.firstAction,
        checkOrder: candidate.checkOrder || candidateMeta.checkOrder || '先排基础项',
        timeEstimate: candidate.timeEstimate || candidateMeta.timeEstimate || '约 5-10 分钟',
        matchedReasons: [...new Set(matchedReasons)].slice(0, 4),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
})

const topDiagnosis = computed(() => rankedDiagnoses.value[0] || null)
const alternativeDiagnoses = computed(() => rankedDiagnoses.value.slice(1))
const diagnosisProblemIds = computed(() => rankedDiagnoses.value.map((item) => item.problem.id))
const diagnosisProblemMetaMap = computed(() =>
  new Map(
    rankedDiagnoses.value.map((item, index) => [
      item.problem.id,
      {
        rank: index + 1,
        tone: item.tone,
        matchLabel: item.matchLabel,
        reason: item.matchedReasons[1] || item.matchedReasons[0] || item.summary,
      },
    ])
  )
)

const workbenchTitle = computed(() => {
  if (workbenchMode.value === 'search') return t('p.modeSearchTitle')
  return t('p.modeDiagnosisTitle')
})

const workbenchDesc = computed(() => {
  if (workbenchMode.value === 'search') return t('p.modeSearchDesc')
  return t('p.modeDiagnosisDesc')
})

const categories = computed(() => {
  const cats = allProblems.value.map(p => p.category).filter(Boolean)
  return ['全部', ...new Set(cats)]
})

const filteredProblems = computed(() => libraryItems.value)
const diagnosisLinkedProblems = computed(() => libraryItems.value)
const displayProblems = computed(() => libraryItems.value)
const totalPages = computed(() => Math.max(1, Math.ceil(libraryTotal.value / pageSize)))
const paginatedProblems = computed(() => libraryItems.value)

const visiblePageNumbers = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const start = Math.max(1, current - 2)
  const end = Math.min(total, start + 4)
  const adjustedStart = Math.max(1, end - 4)
  return Array.from({ length: end - adjustedStart + 1 }, (_, i) => adjustedStart + i)
})

const hasActiveSearchFilters = computed(() =>
  !!searchQuery.value.trim() ||
  activeCategory.value !== '全部' ||
  activePrinterType.value !== '全部' ||
  showFavOnly.value
)

function resetSearchFilters() {
  searchQuery.value = ''
  activeCategory.value = '全部'
  activePrinterType.value = '全部'
  showFavOnly.value = false
  currentPage.value = 1
}

function activeDiagnosisMeta(problemId) {
  if (!diagnosisListFilterActive.value) return null
  return diagnosisProblemMetaMap.value.get(problemId) || null
}

async function loadLibraryPage() {
  libraryLoading.value = true
  try {
    const requestedPage = currentPage.value
    const result = await searchProblemLibrary({
      page: requestedPage,
      pageSize,
      query: searchQuery.value,
      category: activeCategory.value,
      printerType: activePrinterType.value,
      showFavOnly: showFavOnly.value,
      favoriteIds: [...favorites.value],
      problemIds: diagnosisListFilterActive.value ? diagnosisProblemIds.value : [],
      orderedIds: diagnosisListFilterActive.value ? diagnosisProblemIds.value : [],
      extraItems: userProblems.value,
    })
    libraryItems.value = result.items
    libraryTotal.value = result.total
    const maxPage = Math.max(1, Math.ceil(result.total / pageSize))
    if (requestedPage > maxPage && currentPage.value === requestedPage) {
      currentPage.value = maxPage
      return
    }
  } finally {
    libraryLoading.value = false
  }
}

watch(
  [
    currentPage,
    activeCategory,
    activePrinterType,
    searchQuery,
    showFavOnly,
    diagnosisListFilterActive,
    diagnosisProblemIds,
    userProblems,
  ],
  () => {
    loadLibraryPage()
  },
  { deep: true }
)

watch(
  [activeCategory, activePrinterType, searchQuery, showFavOnly, diagnosisListFilterActive, diagnosisProblemIds],
  () => {
    if (currentPage.value !== 1) currentPage.value = 1
  },
  { deep: true }
)

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

</script>

<style scoped>
.problems-page {
  --page-bg: #f3f5f8;
  --panel-bg: rgba(255, 255, 255, 0.72);
  --panel-strong: #ffffff;
  --panel-soft: rgba(255, 255, 255, 0.58);
  --line: rgba(255, 255, 255, 0.54);
  --line-strong: rgba(131, 147, 255, 0.18);
  --text-main: #15181f;
  --text-soft: #69727f;
  --text-dim: #97a0ac;
  --accent-blue: #7c90ff;
  --accent-teal: #8fb9ff;
  --accent-orange: #d6a46c;
  --accent-red: #d1857b;
  --accent-green: #7daf8e;
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(134, 150, 255, 0.13), transparent 26%),
    linear-gradient(180deg, #fbfbfd 0%, #f4f6f9 48%, #eef2f6 100%);
  color: var(--text-main);
  font-family: "SF Pro Display","PingFang SC","Helvetica Neue",sans-serif;
}

.hero {
  padding: 68px 24px 44px;
  text-align: center;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 18%, rgba(61, 127, 255, 0.2), transparent 24%),
    radial-gradient(circle at 82% 22%, rgba(31, 199, 216, 0.16), transparent 22%),
    linear-gradient(135deg, #0d1624 0%, #132238 54%, #173054 100%) !important;
  border-bottom: none !important;
}
.hero::before {
  content: '';
  position: absolute;
  inset: 24px 24px auto;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(154, 191, 255, 0.4) 50%, transparent 100%);
  z-index: 2;
}
.hero-inner {
  max-width: 820px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}
.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  letter-spacing: 0.22em;
  color: rgba(167, 193, 232, 0.96) !important;
  margin-bottom: 18px;
  text-transform: uppercase;
}
.hero-eyebrow::before,
.hero-eyebrow::after {
  content: '';
  display: inline-block;
  width: 34px;
  height: 1px;
  background: rgba(154, 191, 255, 0.26);
}
.hero-title {
  font-size: clamp(2.5rem, 6vw, 4.3rem);
  font-weight: 760;
  line-height: 1.04;
  letter-spacing: -0.045em;
  margin-bottom: 16px;
  color: #f5f9ff !important;
  text-shadow: 0 12px 40px rgba(0, 0, 0, 0.24);
}
.hero-title em {
  font-style: normal;
  color: transparent;
  background: linear-gradient(135deg, #dff0ff 0%, #8fc0ff 38%, #87a1ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-total {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin: 0 auto 18px;
  padding: 10px 16px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(14, 23, 38, 0.68) 0%, rgba(21, 37, 59, 0.6) 100%) !important;
  border: 1px solid rgba(151, 188, 247, 0.22) !important;
  backdrop-filter: blur(22px);
  box-shadow: 0 18px 40px rgba(5, 12, 24, 0.24);
}
.hero-total-label {
  font-size: 11px;
  letter-spacing: 0.12em;
  color: rgba(177, 203, 240, 0.82) !important;
  font-weight: 700;
  text-transform: uppercase;
}
.hero-total-value {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  font-family: "SF Mono","Menlo","Roboto Mono","Consolas",monospace;
}
.hero-total-value strong {
  font-size: clamp(1.45rem, 3vw, 2rem);
  line-height: 1;
  letter-spacing: -0.04em;
  color: #ffffff !important;
}
.hero-total-value span {
  font-size: 13px;
  font-weight: 700;
  color: rgba(212, 227, 250, 0.84) !important;
}
.hero-desc {
  font-size: 15px;
  color: rgba(223, 234, 247, 0.86) !important;
  line-height: 1.8;
  margin: 0 auto 22px;
  max-width: 660px;
}
.hero-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0 auto 18px;
  max-width: 760px;
}
.hero-path-btn {
  text-align: left;
  padding: 18px 18px 17px;
  border-radius: 22px;
  border: 1px solid rgba(106, 189, 255, 0.28);
  background:
    linear-gradient(135deg, rgba(17, 57, 122, 0.96) 0%, rgba(22, 124, 183, 0.92) 100%);
  color: #f4f8ff !important;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  backdrop-filter: blur(18px);
  box-shadow: 0 16px 30px rgba(8, 34, 79, 0.24);
}
.hero-path-btn:hover {
  transform: translateY(-2px);
  border-color: rgba(172, 220, 255, 0.44);
  box-shadow: 0 18px 32px rgba(8, 34, 79, 0.32);
}
.hero-path-btn.primary {
  background:
    linear-gradient(135deg, rgba(36, 104, 247, 0.98) 0%, rgba(50, 165, 228, 0.92) 100%);
  border-color: rgba(211, 235, 255, 0.42);
  box-shadow: 0 18px 34px rgba(22, 98, 228, 0.34);
}
.hero-path-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 6px;
  letter-spacing: -0.01em;
  color: inherit;
}
.hero-path-sub {
  display: block;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(232, 241, 251, 0.86) !important;
}
.share-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  background: linear-gradient(135deg, rgba(239, 247, 255, 0.96) 0%, rgba(224, 236, 255, 0.94) 100%);
  color: #f4f7ff;
  border: 1px solid rgba(171, 198, 241, 0.28);
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  color: #173054 !important;
  box-shadow: 0 18px 36px rgba(7, 17, 34, 0.16);
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
}
.share-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 20px 40px rgba(7, 17, 34, 0.2);
  border-color: rgba(171, 198, 241, 0.4);
}

/* 背景滚动标题 */
.hero-bg-scroll { position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; justify-content: space-around; pointer-events: none; overflow: hidden; }
.scroll-row { display: flex; align-items: center; gap: 32px; white-space: nowrap; will-change: transform; }
.scroll-tag {
  color: rgba(180, 205, 238, 0.36);
  font-weight: 700;
  letter-spacing: -0.02em;
  flex-shrink: 0;
  text-shadow: 0 0 24px rgba(99, 142, 222, 0.08);
}

.row-1 { animation: marquee-left 22s linear infinite; }
.row-2 { animation: marquee-right 30s linear infinite; }
.row-3 { animation: marquee-left 18s linear infinite; }
.row-4 { animation: marquee-right 26s linear infinite; }

@keyframes marquee-left  { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes marquee-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }

.workbench-section {
  padding: 18px 24px 8px;
  margin-top: 10px;
}
.workbench-shell {
  max-width: 1220px;
  margin: 0 auto;
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
  backdrop-filter: none;
  position: relative;
  overflow: visible;
}
.workbench-shell::before {
  display: none;
}
.workbench-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding: 4px 4px 0;
}
.workbench-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #6d7da0;
  margin-bottom: 6px;
}
.workbench-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #152033 !important;
}
.workbench-subtitle {
  font-size: 15px;
  color: #2a5dd4 !important;
  margin-top: 10px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.workbench-desc {
  font-size: 13px;
  color: #55657f !important;
  line-height: 1.7;
  margin-top: 6px;
  max-width: 560px;
}
.workbench-switch {
  display: inline-flex;
  padding: 4px;
  border-radius: 20px;
  background: #eef4fb;
  border: 1px solid #d7e2f3;
  backdrop-filter: blur(18px);
}
.workbench-tab {
  border: none;
  background: transparent;
  color: #62748f;
  padding: 10px 18px;
  border-radius: 16px;
  font-size: 13px;
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
}
.workbench-tab.active {
  background: linear-gradient(135deg, #215ed3 0%, #1f87d0 100%);
  color: #f8fbff;
  box-shadow: 0 10px 20px rgba(38, 93, 210, 0.22);
}
.workbench-head.compact {
  align-items: flex-start;
}
.mobile-diagnosis-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.mobile-diagnosis-head {
  display: none;
}
.mobile-diagnosis-kicker {
  display: inline-flex;
  align-items: center;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(33, 94, 211, 0.1);
  color: #215ed3;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}
.mobile-diagnosis-title {
  margin: 0 0 6px;
  font-size: 18px;
  line-height: 1.35;
  color: var(--text-main);
}
.mobile-diagnosis-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.68;
  color: var(--text-soft);
}
.mobile-diagnosis-back {
  border: none;
  background: transparent;
  color: #5d6ad4;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
}
.workbench-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 250, 255, 0.96) 100%);
  border: 1px solid rgba(214, 226, 244, 0.9);
  border-radius: 20px;
  padding: 22px;
  position: relative;
  z-index: 1;
  backdrop-filter: blur(22px);
}
.search-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.search-main-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.search-wrap-wide {
  max-width: none;
  min-width: min(100%, 320px);
}
.search-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}
.clear-filters-btn {
  border: none;
  background: transparent;
  color: #6370d8;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}
.filters-inline {
  gap: 10px;
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8fbff;
  border: 1px solid #d8e4f4;
  border-radius: 16px;
  padding: 11px 14px;
  flex: 1;
  min-width: 180px;
  max-width: 280px;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  backdrop-filter: blur(18px);
}
.search-wrap.focused {
  background: #ffffff;
  border-color: rgba(42, 109, 244, 0.34);
  box-shadow: 0 0 0 4px rgba(42, 109, 244, 0.08);
}
.search-icon { color: var(--text-dim); flex-shrink: 0; transition: color 0.2s; }
.search-wrap.focused .search-icon { color: var(--accent-blue); }
.search-input { background: transparent; border: none; outline: none; color: var(--text-main); font-size: 14px; font-family: inherit; flex: 1; min-width: 0; }
.search-input::placeholder { color: var(--text-dim); }
.search-clear { background: transparent; border: none; color: var(--text-dim); cursor: pointer; padding: 0; display: flex; align-items: center; flex-shrink: 0; transition: color 0.15s; }
.search-clear:hover { color: var(--text-soft); }

.filters { display: flex; flex-direction: column; gap: 8px; }
.filter-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.filter-row-label { font-size: 11px; color: var(--text-dim); font-weight: 700; letter-spacing: 0.08em; white-space: nowrap; width: 24px; flex-shrink: 0; text-transform: uppercase; }
.filter-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-btn {
  background: #f4f8fc;
  border: 1px solid #dce6f3;
  color: #5b6b83;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.18s;
  font-family: inherit;
  white-space: nowrap;
  backdrop-filter: blur(18px);
}
.filter-btn:hover { border-color: rgba(42, 109, 244, 0.26); color: var(--text-main); }
.filter-btn.active {
  background: linear-gradient(135deg, rgba(42, 109, 244, 0.14) 0%, rgba(24, 184, 216, 0.1) 100%);
  border-color: rgba(42, 109, 244, 0.22);
  color: #194ea9;
  font-weight: 700;
}
.fav-filter-btn { display: flex; align-items: center; gap: 5px; }
.fav-filter-btn.active { background: linear-gradient(135deg, rgba(252, 244, 238, 0.98) 0%, rgba(255, 250, 246, 0.98) 100%); border-color: rgba(240, 163, 91, 0.3); color: #9b6232; }
.fav-count { background: rgba(255,255,255,0.3); border-radius: 100px; padding: 1px 6px; font-size: 11px; font-weight: 600; }

.legend { display: flex; gap: 10px; flex-wrap: wrap; }
.legend-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #aeaeb2; white-space: nowrap; }
.dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.dot-normal   { background: #6e6e73; }
.dot-urgent   { background: #e03131; }
.dot-warn     { background: #7048e8; }
.dot-advanced { background: #1971c2; }
.result-count { margin-left: auto; font-size: 12px; color: var(--text-dim); white-space: nowrap; }
.result-count.static { margin-left: 0; }

.diagnosis-section { padding: 24px 24px 8px; }
.diagnosis-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(280px, 0.72fr) minmax(0, 1.28fr);
  gap: 14px;
}
.diagnosis-copy,
.diagnosis-panel {
  background: #fff;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 24px;
  padding: 22px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.05);
}
.diagnosis-copy {
  background:
    radial-gradient(circle at top right, rgba(255, 107, 107, 0.14), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #fbfbfb 100%);
}
.diagnosis-kicker {
  display: inline-block;
  padding: 5px 10px;
  border-radius: 999px;
  background: #1d1d1f;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}
.diagnosis-title {
  font-size: clamp(24px, 3.6vw, 34px);
  line-height: 1.08;
  letter-spacing: -0.04em;
  margin-bottom: 14px;
}
.diagnosis-desc {
  color: #6e6e73;
  font-size: 14px;
  line-height: 1.75;
}
.diagnosis-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.diagnosis-panel-home {
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}
.diag-step {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.diag-label {
  font-size: 12px;
  font-weight: 700;
  color: #53647d;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.diag-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.diag-options.compact { margin-top: 8px; }
.diag-option {
  border: 1px solid #d8e3f3;
  background: #f7faff;
  color: #5b6b82;
  padding: 9px 14px;
  border-radius: 14px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, color 0.15s ease;
  backdrop-filter: blur(18px);
}
.diag-option.soft {
  background: #f7faff;
  color: #5b6b82;
}
.diag-option:hover {
  transform: translateY(-1px);
  border-color: rgba(42, 109, 244, 0.24);
}
.diag-option.soft.active {
  background: linear-gradient(135deg, rgba(42, 109, 244, 0.14) 0%, rgba(24, 184, 216, 0.08) 100%);
  color: #184ca6;
  border-color: rgba(42, 109, 244, 0.24);
  box-shadow: 0 10px 22px rgba(38, 93, 210, 0.12);
}
.diag-option.clue.active {
  background: linear-gradient(135deg, rgba(42, 109, 244, 0.12) 0%, rgba(24, 184, 216, 0.07) 100%);
  color: #3157bf;
  border-color: rgba(42, 109, 244, 0.24);
  box-shadow: 0 10px 22px rgba(38, 93, 210, 0.12);
}
.diag-option.active:not(.soft) {
  background: linear-gradient(135deg, #215ed3 0%, #1f87d0 100%);
  border-color: rgba(42, 109, 244, 0.18);
  color: #f8fbff;
  box-shadow: 0 10px 22px rgba(38, 93, 210, 0.18);
}

.diag-result {
  border-radius: 22px;
  background: linear-gradient(180deg, #ffffff 0%, #f6faff 100%);
  border: 1px solid #d8e4f2;
  padding: 18px;
  box-shadow: 0 20px 42px rgba(23, 39, 68, 0.08);
  backdrop-filter: blur(24px);
}
.diag-result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}
.diag-reset-btn {
  background: transparent;
  border: none;
  color: #6976da;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.diag-result-tag {
  font-size: 11px;
  font-weight: 700;
  color: #5870c7;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.diag-result-body {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(220px, 0.9fr);
  gap: 16px;
}
.diag-primary-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.diag-emoji {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.74), 0 10px 20px rgba(128, 138, 162, 0.1);
}
.diag-primary-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.diag-problem-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -0.02em;
}
.diag-problem-subtitle {
  font-size: 13px;
  color: var(--text-soft);
  margin-top: 4px;
}
.diag-problem-match {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.diag-match-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.diag-match-chip.high {
  background: rgba(125, 175, 142, 0.1);
  color: #617f6a;
}
.diag-match-chip.mid {
  background: rgba(124, 144, 255, 0.1);
  color: #5e6ad6;
}
.diag-match-chip.soft {
  background: rgba(143, 185, 255, 0.1);
  color: #667bb8;
}
.diag-match-chip.small {
  font-size: 10px;
  padding: 3px 8px;
}
.diag-match-score,
.diag-match-stage {
  font-size: 12px;
  color: var(--text-dim);
}
.diag-primary-desc {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-soft);
  margin-bottom: 12px;
}
.diag-meta-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.diag-meta-pill {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.72);
  color: #61718a;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid rgba(255,255,255,0.76);
}
.diag-reasons {
  margin: 0 0 16px;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.55;
}
.diag-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.diag-open-btn {
  align-self: flex-start;
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(31, 37, 54, 0.98) 0%, rgba(83, 93, 147, 0.94) 100%);
  color: #f5f7ff;
  padding: 10px 15px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}
.diag-first-action {
  font-size: 13px;
  color: #6b7484;
  line-height: 1.6;
}
.diag-secondary {
  background: #f7faff;
  border-radius: 18px;
  padding: 14px;
  border: 1px solid #dde6f4;
  backdrop-filter: blur(18px);
}
.diag-secondary-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 10px;
}
.diag-secondary-list {
  display: grid;
  gap: 10px;
}
.diag-alt-card {
  width: 100%;
  background: #ffffff;
  border: 1px solid #dde6f4;
  border-radius: 16px;
  padding: 12px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  backdrop-filter: blur(18px);
}
.diag-alt-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}
.diag-alt-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
}
.diag-alt-text {
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-soft);
  margin-bottom: 8px;
}
.diag-alt-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 11px;
  color: #71809a;
  margin-bottom: 8px;
}
.diag-alt-arrow {
  color: #6572d8;
  font-size: 12px;
  font-weight: 700;
}

.grid-wrap {
  max-width: 1248px;
  margin: 0 auto;
  padding: 28px 24px 60px;
}
.list-sync-banner {
  max-width: 1200px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(245, 250, 255, 0.92) 100%);
  border: 1px solid #d9e5f4;
  backdrop-filter: blur(22px);
}
.list-sync-banner.muted {
  background: linear-gradient(135deg, rgba(250, 252, 255, 0.96) 0%, rgba(245, 249, 255, 0.94) 100%);
  border-color: #d9e5f4;
}
.list-sync-copy {
  min-width: 0;
}
.list-sync-kicker {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #6a75c6;
  margin-bottom: 6px;
}
.list-sync-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 4px;
}
.list-sync-desc {
  font-size: 13px;
  color: var(--text-soft);
  line-height: 1.6;
}
.list-sync-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.list-sync-btn {
  border: 1px solid #dce6f3;
  background: #f6f9fd;
  color: #596982;
  border-radius: 999px;
  padding: 9px 14px;
  font-size: 13px;
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
}
.list-sync-btn.active {
  background: linear-gradient(135deg, #215ed3 0%, #1f87d0 100%);
  color: #f5f7ff;
  border-color: rgba(42, 109, 244, 0.18);
}
.problems-grid { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill,minmax(230px,1fr)); gap: 14px; position: relative; }
.pagination {
  max-width: 1200px;
  margin: 22px auto 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}
.page-btn {
  min-width: 40px;
  height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.72);
  background: rgba(255, 255, 255, 0.58);
  color: var(--text-soft);
  font-size: 13px;
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.page-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(124, 144, 255, 0.16);
  box-shadow: 0 10px 20px rgba(128, 138, 162, 0.12);
}
.page-btn.active {
  background: linear-gradient(135deg, rgba(33, 39, 57, 0.98) 0%, rgba(91, 101, 160, 0.94) 100%);
  color: #f5f7ff;
  border-color: rgba(255,255,255,0.14);
  box-shadow: 0 12px 24px rgba(84, 94, 140, 0.18);
}
.page-btn.nav {
  padding: 0 16px;
}
.page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.problem-card { background: linear-gradient(180deg, rgba(255, 255, 255, 0.78) 0%, rgba(255, 255, 255, 0.62) 100%); border-radius: 22px; overflow: hidden; cursor: pointer; transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, border-color 0.2s ease; animation: cardIn 0.45s ease both; animation-delay: var(--delay); border: 1px solid rgba(255,255,255,0.72); box-shadow: 0 18px 36px rgba(128, 138, 162, 0.1); backdrop-filter: blur(22px); }
@keyframes cardIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
.problem-card:hover { transform: translateY(-6px) scale(1.015); box-shadow: 0 22px 40px rgba(128, 138, 162, 0.14); border-color: rgba(124, 144, 255, 0.14); }
.problem-card:active { transform: scale(0.98); transition-duration: 0.1s; }

.card-image { position: relative; height: 180px; display: flex; align-items: center; justify-content: center; overflow: hidden; border-bottom: 1px solid rgba(255,255,255,0.54); }
.card-image::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.16), transparent 50%),
    radial-gradient(circle at top right, rgba(124, 144, 255, 0.12), transparent 34%);
  opacity: 1;
}
.card-emoji { position: relative; z-index: 2; transition: transform 0.3s ease; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.card-emoji-icon { font-size: 66px; line-height: 1; filter: drop-shadow(0 6px 18px rgba(0,0,0,0.4)); font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; }
.problem-card:hover .card-emoji { transform: scale(1.05) translateY(-3px); }
.card-glow { position: absolute; width: 110px; height: 110px; border-radius: 50%; opacity: 0.2; filter: blur(36px); z-index: 1; transition: opacity 0.3s, transform 0.3s; }
.problem-card:hover .card-glow { opacity: 0.4; transform: scale(1.3); }
.card-difficulty { position: absolute; top: 11px; right: 11px; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 999px; z-index: 3; letter-spacing: 0.08em; background: rgba(255, 255, 255, 0.72); backdrop-filter: blur(12px); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.82); text-transform: uppercase; }
.fav-btn { position: absolute; bottom: 10px; right: 10px; z-index: 3; background: rgba(255, 255, 255, 0.66); border: 1px solid rgba(255,255,255,0.72); border-radius: 999px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.18s, transform 0.15s, border-color 0.15s; backdrop-filter: blur(12px); }
.fav-btn:hover { background: rgba(255, 255, 255, 0.86); border-color: rgba(124, 144, 255, 0.14); transform: scale(1.08); }
.fav-btn.active { background: rgba(248, 244, 255, 0.88); border-color: rgba(124, 144, 255, 0.14); }
.diff-normal   { color: var(--text-soft); }
.diff-urgent   { color: #c96f61; }
.diff-warn     { color: #8b7ac9; }
.diff-advanced { color: #508eb8; }

.card-body { padding: 17px 19px 19px; }
.card-category { font-size: 10px; color: var(--card-color); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 5px; font-weight: 700; }
.card-diagnosis-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.card-diagnosis-rank {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(124, 144, 255, 0.08);
  color: #5f6cd4;
  font-size: 10px;
  font-weight: 700;
  border: 1px solid rgba(124, 144, 255, 0.08);
}
.card-diagnosis-match {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 700;
}
.card-diagnosis-match.high {
  background: rgba(125, 175, 142, 0.1);
  color: #647d6b;
}
.card-diagnosis-match.mid {
  background: rgba(124, 144, 255, 0.1);
  color: #5f6cd4;
}
.card-diagnosis-match.soft {
  background: rgba(143, 185, 255, 0.1);
  color: #6b7ab0;
}
.card-title { font-size: 15px; font-weight: 700; color: var(--text-main); margin: 0 0 4px; letter-spacing: -0.01em; line-height: 1.3; }
.card-subtitle { font-size: 12px; color: var(--text-soft); line-height: 1.45; margin: 0 0 10px; }
.card-structure-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 0 0 10px;
}
.card-structure-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.72);
  color: #6b7688;
  font-size: 10px;
  font-weight: 700;
  border: 1px solid rgba(255,255,255,0.78);
}
.card-structure-pill.soft {
  background: rgba(247, 244, 255, 0.82);
  color: #6b72c0;
  border-color: rgba(255,255,255,0.78);
}
.card-diagnosis-reason {
  font-size: 11px;
  color: #6e7787;
  line-height: 1.5;
  margin: 0 0 10px;
}
.card-footer { display: flex; align-items: center; justify-content: space-between; }
.encounter-badge { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-dim); }
.card-arrow { color: var(--card-color); display: flex; align-items: center; opacity: 0.6; transition: transform 0.2s, opacity 0.2s; }
.problem-card:hover .card-arrow { transform: translateX(3px); opacity: 1; }

:deep(mark) { background: rgba(124, 144, 255, 0.14); color: #3b4ab8; border-radius: 3px; padding: 0 2px; font-style: normal; }

.empty-state { max-width: 280px; margin: 80px auto; text-align: center; }
.empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.5; }
.empty-title { font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 6px; }
.empty-desc { font-size: 13px; color: var(--text-soft); line-height: 1.6; margin-bottom: 18px; }
.empty-reset { background: rgba(255, 255, 255, 0.72); border: 1px solid rgba(255,255,255,0.78); color: #5d6ad4; padding: 8px 20px; border-radius: 999px; font-size: 13px; font-family: inherit; cursor: pointer; backdrop-filter: blur(16px); }
.empty-reset:hover { background: rgba(255, 255, 255, 0.88); }

.card-enter-active { transition: all 0.22s ease; }
.card-leave-active { transition: all 0.16s ease; position: absolute; }
.card-enter-from, .card-leave-to { opacity: 0; transform: scale(0.94); }
.card-move { transition: transform 0.28s ease; }

.filament-entry-section { padding: 0 24px 80px; }
.filament-entry-card {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 26px;
  border-radius: 26px;
  background:
    radial-gradient(circle at top right, rgba(255, 196, 87, 0.16), transparent 28%),
    radial-gradient(circle at left center, rgba(116, 185, 255, 0.14), transparent 26%),
    linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(248,250,253,0.92) 100%);
  border: 1px solid rgba(255,255,255,0.78);
  box-shadow: 0 20px 38px rgba(128, 138, 162, 0.12);
  backdrop-filter: blur(18px);
}
.filament-entry-copy {
  max-width: 720px;
}
.filament-entry-kicker {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(37, 104, 232, 0.08);
  color: #31507e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  margin-bottom: 12px;
}
.filament-entry-title {
  font-size: 24px;
  line-height: 1.28;
  letter-spacing: -0.03em;
  color: var(--text-main);
  margin-bottom: 10px;
}
.filament-entry-desc {
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-soft);
  margin-bottom: 14px;
}
.filament-entry-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.filament-entry-tag {
  display: inline-flex;
  align-items: center;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.86);
  border: 1px solid rgba(57, 86, 120, 0.08);
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 600;
}
.filament-entry-btn {
  flex-shrink: 0;
  border: none;
  border-radius: 999px;
  padding: 13px 22px;
  background: linear-gradient(135deg, #1f5eff 0%, #3aa9c9 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 14px 30px rgba(37, 104, 232, 0.2);
  transition: transform 0.18s, box-shadow 0.18s;
}
.filament-entry-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 34px rgba(37, 104, 232, 0.24);
}

/* 热门故障 */
.hot-section { padding: 0 24px 8px; }
.hot-inner { max-width: 1200px; margin: 0 auto; }
.hot-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px; }
.hot-title { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 700; color: var(--text-main); }
.hot-sub { font-size: 12px; color: var(--text-dim); }
.hot-scroll { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.hot-card {
  display: flex; align-items: center; gap: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.78) 0%, rgba(255, 255, 255, 0.62) 100%); border-radius: 18px; padding: 12px 14px;
  border: 1px solid rgba(255,255,255,0.72); cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
  backdrop-filter: blur(18px);
}
.hot-card:hover { box-shadow: 0 20px 34px rgba(128, 138, 162, 0.14); transform: translateY(-1px); }
.hot-rank { width: 20px; font-size: 13px; font-weight: 800; color: var(--text-dim); flex-shrink: 0; text-align: center; }
.hot-rank.rank-top { color: #5f6cd4; }
.hot-emoji { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; overflow: hidden; }
.hot-info { flex: 1; min-width: 0; }
.hot-name { font-size: 13px; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
.hot-meta { display: flex; align-items: center; gap: 8px; }
.hot-category { font-size: 11px; color: var(--text-soft); background: rgba(255,255,255,0.72); padding: 2px 7px; border-radius: 999px; }
.hot-count { display: flex; align-items: center; gap: 3px; font-size: 11px; color: #6b72c0; }
.hot-arrow { color: var(--text-dim); flex-shrink: 0; transition: transform 0.2s; }
.hot-card:hover .hot-arrow { transform: translateX(3px); color: var(--hc); }

@media (max-width: 900px) {
  .hero-actions,
  .workbench-head,
  .diagnosis-inner,
  .diag-result-body { grid-template-columns: 1fr; }
  .workbench-head { align-items: start; flex-direction: column; }
  .hot-scroll { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .hero-actions { display: none; }
}
@media (max-width: 640px) {
  .hero { padding: 40px 20px 28px; }
  .hero-total {
    justify-content: center;
    align-items: center;
    padding: 8px 12px;
  }
  .hero-total-value strong { font-size: 1.65rem; }
  .hero-total-value span { font-size: 13px; }
  .workbench-section,
  .diagnosis-section { padding: 16px 16px 6px; }
  .workbench-shell,
  .diagnosis-copy, .diagnosis-panel { padding: 18px; border-radius: 20px; }
  .workbench-subtitle,
  .workbench-desc {
    display: none;
  }
  .workbench-title {
    font-size: 18px;
    margin: 0;
  }
  .mobile-diagnosis-head {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .diag-options { overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none; }
  .diag-options::-webkit-scrollbar { display: none; }
  .diag-option { white-space: nowrap; }
  .search-wrap { max-width: 100%; }
  .search-main-row,
  .search-meta { align-items: stretch; }
  .search-meta { margin-left: 0; width: 100%; justify-content: space-between; }
  .result-count, .legend { display: none; }
  .result-count.static { display: inline; }
  .filter-row-label { display: none; }
  .filter-chips { overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none; padding-bottom: 2px; }
  .filter-chips::-webkit-scrollbar { display: none; }
  .filter-btn { padding: 5px 12px; font-size: 12px; white-space: nowrap; }
  .search-input { font-size: 16px; }
  .grid-wrap { padding: 16px 16px 40px; }
  .list-sync-banner { flex-direction: column; align-items: stretch; }
  .problems-grid { grid-template-columns: repeat(2,1fr); gap: 10px; }
  .pagination { gap: 6px; margin-top: 18px; }
  .page-btn { min-width: 42px; height: 42px; padding: 0 12px; }
  .card-image { height: 148px; }
  .card-emoji-icon { font-size: 52px; }
  .card-body { padding: 13px 15px 15px; }
  .card-title { font-size: 14px; }
  .hot-scroll { grid-template-columns: 1fr; }
  .filament-entry-section { padding: 0 16px 60px; }
  .filament-entry-card {
    flex-direction: column;
    align-items: flex-start;
    padding: 20px;
  }
  .filament-entry-title {
    font-size: 20px;
  }
  .filament-entry-btn {
    width: 100%;
  }
}
</style>
