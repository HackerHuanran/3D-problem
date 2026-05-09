<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useUserProblems } from '@/composables/useUserProblems.js'
import { app } from '@/lib/tcb.js'

const props = defineProps({ currentUser: Object })
const emit  = defineEmits(['back'])

const { fetchMyProblems, deleteUserProblem, updateUserProblem, fetchUserProblems } = useUserProblems()

const CATEGORIES   = ['打印机整机', '喷头热端', '挤出机', '热床', 'AMS送料', '耗材材料', '切片软件', '校准调平', '打印质量', '固件设置']
const DIFFICULTIES = ['常见', '需处理', '紧急', '进阶']

const CAT_META = {
  '打印机整机': { emoji: '🖨️', bg: 'linear-gradient(135deg,#0a0f1a 0%,#0f1a2d 100%)', color: '#74b9ff' },
  '喷头热端':   { emoji: '🔥', bg: 'linear-gradient(135deg,#1a0a0a 0%,#2d1010 100%)', color: '#ff7675' },
  '挤出机':     { emoji: '⚙️', bg: 'linear-gradient(135deg,#0f1214 0%,#1a1e22 100%)', color: '#b2bec3' },
  '热床':       { emoji: '🛏️', bg: 'linear-gradient(135deg,#1a0a12 0%,#2d0f1e 100%)', color: '#fd79a8' },
  'AMS送料':    { emoji: '🎡', bg: 'linear-gradient(135deg,#0f0a1a 0%,#1a0f2d 100%)', color: '#a29bfe' },
  '耗材材料':   { emoji: '🧵', bg: 'linear-gradient(135deg,#1a160a 0%,#2d230f 100%)', color: '#fdcb6e' },
  '切片软件':   { emoji: '✂️', bg: 'linear-gradient(135deg,#0a1a1a 0%,#0f2d2d 100%)', color: '#00cec9' },
  '校准调平':   { emoji: '📐', bg: 'linear-gradient(135deg,#0a0f1a 0%,#0f1e2d 100%)', color: '#0984e3' },
  '打印质量':   { emoji: '🎨', bg: 'linear-gradient(135deg,#1a120a 0%,#2d1e0f 100%)', color: '#e17055' },
  '固件设置':   { emoji: '⚡', bg: 'linear-gradient(135deg,#0a1a14 0%,#0f2d1e 100%)', color: '#55efc4' },
}
const DIFF_COLOR = { '常见': '#6e6e73', '需处理': '#7048e8', '紧急': '#e03131', '进阶': '#1971c2' }
const DIFF_BG    = { '常见': 'rgba(110,110,115,0.15)', '需处理': 'rgba(112,72,232,0.18)', '紧急': 'rgba(224,49,49,0.18)', '进阶': 'rgba(25,113,194,0.18)' }

function catMeta(cat) {
  return CAT_META[cat] || { emoji: '🔧', bg: 'linear-gradient(135deg,#1a0a0a,#2d0f0f)', color: '#ff6b6b' }
}

// ── 列表 ──
const myProblems = ref([])
const listLoading = ref(false)
const view        = ref('list')
const editTarget  = ref(null)

async function load() {
  listLoading.value = true
  myProblems.value  = await fetchMyProblems(props.currentUser.id)
  listLoading.value = false
}
onMounted(load)

// ── 删除 ──
const deleting = ref(null)
async function handleDelete(p) {
  if (!confirm(`确定删除「${p.title}」吗？此操作不可撤销。`)) return
  deleting.value = p.id
  try {
    await deleteUserProblem(p.id)
    myProblems.value = myProblems.value.filter(x => x.id !== p.id)
  } finally {
    deleting.value = null
  }
}

