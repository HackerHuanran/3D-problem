<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useUserProblems } from '@/composables/useUserProblems.js'
import { useUserGuard } from '@/composables/useUserGuard.js'
import { useLocale } from '@/composables/useLocale.js'
import { app } from '@/lib/tcb.js'
import { compressImage } from '@/lib/imageUtils.js'
import { checkContent, checkImage } from '@/lib/moderate.js'
import { useToast } from '@/composables/useToast.js'

const props = defineProps({
  currentUser: Object,
  context: {
    type: Object,
    default: null,
  },
})
const emit  = defineEmits(['back', 'submitted'])

const { submitProblem } = useUserProblems()
const { ensureUserCanPublish } = useUserGuard()
const { t } = useLocale()
const { success, error: toastError } = useToast()

const CDN_BASE = 'https://7072-problem-d1gg06meg3dd7da6b-1257726828.tcb.qcloud.la'

const CATEGORIES = ['打印机整机', '喷头热端', '挤出机', '热床', 'AMS送料', '耗材材料', '切片软件', '校准调平', '打印质量', '固件设置']
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
const DIFF_BG    = { '常见': 'rgba(255,255,255,0.12)', '需处理': 'rgba(162,155,254,0.25)', '紧急': 'rgba(224,49,49,0.25)', '进阶': 'rgba(25,113,194,0.25)' }
const isSolutionMode = computed(() => props.context?.mode === 'solution' && props.context?.targetProblemId)
const targetProblemTitle = computed(() => props.context?.targetProblemTitle || '')

const form = reactive({
  category:    '打印机整机',
  difficulty:  '常见',
  title:       '',
  subtitle:    '',
  description: '',
  causes:      [''],
  solutions:   [{ title: '', detail: '', imageFile: null, imagePreview: null }],
  tips:        '',
  solutionNote: '',
})

if (isSolutionMode.value) {
  form.category = props.context?.category || '打印质量'
  form.title = `${targetProblemTitle.value} · 解决方案补充`
  form.subtitle = '补充一个你验证有效的处理办法'
  form.solutions = [
    { title: '', detail: '', imageFile: null, imagePreview: null },
    { title: '', detail: '', imageFile: null, imagePreview: null },
  ]
}

const heroBg    = computed(() => CAT_META[form.category]?.bg || CAT_META['打印机整机'].bg)
const heroColor = computed(() => CAT_META[form.category]?.color || '#5cba7a')
const heroEmoji = computed(() => CAT_META[form.category]?.emoji || '🖨️')

// ── 问题主图 ──
const problemImageFile    = ref(null)
const problemImagePreview = ref(null)

function onProblemImageChange(e) {
  const file = e.target.files[0]
  if (!file) return
  problemImageFile.value    = file
  problemImagePreview.value = URL.createObjectURL(file)
  e.target.value = ''
}
function removeProblemImage() {
  if (problemImagePreview.value) URL.revokeObjectURL(problemImagePreview.value)
  problemImageFile.value    = null
  problemImagePreview.value = null
}

// ── 步骤图片 ──
function onSolImageChange(e, i) {
  const file = e.target.files[0]
  if (!file) return
  if (form.solutions[i].imagePreview) URL.revokeObjectURL(form.solutions[i].imagePreview)
  form.solutions[i].imageFile    = file
  form.solutions[i].imagePreview = URL.createObjectURL(file)
  e.target.value = ''
}
function removeSolImage(i) {
  if (form.solutions[i].imagePreview) URL.revokeObjectURL(form.solutions[i].imagePreview)
  form.solutions[i].imageFile    = null
  form.solutions[i].imagePreview = null
}

// ── 原因 ──
function addCause()     { form.causes.push('') }
function removeCause(i) { if (form.causes.length > 1) form.causes.splice(i, 1) }

// ── 步骤 ──
function addSolution()     { form.solutions.push({ title: '', detail: '', imageFile: null, imagePreview: null }) }
function removeSolution(i) { if (form.solutions.length > 1) { removeSolImage(i); form.solutions.splice(i, 1) } }

// ── 校验 ──
const errors     = ref({})
const submitting = ref(false)

