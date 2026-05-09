<script setup>
import { ref, reactive, computed } from 'vue'
import { useUserProblems } from '@/composables/useUserProblems.js'
import { app } from '@/lib/tcb.js'
import { compressImage } from '@/lib/imageUtils.js'
import { checkContent, checkImage } from '@/lib/moderate.js'

const props = defineProps({ currentUser: Object })
const emit  = defineEmits(['back', 'submitted'])

const { submitProblem } = useUserProblems()

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
const DIFF_BG    = { '常见': 'rgba(255,255,255,0.12)', '需处理': 'rgba(162,155,254,0.25)', '紧急': 'rgba(224,49,49,0.25)', '进阶': 'rgba(25,113,194,0.25)' }

const form = reactive({
  category:    '打印机整机',
  difficulty:  '常见',
  title:       '',
  subtitle:    '',
  description: '',
  causes:      [''],
  solutions:   [{ title: '', detail: '', imageFile: null, imagePreview: null }],
  tips:        '',
})

const heroBg    = computed(() => CAT_META[form.category]?.bg || CAT_META['新手'].bg)
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
  if (!form.title.trim())       e.title       = '请填写问题标题'
  if (!form.subtitle.trim())    e.subtitle    = '请填写一句话描述'
  if (!form.description.trim()) e.description = '请填写详细描述'
  if (!form.causes.some(c => c.trim()))          e.causes    = '请至少填写一个原因'
  if (!form.solutions.some(s => s.title.trim())) e.solutions = '请至少填写一个解决步骤'
  errors.value = e
  return Object.keys(e).length === 0
}

