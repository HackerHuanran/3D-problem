<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useFavorites } from '@/composables/useFavorites.js'
import { useProblemMeta } from '@/composables/useProblemMeta.js'
import { useUserProblems } from '@/composables/useUserProblems.js'
import { useMarket } from '@/composables/useMarket.js'
import { useCommunity } from '@/composables/useCommunity.js'
import { useAuth } from '@/composables/useAuth.js'
import { getProblemDetailsBatch } from '@/composables/useProblemLibrary.js'
import { uploadImages, getImageURLs } from '@/composables/useStorage.js'
import { app } from '@/lib/tcb.js'
import { compressImage } from '@/lib/imageUtils.js'
import { checkContent, checkImage } from '@/lib/moderate.js'
import { useToast } from '@/composables/useToast.js'
import { isAvatarImage, avatarFallback } from '@/lib/avatar.js'

const props = defineProps({
  currentUser: { type: Object, required: true },
  initialTab: { type: String, default: 'fav' },
})
const emit = defineEmits(['back', 'go-detail', 'go-submit', 'go-home', 'go-market'])

// ── composables ──
const { favorites, fetchFavorites, removeFavorites } = useFavorites()
const { metaMap, fetchProblemMeta } = useProblemMeta()
const { userProblems, fetchMyProblems, fetchMyProblemsCount, deleteUserProblem, updateUserProblem, fetchUserProblems } = useUserProblems()
const { posts: myPosts, fetchMyPosts, fetchMyPostsCount, createPost, deletePost, updatePostStatus, updatePost } = useMarket()
const { getUserActivity } = useCommunity()
const { setupProfile, updateAvatar, changePassword } = useAuth()
const { success, error: toastError, info } = useToast()

// ── 全局状态 ──
const loading     = ref(true)
const myProblems  = ref([])
const myProblemCount = ref(0)
const myPostCount = ref(0)
const activeTab   = ref(props.initialTab || 'fav')
const navScrolled = ref(false)
// subView: 'tabs' | 'edit-problem'
const subView     = ref('tabs')
const favoriteProblems = ref([])
const favoriteQuery = ref('')
const favoriteCategory = ref('全部')
const favoritesLoaded = ref(false)
const submissionsLoaded = ref(false)
const marketLoaded = ref(false)
const activityLoaded = ref(false)
const communityActivity = ref({
  comments: [],
  solutions: [],
  encounters: [],
  timeline: [],
  stats: { commentCount: 0, solutionCount: 0, encounterCount: 0, receivedLikes: 0 },
})

// ── Tab 定义 ──
const TABS = [
  { id: 'fav',       label: '我的收藏' },
  { id: 'submitted', label: '我的投稿' },
  { id: 'market',    label: '需求发布' },
  { id: 'achievements', label: '成就中心' },
  { id: 'account',   label: '账号设置' },
]

const favTotal = computed(() => favoriteProblems.value.length)
const favoriteCategories = computed(() => ['全部', ...new Set(favoriteProblems.value.map(p => p.category).filter(Boolean))])
const favProblems = computed(() => {
  const q = favoriteQuery.value.trim().toLowerCase()
  return favoriteProblems.value.filter((problem) => {
    if (favoriteCategory.value !== '全部' && problem.category !== favoriteCategory.value) return false
    if (!q) return true
    return [
      problem.title,
      problem.subtitle,
      problem.category,
      problem.description,
    ].filter(Boolean).some((field) => field.toLowerCase().includes(q))
  })
})

const contributionStats = computed(() => ({
  favorites: favTotal.value,
  submissions: myProblems.value.length,
  marketPosts: myPosts.value.length,
  solutions: communityActivity.value.stats.solutionCount,
  comments: communityActivity.value.stats.commentCount,
  encounters: communityActivity.value.stats.encounterCount,
  receivedLikes: communityActivity.value.stats.receivedLikes,
  points: props.currentUser.points ?? 0,
}))

const achievementBadges = computed(() => {
  const stats = contributionStats.value
  return [
    { key: 'first-fav', label: '收藏起步', desc: '收藏 1 个问题', unlocked: stats.favorites >= 1 },
    { key: 'collector', label: '问题收藏家', desc: '收藏 10 个问题', unlocked: stats.favorites >= 10 },
    { key: 'contributor', label: '经验投稿者', desc: '投稿 1 个问题', unlocked: stats.submissions >= 1 },
    { key: 'builder', label: '题库建设者', desc: '投稿 5 个问题', unlocked: stats.submissions >= 5 },
    { key: 'helper', label: '热心解答者', desc: '发布 3 条社区方案', unlocked: stats.solutions >= 3 },
    { key: 'speaker', label: '交流达人', desc: '发表评论 5 条', unlocked: stats.comments >= 5 },
    { key: 'resonance', label: '同路人', desc: '标记“我也遇到过” 5 次', unlocked: stats.encounters >= 5 },
    { key: 'trusted', label: '被认可', desc: '累计获得 10 个点赞', unlocked: stats.receivedLikes >= 10 },
  ]
})

const unlockedBadgeCount = computed(() => achievementBadges.value.filter(b => b.unlocked).length)

const activityTimeline = computed(() =>
  [...communityActivity.value.timeline].sort((a, b) => b.createdAt - a.createdAt)
)

const tabCount = (id) => {
  if (id === 'fav')       return favTotal.value
  if (id === 'submitted') return submissionsLoaded.value ? myProblems.value.length : myProblemCount.value
  if (id === 'market')    return marketLoaded.value ? myPosts.value.length : myPostCount.value
  if (id === 'achievements') return unlockedBadgeCount.value
  return 0
}

watch(() => props.initialTab, (tab) => {
  if (tab && tab !== activeTab.value) activeTab.value = tab
})

function openProblemDetail(id) {
  emit('go-detail', { id, tab: activeTab.value })
}

// ── 初始化 ──
const onScroll = () => { navScrolled.value = window.scrollY > 20 }

async function hydrateProblemsByIds(problemIds) {
  const uniqueIds = [...new Set((problemIds || []).filter(Boolean))]
  const details = await getProblemDetailsBatch(uniqueIds, { extraItems: userProblems.value })
  return new Map(details.filter(Boolean).map((problem) => [problem.id, problem]))
}

async function loadFavoriteProblems() {
  if (favoritesLoaded.value) return
  const ids = [...favorites.value]
  if (!ids.length) {
    favoriteProblems.value = []
    favoritesLoaded.value = true
    return
  }
  const details = await getProblemDetailsBatch(ids, { extraItems: userProblems.value })
  const missingIds = ids.filter((id) => !details.some((problem) => problem.id === id))
  if (missingIds.length) {
    await removeFavorites(missingIds, props.currentUser.id)
  }
  favoriteProblems.value = details
    .filter(Boolean)
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
  favoritesLoaded.value = true
}

async function loadCommunityActivity(uid) {
  if (activityLoaded.value) return
  const raw = await getUserActivity(uid)
  const problemMap = await hydrateProblemsByIds([
    ...raw.comments.map(item => item.problemId),
    ...raw.solutions.map(item => item.problemId),
    ...raw.encounters.map(item => item.problemId),
  ])

  const comments = raw.comments.map((item) => ({ ...item, problem: problemMap.get(item.problemId) || null }))
  const solutions = raw.solutions.map((item) => ({ ...item, problem: problemMap.get(item.problemId) || null }))
  const encounters = raw.encounters.map((item) => ({ ...item, problem: problemMap.get(item.problemId) || null }))

  communityActivity.value = {
    comments,
    solutions,
    encounters,
    stats: raw.stats,
    timeline: [
      ...solutions.map(item => ({ ...item, type: 'solution' })),
      ...comments.map(item => ({ ...item, type: 'comment' })),
      ...encounters.map(item => ({ ...item, type: 'encounter' })),
    ],
  }
  activityLoaded.value = true
}

async function loadSubmittedProblems(uid) {
  if (submissionsLoaded.value) return
  myProblems.value = await fetchMyProblems(uid)
  myProblemCount.value = myProblems.value.length
  submissionsLoaded.value = true
}

async function loadMarketPosts(uid) {
  if (marketLoaded.value) return
  await fetchMyPosts(uid)
  myPostCount.value = myPosts.value.length
  marketLoaded.value = true
}

async function loadInitialProfileData(uid) {
  await Promise.all([
    fetchFavorites(uid),
    fetchUserProblems(),
    fetchMyProblemsCount(uid).then((count) => { myProblemCount.value = count }),
    fetchMyPostsCount(uid).then((count) => { myPostCount.value = count }),
  ])
  fetchProblemMeta()
  await loadFavoriteProblems()
}

async function ensureTabData(tab) {
  const uid = props.currentUser.id
  if (tab === 'fav') return loadFavoriteProblems()
  if (tab === 'submitted') return loadSubmittedProblems(uid)
  if (tab === 'market') return loadMarketPosts(uid)
  if (tab === 'achievements') return loadCommunityActivity(uid)
}

onMounted(async () => {
  window.addEventListener('scroll', onScroll, { passive: true })
  const uid = props.currentUser.id
  await loadInitialProfileData(uid)
  await ensureTabData(activeTab.value)
  loading.value = false
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))

watch(activeTab, (tab) => {
  ensureTabData(tab)
})

const currentAvatarIsImage = computed(() => isAvatarImage(props.currentUser.avatar))
const currentAvatarFallback = computed(() => avatarFallback(props.currentUser.avatar, props.currentUser.username))

// ════════════════════════════════════════════════════
// 一、我的投稿（原 MyProblemsView）
// ════════════════════════════════════════════════════
const CATEGORIES   = ['打印机整机', '喷头热端', '挤出机', '热床', 'AMS送料', '耗材材料', '切片软件', '校准调平', '打印质量', '固件设置']
const DIFFICULTIES = ['常见', '需处理', '紧急', '进阶']

const CAT_META = {
  '打印机整机': { emoji: '🖨️', bg: 'linear-gradient(135deg,#0a0f1a,#0f1a2d)', color: '#74b9ff' },
  '喷头热端':   { emoji: '🔥', bg: 'linear-gradient(135deg,#1a0a0a,#2d1010)', color: '#ff7675' },
  '挤出机':     { emoji: '⚙️', bg: 'linear-gradient(135deg,#0f1214,#1a1e22)', color: '#b2bec3' },
  '热床':       { emoji: '🛏️', bg: 'linear-gradient(135deg,#1a0a12,#2d0f1e)', color: '#fd79a8' },
  'AMS送料':    { emoji: '🎡', bg: 'linear-gradient(135deg,#0f0a1a,#1a0f2d)', color: '#a29bfe' },
  '耗材材料':   { emoji: '🧵', bg: 'linear-gradient(135deg,#1a160a,#2d230f)', color: '#fdcb6e' },
  '切片软件':   { emoji: '✂️', bg: 'linear-gradient(135deg,#0a1a1a,#0f2d2d)', color: '#00cec9' },
  '校准调平':   { emoji: '📐', bg: 'linear-gradient(135deg,#0a0f1a,#0f1e2d)', color: '#0984e3' },
  '打印质量':   { emoji: '🎨', bg: 'linear-gradient(135deg,#1a120a,#2d1e0f)', color: '#e17055' },
  '固件设置':   { emoji: '⚡', bg: 'linear-gradient(135deg,#0a1a14,#0f2d1e)', color: '#55efc4' },
}
const DIFF_COLOR = { '常见': '#6e6e73', '需处理': '#7048e8', '紧急': '#e03131', '进阶': '#1971c2' }
const DIFF_BG    = { '常见': 'rgba(110,110,115,.15)', '需处理': 'rgba(112,72,232,.18)', '紧急': 'rgba(224,49,49,.18)', '进阶': 'rgba(25,113,194,.18)' }
const catMeta = (cat) => CAT_META[cat] || { emoji: '🔧', bg: 'linear-gradient(135deg,#1a0a0a,#2d0f0f)', color: '#ff6b6b' }