function validate() {
  const e = {}
  if (!isSolutionMode.value && !form.title.trim()) e.title = t('sp.errTitle')
  if (!isSolutionMode.value && !form.subtitle.trim()) e.subtitle = t('sp.errSubtitle')
  if (!isSolutionMode.value && !form.description.trim()) e.description = t('sp.errDescription')
  if (!isSolutionMode.value && !form.causes.some(c => c.trim())) e.causes = t('sp.errCause')
  if (!form.solutions.some(s => s.title.trim())) e.solutions = t('sp.errSolution')
  errors.value = e
  return Object.keys(e).length === 0
}

function categoryLabel(category) {
  const map = {
    '打印机整机': t('sp.cat.machine'),
    '喷头热端': t('sp.cat.hotend'),
    '挤出机': t('sp.cat.extruder'),
    '热床': t('sp.cat.bed'),
    'AMS送料': t('sp.cat.ams'),
    '耗材材料': t('sp.cat.filament'),
    '切片软件': t('sp.cat.slicer'),
    '校准调平': t('sp.cat.leveling'),
    '打印质量': t('sp.cat.quality'),
    '固件设置': t('sp.cat.firmware'),
  }
  return map[category] || category
}

function difficultyLabel(level) {
  const map = {
    '常见': t('sp.diff.common'),
    '需处理': t('sp.diff.warn'),
    '紧急': t('sp.diff.urgent'),
    '进阶': t('sp.diff.advanced'),
  }
  return map[level] || level
}

// ── 滚动检测（nav 样式）──
const navScrolled = ref(false)
const onScroll = () => { navScrolled.value = window.scrollY > 20 }
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