// ── 编辑表单 ──
const editForm = reactive({
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

function openEdit(p) {
  editTarget.value     = p
  editForm.category    = p.category   || '打印机整机'
  editForm.difficulty  = p.difficulty || '常见'
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
  view.value = 'edit'
  window.scrollTo(0, 0)
}

function cancelEdit() { view.value = 'list'; editTarget.value = null; window.scrollTo(0, 0) }

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
function addCause()       { editForm.causes.push('') }
function removeCause(i)   { if (editForm.causes.length > 1) editForm.causes.splice(i, 1) }
function addSolution()    { editForm.solutions.push({ title: '', detail: '', imageFile: null, imagePreview: null, image_url: null }) }
function removeSolution(i){ if (editForm.solutions.length > 1) { removeSolImg(i); editForm.solutions.splice(i, 1) } }

async function uploadOne(file, dir) {
  const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
  const cloudPath = `${dir}/${props.currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { fileID } = await app.uploadFile({ cloudPath, filePath: file })
  return fileID
}

async function saveEdit() {
  const e = {}
  if (!editForm.title.trim())       e.title       = '请填写问题标题'
  if (!editForm.subtitle.trim())    e.subtitle    = '请填写一句话描述'
  if (!editForm.description.trim()) e.description = '请填写详细描述'
  editErrors.value = e
  if (Object.keys(e).length) return

  saving.value = true
  try {
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
    await load()
    fetchUserProblems()
    view.value = 'list'; window.scrollTo(0, 0)
  } catch (err) {
    editErrors.value.submit = err.message || '保存失败，请重试'
  } finally {
    saving.value = false
  }
}

function formatDate(ts) {
  if (!ts) return ''
  try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) } catch { return '' }
}
</script>

<template>
  <div class="my-problems-page">

    <!-- ── 导航 ── -->
    <nav class="back-nav">
      <button class="back-btn" @click="view === 'edit' ? cancelEdit() : emit('back')">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 4L6 9l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ view === 'edit' ? '返回列表' : '返回' }}
      </button>
      <h1 class="nav-title">{{ view === 'edit' ? '编辑问题' : '我发布的问题' }}</h1>
    </nav>

    <!-- ══════════ 列表视图 ══════════ -->
    <div v-if="view === 'list'" class="list-wrap">

      <div v-if="listLoading" class="center-state">
        <span class="spinner"></span>加载中…
      </div>

      <div v-else-if="myProblems.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <p class="empty-title">还没有发布过问题</p>
        <p class="empty-desc">在首页点击「分享你遇到的问题」来发布第一个问题</p>
      </div>

      <div v-else class="problem-list">
        <div v-for="p in myProblems" :key="p.id" class="problem-item">
          <!-- 缩略 Hero -->
          <div class="item-hero" :style="{ background: catMeta(p.category).bg }">
            <div class="item-glow" :style="{ background: catMeta(p.category).color }"></div>
            <img v-if="p.image_url" :src="p.image_url" class="item-img" alt="" />
            <span v-else class="item-emoji">{{ catMeta(p.category).emoji }}</span>
          </div>
          <!-- 信息 -->
          <div class="item-body">
            <div class="item-meta">
              <span class="item-cat" :style="{ color: catMeta(p.category).color }">{{ p.category }}</span>
              <span class="item-diff"
                :style="{ background: DIFF_BG[p.difficulty], color: DIFF_COLOR[p.difficulty] }">
                {{ p.difficulty }}
              </span>
            </div>
            <h3 class="item-title">{{ p.title }}</h3>
            <p class="item-sub">{{ p.subtitle }}</p>
            <p class="item-date">{{ formatDate(p._rawCreatedAt) }}</p>
          </div>
          <!-- 操作 -->
          <div class="item-actions">
            <button class="act-btn edit" @click="openEdit(p)">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
              </svg>
              编辑
            </button>
            <button class="act-btn del" :disabled="deleting === p.id" @click="handleDelete(p)">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.8 7.5h6.4L11 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ deleting === p.id ? '删除中…' : '删除' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════ 编辑视图 ══════════ -->
    <div v-if="view === 'edit'" class="edit-wrap">

      <!-- Hero 编辑 -->
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
          <h2 class="section-title">
            <span class="section-icon" :style="{ background: eColor + '22', color: eColor }">📝</span>详细描述
          </h2>
          <textarea v-model="editForm.description" class="content-textarea" :class="{ 'has-error': editErrors.description }"
            rows="5" maxlength="600" placeholder="详细描述问题的具体表现…"></textarea>
          <p v-if="editErrors.description" class="field-err">{{ editErrors.description }}</p>
        </section>

        <!-- 问题类型 -->
        <section class="section">
          <h2 class="section-title">
            <span class="section-icon" :style="{ background: eColor + '22', color: eColor }">🏷️</span>问题类型
          </h2>
          <div class="select-chips">
            <button v-for="c in CATEGORIES" :key="c"
              :class="['select-chip', { active: editForm.category === c }]"
              :style="editForm.category === c ? { background: eColor + '18', borderColor: eColor, color: eColor } : {}"
              type="button" @click="editForm.category = c">{{ c }}</button>
          </div>
        </section>

        <!-- 问题重要性 -->
        <section class="section">
          <h2 class="section-title">
            <span class="section-icon" :style="{ background: eColor + '22', color: eColor }">⚠️</span>问题重要性
          </h2>
          <div class="select-chips">
            <button v-for="d in DIFFICULTIES" :key="d"
              :class="['select-chip', { active: editForm.difficulty === d }]"
              :style="editForm.difficulty === d ? { background: DIFF_BG[d], borderColor: DIFF_COLOR[d], color: DIFF_COLOR[d] } : {}"
              type="button" @click="editForm.difficulty = d">{{ d }}</button>
          </div>
        </section>

        <!-- 问题图片 -->
        <section class="section">
          <h2 class="section-title">
            <span class="section-icon" :style="{ background: eColor + '22', color: eColor }">📷</span>
            问题图片<span class="optional-tag">选填</span>
          </h2>
          <!-- 有新预览 -->
          <div v-if="editImgPreview" class="img-preview-wrap">
            <img :src="editImgPreview" class="img-preview" alt="" />
            <button class="img-remove-btn" type="button" @click="removeEditImg">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            </button>
          </div>
          <!-- 保留已有图 -->
          <div v-else-if="keepImg && editTarget?.image_url" class="img-preview-wrap">
            <img :src="editTarget.image_url" class="img-preview" alt="" />
            <button class="img-remove-btn" type="button" @click="keepImg = false">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            </button>
          </div>
          <!-- 上传区 -->
          <label v-else class="img-upload-area">
            <input type="file" accept="image/*" style="display:none" @change="onEditImgChange" />
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 6v16M6 14h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            <span>点击上传图片</span>
          </label>
        </section>

        <!-- 可能原因 -->
        <section class="section">
          <h2 class="section-title">
            <span class="section-icon" :style="{ background: eColor + '22', color: eColor }">⚡</span>可能原因
          </h2>
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
          <h2 class="section-title">
            <span class="section-icon" :style="{ background: eColor + '22', color: eColor }">🔧</span>解决步骤
          </h2>
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
          <h2 class="section-title">
            <span class="section-icon" :style="{ background: eColor + '22', color: eColor }">💡</span>
            小贴士<span class="optional-tag">选填</span>
          </h2>
          <div class="tip-box" :style="{ background: eColor + '0d', borderColor: eColor + '33' }">
            <textarea v-model="editForm.tips" class="tip-textarea" rows="3" maxlength="200" placeholder="补充注意事项…"></textarea>
          </div>
        </section>

        <div v-if="editErrors.submit" class="submit-err-box">{{ editErrors.submit }}</div>

        <button class="submit-btn" :class="{ loading: saving }" :disabled="saving" @click="saveEdit">
          <span v-if="saving" class="btn-spinner"></span>
          {{ saving ? '保存中…' : '保存修改' }}
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.my-problems-page { min-height: 100vh; background: #f5f5f7; color: #1d1d1f; font-family: -apple-system,'PingFang SC','Helvetica Neue',sans-serif; padding-bottom: 60px; }

/* 导航 */
.back-nav { position: sticky; top: 0; z-index: 100; padding: 0 24px; height: 52px; background: rgba(255,255,255,0.88); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0,0,0,0.08); display: flex; align-items: center; gap: 12px; }
.back-btn  { display: flex; align-items: center; gap: 4px; background: transparent; border: none; color: #007aff; font-size: 15px; cursor: pointer; font-family: inherit; padding: 0; flex-shrink: 0; }
.back-btn:hover { opacity: 0.7; }
.nav-title { font-size: 15px; font-weight: 600; color: #1d1d1f; }

/* 列表 */
.list-wrap { max-width: 760px; margin: 0 auto; padding: 24px 20px; }
.center-state { display: flex; align-items: center; justify-content: center; gap: 10px; color: #aeaeb2; font-size: 14px; padding: 60px 0; }
.spinner { width: 18px; height: 18px; border: 2px solid rgba(0,0,0,0.08); border-top-color: #6e6e73; border-radius: 50%; animation: spin 0.75s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { text-align: center; padding: 80px 20px; }
.empty-icon  { font-size: 40px; margin-bottom: 12px; opacity: 0.5; }
.empty-title { font-size: 16px; font-weight: 600; color: #1d1d1f; margin-bottom: 6px; }
.empty-desc  { font-size: 13px; color: #6e6e73; line-height: 1.6; }

.problem-list { display: flex; flex-direction: column; gap: 12px; }
.problem-item { background: #fff; border-radius: 18px; overflow: hidden; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; align-items: stretch; }

.item-hero { width: 90px; flex-shrink: 0; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.item-glow { position: absolute; width: 80px; height: 80px; border-radius: 50%; opacity: 0.25; filter: blur(24px); }
.item-img  { width: 100%; height: 100%; object-fit: cover; position: relative; z-index: 1; }
.item-emoji { font-size: 36px; position: relative; z-index: 1; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.4)); font-family: "Apple Color Emoji","Segoe UI Emoji",sans-serif; }

.item-body  { flex: 1; padding: 14px 16px; min-width: 0; }
.item-meta  { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.item-cat   { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; }
.item-diff  { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 100px; letter-spacing: 0.04em; }
.item-title { font-size: 15px; font-weight: 600; color: #1d1d1f; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-sub   { font-size: 12px; color: #6e6e73; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px; }
.item-date  { font-size: 11px; color: #aeaeb2; }

.item-actions { display: flex; flex-direction: column; justify-content: center; gap: 6px; padding: 14px 14px 14px 0; }
.act-btn { display: flex; align-items: center; gap: 5px; padding: 7px 13px; border-radius: 10px; font-size: 12px; font-family: inherit; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; white-space: nowrap; }
.act-btn.edit { background: rgba(0,122,255,0.1); color: #007aff; }
.act-btn.edit:hover { background: rgba(0,122,255,0.18); }
.act-btn.del  { background: rgba(255,59,48,0.08); color: #ff3b30; }
.act-btn.del:hover:not(:disabled) { background: rgba(255,59,48,0.16); }
.act-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* 编辑视图（复用 SubmitProblemView 样式） */
.edit-wrap { padding-bottom: 60px; }
.detail-hero { padding-top: 52px; min-height: 240px; position: relative; display: flex; align-items: flex-end; overflow: hidden; }
.hero-content { width: 100%; max-width: 800px; margin: 0 auto; padding: 40px 24px 32px; display: flex; align-items: flex-end; gap: 24px; position: relative; z-index: 2; }
.hero-emoji { font-size: 72px; line-height: 1; flex-shrink: 0; filter: drop-shadow(0 10px 28px rgba(0,0,0,0.5)); font-family: "Apple Color Emoji","Segoe UI Emoji",sans-serif; }
.hero-glow  { position: absolute; width: 180px; height: 180px; border-radius: 50%; opacity: 0.2; filter: blur(56px); left: 24px; bottom: 16px; }
.hero-meta  { flex: 1; min-width: 0; }
.hero-title-input { display: block; width: 100%; background: transparent; border: none; border-bottom: 1.5px solid rgba(255,255,255,0.25); outline: none; color: #f5f5f7; font-size: clamp(1.4rem,4vw,2rem); font-weight: 700; letter-spacing: -0.03em; padding: 10px 0 7px; margin-top: 8px; font-family: inherit; }
.hero-title-input::placeholder { color: rgba(255,255,255,0.3); }
.hero-title-input.has-error { border-bottom-color: #ff6b6b; }
.hero-sub-input { display: block; width: 100%; background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.15); outline: none; color: rgba(255,255,255,0.65); font-size: 15px; padding: 7px 0; margin-top: 8px; font-family: inherit; }
.hero-sub-input::placeholder { color: rgba(255,255,255,0.25); }
.hero-sub-input.has-error { border-bottom-color: #ff6b6b; }
.hero-err { font-size: 12px; color: #ff6b6b; margin-top: 3px; }

.detail-content { max-width: 800px; margin: 0 auto; padding: 0 24px 40px; }
.section { padding: 32px 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
.section:last-of-type { border-bottom: none; }
.section-title { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 600; margin-bottom: 14px; color: #1d1d1f; }
.section-icon  { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.optional-tag  { margin-left: 4px; font-size: 12px; color: #aeaeb2; font-weight: 400; }

.content-input { width: 100%; background: #fff; border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 11px 15px; color: #1d1d1f; font-size: 15px; font-family: inherit; outline: none; box-sizing: border-box; }
.content-textarea { width: 100%; background: #fff; border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 11px 15px; color: #1d1d1f; font-size: 15px; font-family: inherit; outline: none; resize: vertical; line-height: 1.7; box-sizing: border-box; }
.content-textarea.small { font-size: 14px; }
.content-textarea.has-error, .content-input.has-error { border-color: #ff3b30; }
.field-err { font-size: 12px; color: #ff3b30; margin-top: 4px; }

.select-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.select-chip  { padding: 7px 18px; border-radius: 100px; border: 1.5px solid rgba(0,0,0,0.12); background: #fff; color: #6e6e73; font-size: 14px; font-family: inherit; cursor: pointer; transition: all 0.18s; font-weight: 500; }
.select-chip:hover { border-color: rgba(0,0,0,0.25); color: #1d1d1f; }
.select-chip.active { font-weight: 600; }

.img-upload-area { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; height: 160px; border: 1.5px dashed rgba(0,0,0,0.15); border-radius: 16px; color: #aeaeb2; cursor: pointer; background: #fff; }
.img-upload-area:hover { border-color: rgba(0,0,0,0.28); color: #6e6e73; }
.img-preview-wrap { position: relative; display: inline-block; }
.img-preview { width: 100%; max-height: 260px; object-fit: cover; border-radius: 14px; display: block; }
.img-remove-btn { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; border-radius: 50%; background: rgba(0,0,0,0.5); border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.img-remove-btn.small { width: 22px; height: 22px; top: 6px; right: 6px; }
.img-remove-btn:hover { background: rgba(255,59,48,0.8); }

.causes-edit-grid { display: flex; flex-direction: column; gap: 8px; }
.cause-edit-item { display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 12px 14px; }
.cause-num   { font-size: 12px; font-weight: 700; flex-shrink: 0; width: 22px; }
.cause-input { flex: 1; background: transparent; border: none; outline: none; color: #1d1d1f; font-size: 14px; font-family: inherit; }
.cause-input::placeholder { color: #c7c7cc; }

.solutions-edit-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; }
.solution-edit-item { background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.sol-edit-head { display: flex; align-items: center; gap: 10px; }
.sol-step-badge { width: 24px; height: 24px; border-radius: 50%; font-size: 11px; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sol-step-label { flex: 1; font-size: 12px; font-weight: 700; color: #6e6e73; letter-spacing: 0.05em; text-transform: uppercase; }
.sol-img-section { margin-top: 2px; }
.sol-img-upload { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; background: #f5f5f7; border: 1.5px dashed rgba(0,0,0,0.12); border-radius: 10px; color: #aeaeb2; font-size: 13px; font-family: inherit; cursor: pointer; }
.sol-img-upload:hover { border-color: rgba(0,0,0,0.22); color: #6e6e73; }
.sol-img-preview-wrap { position: relative; display: inline-block; }
.sol-img-preview { max-width: 220px; max-height: 140px; object-fit: cover; border-radius: 10px; display: block; }

.icon-remove { width: 26px; height: 26px; border-radius: 50%; border: none; background: rgba(0,0,0,0.06); color: #6e6e73; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon-remove:hover { background: rgba(255,59,48,0.1); color: #ff3b30; }
.add-row-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #fff; border: 1.5px dashed rgba(0,0,0,0.14); border-radius: 10px; color: #6e6e73; font-size: 13px; font-family: inherit; cursor: pointer; margin-top: 2px; }
.add-row-btn:hover:not(:disabled) { border-color: rgba(0,0,0,0.26); color: #1d1d1f; }
.add-row-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.tip-box { border-radius: 14px; padding: 14px 16px; border: 1px solid; }
.tip-textarea { width: 100%; background: transparent; border: none; outline: none; color: #6e6e73; font-size: 14px; font-family: inherit; resize: none; line-height: 1.75; box-sizing: border-box; }
.tip-textarea::placeholder { color: #c7c7cc; }

.submit-err-box { background: rgba(255,59,48,0.08); border: 1px solid rgba(255,59,48,0.2); border-radius: 12px; padding: 12px 16px; font-size: 14px; color: #ff3b30; margin-bottom: 16px; }
.submit-btn { width: 100%; padding: 15px; background: #1d1d1f; color: #fff; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.18s; }
.submit-btn:hover:not(:disabled) { background: #3a3a3c; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.submit-btn.loading { background: #aeaeb2; }
.btn-spinner { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }

@media (max-width: 600px) {
  .item-hero { width: 72px; }
  .item-emoji { font-size: 28px; }
  .act-btn span { display: none; }
  .detail-content { padding: 0 16px 40px; }
}
</style>