// 删除投稿
const deletingProblem = ref(null)
async function handleDeleteProblem(p) {
  if (!confirm(`确定删除「${p.title}」吗？`)) return
  deletingProblem.value = p.id
  try {
    await deleteUserProblem(p.id)
    myProblems.value = myProblems.value.filter(x => x.id !== p.id)
    myProblemCount.value = Math.max(0, myProblemCount.value - 1)
    favoriteProblems.value = favoriteProblems.value.filter(x => x.id !== p.problemId && x.id !== p.id)
    await removeFavorites([p.problemId, p.id], props.currentUser.id)
  } finally { deletingProblem.value = null }
}

// 编辑投稿（内联视图）
const editTarget  = ref(null)
const editForm    = reactive({
  category: '打印机整机', difficulty: '常见',
  title: '', subtitle: '', description: '',
  causes: [''],
  solutions: [{ title: '', detail: '', imageFile: null, imagePreview: null, image_url: null }],
  tips: '',
})
const editImgFile    = ref(null)
const editImgPreview = ref(null)
const keepImg        = ref(true)
const editErrors     = ref({})
const saving         = ref(false)

const eColor = computed(() => catMeta(editForm.category).color)
const eBg    = computed(() => catMeta(editForm.category).bg)
const eEmoji = computed(() => catMeta(editForm.category).emoji)

function openEditProblem(p) {
  editTarget.value     = p
  editForm.category    = p.category    || '打印机整机'
  editForm.difficulty  = p.difficulty  || '常见'
  editForm.title       = p.title       || ''
  editForm.subtitle    = p.subtitle    || ''
  editForm.description = p.description || ''
  editForm.causes      = p.causes?.length ? [...p.causes] : ['']
  editForm.solutions   = p.solutions?.length
    ? p.solutions.map(s => ({ title: s.title || '', detail: s.detail || '', imageFile: null, imagePreview: null, image_url: s.image_url || null }))
    : [{ title: '', detail: '', imageFile: null, imagePreview: null, image_url: null }]
  editForm.tips        = p.tips || ''
  editImgFile.value    = null
  editImgPreview.value = null
  keepImg.value        = !!p.image_url
  editErrors.value     = {}
  subView.value        = 'edit-problem'
  window.scrollTo(0, 0)
}
function cancelEditProblem() { subView.value = 'tabs'; editTarget.value = null; window.scrollTo(0, 0) }

function onEditImgChange(e) {
  const file = e.target.files[0]; if (!file) return
  if (editImgPreview.value) URL.revokeObjectURL(editImgPreview.value)
  editImgFile.value = file; editImgPreview.value = URL.createObjectURL(file)
  keepImg.value = false; e.target.value = ''
}
function removeEditImg() {
  if (editImgPreview.value) URL.revokeObjectURL(editImgPreview.value)
  editImgFile.value = null; editImgPreview.value = null; keepImg.value = false
}
function onSolImgChange(e, i) {
  const file = e.target.files[0]; if (!file) return
  if (editForm.solutions[i].imagePreview) URL.revokeObjectURL(editForm.solutions[i].imagePreview)
  editForm.solutions[i].imageFile = file
  editForm.solutions[i].imagePreview = URL.createObjectURL(file)
  editForm.solutions[i].image_url = null; e.target.value = ''
}
function removeSolImg(i) {
  if (editForm.solutions[i].imagePreview) URL.revokeObjectURL(editForm.solutions[i].imagePreview)
  editForm.solutions[i].imageFile = null; editForm.solutions[i].imagePreview = null; editForm.solutions[i].image_url = null
}
const addCause    = () => { if (editForm.causes.length < 8) editForm.causes.push('') }
const removeCause = (i) => { if (editForm.causes.length > 1) editForm.causes.splice(i, 1) }
const addSolution    = () => { if (editForm.solutions.length < 10) editForm.solutions.push({ title: '', detail: '', imageFile: null, imagePreview: null, image_url: null }) }
const removeSolution = (i) => { if (editForm.solutions.length > 1) { removeSolImg(i); editForm.solutions.splice(i, 1) } }