// ── 上传单张图片（压缩后），返回 fileID ──
async function uploadOne(file, dir) {
  const compressed = await compressImage(file)
  const { pass, msg } = await checkImage(compressed)
  if (!pass) throw new Error(msg)
  const cloudPath = `${dir}/${props.currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
  await app.uploadFile({ cloudPath, filePath: compressed })
  return `${CDN_BASE}/${cloudPath}`
}

async function submit() {
  if (!validate()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
  submitting.value = true
  try {
    await ensureUserCanPublish(props.currentUser.id, isSolutionMode.value ? '提交补充方案' : '提交问题')
    const contentText = isSolutionMode.value
      ? [form.solutionNote, ...form.solutions.map((s) => [s.title, s.detail].filter(Boolean).join('\n'))].filter(Boolean).join('\n')
      : [form.title, form.subtitle, form.description, ...form.causes, form.tips].filter(Boolean).join('\n')
    const { pass, msg } = await checkContent(contentText)
    if (!pass) { errors.value.submit = msg; return }

    // 上传问题主图
    let image_url = null
    if (!isSolutionMode.value && problemImageFile.value) {
      image_url = await uploadOne(problemImageFile.value, 'problem-images')
    }

    // 上传步骤图片
    const solutions = await Promise.all(
      form.solutions
        .filter(s => s.title.trim())
        .map(async (s, i) => {
          let sol_image_url = null
          if (s.imageFile) {
            sol_image_url = await uploadOne(s.imageFile, 'solution-images')
          }
          return { step: i + 1, title: s.title.trim(), detail: s.detail.trim(), image_url: sol_image_url }
        })
    )

    await submitProblem(props.currentUser.id, props.currentUser.username, {
      category:    form.category,
      difficulty:  form.difficulty,
      title:       isSolutionMode.value ? `${targetProblemTitle.value} · 方案补充` : form.title.trim(),
      subtitle:    isSolutionMode.value ? '来自用户补充的处理方案' : form.subtitle.trim(),
      description: isSolutionMode.value
        ? [form.solutionNote.trim(), solutions.map((item) => [item.title, item.detail].filter(Boolean).join('：')).join('；')].filter(Boolean).join('；')
        : form.description.trim(),
      causes:      isSolutionMode.value ? [] : form.causes.filter(c => c.trim()),
      solutions,
      tips:        isSolutionMode.value ? '' : form.tips.trim(),
      image_url,
      submissionType: isSolutionMode.value ? 'solution' : 'problem',
      parentProblemId: isSolutionMode.value ? props.context.targetProblemId : '',
      parentProblemTitle: isSolutionMode.value ? targetProblemTitle.value : '',
    })
    success(isSolutionMode.value ? '解决方案已提交，等待后台审核后展示' : '问题提交成功，等待后台审核后展示')
    emit('submitted')
  } catch (e) {
    errors.value.submit = e.message || t('sp.errSubmit')
    toastError(errors.value.submit)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="submit-page">

    <!-- 顶部导航 -->
    <nav class="back-nav" :class="{ scrolled: navScrolled }">
      <button class="back-btn" @click="emit('back')">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 4L6 9l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ t('common.back') }}
      </button>
    </nav>

    <!-- Hero 编辑区（深色） -->
    <header class="detail-hero" :style="{ background: heroBg }">
      <div class="hero-content">
        <div class="hero-emoji">{{ heroEmoji }}</div>
        <div class="hero-glow" :style="{ background: heroColor }"></div>

        <div class="hero-meta">
          <div v-if="isSolutionMode" class="solution-mode-badge">
            <span>补充方案</span>
            <strong>{{ targetProblemTitle }}</strong>
          </div>
          <template v-if="isSolutionMode">
            <h1 class="solution-mode-title">补充你的解决步骤</h1>
            <p class="solution-mode-desc">不用重复填写问题信息，直接把你验证有效的处理步骤补充上来就可以。</p>
          </template>
          <template v-else>
            <input
              v-model="form.title"
              class="hero-title-input"
              :placeholder="t('sp.titlePh')"
              maxlength="40"
              :class="{ 'has-error': errors.title }"
            />
            <p v-if="errors.title" class="hero-err">{{ errors.title }}</p>

            <input
              v-model="form.subtitle"
              class="hero-sub-input"
              :placeholder="t('sp.subtitlePh')"
              maxlength="40"
              :class="{ 'has-error': errors.subtitle }"
            />
            <p v-if="errors.subtitle" class="hero-err">{{ errors.subtitle }}</p>
          </template>
        </div>
      </div>
    </header>

    <!-- 内容区（白底分区，和详情页一致） -->
    <div class="detail-content">

      <!-- 📝 详细描述 -->
      <section v-if="!isSolutionMode" class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: heroColor + '22', color: heroColor }">📝</span>
          {{ t('sp.detail') }}
        </h2>
        <textarea
          v-model="form.description"
          class="content-textarea"
          :placeholder="t('sp.descPh')"
          rows="5"
          maxlength="600"
          :class="{ 'has-error': errors.description }"
        ></textarea>
        <div class="char-hint">{{ form.description.length }}/600</div>
        <p v-if="errors.description" class="field-err">{{ errors.description }}</p>
      </section>

      <!-- 🏷️ 问题类型 -->
      <section v-if="!isSolutionMode" class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: heroColor + '22', color: heroColor }">🏷️</span>
          {{ t('sp.category') }}
        </h2>
        <div class="select-chips">
          <button
            v-for="c in CATEGORIES" :key="c"
            :class="['select-chip', { active: form.category === c }]"
            :style="form.category === c ? { background: heroColor + '18', borderColor: heroColor, color: heroColor } : {}"
            type="button" @click="form.category = c"
          >{{ categoryLabel(c) }}</button>
        </div>
      </section>

      <!-- ⚠️ 问题重要性 -->
      <section v-if="!isSolutionMode" class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: heroColor + '22', color: heroColor }">⚠️</span>
          {{ t('sp.difficulty') }}
        </h2>
        <div class="select-chips">
          <button
            v-for="d in DIFFICULTIES" :key="d"
            :class="['select-chip', { active: form.difficulty === d }]"
            :style="form.difficulty === d
              ? { background: DIFF_BG[d] + 'cc', borderColor: DIFF_COLOR[d], color: DIFF_COLOR[d] }
              : {}"
            type="button" @click="form.difficulty = d"
          >{{ difficultyLabel(d) }}</button>
        </div>
      </section>

      <!-- 📷 问题图片 -->
      <section v-if="!isSolutionMode" class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: heroColor + '22', color: heroColor }">📷</span>
          {{ t('sp.image') }}
          <span class="optional-tag">{{ t('common.optional') }}</span>
        </h2>
        <p class="section-sub">{{ t('sp.imageSub') }}</p>

        <div v-if="problemImagePreview" class="img-preview-wrap">
          <img :src="problemImagePreview" class="img-preview" :alt="t('sp.image')" />
          <button class="img-remove-btn" type="button" @click="removeProblemImage">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <label v-else class="img-upload-area">
          <input type="file" accept="image/*" style="display:none" @change="onProblemImageChange" />
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 6v16M6 14h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          <span>{{ t('sp.uploadImage') }}</span>
          <span class="upload-hint">{{ t('sp.uploadHint') }}</span>
        </label>
      </section>

      <!-- ⚡ 可能原因 -->
      <section v-if="!isSolutionMode" class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: heroColor + '22', color: heroColor }">⚡</span>
          {{ t('sp.causes') }}
        </h2>
        <div class="causes-edit-grid">
          <div v-for="(_, i) in form.causes" :key="i" class="cause-edit-item">
            <span class="cause-num" :style="{ color: heroColor }">0{{ i + 1 }}</span>
            <input
              v-model="form.causes[i]"
              class="cause-input"
              :placeholder="t('sp.causePh', { n: i + 1 })"
              maxlength="60"
            />
            <button v-if="form.causes.length > 1" class="icon-remove" type="button" @click="removeCause(i)">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        <p v-if="errors.causes" class="field-err" style="margin-top:8px">{{ errors.causes }}</p>
        <button class="add-row-btn" type="button" @click="addCause" :disabled="form.causes.length >= 8">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          {{ t('sp.addCause') }}
        </button>
      </section>

      <!-- 🔧 解决步骤 -->
      <section class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: heroColor + '22', color: heroColor }">🔧</span>
          {{ isSolutionMode ? '你的解决步骤' : t('sp.solutions') }}
        </h2>
        <p v-if="isSolutionMode" class="section-sub solution-sub">建议一条一步，写清楚改了什么参数、怎么操作、结果有什么变化。</p>
        <div v-if="isSolutionMode" class="solution-note-card">
          <label class="solution-note-label">这套方法更适合什么情况</label>
          <textarea
            v-model="form.solutionNote"
            class="content-textarea small"
            placeholder="例如：适用于 PLA 首层轻微翘边、热床已清洁、环境没有明显穿堂风的情况。"
            rows="3"
            maxlength="180"
          ></textarea>
          <div class="char-hint">{{ form.solutionNote.length }}/180</div>
        </div>
        <p v-if="errors.solutions" class="field-err" style="margin-bottom:12px">{{ errors.solutions }}</p>

        <div class="solutions-edit-list">
          <div v-for="(sol, i) in form.solutions" :key="i" class="solution-edit-item">
            <!-- 步骤头 -->
            <div class="sol-edit-head">
              <span class="sol-step-badge" :style="{ background: heroColor }">{{ i + 1 }}</span>
              <span class="sol-step-label">{{ t('sp.step', { n: i + 1 }) }}</span>
              <button v-if="form.solutions.length > 1" class="icon-remove" type="button" @click="removeSolution(i)">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>

            <!-- 步骤标题 -->
            <input
              v-model="sol.title"
              class="content-input"
              :placeholder="t('sp.stepTitlePh')"
              maxlength="40"
            />

            <!-- 步骤详情 -->
            <textarea
              v-model="sol.detail"
              class="content-textarea small"
              :placeholder="t('sp.stepDetailPh')"
              rows="3"
              maxlength="300"
            ></textarea>

            <!-- 步骤图片 -->
            <div class="sol-img-section">
              <div v-if="sol.imagePreview" class="sol-img-preview-wrap">
                <img :src="sol.imagePreview" class="sol-img-preview" />
                <button class="img-remove-btn small" type="button" @click="removeSolImage(i)">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
              <label v-else class="sol-img-upload">
                <input type="file" accept="image/*" style="display:none" @change="e => onSolImageChange(e, i)" />
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                <span>{{ t('sp.stepImage') }}</span>
              </label>
            </div>
          </div>
        </div>

        <button class="add-row-btn" type="button" @click="addSolution" :disabled="form.solutions.length >= 10">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          {{ isSolutionMode ? '继续添加处理步骤' : t('sp.addStep') }}
        </button>
      </section>

      <!-- 💡 小贴士 -->
      <section v-if="!isSolutionMode" class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: heroColor + '22', color: heroColor }">💡</span>
          {{ t('sp.tips') }}
          <span class="optional-tag">{{ t('common.optional') }}</span>
        </h2>
        <div class="tip-box" :style="{ background: heroColor + '0d', borderColor: heroColor + '33' }">
          <textarea
            v-model="form.tips"
            class="tip-textarea"
            :placeholder="t('sp.tipPh')"
            rows="3"
            maxlength="200"
          ></textarea>
          <div class="char-hint" style="margin-top:4px">{{ form.tips.length }}/200</div>
        </div>
      </section>

      <!-- 提交错误 -->
      <div v-if="errors.submit" class="submit-err-box">{{ errors.submit }}</div>

      <!-- 提交按钮 -->
      <button class="submit-btn" :class="{ loading: submitting }" :disabled="submitting" @click="submit">
        <span v-if="submitting" class="btn-spinner"></span>
        {{ submitting ? t('sp.submitting') : (isSolutionMode ? '提交解决方案' : t('sp.submit')) }}
      </button>

    </div>

    <!-- 底部浮动返回（同详情页） -->
    <div class="float-back">
      <button class="float-back-btn" @click="emit('back')">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M10 3L5 7.5l5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ t('sp.backList') }}
      </button>
    </div>

  </div>
</template>

<style scoped>
.submit-page { min-height: 100vh; background: #f5f5f7; color: #1d1d1f; font-family: -apple-system,'PingFang SC','Helvetica Neue',sans-serif; padding-bottom: 120px; }

/* 顶部导航（与详情页一致） */
.back-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 12px 24px; background: transparent; display: flex; align-items: center; transition: background 0.3s, backdrop-filter 0.3s, border-color 0.3s; border-bottom: 1px solid transparent; }
.back-nav.scrolled { background: rgba(255,255,255,0.9); backdrop-filter: blur(20px); border-bottom-color: rgba(0,0,0,0.08); }
.back-btn { display: flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.28); backdrop-filter: blur(12px); border: none; color: #fff; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; padding: 6px 14px; border-radius: 100px; transition: background 0.18s, color 0.18s; }
.back-btn:hover { background: rgba(0,0,0,0.42); }
.back-nav.scrolled .back-btn { background: transparent; color: #007aff; padding: 6px 0; }

/* Hero 编辑区 */
.detail-hero { padding-top: 52px; min-height: 280px; position: relative; display: flex; align-items: flex-end; overflow: hidden; }
.hero-content { width: 100%; max-width: 800px; margin: 0 auto; padding: 48px 24px 36px; display: flex; align-items: flex-end; gap: 28px; position: relative; z-index: 2; }
.hero-emoji { font-size: 80px; line-height: 1; flex-shrink: 0; filter: drop-shadow(0 12px 32px rgba(0,0,0,0.5)); font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; }
.hero-glow { position: absolute; width: 200px; height: 200px; border-radius: 50%; opacity: 0.2; filter: blur(60px); left: 24px; bottom: 20px; }
.hero-meta { flex: 1; min-width: 0; }
.solution-mode-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.92);
  font-size: 13px;
  margin-bottom: 14px;
}
.solution-mode-badge strong {
  font-weight: 700;
  color: #fff;
}
.solution-mode-title {
  margin: 0;
  font-size: clamp(1.7rem, 4vw, 2.5rem);
  line-height: 1.15;
  color: #fff;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.solution-mode-desc {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.75;
  color: rgba(255,255,255,0.74);
  max-width: 560px;
}

/* 分类 / 难度选择器 */
.hero-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.cat-chip { padding: 5px 14px; border-radius: 100px; border: 1.5px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.18s; font-weight: 500; }
.cat-chip:hover { border-color: rgba(255,255,255,0.5); color: #fff; }
.cat-chip.active { color: #1d1d1f; font-weight: 600; }
.diff-chip { padding: 4px 12px; border-radius: 100px; border: 1.5px solid transparent; font-size: 11px; font-family: inherit; cursor: pointer; transition: all 0.18s; letter-spacing: 0.04em; font-weight: 600; }
.diff-chip:hover { opacity: 0.85; }

/* Hero 输入框 */
.hero-title-input { display: block; width: 100%; background: transparent; border: none; border-bottom: 1.5px solid rgba(255,255,255,0.25); outline: none; color: #f5f5f7; font-size: clamp(1.5rem, 4vw, 2.2rem); font-weight: 700; letter-spacing: -0.03em; padding: 12px 0 8px; margin-top: 16px; font-family: inherit; transition: border-color 0.2s; }
.hero-title-input::placeholder { color: rgba(255,255,255,0.3); }
.hero-title-input:focus { border-bottom-color: rgba(255,255,255,0.6); }
.hero-title-input.has-error { border-bottom-color: #ff6b6b; }
.hero-sub-input { display: block; width: 100%; background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.15); outline: none; color: rgba(255,255,255,0.65); font-size: 15px; padding: 8px 0 8px; margin-top: 10px; font-family: inherit; transition: border-color 0.2s; }
.hero-sub-input::placeholder { color: rgba(255,255,255,0.25); }
.hero-sub-input:focus { border-bottom-color: rgba(255,255,255,0.5); }
.hero-sub-input.has-error { border-bottom-color: #ff6b6b; }
.hero-err { font-size: 12px; color: #ff6b6b; margin-top: 4px; }

/* 内容区 */
.detail-content { max-width: 800px; margin: 0 auto; padding: 0 24px 40px; }
.section { padding: 36px 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
.section:last-of-type { border-bottom: none; }
.section-title { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 600; margin-bottom: 16px; letter-spacing: -0.01em; color: #1d1d1f; }
.section-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
.section-sub { font-size: 13px; color: #aeaeb2; margin-bottom: 14px; margin-top: -8px; }
.solution-sub { margin-top: -4px; color: #7c8798; }
.solution-note-card {
  margin-bottom: 14px;
  padding: 16px 18px;
  border-radius: 16px;
  background: #f8fbff;
  border: 1px solid rgba(37, 104, 232, 0.08);
}
.solution-note-label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #335b96;
  margin-bottom: 10px;
}
.optional-tag { margin-left: 4px; font-size: 12px; color: #aeaeb2; font-weight: 400; }

/* 通用输入控件 */
.content-input { width: 100%; background: #fff; border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 12px 16px; color: #1d1d1f; font-size: 15px; font-family: inherit; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
.content-input:focus { border-color: rgba(0,0,0,0.25); box-shadow: 0 0 0 3px rgba(0,0,0,0.04); }
.content-input::placeholder { color: #c7c7cc; }
.content-textarea { width: 100%; background: #fff; border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 12px 16px; color: #1d1d1f; font-size: 15px; font-family: inherit; outline: none; resize: vertical; transition: border-color 0.2s, box-shadow 0.2s; line-height: 1.7; box-sizing: border-box; }
.content-textarea:focus { border-color: rgba(0,0,0,0.25); box-shadow: 0 0 0 3px rgba(0,0,0,0.04); }
.content-textarea::placeholder { color: #c7c7cc; }
.content-textarea.small { font-size: 14px; }
.content-textarea.has-error, .content-input.has-error { border-color: #ff3b30; }
.char-hint { font-size: 11px; color: #aeaeb2; text-align: right; margin-top: 4px; }
.field-err { font-size: 12px; color: #ff3b30; }

/* 类型 / 重要性选择 */
.select-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.select-chip { padding: 7px 18px; border-radius: 100px; border: 1.5px solid rgba(0,0,0,0.12); background: #fff; color: #6e6e73; font-size: 14px; font-family: inherit; cursor: pointer; transition: all 0.18s; font-weight: 500; }
.select-chip:hover { border-color: rgba(0,0,0,0.25); color: #1d1d1f; }
.select-chip.active { font-weight: 600; }

/* 图片上传 */
.img-upload-area { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; height: 180px; border: 1.5px dashed rgba(0,0,0,0.15); border-radius: 16px; color: #aeaeb2; cursor: pointer; transition: all 0.18s; background: #fff; }
.img-upload-area:hover { border-color: rgba(0,0,0,0.3); color: #6e6e73; }
.upload-hint { font-size: 12px; }
.img-preview-wrap { position: relative; display: inline-block; }
.img-preview { width: 100%; max-height: 280px; object-fit: cover; border-radius: 16px; display: block; }
.img-remove-btn { position: absolute; top: 10px; right: 10px; width: 30px; height: 30px; border-radius: 50%; background: rgba(0,0,0,0.5); border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
.img-remove-btn:hover { background: rgba(255,59,48,0.8); }
.img-remove-btn.small { width: 24px; height: 24px; top: 6px; right: 6px; }

/* 原因编辑 */
.causes-edit-grid { display: flex; flex-direction: column; gap: 10px; }
.cause-edit-item { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 14px; padding: 14px 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
.cause-num { font-size: 13px; font-weight: 700; flex-shrink: 0; width: 24px; }
.cause-input { flex: 1; background: transparent; border: none; outline: none; color: #1d1d1f; font-size: 14px; font-family: inherit; font-weight: 500; }
.cause-input::placeholder { color: #c7c7cc; font-weight: 400; }

/* 步骤编辑 */
.solutions-edit-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 14px; }
.solution-edit-item { background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.sol-edit-head { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
.sol-step-badge { width: 26px; height: 26px; border-radius: 50%; font-size: 12px; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sol-step-label { flex: 1; font-size: 13px; font-weight: 700; color: #6e6e73; letter-spacing: 0.05em; text-transform: uppercase; }

/* 步骤图片 */
.sol-img-section { margin-top: 4px; }
.sol-img-upload { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; background: #f5f5f7; border: 1.5px dashed rgba(0,0,0,0.12); border-radius: 10px; color: #aeaeb2; font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.15s; }
.sol-img-upload:hover { border-color: rgba(0,0,0,0.25); color: #6e6e73; }
.sol-img-preview-wrap { position: relative; display: inline-block; }
.sol-img-preview { max-width: 240px; max-height: 160px; object-fit: cover; border-radius: 10px; display: block; }

/* 通用移除 / 添加按钮 */
.icon-remove { width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(0,0,0,0.06); color: #6e6e73; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s, color 0.15s; }
.icon-remove:hover { background: rgba(255,59,48,0.1); color: #ff3b30; }
.add-row-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; background: #fff; border: 1.5px dashed rgba(0,0,0,0.14); border-radius: 10px; color: #6e6e73; font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.15s; margin-top: 4px; }
.add-row-btn:hover:not(:disabled) { border-color: rgba(0,0,0,0.28); color: #1d1d1f; }
.add-row-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* 小贴士 */
.tip-box { border-radius: 16px; padding: 16px 18px; border: 1px solid; }
.tip-textarea { width: 100%; background: transparent; border: none; outline: none; color: #6e6e73; font-size: 14px; font-family: inherit; resize: none; line-height: 1.75; box-sizing: border-box; }
.tip-textarea::placeholder { color: #c7c7cc; }

/* 提交 */
.submit-err-box { background: rgba(255,59,48,0.08); border: 1px solid rgba(255,59,48,0.2); border-radius: 12px; padding: 12px 16px; font-size: 14px; color: #ff3b30; margin-bottom: 16px; }
.submit-btn { width: 100%; padding: 16px; background: #1d1d1f; color: #fff; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.18s; display: flex; align-items: center; justify-content: center; gap: 8px; }
.submit-btn:hover:not(:disabled) { background: #3a3a3c; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.submit-btn.loading { background: #aeaeb2; }
.btn-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 浮动返回 */
.float-back { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); z-index: 80; }
.float-back-btn { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.92); border: 1px solid rgba(0,0,0,0.12); color: #1d1d1f; padding: 11px 22px; border-radius: 100px; font-size: 14px; font-family: inherit; cursor: pointer; backdrop-filter: blur(16px); box-shadow: 0 4px 16px rgba(0,0,0,0.12); transition: all 0.2s; }
.float-back-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.16); }

@media (max-width: 600px) {
  .hero-content { flex-direction: column; align-items: flex-start; gap: 16px; padding: 72px 20px 28px; }
  .hero-emoji { font-size: 56px; }
  .detail-content { padding: 0 16px 40px; }
  .img-upload-area { height: 140px; }
}
</style>
