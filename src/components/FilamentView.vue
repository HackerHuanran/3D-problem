<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { filaments, materialTypes, brands, MATERIAL_COLOR, DIFFICULTY_COLOR } from '../data/filaments.js'
import { useFilamentReviews } from '@/composables/useFilamentReviews.js'
import { useUserGuard } from '@/composables/useUserGuard.js'
import { useToast } from '@/composables/useToast.js'

const props = defineProps({
  currentUser: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['open-auth'])

const {
  fetchFilamentReviews,
  fetchFilamentRatingSummary,
  fetchUserFilamentReview,
  submitFilamentReview,
  deleteFilamentReview,
} = useFilamentReviews()

const { ensureUserCanInteract } = useUserGuard()
const { success, error: toastError } = useToast()

const selectedMaterial = ref('全部')
const selectedBrand = ref('全部')
const selectedScenario = ref('全部')
const searchQuery = ref('')
const activeId = ref(filaments[0]?.id || null)
const detailModalOpen = ref(false)

const reviewSummary = ref({
  count: 0,
  overall: 0,
  metrics: {
    printability: 0,
    adhesion: 0,
    stringing_control: 0,
    surface_quality: 0,
    strength: 0,
    value: 0,
  },
})
const reviewList = ref([])
const currentUserReview = ref(null)

const reviewLoading = ref(false)
const reviewSubmitting = ref(false)
const reviewNotice = ref('')
const reviewError = ref('')
const reviewFormOpen = ref(false)

const reviewFiles = ref([])
const reviewPreviews = ref([])

const reviewForm = reactive({
  content: '',
  printability: 0,
  adhesion: 0,
  stringing_control: 0,
  surface_quality: 0,
  strength: 0,
  value: 0,
})

const SCENARIO_OPTIONS = ['全部', '新手友好', '高速打印', '展示外观', '功能强度', '耐候户外', '柔性件', '树脂精细']

const RATING_ITEMS = [
  { key: 'printability', label: '易打性' },
  { key: 'adhesion', label: '附着稳定' },
  { key: 'stringing_control', label: '抗拉丝' },
  { key: 'surface_quality', label: '表面质量' },
  { key: 'strength', label: '强度表现' },
  { key: 'value', label: '性价比' },
]

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
  '光固化树脂': 94,
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
  '支撑材料': 68,
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
  if (scenario === '高速打印') return (item.speedMax || 0) >= 180 || /高速/.test(item.tips) || item.tags.some((tag) => tag.includes('高速'))
  if (scenario === '展示外观') return item.tags.some((tag) => /丝绸|哑光|光泽|展示|渐变|木纹|金属/.test(tag))
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

function resetReviewForm() {
  reviewForm.content = ''
  reviewForm.printability = 0
  reviewForm.adhesion = 0
  reviewForm.stringing_control = 0
  reviewForm.surface_quality = 0
  reviewForm.strength = 0
  reviewForm.value = 0
}

function clearPreviewState(filesRef, previewsRef) {
  previewsRef.value.forEach((url) => URL.revokeObjectURL(url))
  filesRef.value = []
  previewsRef.value = []
}

function addPreviewFiles(event, filesRef, previewsRef, max = 4) {
  const incoming = [...(event.target.files || [])].slice(0, Math.max(0, max - filesRef.value.length))
  incoming.forEach((file) => {
    filesRef.value.push(file)
    previewsRef.value.push(URL.createObjectURL(file))
  })
  event.target.value = ''
}

function removePreviewFile(index, filesRef, previewsRef) {
  URL.revokeObjectURL(previewsRef.value[index])
  filesRef.value.splice(index, 1)
  previewsRef.value.splice(index, 1)
}

function hydrateReviewForm(review) {
  if (!review) {
    resetReviewForm()
    return
  }
  reviewForm.content = review.content || ''
  reviewForm.printability = review.ratings?.printability || 0
  reviewForm.adhesion = review.ratings?.adhesion || 0
  reviewForm.stringing_control = review.ratings?.stringing_control || 0
  reviewForm.surface_quality = review.ratings?.surface_quality || 0
  reviewForm.strength = review.ratings?.strength || 0
  reviewForm.value = review.ratings?.value || 0
}

function currentUserReviewStatusLabel(status) {
  if (status === 'pending') return '你的评价正在审核中'
  if (status === 'hidden') return '你的评价当前已被隐藏'
  if (status === 'rejected') return '你的评价未通过审核，可删除后重新提交'
  if (status === 'published') return '你的评价已公开展示'
  return ''
}

function averageRatingFromForm() {
  const values = RATING_ITEMS.map((item) => Number(reviewForm[item.key] || 0)).filter((value) => value > 0)
  if (!values.length) return 0
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
}

function formatScore(value) {
  return value ? Number(value).toFixed(1) : '暂无'
}

function formatStars(value) {
  const count = Math.round(Number(value) || 0)
  return count > 0 ? '★'.repeat(count) : '未评分'
}

function formatRatingText(value) {
  if (value >= 4.5) return '非常稳'
  if (value >= 4) return '推荐'
  if (value >= 3) return '可用'
  if (value > 0) return '挑机器'
  return '暂无评价'
}

function formatRelativeTime(timestamp) {
  const delta = Date.now() - timestamp
  const minutes = Math.floor(delta / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function loadExperienceData() {
  const filament = activeFilament.value
  if (!detailModalOpen.value || !filament) return

  reviewLoading.value = true
  reviewError.value = ''
  reviewNotice.value = ''

  try {
    const [summary, reviews] = await Promise.all([
      fetchFilamentRatingSummary(filament.id, { force: true }),
      fetchFilamentReviews(filament.id, { force: true }),
    ])
    reviewSummary.value = summary
    reviewList.value = reviews

    if (props.currentUser?.id) {
      const [ownReview] = await Promise.all([
        fetchUserFilamentReview(filament.id, props.currentUser.id, { force: true }),
      ])
      currentUserReview.value = ownReview
      hydrateReviewForm(ownReview)
    } else {
      currentUserReview.value = null
      resetReviewForm()
    }
  } catch (error) {
    const message = error?.message || '加载评价失败'
    reviewError.value = message
  } finally {
    reviewLoading.value = false
  }
}

async function refreshAfterSubmit() {
  await loadExperienceData()
}

async function handleSubmitReview() {
  if (!props.currentUser?.id) {
    emit('open-auth', 'login')
    return
  }
  if (!activeFilament.value) return
  if (!reviewForm.content.trim()) {
    reviewError.value = '请写一点使用体验，别只留分数'
    return
  }
  if (RATING_ITEMS.some((item) => Number(reviewForm[item.key]) < 1)) {
    reviewError.value = '请把 6 个评分项都打完'
    return
  }

  reviewSubmitting.value = true
  reviewError.value = ''
  reviewNotice.value = ''

  try {
    await ensureUserCanInteract(props.currentUser.id, '提交耗材评价')
    await submitFilamentReview(props.currentUser.id, props.currentUser, activeFilament.value, {
      content: reviewForm.content,
      overallRating: averageRatingFromForm(),
      ratings: {
        printability: reviewForm.printability,
        adhesion: reviewForm.adhesion,
        stringing_control: reviewForm.stringing_control,
        surface_quality: reviewForm.surface_quality,
        strength: reviewForm.strength,
        value: reviewForm.value,
      },
      images: reviewFiles.value,
    })
    reviewNotice.value = '评价已提交，等待后台审核后展示'
    success('评价提交成功，等待审核')
    clearPreviewState(reviewFiles, reviewPreviews)
    await refreshAfterSubmit()
  } catch (error) {
    reviewError.value = error?.message || '评价提交失败，请稍后再试'
    toastError(reviewError.value)
  } finally {
    reviewSubmitting.value = false
  }
}

async function handleDeleteReview() {
  if (!props.currentUser?.id || !activeFilament.value || !currentUserReview.value) return
  if (!confirm('确定删除你当前的耗材评价吗？删除后需要重新提交。')) return

  reviewSubmitting.value = true
  reviewError.value = ''
  reviewNotice.value = ''

  try {
    await ensureUserCanInteract(props.currentUser.id, '删除耗材评价')
    await deleteFilamentReview(activeFilament.value.id, props.currentUser.id)
    currentUserReview.value = null
    resetReviewForm()
    clearPreviewState(reviewFiles, reviewPreviews)
    success('评价已删除')
    await refreshAfterSubmit()
  } catch (error) {
    reviewError.value = error?.message || '删除评价失败，请稍后再试'
    toastError(reviewError.value)
  } finally {
    reviewSubmitting.value = false
  }
}

function openFilament(item) {
  activeId.value = item.id
  detailModalOpen.value = true
}

function closeDetailModal() {
  detailModalOpen.value = false
  reviewNotice.value = ''
  reviewError.value = ''
  reviewFormOpen.value = false
}

function resetFilters() {
  selectedMaterial.value = '全部'
  selectedBrand.value = '全部'
  selectedScenario.value = '全部'
  searchQuery.value = ''
}

const sortedBrands = computed(() =>
  [...brands].sort((a, b) => {
    if (a === '全部') return -1
    if (b === '全部') return 1
    const diff = getBrandPriority(b) - getBrandPriority(a)
    if (diff !== 0) return diff
    return a.localeCompare(b, 'zh-Hans-CN')
  }),
)

const filtered = computed(() =>
  filaments
    .filter((item) => {
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
    })
    .sort(compareItems),
)

const activeFilament = computed(() => {
  const found = filtered.value.find((item) => item.id === activeId.value)
  return found || filtered.value[0] || null
})

const filterSummary = computed(() => {
  if (selectedScenario.value !== '全部') return `当前按“${selectedScenario.value}”优先筛选`
  if (selectedMaterial.value !== '全部') return `当前聚焦 ${selectedMaterial.value} 材料`
  if (selectedBrand.value !== '全部') return `当前只看 ${selectedBrand.value}`
  return '点击卡片查看完整参数、推荐值、真实评价和常见使用反馈'
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

const materialCompatibility = computed(() => {
  const item = activeFilament.value
  if (!item) return []

  if (item.isResin) {
    return [
      '默认适合高细节、小尺寸、表面优先的模型',
      '需要清洗和二次固化流程',
      '更适合愿意做参数测试和后处理的用户',
    ]
  }

  const rules = []
  const material = item.material || ''
  const tags = item.tags || []
  const tips = item.tips || ''

  if (material === 'PLA' || material === 'PLA+') rules.push('新手友好，大多数开放式 FDM 都能直接起步')
  if (material === 'PETG') rules.push('更适合需要韧性和耐候性的日常功能件')
  if (material === 'TPU') rules.push('直驱挤出机更省心，柔性件和防滑件更合适')
  if (['ABS', 'ABS+', 'ASA'].includes(material)) rules.push('更建议封箱或稳定环境打印，适合耐热和结构件')
  if (['PA', 'PA-CF', 'PC', 'PLA-CF', 'PETG-CF', 'PET-CF'].includes(material)) rules.push('更偏功能件路线，对机器稳定性和参数管理要求更高')
  if (material.includes('CF')) rules.push('建议准备耐磨喷嘴，长期用普通铜嘴损耗会更快')
  if ((item.speedMax || 0) >= 180 || tags.some((tag) => tag.includes('高速'))) rules.push('支持偏高速打印，但仍建议先从保守参数起步')
  if (tips.includes('官方') || tips.includes('预设')) rules.push('如果你用对应品牌机器，可优先尝试官方预设参数')

  return rules.slice(0, 4)
})

const materialRiskTags = computed(() => {
  const item = activeFilament.value
  if (!item) return []

  const material = item.material || ''
  const tags = item.tags || []
  const tips = item.tips || ''
  const risks = []

  if (item.isResin) {
    risks.push('需要注意气味、防护和通风')
    risks.push('曝光窗口偏差会明显影响成功率')
    risks.push('后处理过度容易发白或变脆')
    return risks
  }

  if (['PETG', 'TPU', 'PA', 'PA-CF', 'PETG-CF'].includes(material)) risks.push('吸潮后表现会明显变差，建议烘干后再打')
  if (['ABS', 'ABS+', 'ASA', 'PC'].includes(material)) risks.push('环境温差大时更容易翘边或开裂')
  if (material === 'PETG') risks.push('容易拉丝，首轮建议保守调回抽和温度')
  if (material === 'TPU') risks.push('送料路径不顺时容易卡料，速度别一开始就打快')
  if (material.includes('CF')) risks.push('含纤材料更磨喷嘴，不建议长期用黄铜嘴')
  if (tips.includes('干燥') || tips.includes('烘干')) risks.push('存放不当时，参数对了也可能打不稳')
  if (tags.some((tag) => /丝绸|哑光|渐变|木纹/.test(tag))) risks.push('外观型材料更吃参数窗口，别一开始就追最高速度')

  return [...new Set(risks)].slice(0, 4)
})

watch(filtered, (list) => {
  if (!list.length) {
    activeId.value = null
    detailModalOpen.value = false
    return
  }
  if (!list.some((item) => item.id === activeId.value)) activeId.value = list[0].id
}, { immediate: true })

watch(
  () => [detailModalOpen.value, activeFilament.value?.id || '', props.currentUser?.id || ''],
  ([open, filamentId]) => {
    if (!open || !filamentId) return
    loadExperienceData()
  },
  { immediate: false },
)

watch(
  () => props.currentUser?.id || '',
  (userId) => {
    if (!userId) {
      currentUserReview.value = null
      resetReviewForm()
    }
  },
)

onBeforeUnmount(() => {
  clearPreviewState(reviewFiles, reviewPreviews)
})
</script>

<template>
  <div class="filament-page">
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-badge">耗材参数库</div>
        <h1 class="hero-title">先选耗材，再看推荐值和真实使用反馈</h1>
        <p class="hero-sub">收录 {{ filaments.length }} 种主流耗材，既能查参数，也能看真实用户的评分、评价和踩坑反馈。</p>
        <div class="search-wrap">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.4" />
            <path d="M10.5 10.5l3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
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
              :style="selectedMaterial === m && m !== '全部' ? { background: `${matColor(m)}18`, color: matColor(m), borderColor: `${matColor(m)}55` } : {}"
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
                <span class="material-chip" :style="{ color: matColor(item.material), background: `${matColor(item.material)}12` }">{{ item.material }}</span>
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
              <span class="material-card-tip">{{ item.isResin ? '查看曝光、后处理和真实评分' : '查看参数、真实评分和用户评价' }}</span>
              <span class="material-card-arrow">查看详情</span>
            </div>
          </article>
        </div>
      </div>

      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="detailModalOpen && activeFilament" class="detail-modal-backdrop">
            <div class="detail-modal">
              <div class="detail-modal-headbar">
                <div>
                  <div class="detail-modal-kicker">耗材详情</div>
                  <div class="detail-modal-sub">参数、使用反馈和评分都在这里</div>
                </div>
                <button class="detail-modal-close" @click="closeDetailModal" aria-label="关闭详情">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
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

                <section class="detail-section rating-summary">
                  <div class="section-head">
                    <div>
                      <div class="detail-section-title">真实评分概览</div>
                      <div class="section-subtext">只统计已审核通过并公开展示的真实评价</div>
                    </div>
                    <button v-if="props.currentUser?.id" class="ghost-action" :disabled="reviewLoading" @click="loadExperienceData">刷新</button>
                  </div>

                  <div v-if="reviewLoading" class="inline-state">正在加载评分和评价…</div>
                  <div v-else>
                    <div v-if="reviewError" class="inline-error">{{ reviewError }}</div>

                    <div class="summary-grid">
                      <div class="summary-card summary-main">
                        <div class="summary-main-score">{{ formatScore(reviewSummary.overall) }}</div>
                        <div class="summary-main-stars">{{ formatStars(reviewSummary.overall) }}</div>
                        <div class="summary-main-desc">{{ formatRatingText(reviewSummary.overall) }} · {{ reviewSummary.count }} 条已审核评价</div>
                      </div>

                      <div class="summary-card summary-metrics">
                        <div v-for="metric in RATING_ITEMS" :key="metric.key" class="metric-row">
                          <span class="metric-label">{{ metric.label }}</span>
                          <span class="metric-score">{{ formatScore(reviewSummary.metrics[metric.key]) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

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
                      <div class="param-val">{{ activeFilament.retractBowden === 0 ? '禁用' : `${activeFilament.retractBowden} mm` }}</div>
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

                <section v-if="materialCompatibility.length" class="detail-section soft">
                  <div class="detail-section-title">适配条件</div>
                  <div class="signal-list">
                    <div v-for="item in materialCompatibility" :key="item" class="signal-item">
                      <span class="signal-dot good"></span>
                      <span>{{ item }}</span>
                    </div>
                  </div>
                </section>

                <section v-if="materialRiskTags.length" class="detail-section risk-panel">
                  <div class="detail-section-title">风险提示</div>
                  <div class="signal-list">
                    <div v-for="item in materialRiskTags" :key="item" class="signal-item">
                      <span class="signal-dot risk"></span>
                      <span>{{ item }}</span>
                    </div>
                  </div>
                </section>
              </div>

              <section class="detail-section tips-panel">
                <div class="detail-section-title">打印建议</div>
                <p class="tips-text">{{ activeFilament.tips }}</p>
              </section>

              <section class="detail-section form-panel">
                <button class="review-collapse-head" @click="reviewFormOpen = !reviewFormOpen">
                  <div>
                    <div class="detail-section-title">提交耗材评价</div>
                    <div class="section-subtext">请填写评分和详细使用体验，图片可选，提交后会进入后台审核。</div>
                  </div>
                  <span class="collapse-caret" :class="{ open: reviewFormOpen }">⌄</span>
                </button>

                <div v-if="reviewFormOpen" class="review-collapse-body">
                  <div v-if="!props.currentUser" class="auth-hint-box">
                    <div>登录后可以提交评分和评价，并把你的真实使用经验沉淀到耗材库里。</div>
                    <button class="primary-action" @click="emit('open-auth', 'login')">先登录</button>
                  </div>

                  <template v-else>
                    <div class="review-form-shell">
                      <div v-if="currentUserReview?.status" class="inline-state">
                        {{ currentUserReviewStatusLabel(currentUserReview.status) }}
                      </div>
                      <div class="rating-editor-grid">
                        <div v-for="metric in RATING_ITEMS" :key="metric.key" class="rating-editor-item">
                          <div class="rating-editor-label">{{ metric.label }}</div>
                          <div class="rating-stars">
                            <button
                              v-for="star in 5"
                              :key="`${metric.key}-${star}`"
                              type="button"
                              :class="['star-btn', { active: reviewForm[metric.key] >= star }]"
                              @click="reviewForm[metric.key] = star"
                            >★</button>
                          </div>
                        </div>
                      </div>

                      <label class="field field-full">
                        <span class="field-label">详细使用体验</span>
                        <textarea v-model="reviewForm.content" class="field-textarea" rows="4" placeholder="必填，建议写清楚：参数怎么调、是否容易拉丝、表面效果如何、适合什么场景…" />
                      </label>

                      <div class="upload-block">
                        <div class="field-label">评价图片（选填）</div>
                        <div class="upload-grid">
                          <div v-for="(url, index) in reviewPreviews" :key="url" class="upload-thumb">
                            <img :src="url" alt="review preview" />
                            <button type="button" class="upload-remove" @click="removePreviewFile(index, reviewFiles, reviewPreviews)">✕</button>
                          </div>
                          <label v-if="reviewPreviews.length < 4" class="upload-add">
                            <input type="file" accept="image/*" multiple style="display:none" @change="(event) => addPreviewFiles(event, reviewFiles, reviewPreviews, 4)" />
                            <span>上传图片</span>
                          </label>
                        </div>
                      </div>

                      <div v-if="reviewError" class="inline-error">{{ reviewError }}</div>
                      <div v-if="reviewNotice" class="inline-success">{{ reviewNotice }}</div>

                      <div class="review-action-row">
                        <button class="primary-action wide" :disabled="reviewSubmitting" @click="handleSubmitReview">
                          {{ reviewSubmitting ? '提交中…' : '发布评价' }}
                        </button>
                        <button v-if="currentUserReview" class="ghost-danger-action" :disabled="reviewSubmitting" @click="handleDeleteReview">
                          删除我的评价
                        </button>
                      </div>
                    </div>
                  </template>
                </div>
              </section>

              <section class="detail-section">
                <div class="section-head">
                  <div>
                    <div class="detail-section-title">真实评价列表</div>
                    <div class="section-subtext">这里展示所有已审核通过的真实评价，便于横向参考。</div>
                  </div>
                  <div class="review-count-pill">{{ reviewList.length }} 条</div>
                </div>

                <div v-if="!reviewList.length" class="inline-state muted">还没有人留下已审核评价，你可以成为第一个。</div>
                <div v-else class="review-list">
                  <article v-for="review in reviewList" :key="review.id" class="review-card">
                    <div class="review-card-head">
                      <div class="review-user">
                        <div class="review-avatar">{{ review.avatar }}</div>
                        <div>
                          <div class="review-username">{{ review.username }}</div>
                          <div class="review-meta">{{ formatRelativeTime(review.createdAt) }}</div>
                        </div>
                      </div>
                      <div class="review-score-box">
                        <div class="review-score">{{ review.overallRating.toFixed(1) }}</div>
                        <div class="review-stars">{{ formatStars(review.overallRating) }}</div>
                      </div>
                    </div>

                    <p class="review-content">{{ review.content }}</p>

                    <div class="review-metric-row">
                      <span v-for="metric in RATING_ITEMS" :key="`${review.id}-${metric.key}`" class="review-metric-pill">
                        {{ metric.label }} {{ review.ratings?.[metric.key] || 0 }}
                      </span>
                    </div>

                    <div v-if="review.images?.length" class="review-image-grid">
                      <a v-for="image in review.images" :key="image.id" :href="image.url" target="_blank" rel="noreferrer" class="review-image-link">
                        <img :src="image.url" alt="review image" class="review-image" />
                      </a>
                    </div>
                  </article>
                </div>
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
                      <span class="compare-type" :style="{ color: matColor(candidate.material), background: `${matColor(candidate.material)}12` }">{{ candidate.material }}</span>
                      <span class="compare-name">{{ candidate.brand }} {{ candidate.variant }}</span>
                      <span class="compare-meta">{{ candidate.nozzleRec || candidate.exposureTime }}{{ candidate.isResin ? 's' : '°C' }}</span>
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

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
.grid-shell {
  position: relative;
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
  z-index: 2000;
}
.detail-modal {
  width: min(1040px, 100%);
  max-height: min(92vh, 1040px);
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
.detail-modal-close:hover { background: #f0f1f5; }
.detail-modal-scroll {
  max-height: calc(92vh - 72px);
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
.detail-head-main {
  min-width: 0;
  flex: 1;
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
.detail-section.soft { background: linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%); }
.detail-section-title {
  font-size: 14px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 14px;
}
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.section-subtext {
  font-size: 12px;
  line-height: 1.6;
  color: #8d8d92;
}
.rating-summary {
  background:
    radial-gradient(circle at top right, rgba(90, 169, 255, 0.1), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border-color: rgba(70, 110, 170, 0.1);
}

.summary-grid {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 12px;
}
.summary-card {
  border-radius: 18px;
  border: 1px solid rgba(40, 60, 90, 0.08);
  background: linear-gradient(180deg, #f7faff 0%, #ffffff 100%);
  padding: 16px;
}
.summary-main {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.summary-main-score {
  font-size: 40px;
  line-height: 1;
  font-weight: 800;
  color: #1b2d4f;
}
.summary-main-stars {
  margin-top: 10px;
  color: #f5a623;
  font-size: 15px;
  letter-spacing: 0.1em;
}
.summary-main-desc {
  margin-top: 10px;
  font-size: 13px;
  color: #6d7280;
  line-height: 1.6;
}
.summary-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px;
}
.metric-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed rgba(70, 88, 120, 0.12);
}
.metric-label {
  font-size: 13px;
  color: #55606f;
}
.metric-score {
  font-size: 14px;
  font-weight: 700;
  color: #1d1d1f;
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
.risk-panel {
  background: linear-gradient(180deg, rgba(255, 245, 238, 0.92) 0%, #ffffff 100%);
  border-color: rgba(221, 146, 92, 0.16);
}
.signal-list {
  display: grid;
  gap: 10px;
}
.signal-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  line-height: 1.72;
  color: #4f5867;
}
.signal-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}
.signal-dot.good {
  background: #5cba7a;
  box-shadow: 0 0 0 4px rgba(92, 186, 122, 0.12);
}
.signal-dot.risk {
  background: #e39a4a;
  box-shadow: 0 0 0 4px rgba(227, 154, 74, 0.12);
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

.form-panel {
  background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
}
.review-collapse-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  text-align: left;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
}
.collapse-caret {
  flex-shrink: 0;
  font-size: 22px;
  line-height: 1;
  color: #6a7586;
  transition: transform 0.18s ease;
}
.collapse-caret.open {
  transform: rotate(180deg);
}
.review-collapse-body {
  margin-top: 18px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.field-full { margin-top: 14px; }
.field-label {
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
}
.field-input,
.field-textarea {
  width: 100%;
  border: 1px solid rgba(70, 88, 120, 0.12);
  background: #f7f9fc;
  border-radius: 14px;
  padding: 11px 13px;
  font-size: 14px;
  color: #20242c;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.field-input:focus,
.field-textarea:focus {
  border-color: rgba(37, 104, 232, 0.3);
  box-shadow: 0 0 0 4px rgba(37, 104, 232, 0.08);
  background: #fff;
}
.field-textarea {
  line-height: 1.7;
  resize: vertical;
}

.upload-block { margin-top: 14px; }
.upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
  margin-top: 10px;
}
.upload-thumb {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(70, 88, 120, 0.12);
  background: #f3f6fa;
}
.upload-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.upload-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 999px;
  background: rgba(12, 15, 20, 0.66);
  color: #fff;
  cursor: pointer;
}
.upload-add {
  min-height: 100px;
  border: 1px dashed rgba(70, 88, 120, 0.18);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7f9fc;
  color: #5f6877;
  font-size: 13px;
  cursor: pointer;
}

.rating-editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.rating-editor-item {
  border: 1px solid rgba(70, 88, 120, 0.1);
  background: #f8fafc;
  border-radius: 16px;
  padding: 14px;
}
.rating-editor-label {
  font-size: 13px;
  font-weight: 700;
  color: #243041;
  margin-bottom: 10px;
}
.rating-stars {
  display: flex;
  align-items: center;
  gap: 6px;
}
.star-btn {
  border: none;
  background: transparent;
  color: #d0d4dc;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}
.star-btn.active { color: #f5a623; }

.inline-state {
  padding: 12px 14px;
  border-radius: 14px;
  background: #f6f8fb;
  color: #697384;
  font-size: 13px;
}
.inline-state.muted {
  border: 1px dashed rgba(70, 88, 120, 0.14);
}
.inline-error {
  margin-top: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(229, 72, 77, 0.08);
  color: #b23b42;
  font-size: 13px;
}
.inline-success {
  margin-top: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(48, 176, 112, 0.1);
  color: #1f7e52;
  font-size: 13px;
}

.ghost-action,
.primary-action {
  border: none;
  border-radius: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
}
.ghost-action {
  background: #eef3fb;
  color: #31507e;
  padding: 10px 14px;
  font-size: 13px;
}
.primary-action {
  background: linear-gradient(135deg, var(--lab-accent) 0%, var(--lab-accent-2) 100%);
  color: #fff;
  padding: 11px 16px;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 12px 24px rgba(37, 104, 232, 0.16);
}
.primary-action.wide {
  width: 100%;
  justify-content: center;
}
.ghost-action:disabled,
.primary-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}
.review-action-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}
.ghost-danger-action {
  width: 100%;
  border: 1px solid rgba(191, 64, 64, 0.16);
  border-radius: 12px;
  background: rgba(255, 244, 244, 0.96);
  color: #b13d3d;
  padding: 11px 16px;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.15s, filter 0.15s, border-color 0.15s;
}
.ghost-danger-action:hover:not(:disabled) {
  filter: brightness(0.99);
  border-color: rgba(191, 64, 64, 0.28);
}
.ghost-danger-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-hint-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(37, 104, 232, 0.08) 0%, rgba(104, 183, 255, 0.08) 100%);
  border: 1px solid rgba(37, 104, 232, 0.12);
  color: #405165;
  font-size: 13px;
  line-height: 1.6;
}
.review-form-shell {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.review-count-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 10px;
  white-space: nowrap;
}
.review-count-pill {
  background: #edf3fb;
  color: #4a5d79;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.review-card {
  border: 1px solid rgba(70, 88, 120, 0.1);
  background: linear-gradient(180deg, #fbfcfe 0%, #ffffff 100%);
  border-radius: 18px;
  padding: 16px;
}
.review-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.review-user {
  display: flex;
  align-items: center;
  gap: 10px;
}
.review-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #24497a 0%, #5aa9ff 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
}
.review-username {
  font-size: 14px;
  font-weight: 700;
  color: #1d1d1f;
}
.review-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #8a92a0;
}
.review-score-box {
  text-align: right;
}
.review-score {
  font-size: 22px;
  font-weight: 800;
  color: #16396d;
}
.review-stars {
  margin-top: 2px;
  font-size: 12px;
  color: #f5a623;
}
.review-content {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.75;
  color: #4f5865;
}
.review-metric-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.review-metric-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  color: #4e5a69;
  background: #f2f6fb;
}
.review-image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 10px;
  margin-top: 14px;
}
.review-image-link {
  display: block;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(70, 88, 120, 0.12);
  background: #f2f5f8;
  aspect-ratio: 1 / 1;
}
.review-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

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

.ghost-action:hover,
.primary-action:hover {
  transform: translateY(-1px);
  filter: brightness(1.02);
}

.review-card + .review-card {
  margin-top: 2px;
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

.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-to,
.modal-fade-leave-from { opacity: 1; }

@media (max-width: 1100px) {
  .cards-grid { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); }
  .hero-stat-grid,
  .params-grid,
  .detail-grid,
  .summary-grid,
  .form-grid,
  .rating-editor-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .summary-main { min-height: 180px; }
  .compare-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 1024px) {
  .detail-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }
  .form-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .cards-grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
  .detail-modal {
    width: 100%;
    max-height: 100vh;
    border-radius: 22px;
  }
  .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
  .mini-stats { gap: 6px; }
  .mini-stat { padding: 9px 6px; }
  .detail-modal-backdrop {
    padding: 10px;
    align-items: flex-end;
  }
  .detail-modal { border-radius: 22px 22px 0 0; }
  .detail-modal-scroll { padding: 14px; }
  .detail-head {
    padding: 14px 15px;
    flex-direction: column;
  }
  .chips {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: 2px;
  }
  .chips::-webkit-scrollbar { display: none; }
  .results-meta,
  .section-head,
  .auth-hint-box,
  .review-card-head {
    flex-direction: column;
    align-items: flex-start;
  }
  .hero-stat-grid,
  .params-grid,
  .form-grid,
  .rating-editor-grid,
  .summary-metrics,
  .compare-list {
    grid-template-columns: 1fr;
  }
  .upload-grid,
  .review-image-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .cards-grid { grid-template-columns: 1fr 1fr; }
  .upload-grid,
  .review-image-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