// ── 上传单张图片（压缩后），返回 fileID ──
async function uploadOne(file, dir) {
  const compressed = await compressImage(file)
  const { pass, msg } = await checkImage(compressed)
  if (!pass) throw new Error(msg)
  const cloudPath  = `${dir}/${props.currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
  const { fileID } = await app.uploadFile({ cloudPath, filePath: compressed })
  return fileID
}

async function submit() {
  if (!validate()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
  submitting.value = true
  try {
    const contentText = [form.title, form.subtitle, form.description, ...form.causes, form.tips].filter(Boolean).join('\n')
    const { pass, msg } = await checkContent(contentText)
    if (!pass) { errors.value.submit = msg; return }

    // 上传问题主图
    let image_url = null
    if (problemImageFile.value) {
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
      title:       form.title.trim(),
      subtitle:    form.subtitle.trim(),
      description: form.description.trim(),
      causes:      form.causes.filter(c => c.trim()),
      solutions,
      tips:        form.tips.trim(),
      image_url,
    })
    emit('submitted')
  } catch (e) {
    errors.value.submit = e.message || '提交失败，请重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="submit-page">

    <!-- 顶部导航 -->
    <nav class="back-nav">
      <button class="back-btn" @click="emit('back')">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 4L6 9l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        返回
      </button>
    </nav>

    <!-- Hero 编辑区（深色） -->
    <header class="detail-hero" :style="{ background: heroBg }">
      <div class="hero-content">
        <div class="hero-emoji">{{ heroEmoji }}</div>
        <div class="hero-glow" :style="{ background: heroColor }"></div>

        <div class="hero-meta">
          <!-- 标题输入 -->
          <input
            v-model="form.title"
            class="hero-title-input"
            placeholder="问题标题（例：打印件翘边）"
            maxlength="40"
            :class="{ 'has-error': errors.title }"
          />
          <p v-if="errors.title" class="hero-err">{{ errors.title }}</p>

          <!-- 简述输入 -->
          <input
            v-model="form.subtitle"
            class="hero-sub-input"
            placeholder="一句话描述（例：底部脱离热床）"
            maxlength="40"
            :class="{ 'has-error': errors.subtitle }"
          />
          <p v-if="errors.subtitle" class="hero-err">{{ errors.subtitle }}</p>
        </div>
      </div>
    </header>

    <!-- 内容区（白底分区，和详情页一致） -->
    <div class="detail-content">

      <!-- 📝 详细描述 -->
      <section class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: heroColor + '22', color: heroColor }">📝</span>
          详细描述
        </h2>
        <textarea
          v-model="form.description"
          class="content-textarea"
          placeholder="详细描述问题的具体表现、出现场景等…"
          rows="5"
          maxlength="600"
          :class="{ 'has-error': errors.description }"
        ></textarea>
        <div class="char-hint">{{ form.description.length }}/600</div>
        <p v-if="errors.description" class="field-err">{{ errors.description }}</p>
      </section>

      <!-- 🏷️ 问题类型 -->
      <section class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: heroColor + '22', color: heroColor }">🏷️</span>
          问题类型
        </h2>
        <div class="select-chips">
          <button
            v-for="c in CATEGORIES" :key="c"
            :class="['select-chip', { active: form.category === c }]"
            :style="form.category === c ? { background: heroColor + '18', borderColor: heroColor, color: heroColor } : {}"
            type="button" @click="form.category = c"
          >{{ c }}</button>
        </div>
      </section>

      <!-- ⚠️ 问题重要性 -->
      <section class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: heroColor + '22', color: heroColor }">⚠️</span>
          问题重要性
        </h2>
        <div class="select-chips">
          <button
            v-for="d in DIFFICULTIES" :key="d"
            :class="['select-chip', { active: form.difficulty === d }]"
            :style="form.difficulty === d
              ? { background: DIFF_BG[d] + 'cc', borderColor: DIFF_COLOR[d], color: DIFF_COLOR[d] }
              : {}"
            type="button" @click="form.difficulty = d"
          >{{ d }}</button>
        </div>
      </section>

      <!-- 📷 问题图片 -->
      <section class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: heroColor + '22', color: heroColor }">📷</span>
          问题图片
          <span class="optional-tag">选填</span>
        </h2>
        <p class="section-sub">上传能直观展示该问题的图片</p>

        <div v-if="problemImagePreview" class="img-preview-wrap">
          <img :src="problemImagePreview" class="img-preview" alt="问题图片" />
          <button class="img-remove-btn" type="button" @click="removeProblemImage">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <label v-else class="img-upload-area">
          <input type="file" accept="image/*" style="display:none" @change="onProblemImageChange" />
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 6v16M6 14h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          <span>点击上传图片</span>
          <span class="upload-hint">JPG / PNG，建议横图</span>
        </label>
      </section>

      <!-- ⚡ 可能原因 -->
      <section class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: heroColor + '22', color: heroColor }">⚡</span>
          可能原因
        </h2>
        <div class="causes-edit-grid">
          <div v-for="(_, i) in form.causes" :key="i" class="cause-edit-item">
            <span class="cause-num" :style="{ color: heroColor }">0{{ i + 1 }}</span>
            <input
              v-model="form.causes[i]"
              class="cause-input"
              :placeholder="`原因 ${i + 1}，例：热床温度不足`"
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
          添加原因
        </button>
      </section>

      <!-- 🔧 解决步骤 -->
      <section class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: heroColor + '22', color: heroColor }">🔧</span>
          解决步骤
        </h2>
        <p v-if="errors.solutions" class="field-err" style="margin-bottom:12px">{{ errors.solutions }}</p>

        <div class="solutions-edit-list">
          <div v-for="(sol, i) in form.solutions" :key="i" class="solution-edit-item">
            <!-- 步骤头 -->
            <div class="sol-edit-head">
              <span class="sol-step-badge" :style="{ background: heroColor }">{{ i + 1 }}</span>
              <span class="sol-step-label">步骤 {{ i + 1 }}</span>
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
              placeholder="步骤名称，例：重新调平热床"
              maxlength="40"
            />

            <!-- 步骤详情 -->
            <textarea
              v-model="sol.detail"
              class="content-textarea small"
              placeholder="操作说明，例：使用A4纸在喷嘴与热床之间校准间距…"
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
                <span>上传步骤图片（选填）</span>
              </label>
            </div>
          </div>
        </div>

        <button class="add-row-btn" type="button" @click="addSolution" :disabled="form.solutions.length >= 10">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          添加步骤
        </button>
      </section>

      <!-- 💡 小贴士 -->
      <section class="section">
        <h2 class="section-title">
          <span class="section-icon" :style="{ background: heroColor + '22', color: heroColor }">💡</span>
          小贴士
          <span class="optional-tag">选填</span>
        </h2>
        <div class="tip-box" :style="{ background: heroColor + '0d', borderColor: heroColor + '33' }">
          <textarea
            v-model="form.tips"
            class="tip-textarea"
            placeholder="补充一些额外注意事项或小技巧…"
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
        {{ submitting ? '正在发布…' : '发布问题' }}
      </button>

    </div>

    <!-- 底部浮动返回（同详情页） -->
    <div class="float-back">
      <button class="float-back-btn" @click="emit('back')">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M10 3L5 7.5l5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        返回列表
      </button>
    </div>

  </div>
</template>

<style scoped>
.submit-page { min-height: 100vh; background: #f5f5f7; color: #1d1d1f; font-family: -apple-system,'PingFang SC','Helvetica Neue',sans-serif; padding-bottom: 120px; }

/* 顶部导航（与详情页一致） */
.back-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 0 24px; height: 52px; background: rgba(255,255,255,0.88); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0,0,0,0.08); display: flex; align-items: center; }
.back-btn { display: flex; align-items: center; gap: 4px; background: transparent; border: none; color: #007aff; font-size: 15px; cursor: pointer; font-family: inherit; padding: 0; transition: opacity 0.15s; }
.back-btn:hover { opacity: 0.7; }

/* Hero 编辑区 */
.detail-hero { padding-top: 52px; min-height: 280px; position: relative; display: flex; align-items: flex-end; overflow: hidden; }
.hero-content { width: 100%; max-width: 800px; margin: 0 auto; padding: 48px 24px 36px; display: flex; align-items: flex-end; gap: 28px; position: relative; z-index: 2; }
.hero-emoji { font-size: 80px; line-height: 1; flex-shrink: 0; filter: drop-shadow(0 12px 32px rgba(0,0,0,0.5)); font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; }
.hero-glow { position: absolute; width: 200px; height: 200px; border-radius: 50%; opacity: 0.2; filter: blur(60px); left: 24px; bottom: 20px; }
.hero-meta { flex: 1; min-width: 0; }

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
