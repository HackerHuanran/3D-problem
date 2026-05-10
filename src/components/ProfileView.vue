<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { problems as staticProblems } from '@/data/problems.js'
import { useFavorites } from '@/composables/useFavorites.js'
import { useUserProblems } from '@/composables/useUserProblems.js'
import { useMarket } from '@/composables/useMarket.js'
import { useAuth } from '@/composables/useAuth.js'
import { uploadImages, getImageURLs } from '@/composables/useStorage.js'
import { app } from '@/lib/tcb.js'
import { compressImage } from '@/lib/imageUtils.js'
import { checkContent, checkImage } from '@/lib/moderate.js'

const props = defineProps({ currentUser: { type: Object, required: true } })
defineEmits(['back', 'go-detail'])

// ── composables ──
const { favorites, fetchFavorites } = useFavorites()
const { fetchMyProblems, deleteUserProblem, updateUserProblem, fetchUserProblems } = useUserProblems()
const { posts: myPosts, fetchMyPosts, createPost, deletePost, updatePostStatus, updatePost } = useMarket()
const { setupProfile, changePassword } = useAuth()

// ── 全局状态 ──
const loading     = ref(true)
const myProblems  = ref([])
const activeTab   = ref('fav')
const navScrolled = ref(false)
// subView: 'tabs' | 'edit-problem'
const subView     = ref('tabs')

// ── Tab 定义 ──
const TABS = [
  { id: 'fav',       label: '我的收藏' },
  { id: 'submitted', label: '我的投稿' },
  { id: 'market',    label: '求助帖' },
  { id: 'account',   label: '账号设置' },
]

const favProblems = computed(() => staticProblems.filter(p => favorites.value.has(p.id)))
const tabCount = (id) => {
  if (id === 'fav')       return favProblems.value.length
  if (id === 'submitted') return myProblems.value.length
  if (id === 'market')    return myPosts.value.length
  return 0
}

// ── 初始化 ──
const onScroll = () => { navScrolled.value = window.scrollY > 20 }
onMounted(async () => {
  window.addEventListener('scroll', onScroll, { passive: true })
  const uid = props.currentUser.id
  await Promise.all([
    fetchFavorites(uid),
    fetchMyProblems(uid).then(r => { myProblems.value = r }),
    fetchMyPosts(uid),
  ])
  loading.value = false
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))

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
    myProblems.value = await fetchMyProblems(props.currentUser.id)
    fetchUserProblems()
    cancelEditProblem()
  } catch (err) {
    editErrors.value = { submit: err.message || '保存失败，请重试' }
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
    await fetchMyPosts(props.currentUser.id)
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
    await fetchMyPosts(props.currentUser.id)
  } catch (e) { editPostError.value = e.message } finally { editingPost_.value = false }
}

// 状态切换 & 删除帖子
const actionLoading = ref({})
async function toggleStatus(post) {
  const next = post.status === '待解决' ? '已解决' : '待解决'
  actionLoading.value[post.id + '_s'] = true
  try { await updatePostStatus(post.id, next); post.status = next } catch (e) { alert(e.message) }
  finally { delete actionLoading.value[post.id + '_s'] }
}
async function removePost(post) {
  if (!confirm('确定删除这条求助帖？')) return
  actionLoading.value[post.id + '_d'] = true
  try { await deletePost(post.id); await fetchMyPosts(props.currentUser.id) } catch {}
  finally { delete actionLoading.value[post.id + '_d'] }
}

// ════════════════════════════════════════════════════
// 三、账号设置
// ════════════════════════════════════════════════════
const usernameForm    = ref({ username: props.currentUser.username })
const usernameError   = ref('')
const usernameSuccess = ref('')
const usernameLoading = ref(false)