async function uploadOne(file, dir) {
  const compressed = await compressImage(file)
  const { pass, msg } = await checkImage(compressed)
  if (!pass) throw new Error(msg)
  const cloudPath  = `${dir}/${props.currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
  const { fileID } = await app.uploadFile({ cloudPath, filePath: compressed })
  return fileID
}

async function saveEditProblem() {
  const e = {}
  if (!editForm.title.trim())       e.title       = '请填写问题标题'
  if (!editForm.subtitle.trim())    e.subtitle    = '请填写一句话描述'
  if (!editForm.description.trim()) e.description = '请填写详细描述'
  editErrors.value = e
  if (Object.keys(e).length) return
  saving.value = true
  try {
    const contentText = [editForm.title, editForm.subtitle, editForm.description, ...editForm.causes, editForm.tips].filter(Boolean).join('\n')
    const { pass, msg } = await checkContent(contentText)
    if (!pass) { editErrors.value = { submit: msg }; return }
    let image_url = keepImg.value ? (editTarget.value.image_url || null) : null
    if (editImgFile.value) image_url = await uploadOne(editImgFile.value, 'problem-images')
    const solutions = await Promise.all(
      editForm.solutions.filter(s => s.title.trim()).map(async (s, i) => {
        let sol_image_url = s.image_url || null
        if (s.imageFile) sol_image_url = await uploadOne(s.imageFile, 'solution-images')
        return { step: i + 1, title: s.title.trim(), detail: s.detail.trim(), image_url: sol_image_url }
      })
    )
    await updateUserProblem(editTarget.value.id, {
      category: editForm.category, difficulty: editForm.difficulty,
      title: editForm.title.trim(), subtitle: editForm.subtitle.trim(),
      description: editForm.description.trim(),
      causes: editForm.causes.filter(c => c.trim()),
      solutions, tips: editForm.tips.trim(), image_url,
    })
    submissionsLoaded.value = false
    await loadSubmittedProblems(props.currentUser.id)
    fetchUserProblems()
    success('投稿保存成功')
    cancelEditProblem()
  } catch (err) {
    editErrors.value = { submit: err.message || '保存失败，请重试' }
    toastError(editErrors.value.submit)
  } finally {
    saving.value = false
  }
}

function formatDate(ts) {
  if (!ts) return ''
  try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) } catch { return '' }
}

// ════════════════════════════════════════════════════
// 二、求助帖（原 MyPostsView）
// ════════════════════════════════════════════════════
const FORM_CATEGORIES = ['代打服务', '求购耗材', '出售设备', '技术求助', '其他']
const CAT_STYLE = {
  '代打服务': { background: 'rgba(249,115,22,.18)', color: '#fb923c' },
  '求购耗材': { background: 'rgba(99,102,241,.18)',  color: '#818cf8' },
  '出售设备': { background: 'rgba(168,85,247,.18)',  color: '#c084fc' },
  '技术求助': { background: 'rgba(6,182,212,.18)',   color: '#22d3ee' },
  '其他':     { background: 'rgba(107,114,128,.18)', color: '#9ca3af' },
}

function makeImgState() { return { files: ref([]), previews: ref([]) } }
function addFiles(state, e) {
  const toAdd = [...e.target.files].slice(0, 5 - state.files.value.length)
  toAdd.forEach(f => { state.files.value.push(f); state.previews.value.push(URL.createObjectURL(f)) })
  e.target.value = ''
}
function removeFile(state, i) { URL.revokeObjectURL(state.previews.value[i]); state.files.value.splice(i, 1); state.previews.value.splice(i, 1) }
function clearFiles(state) { state.previews.value.forEach(u => URL.revokeObjectURL(u)); state.files.value = []; state.previews.value = [] }

// 发布弹窗
const showCreate  = ref(false)
const createForm  = ref({ title: '', category: '代打服务', description: '', budget: '' })
const createError = ref('')
const creating    = ref(false)
const createImg   = makeImgState()

function openCreate() {
  createForm.value = { title: '', category: '代打服务', description: '', budget: '' }
  createError.value = ''; clearFiles(createImg); showCreate.value = true
}
async function submitCreate() {
  const { title, description } = createForm.value
  if (!title.trim() || !description.trim()) { createError.value = '标题和描述不能为空'; return }
  creating.value = true; createError.value = ''
  try {
    const { pass, msg } = await checkContent(`${createForm.value.title}\n${createForm.value.description}`)
    if (!pass) { createError.value = msg; return }
    for (const file of createImg.files.value) {
      const { pass: ip, msg: im } = await checkImage(file)
      if (!ip) { createError.value = im; return }
    }
    const images = createImg.files.value.length ? await uploadImages(createImg.files.value, props.currentUser.id) : []
    await createPost(props.currentUser.id, { ...createForm.value, images })
    clearFiles(createImg); showCreate.value = false
    marketLoaded.value = false
    await loadMarketPosts(props.currentUser.id)
    success('需求发布成功')
  } catch (e) { createError.value = e.message } finally { creating.value = false }
}

// 编辑弹窗
const showEdit         = ref(false)
const editingPost      = ref(null)
const editPostForm     = ref({ title: '', category: '代打服务', description: '', budget: '' })
const editPostError    = ref('')
const editingPost_     = ref(false)
const editImg          = makeImgState()
const editExistingImgs = ref([])

async function openEditPost(post) {
  editingPost.value  = post
  editPostForm.value = { title: post.title, category: post.category, description: post.description, budget: post.budget || '' }
  editPostError.value = ''; clearFiles(editImg); editExistingImgs.value = []
  showEdit.value = true
  if (post.images?.length) editExistingImgs.value = await getImageURLs(post.images)
}
function removeExistingImg(i) { editExistingImgs.value.splice(i, 1) }
async function submitEditPost() {
  const { title, description } = editPostForm.value
  if (!title.trim() || !description.trim()) { editPostError.value = '标题和描述不能为空'; return }
  editingPost_.value = true; editPostError.value = ''
  try {
    const { pass, msg } = await checkContent(`${editPostForm.value.title}\n${editPostForm.value.description}`)
    if (!pass) { editPostError.value = msg; return }
    for (const file of editImg.files.value) {
      const { pass: ip, msg: im } = await checkImage(file)
      if (!ip) { editPostError.value = im; return }
    }
    const newFileIDs = editImg.files.value.length ? await uploadImages(editImg.files.value, props.currentUser.id) : []
    const images = [...editExistingImgs.value.map(i => i.id), ...newFileIDs]
    await updatePost(editingPost.value.id, { ...editPostForm.value, images })
    clearFiles(editImg); showEdit.value = false
    marketLoaded.value = false
    await loadMarketPosts(props.currentUser.id)
    success('需求保存成功')
  } catch (e) { editPostError.value = e.message } finally { editingPost_.value = false }
}

// 状态切换 & 删除帖子
const actionLoading = ref({})
async function toggleStatus(post) {
  const next = post.status === '待解决' ? '已解决' : '待解决'
  actionLoading.value[post.id + '_s'] = true
  try {
    await updatePostStatus(post.id, next); post.status = next
    info(next === '已解决' ? '已标记为已解决' : '已重新开启需求')
  } catch (e) { toastError(e.message || '状态更新失败') }
  finally { delete actionLoading.value[post.id + '_s'] }
}
async function removePost(post) {
  if (!confirm('确定删除这条需求？')) return
  actionLoading.value[post.id + '_d'] = true
  try {
    await deletePost(post.id)
    marketLoaded.value = false
    await loadMarketPosts(props.currentUser.id)
    success('需求已删除')
  } catch (e) {
    toastError(e?.message || '删除失败')
  }
  finally { delete actionLoading.value[post.id + '_d'] }
}

// ════════════════════════════════════════════════════
// 三、账号设置
// ════════════════════════════════════════════════════
const usernameForm    = ref({ username: props.currentUser.username })
const usernameError   = ref('')
const usernameSuccess = ref('')
const usernameLoading = ref(false)
const avatarError = ref('')
const avatarSuccess = ref('')
const avatarLoading = ref(false)
const showAvatarCropper = ref(false)
const avatarCropSource = ref('')
const avatarCropFile = ref(null)
const avatarCropFrameRef = ref(null)
const avatarCropFrameSize = ref(280)
const avatarScale = ref(1)
const avatarScaleMin = 1
const avatarScaleMax = 3
const avatarOffset = reactive({ x: 0, y: 0 })
const avatarImageMeta = reactive({ width: 0, height: 0 })
const avatarDragState = reactive({
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
})

const avatarBaseScale = computed(() => {
  if (!avatarImageMeta.width || !avatarImageMeta.height || !avatarCropFrameSize.value) return 1
  return Math.max(
    avatarCropFrameSize.value / avatarImageMeta.width,
    avatarCropFrameSize.value / avatarImageMeta.height,
  )
})

const avatarImageTransform = computed(() => {
  const scale = avatarBaseScale.value * avatarScale.value
  return {
    width: `${avatarImageMeta.width * scale}px`,
    height: `${avatarImageMeta.height * scale}px`,
    transform: `translate(calc(-50% + ${avatarOffset.x}px), calc(-50% + ${avatarOffset.y}px))`,
  }
})

const avatarZoomPercent = computed(() => `${Math.round(avatarScale.value * 100)}%`)

async function submitUsername() {
  usernameError.value = ''; usernameSuccess.value = ''
  if (!usernameForm.value.username.trim()) { usernameError.value = '请输入用户名'; return }
  usernameLoading.value = true
  try {
    await setupProfile(usernameForm.value.username.trim())
    usernameSuccess.value = '用户名已更新'
    success('用户名已更新')
  } catch (e) { usernameError.value = e.message || String(e) }
  finally { usernameLoading.value = false }
}

function revokeAvatarCropSource() {
  if (avatarCropSource.value?.startsWith('blob:')) {
    URL.revokeObjectURL(avatarCropSource.value)
  }
}

function clampAvatarOffset(x, y) {
  const frameSize = avatarCropFrameSize.value
  const displayWidth = avatarImageMeta.width * avatarBaseScale.value * avatarScale.value
  const displayHeight = avatarImageMeta.height * avatarBaseScale.value * avatarScale.value
  const limitX = Math.max(0, (displayWidth - frameSize) / 2)
  const limitY = Math.max(0, (displayHeight - frameSize) / 2)

  return {
    x: Math.min(limitX, Math.max(-limitX, x)),
    y: Math.min(limitY, Math.max(-limitY, y)),
  }
}

function applyAvatarOffset(x, y) {
  const next = clampAvatarOffset(x, y)
  avatarOffset.x = next.x
  avatarOffset.y = next.y
}

function resetAvatarDragState() {
  avatarDragState.active = false
  avatarDragState.pointerId = null
}

function resetAvatarCropper({ revoke = true } = {}) {
  resetAvatarDragState()
  if (revoke) revokeAvatarCropSource()
  showAvatarCropper.value = false
  avatarCropSource.value = ''
  avatarCropFile.value = null
  avatarCropFrameSize.value = 280
  avatarScale.value = 1
  avatarOffset.x = 0
  avatarOffset.y = 0
  avatarImageMeta.width = 0
  avatarImageMeta.height = 0
}

function loadAvatarImageMeta(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error('头像图片读取失败，请换一张试试'))
    image.src = src
  })
}

async function openAvatarCropper(file) {
  avatarError.value = ''
  avatarSuccess.value = ''

  if (!file?.type?.startsWith('image/')) {
    avatarError.value = '请选择图片文件'
    toastError(avatarError.value)
    return
  }

  try {
    resetAvatarCropper()
    const source = URL.createObjectURL(file)
    const meta = await loadAvatarImageMeta(source)

    avatarCropSource.value = source
    avatarCropFile.value = file
    avatarImageMeta.width = meta.width
    avatarImageMeta.height = meta.height
    showAvatarCropper.value = true

    await nextTick()
    avatarCropFrameSize.value = avatarCropFrameRef.value?.clientWidth || 280
    avatarScale.value = 1
    applyAvatarOffset(0, 0)
  } catch (e) {
    avatarError.value = e.message || String(e)
    toastError(avatarError.value)
  }
}

async function handleAvatarChange(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  await openAvatarCropper(file)
}

function closeAvatarCropper() {
  resetAvatarCropper()
}

function startAvatarDrag(event) {
  if (!showAvatarCropper.value || !avatarCropSource.value) return

  event.preventDefault()
  avatarDragState.active = true
  avatarDragState.pointerId = event.pointerId
  avatarDragState.startX = event.clientX
  avatarDragState.startY = event.clientY
  avatarDragState.originX = avatarOffset.x
  avatarDragState.originY = avatarOffset.y
  event.currentTarget?.setPointerCapture?.(event.pointerId)
}

function moveAvatarDrag(event) {
  if (!avatarDragState.active || event.pointerId !== avatarDragState.pointerId) return
  const deltaX = event.clientX - avatarDragState.startX
  const deltaY = event.clientY - avatarDragState.startY
  applyAvatarOffset(avatarDragState.originX + deltaX, avatarDragState.originY + deltaY)
}

function endAvatarDrag(event) {
  if (!avatarDragState.active || event.pointerId !== avatarDragState.pointerId) return
  event.currentTarget?.releasePointerCapture?.(avatarDragState.pointerId)
  resetAvatarDragState()
}

function exportAvatarCroppedFile() {
  return new Promise((resolve, reject) => {
    if (!avatarCropSource.value || !avatarImageMeta.width || !avatarImageMeta.height) {
      reject(new Error('头像图片还没准备好，请稍后再试'))
      return
    }

    const image = new Image()
    image.onload = () => {
      const frameSize = avatarCropFrameSize.value
      const displayScale = avatarBaseScale.value * avatarScale.value
      const sourceSize = frameSize / displayScale
      const sourceX = (avatarImageMeta.width / 2) - (sourceSize / 2) - (avatarOffset.x / displayScale)
      const sourceY = (avatarImageMeta.height / 2) - (sourceSize / 2) - (avatarOffset.y / displayScale)

      const safeSourceX = Math.min(
        Math.max(0, sourceX),
        Math.max(0, avatarImageMeta.width - sourceSize),
      )
      const safeSourceY = Math.min(
        Math.max(0, sourceY),
        Math.max(0, avatarImageMeta.height - sourceSize),
      )

      const canvas = document.createElement('canvas')
      canvas.width = 360
      canvas.height = 360
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('头像裁剪失败，请稍后再试'))
        return
      }

      context.drawImage(
        image,
        safeSourceX,
        safeSourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        canvas.width,
        canvas.height,
      )

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('头像裁剪失败，请稍后再试'))
          return
        }
        resolve(new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.82)
    }
    image.onerror = () => reject(new Error('头像裁剪失败，请换一张图片试试'))
    image.src = avatarCropSource.value
  })
}

async function confirmAvatarCrop() {
  if (!avatarCropFile.value) return

  avatarError.value = ''
  avatarSuccess.value = ''
  avatarLoading.value = true
  try {
    const croppedFile = await exportAvatarCroppedFile()
    await updateAvatar(croppedFile)
    avatarSuccess.value = '头像已更新'
    success('头像已更新')
    closeAvatarCropper()
  } catch (e) {
    avatarError.value = e.message || String(e)
    toastError(avatarError.value)
  } finally {
    avatarLoading.value = false
  }
}

const pwdForm    = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdError   = ref('')
const pwdSuccess = ref('')
const pwdLoading = ref(false)

async function submitPwd() {
  pwdError.value = ''; pwdSuccess.value = ''
  const { oldPassword, newPassword, confirmPassword } = pwdForm.value
  if (!oldPassword)                    { pwdError.value = '请输入原密码'; return }
  if (newPassword.length < 6)          { pwdError.value = '新密码至少6位'; return }
  if (newPassword !== confirmPassword) { pwdError.value = '两次密码不一致'; return }
  pwdLoading.value = true
  try {
    await changePassword(oldPassword, newPassword)
    pwdSuccess.value = '密码已修改成功'
    success('密码修改成功')
    pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (e) { pwdError.value = e.message || String(e) }
  finally { pwdLoading.value = false }
}

// ── 工具函数 ──
const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return '刚刚'
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`
  if (s < 2592000) return `${Math.floor(s / 86400)} 天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}
const STATUS_CLASS = { '待解决': 'open', '已解决': 'done', '进行中': 'active' }
const statusClass = (s) => STATUS_CLASS[s] || 'open'

watch(avatarScale, () => {
  applyAvatarOffset(avatarOffset.x, avatarOffset.y)
})

onUnmounted(() => {
  revokeAvatarCropSource()
})
</script>

<template>
  <div class="profile-page">

    <!-- ── 顶部导航 ── -->
    <nav class="pnav" :class="{ scrolled: navScrolled }">
      <button class="back-btn" @click="subView === 'edit-problem' ? cancelEditProblem() : $emit('back')">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 4L6 9l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ subView === 'edit-problem' ? '返回个人主页' : '返回' }}
      </button>
      <span v-if="subView === 'edit-problem'" class="pnav-title">编辑问题</span>
    </nav>

    <!-- ══════════ 编辑投稿（全屏内联视图）══════════ -->
    <div v-if="subView === 'edit-problem'" class="edit-wrap">

      <header class="detail-hero" :style="{ background: eBg }">
        <div class="hero-content">
          <div class="hero-emoji">{{ eEmoji }}</div>
          <div class="hero-glow" :style="{ background: eColor }"></div>
          <div class="hero-meta">
            <input v-model="editForm.title" class="hero-title-input" :class="{ 'has-error': editErrors.title }"
              placeholder="问题标题" maxlength="40" />
            <p v-if="editErrors.title" class="hero-err">{{ editErrors.title }}</p>
            <input v-model="editForm.subtitle" class="hero-sub-input" :class="{ 'has-error': editErrors.subtitle }"
              placeholder="一句话描述" maxlength="40" />
            <p v-if="editErrors.subtitle" class="hero-err">{{ editErrors.subtitle }}</p>
          </div>
        </div>
      </header>

      <div class="detail-content">
        <!-- 详细描述 -->
        <section class="section">
          <h2 class="section-title"><span class="section-icon" :style="{ background: eColor + '22', color: eColor }">📝</span>详细描述</h2>
          <textarea v-model="editForm.description" class="content-textarea" :class="{ 'has-error': editErrors.description }"
            rows="5" maxlength="600" placeholder="详细描述问题的具体表现…"></textarea>
          <p v-if="editErrors.description" class="field-err">{{ editErrors.description }}</p>
        </section>
        <!-- 问题类型 -->
        <section class="section">
          <h2 class="section-title"><span class="section-icon" :style="{ background: eColor + '22', color: eColor }">🏷️</span>问题类型</h2>
          <div class="select-chips">
            <button v-for="c in CATEGORIES" :key="c" :class="['select-chip', { active: editForm.category === c }]"
              :style="editForm.category === c ? { background: eColor + '18', borderColor: eColor, color: eColor } : {}"
              type="button" @click="editForm.category = c">{{ c }}</button>
          </div>
        </section>
        <!-- 问题重要性 -->
        <section class="section">
          <h2 class="section-title"><span class="section-icon" :style="{ background: eColor + '22', color: eColor }">⚠️</span>问题重要性</h2>
          <div class="select-chips">
            <button v-for="d in DIFFICULTIES" :key="d" :class="['select-chip', { active: editForm.difficulty === d }]"
              :style="editForm.difficulty === d ? { background: DIFF_BG[d], borderColor: DIFF_COLOR[d], color: DIFF_COLOR[d] } : {}"
              type="button" @click="editForm.difficulty = d">{{ d }}</button>
          </div>
        </section>
        <!-- 问题图片 -->
        <section class="section">
          <h2 class="section-title"><span class="section-icon" :style="{ background: eColor + '22', color: eColor }">📷</span>问题图片<span class="optional-tag">选填</span></h2>
          <div v-if="editImgPreview" class="img-preview-wrap">
            <img :src="editImgPreview" class="img-preview" alt="" />
            <button class="img-remove-btn" type="button" @click="removeEditImg">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div v-else-if="keepImg && editTarget?.image_url" class="img-preview-wrap">
            <img :src="editTarget.image_url" class="img-preview" alt="" />
            <button class="img-remove-btn" type="button" @click="keepImg = false">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            </button>
          </div>
          <label v-else class="img-upload-area">
            <input type="file" accept="image/*" style="display:none" @change="onEditImgChange" />
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 6v16M6 14h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            <span>点击上传图片</span>
          </label>
        </section>
        <!-- 可能原因 -->
        <section class="section">
          <h2 class="section-title"><span class="section-icon" :style="{ background: eColor + '22', color: eColor }">⚡</span>可能原因</h2>
          <div class="causes-edit-grid">
            <div v-for="(_, i) in editForm.causes" :key="i" class="cause-edit-item">
              <span class="cause-num" :style="{ color: eColor }">0{{ i + 1 }}</span>
              <input v-model="editForm.causes[i]" class="cause-input" :placeholder="`原因 ${i + 1}`" maxlength="60" />
              <button v-if="editForm.causes.length > 1" class="icon-remove" type="button" @click="removeCause(i)">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              </button>
            </div>
          </div>
          <button class="add-row-btn" type="button" @click="addCause" :disabled="editForm.causes.length >= 8">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            添加原因
          </button>
        </section>
        <!-- 解决步骤 -->
        <section class="section">
          <h2 class="section-title"><span class="section-icon" :style="{ background: eColor + '22', color: eColor }">🔧</span>解决步骤</h2>
          <div class="solutions-edit-list">
            <div v-for="(sol, i) in editForm.solutions" :key="i" class="solution-edit-item">
              <div class="sol-edit-head">
                <span class="sol-step-badge" :style="{ background: eColor }">{{ i + 1 }}</span>
                <span class="sol-step-label">步骤 {{ i + 1 }}</span>
                <button v-if="editForm.solutions.length > 1" class="icon-remove" type="button" @click="removeSolution(i)">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </button>
              </div>
              <input v-model="sol.title" class="content-input" placeholder="步骤名称" maxlength="40" />
              <textarea v-model="sol.detail" class="content-textarea small" rows="3" maxlength="300" placeholder="操作说明"></textarea>
              <div class="sol-img-section">
                <div v-if="sol.imagePreview" class="sol-img-preview-wrap">
                  <img :src="sol.imagePreview" class="sol-img-preview" />
                  <button class="img-remove-btn small" type="button" @click="removeSolImg(i)">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                  </button>
                </div>
                <div v-else-if="sol.image_url" class="sol-img-preview-wrap">
                  <img :src="sol.image_url" class="sol-img-preview" />
                  <button class="img-remove-btn small" type="button" @click="removeSolImg(i)">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                  </button>
                </div>
                <label v-else class="sol-img-upload">
                  <input type="file" accept="image/*" style="display:none" @change="e => onSolImgChange(e, i)" />
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                  <span>上传步骤图片（选填）</span>
                </label>
              </div>
            </div>
          </div>
          <button class="add-row-btn" type="button" @click="addSolution" :disabled="editForm.solutions.length >= 10">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            添加步骤
          </button>
        </section>
        <!-- 小贴士 -->
        <section class="section">
          <h2 class="section-title"><span class="section-icon" :style="{ background: eColor + '22', color: eColor }">💡</span>小贴士<span class="optional-tag">选填</span></h2>
          <div class="tip-box" :style="{ background: eColor + '0d', borderColor: eColor + '33' }">
            <textarea v-model="editForm.tips" class="tip-textarea" rows="3" maxlength="200" placeholder="补充注意事项…"></textarea>
          </div>
        </section>
        <div v-if="editErrors.submit" class="submit-err-box">{{ editErrors.submit }}</div>
        <button class="big-submit-btn" :class="{ loading: saving }" :disabled="saving" @click="saveEditProblem">
          <span v-if="saving" class="btn-spinner"></span>
          {{ saving ? '保存中…' : '保存修改' }}
        </button>
      </div>
    </div>

    <!-- ══════════ 正常 Tabs 视图 ══════════ -->
    <template v-else>

      <header class="profile-header">
        <div class="header-bg"></div>
        <div class="header-content">
          <div class="avatar-circle">
            <img v-if="currentAvatarIsImage" :src="currentUser.avatar" alt="用户头像" class="avatar-image" />
            <span v-else>{{ currentAvatarFallback }}</span>
          </div>
          <h1 class="profile-username">{{ currentUser.username }}</h1>
          <p class="profile-subtitle">管理你的收藏、投稿、需求记录和社区互动</p>
          <div class="stats-bar">
            <div class="stat-item">
              <span class="stat-num">{{ contributionStats.favorites }}</span>
              <span class="stat-lbl">收藏</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-num">{{ contributionStats.submissions }}</span>
              <span class="stat-lbl">投稿</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-num">{{ marketLoaded ? myPosts.length : myPostCount }}</span>
              <span class="stat-lbl">需求</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-num">{{ contributionStats.receivedLikes }}</span>
              <span class="stat-lbl">获赞</span>
            </div>
          </div>
          <div class="profile-summary-strip">
            <span class="summary-chip">投稿 {{ submissionsLoaded ? myProblems.length : myProblemCount }}</span>
            <span class="summary-chip">需求 {{ marketLoaded ? myPosts.length : myPostCount }}</span>
            <span class="summary-chip">评论 {{ contributionStats.comments }}</span>
            <span class="summary-chip">方案 {{ contributionStats.solutions }}</span>
          </div>
        </div>
      </header>

      <div class="ptabs">
        <button v-for="tab in TABS" :key="tab.id" :class="['ptab', { active: activeTab === tab.id }]" @click="activeTab = tab.id">
          {{ tab.label }}
          <span v-if="tabCount(tab.id) > 0" class="ptab-badge">{{ tabCount(tab.id) }}</span>
        </button>
      </div>

      <div v-if="loading" class="state-box">
        <div class="spinner"></div>
        <span>加载中…</span>
      </div>

      <template v-else>
        <div v-if="activeTab === 'fav'" class="tab-body">
          <div class="tab-header-row">
            <div>
              <span class="tab-header-title">我的收藏</span>
              <span class="tab-header-sub block">支持按分类和关键词快速找回</span>
            </div>
          </div>
          <div v-if="favTotal > 0" class="fav-toolbar">
            <div class="fav-search">
              <input v-model="favoriteQuery" placeholder="搜索收藏的问题标题、描述或分类" />
            </div>
            <div class="fav-filters">
              <button
                v-for="cat in favoriteCategories"
                :key="cat"
                :class="['fav-filter-chip', { active: favoriteCategory === cat }]"
                @click="favoriteCategory = cat"
              >{{ cat }}</button>
            </div>
          </div>
          <div v-if="favTotal === 0" class="empty">
            <span class="empty-icon">🔖</span>
            <p class="empty-title">还没有收藏</p>
            <p class="empty-sub">把常见故障先收藏起来，之后排查会快很多。</p>
            <div class="empty-actions">
              <button class="empty-btn primary" @click="emit('go-home')">去问题库看看</button>
            </div>
          </div>
          <div v-else-if="favProblems.length === 0" class="empty compact-empty">
            <span class="empty-icon">🧭</span>
            <p class="empty-title">当前筛选下没有结果</p>
            <p class="empty-sub">试试清空搜索词，或者切换别的分类。</p>
          </div>
          <div v-else class="fav-grid">
            <div v-for="p in favProblems" :key="p.id" class="fav-card" :style="{ '--c': p.color }" @click="openProblemDetail(p.id)">
              <div class="fav-img" :style="{ background: p.bgGradient }">
                <img v-if="metaMap[p.id]?.image_url || p.image_url" :src="metaMap[p.id]?.image_url || p.image_url" :alt="p.title" loading="lazy" />
                <span v-else class="fav-emoji">{{ p.emoji }}</span>
              </div>
              <div class="fav-body">
                <span class="fav-cat" :style="{ color: p.color }">{{ p.category }}</span>
                <p class="fav-title">{{ p.title }}</p>
                <p class="fav-sub">{{ p.subtitle }}</p>
                <span class="fav-diff" :class="'diff-' + p.difficulty">{{ p.difficulty }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'submitted'" class="tab-body">
          <div class="tab-header-row">
            <div>
              <span class="tab-header-title">我的投稿</span>
              <span class="tab-header-sub block">你贡献的问题会同步进入公开问题库</span>
            </div>
          </div>
          <div v-if="myProblems.length === 0" class="empty">
            <span class="empty-icon">📝</span>
            <p class="empty-title">还没有投稿</p>
            <p class="empty-sub">把自己踩过的坑写下来，后来的人会很感谢你。</p>
            <div class="empty-actions">
              <button class="empty-btn primary" @click="emit('go-submit')">去提交问题</button>
            </div>
          </div>
          <div v-else class="problem-list">
            <div v-for="p in myProblems" :key="p.id" class="problem-item">
              <div class="item-hero" :style="{ background: catMeta(p.category).bg }">
                <div class="item-glow" :style="{ background: catMeta(p.category).color }"></div>
                <img v-if="p.image_url" :src="p.image_url" class="item-img" alt="" />
                <span v-else class="item-emoji">{{ catMeta(p.category).emoji }}</span>
              </div>
              <div class="item-body item-link" @click="openProblemDetail(p.id)">
                <div class="item-meta">
                  <span class="item-cat" :style="{ color: catMeta(p.category).color }">{{ p.category }}</span>
                  <span class="item-diff" :style="{ background: DIFF_BG[p.difficulty], color: DIFF_COLOR[p.difficulty] }">{{ p.difficulty }}</span>
                  <span class="item-status published">已进入题库</span>
                </div>
                <h3 class="item-title">{{ p.title }}</h3>
                <p class="item-sub">{{ p.subtitle }}</p>
                <p class="item-date">{{ formatDate(p._rawCreatedAt) }}</p>
              </div>
              <div class="item-actions">
                <button class="act-btn edit" @click="openEditProblem(p)">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
                  编辑
                </button>
                <button class="act-btn del" :disabled="deletingProblem === p.id" @click="handleDeleteProblem(p)">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.8 7.5h6.4L11 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  {{ deletingProblem === p.id ? '删除中…' : '删除' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'market'" class="tab-body">
          <div class="tab-header-row">
            <div>
              <span class="tab-header-title">我的需求</span>
              <span class="tab-header-sub block">管理你发布的求助、代打和求购信息</span>
            </div>
            <button class="create-btn" @click="openCreate">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
              发布需求
            </button>
          </div>
          <div v-if="myPosts.length === 0" class="empty" style="padding-top:40px">
            <span class="empty-icon">🛒</span>
            <p class="empty-title">还没有需求记录</p>
            <p class="empty-sub">发布你的打印需求、技术求助或耗材求购信息。</p>
            <div class="empty-actions">
              <button class="empty-btn primary" @click="openCreate">立即发布需求</button>
              <button class="empty-btn" @click="emit('go-market')">去需求市场看看</button>
            </div>
          </div>
          <div v-else class="post-list">
            <div v-for="post in myPosts" :key="post.id" class="post-row">
              <div class="row-top">
                <span class="badge" :style="CAT_STYLE[post.category]">{{ post.category }}</span>
                <span :class="['status-tag', post.status === '待解决' ? 'status-open' : 'status-done']">{{ post.status }}</span>
                <span class="row-time">{{ timeAgo(post.createdAt) }}</span>
              </div>
              <h3 class="row-title">{{ post.title }}</h3>
              <p class="row-desc">{{ post.description }}</p>
              <div class="market-metrics">
                <span class="metric-chip">浏览 {{ post.viewCount || 0 }}</span>
                <span class="metric-chip">意向 {{ post.interestCount || 0 }}</span>
                <span v-if="post.budget" class="metric-chip">预算 {{ post.budget }}</span>
              </div>
              <div class="row-actions">
                <button class="act-btn edit" @click="openEditPost(post)">编辑</button>
                <button class="act-btn" :disabled="actionLoading[post.id + '_s']" @click="toggleStatus(post)">
                  {{ post.status === '待解决' ? '标记已解决' : '重新开启' }}
                </button>
                <button class="act-btn del" :disabled="actionLoading[post.id + '_d']" @click="removePost(post)">删除</button>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'achievements'" class="tab-body achievements-tab">
          <section class="achievement-section">
            <div class="tab-header-row compact">
              <span class="tab-header-title">徽章进度</span>
              <span class="tab-header-sub">{{ unlockedBadgeCount }}/{{ achievementBadges.length }} 已解锁</span>
            </div>
            <div class="badge-grid">
              <div v-for="badge in achievementBadges" :key="badge.key" :class="['badge-card', { unlocked: badge.unlocked }]">
                <span class="badge-card-mark">{{ badge.unlocked ? '✓' : '•' }}</span>
                <div class="badge-card-title">{{ badge.label }}</div>
                <div class="badge-card-desc">{{ badge.desc }}</div>
              </div>
            </div>
          </section>

          <section class="achievement-section">
            <div class="tab-header-row compact">
              <span class="tab-header-title">我的互动</span>
              <span class="tab-header-sub">评论、方案和“我也遇到过”都会沉淀在这里</span>
            </div>
            <div v-if="activityTimeline.length === 0" class="empty compact-empty">
              <span class="empty-icon">🌱</span>
              <p class="empty-title">还没有互动记录</p>
              <p class="empty-sub">去问题详情页评论、补方案，或者点一下“我也遇到过”。</p>
            </div>
            <div v-else class="activity-list">
              <div v-for="item in activityTimeline" :key="item.type + item.id" class="activity-item">
                <div class="activity-dot" :class="item.type"></div>
                <div class="activity-body">
                  <div class="activity-top">
                    <span class="activity-type">{{ item.type === 'solution' ? '发布方案' : item.type === 'comment' ? '发表评论' : '标记遇到过' }}</span>
                    <span class="activity-time">{{ timeAgo(item.createdAt) }}</span>
                  </div>
                  <div v-if="item.problem" class="activity-problem" @click="openProblemDetail(item.problem.id)">
                    {{ item.problem.title }}
                  </div>
                  <p v-if="item.type === 'solution'" class="activity-text">{{ item.title }}</p>
                  <p v-else-if="item.type === 'comment'" class="activity-text">{{ item.content }}</p>
                  <p v-else class="activity-text">这个问题我也遇到过，留下了一次有效反馈。</p>
                  <div v-if="item.likes?.length" class="activity-like">获得 {{ item.likes.length }} 个赞</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div v-else-if="activeTab === 'account'" class="tab-body account-tab">
          <div class="account-section">
            <div class="account-section-head">
              <h3 class="account-title">基本信息</h3>
              <p class="account-sub">调整你在社区里显示的用户名和当前身份信息</p>
            </div>
            <div class="account-summary-card">
              <div class="account-summary-avatar">
                <img v-if="currentAvatarIsImage" :src="currentUser.avatar" alt="用户头像" class="avatar-image" />
                <span v-else>{{ currentAvatarFallback }}</span>
              </div>
              <div class="account-summary-main">
                <div class="account-summary-name">{{ currentUser.username }}</div>
                <div class="account-summary-meta">积分 {{ contributionStats.points }}</div>
              </div>
            </div>
            <div class="account-field">
              <label>头像</label>
              <div class="avatar-upload-row">
                <label class="avatar-upload-btn" :class="{ disabled: avatarLoading }">
                  <input type="file" accept="image/*" style="display:none" :disabled="avatarLoading" @change="handleAvatarChange" />
                  {{ avatarLoading ? '上传中…' : '上传新头像' }}
                </label>
                <span class="avatar-upload-hint">支持常见图片格式，建议使用正方形头像</span>
              </div>
            </div>
            <div class="account-field">
              <label>用户名</label>
              <input v-model="usernameForm.username" placeholder="输入新用户名" maxlength="20" @keyup.enter="submitUsername" />
            </div>
            <p v-if="avatarError" class="form-error">{{ avatarError }}</p>
            <p v-if="avatarSuccess" class="form-success">{{ avatarSuccess }}</p>
            <p v-if="usernameError" class="form-error">{{ usernameError }}</p>
            <p v-if="usernameSuccess" class="form-success">{{ usernameSuccess }}</p>
            <button class="account-btn" :disabled="usernameLoading" @click="submitUsername">
              <span v-if="usernameLoading" class="btn-spinner"></span>
              {{ usernameLoading ? '保存中…' : '保存用户名' }}
            </button>
          </div>

          <div class="account-section">
            <div class="account-section-head">
              <h3 class="account-title">安全设置</h3>
              <p class="account-sub">更新密码，保护你的投稿、收藏和需求记录</p>
            </div>
            <div class="account-field">
              <label>原密码</label>
              <input v-model="pwdForm.oldPassword" type="password" placeholder="输入原密码" @keyup.enter="submitPwd" />
            </div>
            <div class="account-field">
              <label>新密码</label>
              <input v-model="pwdForm.newPassword" type="password" placeholder="至少6位，包含字母和数字" @keyup.enter="submitPwd" />
            </div>
            <div class="account-field">
              <label>确认新密码</label>
              <input v-model="pwdForm.confirmPassword" type="password" placeholder="再次输入新密码" @keyup.enter="submitPwd" />
            </div>
            <p v-if="pwdError" class="form-error">{{ pwdError }}</p>
            <p v-if="pwdSuccess" class="form-success">{{ pwdSuccess }}</p>
            <button class="account-btn" :disabled="pwdLoading" @click="submitPwd">
              <span v-if="pwdLoading" class="btn-spinner"></span>
              {{ pwdLoading ? '修改中…' : '修改密码' }}
            </button>
          </div>
        </div>
      </template>
    </template>

    <Transition name="modal">
      <div v-if="showAvatarCropper" class="modal-mask avatar-crop-modal">
        <div class="modal-box avatar-crop-box">
          <div class="modal-head avatar-crop-head">
            <div>
              <h2>调整头像</h2>
              <p class="avatar-crop-sub">拖动图片位置，确认后再上传</p>
            </div>
            <button class="close-btn" :disabled="avatarLoading" @click="closeAvatarCropper">✕</button>
          </div>
          <div class="modal-body avatar-crop-body">
            <div
              ref="avatarCropFrameRef"
              class="avatar-crop-frame"
              @pointerdown="startAvatarDrag"
              @pointermove="moveAvatarDrag"
              @pointerup="endAvatarDrag"
              @pointercancel="endAvatarDrag"
            >
              <img
                v-if="avatarCropSource"
                :src="avatarCropSource"
                alt="头像预览"
                class="avatar-crop-image"
                :style="avatarImageTransform"
                draggable="false"
              />
              <div class="avatar-crop-overlay"></div>
            </div>
            <div class="avatar-crop-controls">
              <div class="avatar-crop-zoom">
                <span>缩放</span>
                <input v-model="avatarScale" type="range" :min="avatarScaleMin" :max="avatarScaleMax" step="0.01" />
                <strong>{{ avatarZoomPercent }}</strong>
              </div>
              <p class="avatar-crop-tip">建议把主体放在圆形区域中央，上传后会同步更新全站头像。</p>
            </div>
            <div class="avatar-crop-actions">
              <button class="avatar-crop-btn secondary" :disabled="avatarLoading" @click="closeAvatarCropper">取消</button>
              <button class="avatar-crop-btn primary" :disabled="avatarLoading" @click="confirmAvatarCrop">
                <span v-if="avatarLoading" class="btn-spinner dark"></span>
                {{ avatarLoading ? '上传中…' : '确认上传' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── 发布弹窗 ── -->
    <Transition name="modal">
      <div v-if="showCreate" class="modal-mask">
        <div class="modal-box">
          <div class="modal-head"><h2>发布需求</h2><button class="close-btn" @click="showCreate = false">✕</button></div>
          <div class="modal-body">
            <div class="field"><label>类型 <span class="req">*</span></label>
              <div class="radio-group">
                <label v-for="c in FORM_CATEGORIES" :key="c" class="radio-item">
                  <input type="radio" :value="c" v-model="createForm.category" />
                  <span :style="CAT_STYLE[c]" class="radio-label">{{ c }}</span>
                </label>
              </div>
            </div>
            <div class="field"><label>标题 <span class="req">*</span></label><input v-model="createForm.title" placeholder="简洁描述你的需求" maxlength="60" /><span class="char-count">{{ createForm.title.length }}/60</span></div>
            <div class="field"><label>详细描述 <span class="req">*</span></label><textarea v-model="createForm.description" rows="4" maxlength="500"></textarea><span class="char-count">{{ createForm.description.length }}/500</span></div>
            <div class="field"><label>预算</label><input v-model="createForm.budget" placeholder="如：100元以内" /></div>
            <div class="field">
              <label>图片</label>
              <div class="img-grid">
                <div v-for="(url, i) in createImg.previews.value" :key="i" class="img-thumb"><img :src="url" /><button type="button" class="img-remove" @click="removeFile(createImg, i)">✕</button></div>
                <label v-if="createImg.previews.value.length < 5" class="img-add"><input type="file" accept="image/*" multiple style="display:none" @change="addFiles(createImg, $event)" /><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></label>
              </div>
            </div>
            <div v-if="createError" class="form-error">{{ createError }}</div>
            <button class="submit-btn" :disabled="creating" @click="submitCreate">{{ creating ? '发布中…' : '发布' }}</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── 编辑弹窗 ── -->
    <Transition name="modal">
      <div v-if="showEdit" class="modal-mask">
        <div class="modal-box">
          <div class="modal-head"><h2>编辑需求</h2><button class="close-btn" @click="showEdit = false">✕</button></div>
          <div class="modal-body">
            <div class="field"><label>类型 <span class="req">*</span></label>
              <div class="radio-group">
                <label v-for="c in FORM_CATEGORIES" :key="c" class="radio-item">
                  <input type="radio" :value="c" v-model="editPostForm.category" />
                  <span :style="CAT_STYLE[c]" class="radio-label">{{ c }}</span>
                </label>
              </div>
            </div>
            <div class="field"><label>标题 <span class="req">*</span></label><input v-model="editPostForm.title" maxlength="60" /><span class="char-count">{{ editPostForm.title.length }}/60</span></div>
            <div class="field"><label>详细描述 <span class="req">*</span></label><textarea v-model="editPostForm.description" rows="4" maxlength="500"></textarea><span class="char-count">{{ editPostForm.description.length }}/500</span></div>
            <div class="field"><label>预算</label><input v-model="editPostForm.budget" /></div>
            <div class="field">
              <label>图片</label>
              <div class="img-grid">
                <div v-for="(img, i) in editExistingImgs" :key="img.id" class="img-thumb"><img :src="img.url" /><button type="button" class="img-remove" @click="removeExistingImg(i)">✕</button></div>
                <div v-for="(url, i) in editImg.previews.value" :key="'n'+i" class="img-thumb"><img :src="url" /><button type="button" class="img-remove" @click="removeFile(editImg, i)">✕</button></div>
                <label v-if="editExistingImgs.length + editImg.previews.value.length < 5" class="img-add"><input type="file" accept="image/*" multiple style="display:none" @change="addFiles(editImg, $event)" /><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></label>
              </div>
            </div>
            <div v-if="editPostError" class="form-error">{{ editPostError }}</div>
            <button class="submit-btn" :disabled="editingPost_" @click="submitEditPost">{{ editingPost_ ? '保存中…' : '保存' }}</button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(37, 104, 232, 0.12), transparent 24%),
    linear-gradient(180deg, #f7fbfd 0%, #eef4f8 42%, #f8fbfd 100%);
  color: var(--lab-text);
  font-family: -apple-system, "SF Pro Display", "PingFang SC", "Helvetica Neue", sans-serif;
  padding-bottom: 80px;
}

/* ── 顶部导航 ── */
.pnav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 0.28s, backdrop-filter 0.28s, border-color 0.28s, box-shadow 0.28s;
}
.pnav.scrolled {
  background: rgba(247, 251, 253, 0.86);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(57, 86, 120, 0.12);
  box-shadow: 0 10px 30px rgba(15, 31, 56, 0.06);
}
.back-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(10, 20, 36, 0.28);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  padding: 8px 16px;
  border-radius: 999px;
  transition: background 0.18s, color 0.18s, border-color 0.18s, transform 0.18s;
  flex-shrink: 0;
}
.pnav.scrolled .back-btn {
  background: rgba(255, 255, 255, 0.88);
  color: var(--lab-text);
  border-color: rgba(57, 86, 120, 0.14);
}
.back-btn:hover { background: rgba(10, 20, 36, 0.42); transform: translateY(-1px); }
.pnav.scrolled .back-btn:hover { color: var(--lab-accent); border-color: rgba(37, 104, 232, 0.2); }
.pnav-title { font-size: 15px; font-weight: 700; color: var(--lab-text); }
.pnav:not(.scrolled) .pnav-title { color: rgba(255,255,255,0.9); }

/* ── 个人信息头 ── */
.profile-header {
  position: relative;
  background: linear-gradient(145deg, #0d1626 0%, #13233a 58%, #17324c 100%);
  padding: 86px 24px 42px;
  overflow: hidden;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.header-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 18% 18%, rgba(37, 104, 232, 0.34), transparent 24%),
    radial-gradient(circle at 82% 12%, rgba(23, 181, 212, 0.22), transparent 18%),
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: auto, auto, 28px 28px, 28px 28px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.72));
  pointer-events: none;
}
.header-content { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; }
.avatar-circle {
  width: 78px;
  height: 78px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2568e8, #17b5d4);
  color: #fff;
  font-size: 30px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 18px 40px rgba(9, 20, 38, 0.34);
  border: 3px solid rgba(255,255,255,.14);
  overflow: hidden;
}
.avatar-image { width: 100%; height: 100%; object-fit: cover; display: block; }
.profile-username { font-size: 24px; font-weight: 750; color: #fff; letter-spacing: -0.03em; margin: 0; }
.profile-subtitle {
  margin: 0;
  font-size: 13px;
  color: rgba(234, 242, 255, 0.68);
  letter-spacing: 0.02em;
}
.stats-bar {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 20px;
  padding: 14px 22px;
  gap: 20px;
  margin-top: 6px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-num { font-size: 20px; font-weight: 700; color: #fff; line-height: 1; }
.stat-lbl { font-size: 11px; color: rgba(255,255,255,.6); letter-spacing: .06em; }
.stat-divider { width: 1px; height: 28px; background: rgba(255,255,255,.15); }
.profile-summary-strip {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
}
.summary-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(246, 250, 255, 0.86);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

/* ── Tab 导航 ── */
.ptabs {
  display: flex;
  background: rgba(247, 251, 253, 0.9);
  border-bottom: 1px solid rgba(57, 86, 120, 0.12);
  padding: 0 16px;
  position: sticky;
  top: 0;
  z-index: 50;
  overflow-x: auto;
  scrollbar-width: none;
  backdrop-filter: blur(16px);
}
.ptabs::-webkit-scrollbar { display: none; }
.ptab { display: flex; align-items: center; gap: 6px; padding: 14px 12px; background: transparent; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px; color: var(--lab-text-soft); font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all .18s; white-space: nowrap; flex-shrink: 0; }
.ptab:hover { color: var(--lab-text); }
.ptab.active { color: var(--lab-text); border-bottom-color: var(--lab-accent); }
.ptab-badge { background: linear-gradient(135deg, var(--lab-accent), var(--lab-accent-2)); color: #fff; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 999px; min-width: 16px; text-align: center; box-shadow: 0 8px 18px rgba(37, 104, 232, 0.18); }

/* ── Tab 内容区 ── */
.tab-body { padding: 22px 20px; max-width: 860px; margin: 0 auto; }
.tab-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.tab-header-row.compact { margin-bottom: 12px; }
.tab-header-title { font-size: 16px; font-weight: 700; color: var(--lab-text); }
.tab-header-sub { font-size: 12px; color: var(--lab-text-dim); }
.tab-header-sub.block { display: block; margin-top: 4px; }
.create-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; background: linear-gradient(135deg, var(--lab-accent), var(--lab-accent-2)); color: #fff; border: none; border-radius: 999px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; transition: transform .15s, box-shadow .15s; box-shadow: 0 12px 24px rgba(37, 104, 232, 0.18); }
.create-btn:hover { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(37, 104, 232, 0.24); }

/* Loading & Empty */
.state-box { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 0; color: var(--lab-text-dim); font-size: 14px; }
.spinner { width: 24px; height: 24px; border: 2px solid rgba(57, 86, 120, 0.12); border-top-color: var(--lab-accent); border-radius: 50%; animation: spin .75s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 60px 20px; gap: 8px; }
.empty-icon { font-size: 40px; opacity: .5; }
.empty-title { font-size: 16px; font-weight: 700; color: var(--lab-text); }
.empty-sub { font-size: 13px; color: var(--lab-text-dim); line-height: 1.6; }
.compact-empty { padding: 36px 20px; }
.empty-actions { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; justify-content: center; }
.empty-btn { padding: 9px 14px; border-radius: 999px; border: 1px solid rgba(57, 86, 120, 0.12); background: #fff; color: var(--lab-text); font-size: 13px; font-family: inherit; cursor: pointer; }
.empty-btn.primary { background: linear-gradient(135deg, var(--lab-accent), var(--lab-accent-2)); color: #fff; border-color: transparent; }

.fav-toolbar { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
.fav-search input { width: 100%; background: rgba(255, 255, 255, 0.92); border: 1px solid rgba(57, 86, 120, 0.1); border-radius: 14px; padding: 11px 14px; color: var(--lab-text); font-size: 14px; font-family: inherit; outline: none; }
.fav-filters { display: flex; flex-wrap: wrap; gap: 8px; }
.fav-filter-chip { padding: 7px 12px; border-radius: 999px; border: 1px solid rgba(57, 86, 120, 0.1); background: #fff; color: var(--lab-text-soft); font-size: 12px; font-family: inherit; cursor: pointer; }
.fav-filter-chip.active { background: linear-gradient(135deg, var(--lab-accent), var(--lab-accent-2)); color: #fff; border-color: transparent; }

/* ── 收藏网格 ── */
.fav-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(155px,1fr)); gap: 12px; }
.fav-card { background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(249,252,255,0.96)); border-radius: 18px; overflow: hidden; cursor: pointer; border: 1px solid rgba(57, 86, 120, 0.08); box-shadow: 0 8px 24px rgba(15, 31, 56, 0.05); transition: transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s,border-color .25s; }
.fav-card:hover { transform: translateY(-4px); box-shadow: 0 16px 34px rgba(15, 31, 56, 0.1); border-color: color-mix(in srgb, var(--c) 20%, rgba(57, 86, 120, 0.08)); }
.fav-img { height: 120px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.fav-img img { width: 100%; height: 100%; object-fit: cover; }
.fav-emoji { font-size: 44px; }
.fav-body { padding: 12px 14px 14px; }
.fav-cat { font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; display: block; margin-bottom: 4px; }
.fav-title { font-size: 13px; font-weight: 700; color: var(--lab-text); line-height: 1.4; margin: 0 0 6px; }
.fav-sub { font-size: 12px; color: var(--lab-text-soft); line-height: 1.55; margin: 0 0 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.fav-diff { font-size: 10px; padding: 2px 7px; border-radius: 100px; font-weight: 600; }
.diff-新手   { background: rgba(110,110,115,.1);  color: #6e6e73; }
.diff-紧急   { background: rgba(224,49,49,.1);    color: #e03131; }
.diff-需处理 { background: rgba(112,72,232,.1);   color: #7048e8; }
.diff-进阶   { background: rgba(25,113,194,.1);   color: #1971c2; }

/* ── 我的投稿列表 ── */
.problem-list { display: flex; flex-direction: column; gap: 10px; }
.problem-item { background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(249,252,255,0.96)); border-radius: 20px; overflow: hidden; border: 1px solid rgba(57, 86, 120, 0.08); box-shadow: 0 10px 28px rgba(15, 31, 56, 0.05); display: flex; align-items: stretch; }
.item-hero { width: 82px; flex-shrink: 0; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.item-glow { position: absolute; width: 70px; height: 70px; border-radius: 50%; opacity: .25; filter: blur(20px); }
.item-img  { width: 100%; height: 100%; object-fit: cover; position: relative; z-index: 1; }
.item-emoji { font-size: 32px; position: relative; z-index: 1; filter: drop-shadow(0 4px 10px rgba(0,0,0,.4)); font-family: "Apple Color Emoji","Segoe UI Emoji",sans-serif; }
.item-body { flex: 1; padding: 13px 14px; min-width: 0; }
.item-link { cursor: pointer; }
.item-link:hover .item-title { color: var(--lab-accent); }
.item-meta { display: flex; align-items: center; gap: 7px; margin-bottom: 5px; }
.item-cat  { font-size: 10px; font-weight: 700; letter-spacing: .06em; }
.item-diff { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 100px; }
.item-status { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 100px; }
.item-status.published { background: rgba(34,197,94,.12); color: #16a34a; }
.item-title { font-size: 14px; font-weight: 700; color: var(--lab-text); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-sub  { font-size: 12px; color: var(--lab-text-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 5px; }
.item-date { font-size: 11px; color: var(--lab-text-dim); }
.item-actions { display: flex; flex-direction: column; justify-content: center; gap: 6px; padding: 12px 12px 12px 0; }
.act-btn { display: flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-family: inherit; font-weight: 500; cursor: pointer; border: none; transition: all .15s; white-space: nowrap; }
.act-btn.edit { background: rgba(37, 104, 232, .1); color: var(--lab-accent); }
.act-btn.edit:hover { background: rgba(37, 104, 232, .18); }
.act-btn.del  { background: rgba(255,59,48,.08); color: #ff3b30; }
.act-btn.del:hover:not(:disabled) { background: rgba(255,59,48,.16); }
.act-btn:not(.edit):not(.del) { background: rgba(37, 104, 232, .06); color: var(--lab-text-soft); }
.act-btn:not(.edit):not(.del):hover:not(:disabled) { background: rgba(37, 104, 232, .1); color: var(--lab-text); }
.act-btn:disabled { opacity: .4; cursor: not-allowed; }

/* ── 求助帖列表 ── */
.post-list { display: flex; flex-direction: column; gap: 10px; }
.post-row { background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(249,252,255,0.96)); border: 1px solid rgba(57, 86, 120, 0.08); border-radius: 18px; padding: 18px 20px; box-shadow: 0 8px 22px rgba(15, 31, 56, 0.04); }
.row-top  { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.badge { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 100px; }
.status-tag  { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 100px; }
.status-open { background: rgba(34,197,94,.12); color: #16a34a; }
.status-done { background: rgba(107,114,128,.12); color: #6b7280; }
.row-time  { font-size: 12px; color: var(--lab-text-dim); margin-left: auto; }
.row-title { font-size: 15px; font-weight: 700; color: var(--lab-text); margin-bottom: 5px; }
.row-desc  { font-size: 13px; color: var(--lab-text-soft); line-height: 1.65; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.market-metrics { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.metric-chip { font-size: 11px; color: var(--lab-text-soft); background: rgba(37, 104, 232, 0.06); padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(57, 86, 120, 0.08); }
.row-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.achievements-tab { display: flex; flex-direction: column; gap: 18px; }
.achievement-stats-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
.achievement-stat-box { background: #fff; border-radius: 18px; padding: 18px; border: 1px solid rgba(57, 86, 120, .08); }
.achievement-stat-num { display: block; font-size: 24px; font-weight: 700; color: var(--lab-text); margin-bottom: 4px; }
.achievement-stat-label { display: block; font-size: 12px; color: var(--lab-text-dim); }
.achievement-section { background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(249,252,255,0.96)); border-radius: 20px; padding: 18px; border: 1px solid rgba(57, 86, 120, .08); box-shadow: 0 8px 22px rgba(15, 31, 56, 0.04); }
.badge-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
.badge-card { border-radius: 16px; padding: 16px; background: #f5f8fc; border: 1px solid transparent; }
.badge-card.unlocked { background: rgba(22,163,74,.08); border-color: rgba(22,163,74,.18); }
.badge-card-mark { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: rgba(37, 104, 232, .08); color: var(--lab-text-soft); font-size: 12px; margin-bottom: 10px; }
.badge-card.unlocked .badge-card-mark { background: rgba(22,163,74,.16); color: #16a34a; }
.badge-card-title { font-size: 14px; font-weight: 700; color: var(--lab-text); margin-bottom: 4px; }
.badge-card-desc { font-size: 12px; color: var(--lab-text-dim); line-height: 1.55; }
.activity-list { display: flex; flex-direction: column; gap: 12px; }
.activity-item { display: flex; gap: 12px; }
.activity-dot { width: 12px; height: 12px; border-radius: 50%; margin-top: 8px; flex-shrink: 0; }
.activity-dot.solution { background: #16a34a; }
.activity-dot.comment { background: #0ea5e9; }
.activity-dot.encounter { background: #f59e0b; }
.activity-body { flex: 1; min-width: 0; background: rgba(245, 249, 253, 0.96); border: 1px solid rgba(57, 86, 120, 0.06); border-radius: 16px; padding: 13px 14px; }
.activity-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.activity-type { font-size: 12px; font-weight: 700; color: var(--lab-text); }
.activity-time { font-size: 11px; color: var(--lab-text-dim); }
.activity-problem { font-size: 13px; font-weight: 600; color: var(--lab-accent); cursor: pointer; margin-bottom: 6px; }
.activity-text { font-size: 13px; color: var(--lab-text-soft); line-height: 1.65; margin: 0; }
.activity-like { margin-top: 8px; font-size: 11px; color: var(--lab-text-dim); }

/* ── 账号设置 ── */
.account-tab { display: flex; flex-direction: column; gap: 20px; }
.account-section { background: #fff; border-radius: 16px; padding: 22px 22px 24px; border: 1px solid rgba(0,0,0,.06); box-shadow: 0 2px 6px rgba(0,0,0,.05); display: flex; flex-direction: column; gap: 14px; }
.account-section-head { display: flex; flex-direction: column; gap: 5px; }
.account-title { font-size: 15px; font-weight: 600; color: #1d1d1f; margin: 0; }
.account-sub { font-size: 12px; color: #8d8d92; line-height: 1.6; }
.account-summary-card { display: flex; align-items: center; gap: 12px; background: #f5f5f7; border-radius: 14px; padding: 12px 14px; }
.account-summary-avatar { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg,#ff6b6b,#ffb347); color: #fff; font-size: 18px; font-weight: 700; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.account-summary-name { font-size: 14px; font-weight: 600; color: #1d1d1f; }
.account-summary-meta { font-size: 12px; color: #8d8d92; margin-top: 2px; }
.account-field { display: flex; flex-direction: column; gap: 6px; }
.account-field label { font-size: 12px; color: #6e6e73; letter-spacing: .04em; }
.avatar-upload-row { display: flex; flex-direction: column; gap: 8px; }
.avatar-upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-width: 120px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #1d1d1f;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .18s, opacity .18s;
}
.avatar-upload-btn:hover { background: #3a3a3c; }
.avatar-upload-btn.disabled { opacity: .6; cursor: not-allowed; }
.avatar-upload-hint { font-size: 12px; color: #8d8d92; }
.account-field input { background: #f5f5f7; border: 1px solid rgba(0,0,0,.1); border-radius: 10px; padding: 11px 14px; color: #1d1d1f; font-size: 14px; font-family: inherit; outline: none; transition: border-color .2s; }
.account-field input:focus { border-color: rgba(0,0,0,.25); }
.account-field input::placeholder { color: #c7c7cc; }
.account-btn { padding: 11px 24px; background: #1d1d1f; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background .18s; align-self: flex-start; }
.account-btn:hover:not(:disabled) { background: #3a3a3c; }
.account-btn:disabled { opacity: .5; cursor: not-allowed; }
.form-error   { font-size: 13px; color: #ff3b30; background: rgba(255,59,48,.08); border: 1px solid rgba(255,59,48,.2); border-radius: 8px; padding: 8px 12px; }
.form-success { font-size: 13px; color: #16a34a; background: rgba(34,197,94,.08); border: 1px solid rgba(34,197,94,.25); border-radius: 8px; padding: 8px 12px; }

/* ── 模态弹窗 ── */
.modal-mask { position: fixed; inset: 0; z-index: 500; background: rgba(0,0,0,.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-box  { background: #fff; border: 1px solid rgba(0,0,0,.1); border-radius: 24px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 16px 48px rgba(0,0,0,.18); }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 22px 24px 0; }
.modal-head h2 { font-size: 18px; font-weight: 700; color: #1d1d1f; }
.close-btn  { background: rgba(0,0,0,.06); border: none; color: #6e6e73; font-size: 13px; cursor: pointer; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.close-btn:hover { background: rgba(0,0,0,.1); }
.modal-body { padding: 20px 24px 28px; display: flex; flex-direction: column; gap: 14px; }
.field      { display: flex; flex-direction: column; gap: 6px; position: relative; }
.field label { font-size: 12px; color: #6e6e73; letter-spacing: .04em; }
.req { color: #ff3b30; }
.field input, .field textarea { background: #f5f5f7; border: 1px solid rgba(0,0,0,.1); border-radius: 10px; padding: 11px 14px; color: #1d1d1f; font-size: 14px; font-family: inherit; outline: none; transition: border-color .2s; resize: none; }
.field input:focus, .field textarea:focus { border-color: rgba(0,0,0,.25); }
.char-count { font-size: 11px; color: #aeaeb2; text-align: right; margin-top: -4px; }
.radio-group { display: flex; flex-wrap: wrap; gap: 8px; }
.radio-item  { display: flex; align-items: center; cursor: pointer; }
.radio-item input[type=radio] { display: none; }
.radio-label { font-size: 12px; font-weight: 500; padding: 5px 12px; border-radius: 100px; cursor: pointer; border: 1px solid transparent; }
.radio-item input:checked + .radio-label { outline: 2px solid rgba(0,0,0,.25); }
.submit-btn { width: 100%; padding: 13px; background: #1d1d1f; color: #fff; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all .18s; }
.submit-btn:hover:not(:disabled) { background: #3a3a3c; }
.submit-btn:disabled { opacity: .5; cursor: not-allowed; }
.img-grid  { display: flex; flex-wrap: wrap; gap: 8px; }
.img-thumb { position: relative; width: 76px; height: 76px; border-radius: 10px; overflow: hidden; flex-shrink: 0; }
.img-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.img-remove { position: absolute; top: 3px; right: 3px; width: 18px; height: 18px; border-radius: 50%; background: rgba(0,0,0,.5); border: none; color: #fff; font-size: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.img-add { width: 76px; height: 76px; border: 1.5px dashed rgba(0,0,0,.15); border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #aeaeb2; transition: border-color .15s; flex-shrink: 0; }
.img-add:hover { border-color: rgba(0,0,0,.3); }
.modal-enter-active, .modal-leave-active { transition: all .22s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

.avatar-crop-modal {
  z-index: 1200;
  padding: 24px;
}
.avatar-crop-box {
  max-width: 560px;
  overflow: hidden;
}
.avatar-crop-head {
  padding-bottom: 8px;
}
.avatar-crop-sub {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--lab-text-dim);
}
.avatar-crop-body {
  gap: 18px;
}
.avatar-crop-frame {
  position: relative;
  width: min(100%, 320px);
  aspect-ratio: 1;
  margin: 0 auto;
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(14, 26, 43, 0.96), rgba(18, 43, 70, 0.92)),
    radial-gradient(circle at top, rgba(37, 104, 232, 0.32), transparent 50%);
  overflow: hidden;
  border: 1px solid rgba(57, 86, 120, 0.16);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 40px rgba(15, 31, 56, 0.18);
  touch-action: none;
  cursor: grab;
}
.avatar-crop-frame:active {
  cursor: grabbing;
}
.avatar-crop-image {
  position: absolute;
  top: 50%;
  left: 50%;
  display: block;
  max-width: none;
  max-height: none;
  user-select: none;
  -webkit-user-drag: none;
  transform-origin: center center;
  pointer-events: none;
}
.avatar-crop-overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at center, transparent 0 38%, rgba(6, 12, 23, 0.42) 39% 100%),
    linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px);
  background-size: auto, 24px 24px, 24px 24px;
  pointer-events: none;
}
.avatar-crop-overlay::after {
  content: '';
  position: absolute;
  inset: 14%;
  border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.68);
  box-shadow: 0 0 0 999px rgba(8, 17, 31, 0.18);
}
.avatar-crop-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.avatar-crop-zoom {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(245, 249, 253, 0.96);
  border: 1px solid rgba(57, 86, 120, 0.08);
}
.avatar-crop-zoom span,
.avatar-crop-zoom strong {
  font-size: 13px;
  color: var(--lab-text);
}
.avatar-crop-zoom strong {
  font-weight: 700;
}
.avatar-crop-zoom input[type='range'] {
  width: 100%;
  accent-color: var(--lab-accent);
}
.avatar-crop-tip {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--lab-text-dim);
}
.avatar-crop-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.avatar-crop-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 110px;
  padding: 11px 16px;
  border-radius: 12px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: transform .18s, box-shadow .18s, background .18s, opacity .18s;
}
.avatar-crop-btn.secondary {
  background: rgba(57, 86, 120, 0.08);
  color: var(--lab-text-soft);
}
.avatar-crop-btn.primary {
  background: linear-gradient(135deg, var(--lab-accent), var(--lab-accent-2));
  color: #fff;
  box-shadow: 0 14px 26px rgba(37, 104, 232, 0.22);
}
.avatar-crop-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.avatar-crop-btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}
.btn-spinner.dark {
  border-color: rgba(255,255,255,.36);
  border-top-color: #fff;
}

/* ── 编辑投稿（内联全屏） ── */
.edit-wrap { padding-bottom: 60px; }
.detail-hero { padding-top: 52px; min-height: 240px; position: relative; display: flex; align-items: flex-end; overflow: hidden; }
.hero-content { width: 100%; max-width: 800px; margin: 0 auto; padding: 40px 24px 32px; display: flex; align-items: flex-end; gap: 24px; position: relative; z-index: 2; }
.hero-emoji { font-size: 72px; line-height: 1; flex-shrink: 0; filter: drop-shadow(0 10px 28px rgba(0,0,0,.5)); font-family: "Apple Color Emoji","Segoe UI Emoji",sans-serif; }
.hero-glow  { position: absolute; width: 180px; height: 180px; border-radius: 50%; opacity: .2; filter: blur(56px); left: 24px; bottom: 16px; }
.hero-meta  { flex: 1; min-width: 0; }
.hero-title-input { display: block; width: 100%; background: transparent; border: none; border-bottom: 1.5px solid rgba(255,255,255,.25); outline: none; color: #f5f5f7; font-size: clamp(1.4rem,4vw,2rem); font-weight: 700; letter-spacing: -.03em; padding: 10px 0 7px; margin-top: 8px; font-family: inherit; }
.hero-title-input::placeholder { color: rgba(255,255,255,.3); }
.hero-title-input.has-error { border-bottom-color: #ff6b6b; }
.hero-sub-input { display: block; width: 100%; background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,.15); outline: none; color: rgba(255,255,255,.65); font-size: 15px; padding: 7px 0; margin-top: 8px; font-family: inherit; }
.hero-sub-input::placeholder { color: rgba(255,255,255,.25); }
.hero-sub-input.has-error { border-bottom-color: #ff6b6b; }
.hero-err { font-size: 12px; color: #ff6b6b; margin-top: 3px; }

.detail-content { max-width: 800px; margin: 0 auto; padding: 0 24px 40px; }
.section { padding: 28px 0; border-bottom: 1px solid rgba(0,0,0,.06); }
.section:last-of-type { border-bottom: none; }
.section-title { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 600; margin-bottom: 16px; color: #1d1d1f; }
.section-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.optional-tag { font-size: 11px; font-weight: 400; color: #aeaeb2; margin-left: 4px; }
.content-textarea { width: 100%; background: #f5f5f7; border: 1px solid rgba(0,0,0,.1); border-radius: 12px; padding: 12px 14px; color: #1d1d1f; font-size: 14px; font-family: inherit; outline: none; resize: vertical; transition: border-color .2s; }
.content-textarea:focus { border-color: rgba(0,0,0,.25); }
.content-textarea.has-error { border-color: #ff6b6b; }
.content-textarea.small { min-height: 70px; }
.content-input { width: 100%; background: #f5f5f7; border: 1px solid rgba(0,0,0,.1); border-radius: 10px; padding: 11px 14px; color: #1d1d1f; font-size: 14px; font-family: inherit; outline: none; transition: border-color .2s; margin-bottom: 8px; }
.content-input:focus { border-color: rgba(0,0,0,.25); }
.field-err { font-size: 12px; color: #ff6b6b; margin-top: 6px; }

.select-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.select-chip { padding: 7px 14px; border-radius: 100px; border: 1px solid rgba(0,0,0,.12); background: #fff; color: #6e6e73; font-size: 13px; font-family: inherit; cursor: pointer; transition: all .15s; white-space: nowrap; }
.select-chip:hover { border-color: rgba(0,0,0,.25); color: #1d1d1f; }
.select-chip.active { font-weight: 500; }

.img-preview-wrap { position: relative; display: inline-block; }
.img-preview { max-width: 260px; max-height: 200px; object-fit: cover; border-radius: 12px; display: block; }
.img-remove-btn { position: absolute; top: 8px; right: 8px; width: 26px; height: 26px; border-radius: 50%; background: rgba(0,0,0,.5); border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.img-remove-btn.small { top: 5px; right: 5px; width: 20px; height: 20px; }
.img-upload-area { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; width: 100%; height: 120px; border: 1.5px dashed rgba(0,0,0,.15); border-radius: 12px; cursor: pointer; color: #aeaeb2; font-size: 13px; transition: border-color .15s; }
.img-upload-area:hover { border-color: rgba(0,0,0,.3); color: #6e6e73; }

.causes-edit-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.cause-edit-item { display: flex; align-items: center; gap: 10px; }
.cause-num { font-size: 12px; font-weight: 700; flex-shrink: 0; width: 22px; }
.cause-input { flex: 1; background: #f5f5f7; border: 1px solid rgba(0,0,0,.1); border-radius: 8px; padding: 9px 12px; color: #1d1d1f; font-size: 14px; font-family: inherit; outline: none; }
.cause-input:focus { border-color: rgba(0,0,0,.22); }
.icon-remove { background: transparent; border: none; color: #aeaeb2; cursor: pointer; padding: 4px; display: flex; align-items: center; flex-shrink: 0; transition: color .15s; }
.icon-remove:hover { color: #ff3b30; }
.add-row-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid rgba(0,0,0,.12); border-radius: 8px; color: #6e6e73; font-size: 13px; font-family: inherit; cursor: pointer; transition: all .15s; }
.add-row-btn:hover:not(:disabled) { border-color: rgba(0,0,0,.25); color: #1d1d1f; }
.add-row-btn:disabled { opacity: .4; cursor: not-allowed; }

.solutions-edit-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 12px; }
.solution-edit-item { background: #f5f5f7; border-radius: 14px; padding: 16px; }
.sol-edit-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.sol-step-badge { width: 22px; height: 22px; border-radius: 50%; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sol-step-label { font-size: 13px; font-weight: 600; color: #6e6e73; flex: 1; }
.sol-img-section { margin-top: 10px; }
.sol-img-preview-wrap { position: relative; display: inline-block; }
.sol-img-preview { max-width: 180px; max-height: 140px; object-fit: cover; border-radius: 8px; display: block; }
.sol-img-upload { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border: 1px dashed rgba(0,0,0,.15); border-radius: 8px; cursor: pointer; color: #aeaeb2; font-size: 12px; transition: border-color .15s; width: fit-content; }
.sol-img-upload:hover { border-color: rgba(0,0,0,.3); color: #6e6e73; }

.tip-box { border-radius: 12px; padding: 14px; border: 1px solid; }
.tip-textarea { width: 100%; background: transparent; border: none; outline: none; color: #1d1d1f; font-size: 14px; font-family: inherit; resize: vertical; min-height: 70px; }
.tip-textarea::placeholder { color: #c7c7cc; }

.submit-err-box { background: rgba(255,59,48,.08); border: 1px solid rgba(255,59,48,.2); border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #ff3b30; margin-bottom: 4px; }
.big-submit-btn { width: 100%; padding: 14px; background: #1d1d1f; color: #fff; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all .18s; margin-top: 12px; }
.big-submit-btn:hover:not(:disabled) { background: #3a3a3c; }
.big-submit-btn:disabled { opacity: .5; cursor: not-allowed; }
.btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0; }

/* ── 移动端 ── */
@media (max-width: 600px) {
  .profile-header { padding: 64px 20px 28px; }
  .avatar-circle { width: 60px; height: 60px; font-size: 22px; }
  .profile-username { font-size: 18px; }
  .stats-bar { padding: 10px 14px; gap: 12px; }
  .stat-num { font-size: 16px; }
  .fav-grid { grid-template-columns: repeat(2,1fr); gap: 10px; }
  .fav-img { height: 100px; }
  .tab-body { padding: 14px 14px; }
  .badge-grid { grid-template-columns: 1fr; }
  .achievement-stats-grid { grid-template-columns: 1fr 1fr; }
  .hero-content { flex-direction: column; align-items: flex-start; gap: 16px; padding: 64px 20px 28px; }
  .hero-emoji { font-size: 56px; }
  .detail-content { padding: 0 16px 40px; }
  .account-section { padding: 18px 16px 20px; }
  .account-field input { font-size: 16px; }
  .field input, .field textarea { font-size: 16px; }
  .avatar-crop-modal { padding: 14px; }
  .avatar-crop-box { border-radius: 20px; }
  .avatar-crop-frame { width: 100%; border-radius: 24px; }
  .avatar-crop-zoom { grid-template-columns: 1fr; gap: 8px; }
  .avatar-crop-actions { flex-direction: column-reverse; }
  .avatar-crop-btn { width: 100%; }
}
</style>