async function submitUsername() {
  usernameError.value = ''; usernameSuccess.value = ''
  if (!usernameForm.value.username.trim()) { usernameError.value = '请输入用户名'; return }
  usernameLoading.value = true
  try {
    await setupProfile(usernameForm.value.username.trim())
    usernameSuccess.value = '用户名已更新'
  } catch (e) { usernameError.value = e.message || String(e) }
  finally { usernameLoading.value = false }
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

      <!-- 个人信息头 -->
      <header class="profile-header">
        <div class="header-bg"></div>
        <div class="header-content">
          <div class="avatar-circle">{{ currentUser.avatar }}</div>
          <h1 class="profile-username">{{ currentUser.username }}</h1>
          <div class="stats-bar">
            <div class="stat-item">
              <span class="stat-num">{{ favProblems.length }}</span>
              <span class="stat-lbl">收藏</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-num">{{ myProblems.length }}</span>
              <span class="stat-lbl">投稿</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-num">{{ myPosts.length }}</span>
              <span class="stat-lbl">求助帖</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-num">{{ currentUser.points ?? 0 }}</span>
              <span class="stat-lbl">积分</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Tab 导航 -->
      <div class="ptabs">
        <button v-for="tab in TABS" :key="tab.id" :class="['ptab', { active: activeTab === tab.id }]" @click="activeTab = tab.id">
          {{ tab.label }}
          <span v-if="tabCount(tab.id) > 0" class="ptab-badge">{{ tabCount(tab.id) }}</span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="state-box">
        <div class="spinner"></div>
        <span>加载中…</span>
      </div>

      <template v-else>

        <!-- ── 我的收藏 ── -->
        <div v-if="activeTab === 'fav'" class="tab-body">
          <div v-if="favProblems.length === 0" class="empty">
            <span class="empty-icon">🔖</span>
            <p class="empty-title">还没有收藏</p>
            <p class="empty-sub">在故障库中点击 ♥ 收藏感兴趣的问题</p>
          </div>
          <div v-else class="fav-grid">
            <div v-for="p in favProblems" :key="p.id" class="fav-card" :style="{ '--c': p.color }" @click="$emit('go-detail', p.id)">
              <div class="fav-img" :style="{ background: p.bgGradient }">
                <img v-if="p.images" :src="p.images" :alt="p.title" loading="lazy" />
                <span v-else class="fav-emoji">{{ p.emoji }}</span>
              </div>
              <div class="fav-body">
                <span class="fav-cat" :style="{ color: p.color }">{{ p.category }}</span>
                <p class="fav-title">{{ p.title }}</p>
                <span class="fav-diff" :class="'diff-' + p.difficulty">{{ p.difficulty }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── 我的投稿 ── -->
        <div v-else-if="activeTab === 'submitted'" class="tab-body">
          <div v-if="myProblems.length === 0" class="empty">
            <span class="empty-icon">📝</span>
            <p class="empty-title">还没有投稿</p>
            <p class="empty-sub">在首页点击「分享你遇到的问题」来发布</p>
          </div>
          <div v-else class="problem-list">
            <div v-for="p in myProblems" :key="p.id" class="problem-item">
              <div class="item-hero" :style="{ background: catMeta(p.category).bg }">
                <div class="item-glow" :style="{ background: catMeta(p.category).color }"></div>
                <img v-if="p.image_url" :src="p.image_url" class="item-img" alt="" />
                <span v-else class="item-emoji">{{ catMeta(p.category).emoji }}</span>
              </div>
              <div class="item-body">
                <div class="item-meta">
                  <span class="item-cat" :style="{ color: catMeta(p.category).color }">{{ p.category }}</span>
                  <span class="item-diff" :style="{ background: DIFF_BG[p.difficulty], color: DIFF_COLOR[p.difficulty] }">{{ p.difficulty }}</span>
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

        <!-- ── 求助帖 ── -->
        <div v-else-if="activeTab === 'market'" class="tab-body">
          <div class="tab-header-row">
            <span class="tab-header-title">我的求助帖</span>
            <button class="create-btn" @click="openCreate">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
              发布求助
            </button>
          </div>
          <div v-if="myPosts.length === 0" class="empty" style="padding-top:40px">
            <span class="empty-icon">🛒</span>
            <p class="empty-title">还没有求助帖</p>
            <p class="empty-sub">发布你的打印需求或技术问题</p>
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

        <!-- ── 账号设置 ── -->
        <div v-else-if="activeTab === 'account'" class="tab-body account-tab">

          <div class="account-section">
            <h3 class="account-title">修改用户名</h3>
            <div class="account-field">
              <label>用户名</label>
              <input v-model="usernameForm.username" placeholder="输入新用户名" maxlength="20" @keyup.enter="submitUsername" />
            </div>
            <p v-if="usernameError" class="form-error">{{ usernameError }}</p>
            <p v-if="usernameSuccess" class="form-success">{{ usernameSuccess }}</p>
            <button class="account-btn" :disabled="usernameLoading" @click="submitUsername">
              <span v-if="usernameLoading" class="btn-spinner"></span>
              {{ usernameLoading ? '保存中…' : '保存用户名' }}
            </button>
          </div>

          <div class="account-section">
            <h3 class="account-title">修改密码</h3>
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

    <!-- ── 发布弹窗 ── -->
    <Transition name="modal">
      <div v-if="showCreate" class="modal-mask">
        <div class="modal-box">
          <div class="modal-head"><h2>发布求助帖</h2><button class="close-btn" @click="showCreate = false">✕</button></div>
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
          <div class="modal-head"><h2>编辑求助帖</h2><button class="close-btn" @click="showEdit = false">✕</button></div>
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
.profile-page { min-height: 100vh; background: #f5f5f7; color: #1d1d1f; font-family: -apple-system,'PingFang SC','Helvetica Neue',sans-serif; padding-bottom: 80px; }

/* ── 顶部导航 ── */
.pnav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 12px 20px; display: flex; align-items: center; gap: 12px; transition: background 0.3s, backdrop-filter 0.3s; }
.pnav.scrolled { background: rgba(255,255,255,0.9); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0,0,0,0.08); }
.back-btn { display: flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.28); backdrop-filter: blur(12px); border: none; color: #fff; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; padding: 6px 14px; border-radius: 100px; transition: background 0.18s, color 0.3s; flex-shrink: 0; }
.pnav.scrolled .back-btn { background: transparent; color: #007aff; }
.back-btn:hover { background: rgba(0,0,0,0.42); }
.pnav.scrolled .back-btn:hover { background: rgba(0,122,255,0.08); }
.pnav-title { font-size: 15px; font-weight: 600; color: #1d1d1f; }
.pnav:not(.scrolled) .pnav-title { color: rgba(255,255,255,0.9); }

/* ── 个人信息头 ── */
.profile-header { position: relative; background: linear-gradient(160deg,#1d1d1f 0%,#2d2d2f 60%,#3a3a3c 100%); padding: 72px 24px 36px; overflow: hidden; }
.header-bg { position: absolute; inset: 0; background: radial-gradient(ellipse at 60% 0%,rgba(255,107,107,.18) 0%,transparent 60%), radial-gradient(ellipse at 0% 80%,rgba(116,185,255,.12) 0%,transparent 50%); pointer-events: none; }
.header-content { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; }
.avatar-circle { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg,#ff6b6b,#ffb347); color: #fff; font-size: 28px; font-weight: 700; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,.3); border: 3px solid rgba(255,255,255,.2); }
.profile-username { font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
.stats-bar { display: flex; align-items: center; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); border-radius: 16px; padding: 12px 20px; gap: 20px; margin-top: 4px; }
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-num { font-size: 20px; font-weight: 700; color: #fff; line-height: 1; }
.stat-lbl { font-size: 11px; color: rgba(255,255,255,.55); letter-spacing: .04em; }
.stat-divider { width: 1px; height: 28px; background: rgba(255,255,255,.15); }

/* ── Tab 导航 ── */
.ptabs { display: flex; background: #fff; border-bottom: 1px solid rgba(0,0,0,.08); padding: 0 16px; position: sticky; top: 0; z-index: 50; overflow-x: auto; scrollbar-width: none; }
.ptabs::-webkit-scrollbar { display: none; }
.ptab { display: flex; align-items: center; gap: 6px; padding: 14px 12px; background: transparent; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px; color: #6e6e73; font-size: 14px; font-weight: 500; font-family: inherit; cursor: pointer; transition: all .18s; white-space: nowrap; flex-shrink: 0; }
.ptab:hover { color: #1d1d1f; }
.ptab.active { color: #1d1d1f; border-bottom-color: #1d1d1f; }
.ptab-badge { background: #ff6b6b; color: #fff; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 100px; min-width: 16px; text-align: center; }

/* ── Tab 内容区 ── */
.tab-body { padding: 20px 20px; max-width: 760px; margin: 0 auto; }
.tab-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.tab-header-title { font-size: 15px; font-weight: 600; color: #1d1d1f; }
.create-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #1d1d1f; color: #fff; border: none; border-radius: 100px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background .15s; }
.create-btn:hover { background: #3a3a3c; }

/* Loading & Empty */
.state-box { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 0; color: #aeaeb2; font-size: 14px; }
.spinner { width: 24px; height: 24px; border: 2px solid rgba(0,0,0,.08); border-top-color: #6e6e73; border-radius: 50%; animation: spin .75s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 60px 20px; gap: 8px; }
.empty-icon { font-size: 40px; opacity: .5; }
.empty-title { font-size: 16px; font-weight: 600; color: #1d1d1f; }
.empty-sub { font-size: 13px; color: #aeaeb2; line-height: 1.6; }

/* ── 收藏网格 ── */
.fav-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(155px,1fr)); gap: 12px; }
.fav-card { background: #fff; border-radius: 16px; overflow: hidden; cursor: pointer; border: 1px solid rgba(0,0,0,.06); box-shadow: 0 2px 8px rgba(0,0,0,.06); transition: transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s; }
.fav-card:hover { transform: translateY(-4px); box-shadow: 0 10px 32px rgba(0,0,0,.12); }
.fav-img { height: 120px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.fav-img img { width: 100%; height: 100%; object-fit: cover; }
.fav-emoji { font-size: 44px; }
.fav-body { padding: 12px 14px 14px; }
.fav-cat { font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; display: block; margin-bottom: 4px; }
.fav-title { font-size: 13px; font-weight: 600; color: #1d1d1f; line-height: 1.35; margin: 0 0 6px; }
.fav-diff { font-size: 10px; padding: 2px 7px; border-radius: 100px; font-weight: 600; }
.diff-新手   { background: rgba(110,110,115,.1);  color: #6e6e73; }
.diff-紧急   { background: rgba(224,49,49,.1);    color: #e03131; }
.diff-需处理 { background: rgba(112,72,232,.1);   color: #7048e8; }
.diff-进阶   { background: rgba(25,113,194,.1);   color: #1971c2; }

/* ── 我的投稿列表 ── */
.problem-list { display: flex; flex-direction: column; gap: 10px; }
.problem-item { background: #fff; border-radius: 18px; overflow: hidden; border: 1px solid rgba(0,0,0,.06); box-shadow: 0 2px 8px rgba(0,0,0,.05); display: flex; align-items: stretch; }
.item-hero { width: 82px; flex-shrink: 0; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.item-glow { position: absolute; width: 70px; height: 70px; border-radius: 50%; opacity: .25; filter: blur(20px); }
.item-img  { width: 100%; height: 100%; object-fit: cover; position: relative; z-index: 1; }
.item-emoji { font-size: 32px; position: relative; z-index: 1; filter: drop-shadow(0 4px 10px rgba(0,0,0,.4)); font-family: "Apple Color Emoji","Segoe UI Emoji",sans-serif; }
.item-body { flex: 1; padding: 13px 14px; min-width: 0; }
.item-meta { display: flex; align-items: center; gap: 7px; margin-bottom: 5px; }
.item-cat  { font-size: 10px; font-weight: 700; letter-spacing: .06em; }
.item-diff { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 100px; }
.item-title { font-size: 14px; font-weight: 600; color: #1d1d1f; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-sub  { font-size: 12px; color: #6e6e73; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 5px; }
.item-date { font-size: 11px; color: #aeaeb2; }
.item-actions { display: flex; flex-direction: column; justify-content: center; gap: 6px; padding: 12px 12px 12px 0; }
.act-btn { display: flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-family: inherit; font-weight: 500; cursor: pointer; border: none; transition: all .15s; white-space: nowrap; }
.act-btn.edit { background: rgba(0,122,255,.1); color: #007aff; }
.act-btn.edit:hover { background: rgba(0,122,255,.18); }
.act-btn.del  { background: rgba(255,59,48,.08); color: #ff3b30; }
.act-btn.del:hover:not(:disabled) { background: rgba(255,59,48,.16); }
.act-btn:not(.edit):not(.del) { background: rgba(0,0,0,.05); color: #6e6e73; }
.act-btn:not(.edit):not(.del):hover:not(:disabled) { background: rgba(0,0,0,.1); color: #1d1d1f; }
.act-btn:disabled { opacity: .4; cursor: not-allowed; }

/* ── 求助帖列表 ── */
.post-list { display: flex; flex-direction: column; gap: 10px; }
.post-row { background: #fff; border: 1px solid rgba(0,0,0,.06); border-radius: 16px; padding: 18px 20px; box-shadow: 0 2px 6px rgba(0,0,0,.05); }
.row-top  { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.badge { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 100px; }
.status-tag  { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 100px; }
.status-open { background: rgba(34,197,94,.12); color: #16a34a; }
.status-done { background: rgba(107,114,128,.12); color: #6b7280; }
.row-time  { font-size: 12px; color: #aeaeb2; margin-left: auto; }
.row-title { font-size: 15px; font-weight: 600; color: #1d1d1f; margin-bottom: 5px; }
.row-desc  { font-size: 13px; color: #6e6e73; line-height: 1.6; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.row-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* ── 账号设置 ── */
.account-tab { display: flex; flex-direction: column; gap: 20px; }
.account-section { background: #fff; border-radius: 16px; padding: 22px 22px 24px; border: 1px solid rgba(0,0,0,.06); box-shadow: 0 2px 6px rgba(0,0,0,.05); display: flex; flex-direction: column; gap: 14px; }
.account-title { font-size: 15px; font-weight: 600; color: #1d1d1f; margin: 0; }
.account-field { display: flex; flex-direction: column; gap: 6px; }
.account-field label { font-size: 12px; color: #6e6e73; letter-spacing: .04em; }
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
  .hero-content { flex-direction: column; align-items: flex-start; gap: 16px; padding: 64px 20px 28px; }
  .hero-emoji { font-size: 56px; }
  .detail-content { padding: 0 16px 40px; }
  .account-section { padding: 18px 16px 20px; }
  .account-field input { font-size: 16px; }
  .field input, .field textarea { font-size: 16px; }
}
</style>
