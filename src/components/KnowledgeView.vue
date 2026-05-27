<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { knowledgeArticles, knowledgeCategories, getKnowledgeArticleById } from '@/data/knowledge.js'
import { problemSummaries } from '@/data/problemSummaries.js'
import { app, db } from '@/lib/tcb.js'
import { compressImage } from '@/lib/imageUtils.js'
import { checkContent, checkImage } from '@/lib/moderate.js'
import { useToast } from '@/composables/useToast.js'
import { useUserGuard } from '@/composables/useUserGuard.js'

const props = defineProps({
  initialArticleId: {
    type: String,
    default: '',
  },
  currentUser: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['go-detail', 'open-auth'])

const CDN_BASE = import.meta.env.VITE_TCB_CDN_BASE || 'https://7072-problem-d1gg06meg3dd7da6b-1257726828.tcb.qcloud.la'
const COMMUNITY_ARTICLE_PREFIX = 'community-'
const KNOWLEDGE_SUBMISSION_COLLECTION = 'user_problems'

const activeCategory = ref('全部')
const searchQuery = ref('')
const selectedId = ref(props.initialArticleId || '')
const shareState = ref('')
const communityArticles = ref([])
const communityLoading = ref(false)
const submitVisible = ref(false)
const submitting = ref(false)
const submitErrors = ref({})
const resultImageFile = ref(null)
const resultImagePreview = ref('')
const imageFile = ref(null)
const imagePreview = ref('')

const { success, error: toastError, info } = useToast()
const { ensureUserCanPublish } = useUserGuard()

const submitForm = reactive({
  category: '打印质量',
  title: '',
  summary: '',
  content: '',
  tags: '',
})

const problemMap = new Map(problemSummaries.map((problem) => [problem.id, problem]))

const allArticles = computed(() => [...communityArticles.value, ...knowledgeArticles])
const submitCategories = computed(() => knowledgeCategories.filter((category) => category !== '全部'))

const selectedArticle = computed(() => {
  const id = selectedId.value
  return getKnowledgeArticleById(id) || allArticles.value.find((article) => article.id === id) || null
})

const featuredArticles = computed(() => allArticles.value.slice(0, 3))

function normalizeText(value) {
  return String(value || '').toLowerCase().trim()
}

function articleSearchText(article) {
  return [
    article.title,
    article.summary,
    article.category,
    ...(article.tags || []),
    ...(article.checklist || []),
    ...(article.tools || []),
    ...(article.sections || []).flatMap((section) => [section.title, ...(section.body || [])]),
  ].filter(Boolean).join(' ')
}

const filteredArticles = computed(() => {
  const q = normalizeText(searchQuery.value)
  return allArticles.value.filter((article) => {
    if (activeCategory.value !== '全部' && article.category !== activeCategory.value) return false
    if (!q) return true
    return normalizeText(articleSearchText(article)).includes(q)
  })
})

const relatedProblems = computed(() => {
  const ids = selectedArticle.value?.relatedProblemIds || []
  return ids.map((id) => problemMap.get(id)).filter(Boolean)
})

function selectArticle(article, options = {}) {
  selectedId.value = article.id
  shareState.value = ''
  submitVisible.value = false
  nextTick(() => window.scrollTo({ top: 0, behavior: options.instant ? 'auto' : 'smooth' }))
  if (!options.skipHistory) {
    history.replaceState(null, '', `/knowledge/${article.id}`)
  }
}

function backToList() {
  selectedId.value = ''
  shareState.value = ''
  history.replaceState(null, '', '/knowledge')
  nextTick(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
}

async function shareArticle(article) {
  const url = `${location.origin}/knowledge/${article.id}`
  const title = `${article.title} - 个人3D打印故障库`
  const text = article.summary
  shareState.value = ''

  try {
    if (navigator.share) {
      await navigator.share({ title, text, url })
      shareState.value = '已打开分享'
      return
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      shareState.value = '链接已复制'
      return
    }

    shareState.value = url
  } catch (err) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        shareState.value = '链接已复制'
      } else {
        shareState.value = url
      }
    } catch (clipboardErr) {
      shareState.value = url
    }
  }
}

function clearFilters() {
  activeCategory.value = '全部'
  searchQuery.value = ''
}

function toCdnUrl(val) {
  if (!val) return ''
  if (String(val).startsWith('cloud://')) {
    const match = String(val).match(/^cloud:\/\/[^/]+\/(.+)$/)
    return match ? `${CDN_BASE}/${match[1]}` : val
  }
  return val
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
  return String(value || '')
    .split(/[，,、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeCommunityDoc(doc) {
  const body = String(doc.content || doc.body || '').trim()
  const paragraphs = body
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
  const resultImageUrl = toCdnUrl(doc.result_image_url || doc.resultImageUrl)
  const imageUrl = toCdnUrl(doc.image_url || doc.imageUrl)
  return {
    id: `${COMMUNITY_ARTICLE_PREFIX}${doc.problem_id || doc._id}`,
    sourceId: doc._id,
    category: doc.category || '打印质量',
    title: doc.title || '未命名知识',
    summary: doc.summary || doc.subtitle || paragraphs[0] || '来自用户分享的知识经验。',
    readMin: Number(doc.read_min || doc.readMin || Math.max(3, Math.ceil(body.length / 420))) || 3,
    tags: normalizeList(doc.tags),
    relatedProblemIds: [],
    sections: [
      {
        title: '正文',
        body: paragraphs.length ? paragraphs : ['作者暂未填写详细正文。'],
      },
    ],
    checklist: normalizeList(doc.checklist),
    tools: normalizeList(doc.tools),
    result_image_url: resultImageUrl,
    image_url: imageUrl,
    cover_image_url: resultImageUrl || imageUrl,
    username: doc.username || '匿名用户',
    isCommunity: true,
  }
}

async function loadCommunityArticles() {
  communityLoading.value = true
  try {
    const knowledgeRows = await fetchPublishedKnowledgeRows({ submission_type: 'knowledge', status: 'published' })
    communityArticles.value = knowledgeRows
      .sort((a, b) => getDocTimeValue(b.created_at) - getDocTimeValue(a.created_at))
      .slice(0, 100)
      .map(normalizeCommunityDoc)
  } catch (error) {
    if (!error?.code?.includes('COLLECTION_NOT_EXIST') && !error?.message?.includes('not exist')) {
      console.warn('[Knowledge] community articles load failed:', error?.message || error)
    }
  } finally {
    communityLoading.value = false
  }
}

function getDocTimeValue(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

async function fetchPublishedKnowledgeRows(where) {
  try {
    const { data } = await db.collection(KNOWLEDGE_SUBMISSION_COLLECTION)
      .where(where)
      .orderBy('created_at', 'desc')
      .limit(100)
      .get()
    return data || []
  } catch (error) {
    if (error?.code?.includes('COLLECTION_NOT_EXIST') || error?.message?.includes('not exist')) return []
    try {
      const { data } = await db.collection(KNOWLEDGE_SUBMISSION_COLLECTION).where(where).limit(100).get()
      return data || []
    } catch (fallbackError) {
      console.warn(`[Knowledge] ${KNOWLEDGE_SUBMISSION_COLLECTION} load failed:`, fallbackError?.message || fallbackError)
      return []
    }
  }
}

function openSubmitForm() {
  if (!props.currentUser) {
    info('请先登录后再分享知识')
    emit('open-auth', 'login')
    return
  }
  submitVisible.value = true
  nextTick(() => document.querySelector('.knowledge-submit-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function closeSubmitForm() {
  submitVisible.value = false
  submitErrors.value = {}
}

function resetSubmitForm() {
  submitForm.category = '打印质量'
  submitForm.title = ''
  submitForm.summary = ''
  submitForm.content = ''
  submitForm.tags = ''
  removeResultImage()
  removeImage()
}

function onResultImageChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  removeResultImage()
  resultImageFile.value = file
  resultImagePreview.value = URL.createObjectURL(file)
  event.target.value = ''
}

function onImageChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  removeImage()
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
  event.target.value = ''
}

function removeResultImage() {
  if (resultImagePreview.value) URL.revokeObjectURL(resultImagePreview.value)
  resultImageFile.value = null
  resultImagePreview.value = ''
}

function removeImage() {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  imageFile.value = null
  imagePreview.value = ''
}

function validateSubmitForm() {
  const errors = {}
  if (!submitForm.title.trim()) errors.title = '请填写知识标题'
  if (!submitForm.summary.trim()) errors.summary = '请填写一句摘要'
  if (!submitForm.content.trim()) errors.content = '请填写正文内容'
  if (submitForm.content.trim().length < 10) errors.content = '正文至少写 10 个字，方便管理员判断是否可发布'
  submitErrors.value = errors
  return Object.keys(errors).length === 0
}

async function uploadKnowledgeImage(file) {
  const compressed = await compressImage(file)
  const { pass, msg } = await checkImage(compressed)
  if (!pass) throw new Error(msg)
  const ext = compressed.name.split('.').pop()?.toLowerCase() || 'jpg'
  const cloudPath = `knowledge-images/${props.currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  await app.uploadFile({ cloudPath, filePath: compressed })
  return `${CDN_BASE}/${cloudPath}`
}

async function submitKnowledge() {
  if (!props.currentUser) {
    emit('open-auth', 'login')
    return
  }
  if (!validateSubmitForm()) return
  submitting.value = true
  submitErrors.value = {}
  try {
    await ensureUserCanPublish(props.currentUser.id, '分享知识')
    const contentText = [
      submitForm.title,
      submitForm.summary,
      submitForm.content,
      submitForm.tags,
    ].filter(Boolean).join('\n')
    const { pass, msg } = await checkContent(contentText)
    if (!pass) {
      submitErrors.value = { submit: msg }
      return
    }

    const [resultImageUrl, imageUrl] = await Promise.all([
      resultImageFile.value ? uploadKnowledgeImage(resultImageFile.value) : '',
      imageFile.value ? uploadKnowledgeImage(imageFile.value) : '',
    ])
    const knowledgeId = `knowledge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const { id } = await db.collection(KNOWLEDGE_SUBMISSION_COLLECTION).add({
      problem_id: knowledgeId,
      submission_type: 'knowledge',
      status: 'pending',
      category: submitForm.category,
      title: submitForm.title.trim(),
      subtitle: submitForm.summary.trim(),
      description: submitForm.summary.trim(),
      summary: submitForm.summary.trim(),
      content: submitForm.content.trim(),
      tags: normalizeList(submitForm.tags),
      result_image_url: resultImageUrl || null,
      image_url: imageUrl || null,
      user_id: props.currentUser.id,
      username: props.currentUser.username || '匿名用户',
      created_at: db.serverDate(),
      updated_at: db.serverDate(),
    })

    success(`知识已提交到后台审核，记录 ID：${id || knowledgeId}`)
    resetSubmitForm()
    submitVisible.value = false
  } catch (err) {
    const message = err?.message || '提交失败，请稍后再试'
    submitErrors.value = { submit: message }
    toastError(message)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadCommunityArticles()
})

onUnmounted(() => {
  removeResultImage()
  removeImage()
})

watch(
  () => props.initialArticleId,
  (id) => {
    if ((id || '') !== selectedId.value) selectedId.value = id || ''
  },
)

</script>

<template>
  <div class="knowledge-page">
    <section v-if="!selectedArticle" class="knowledge-hero">
      <div class="hero-copy">
        <p class="eyebrow">3D 打印 · 知识库</p>
        <h1>把打印质量提升，变成一套可复用的方法。</h1>
        <p class="hero-desc">
          这里整理参数调校、材料选择、设备维护和光固化经验。你也可以分享验证过的知识，审核通过后会出现在主题列表里。
        </p>
        <div class="hero-actions">
          <button class="share-knowledge-btn" type="button" @click="openSubmitForm">分享知识</button>
          <span>提交后进入后台审核，通过后公开展示</span>
        </div>
        <div class="hero-stats">
          <div class="stat-card">
            <strong>{{ allArticles.length }}</strong>
            <span>篇知识文章</span>
          </div>
          <div class="stat-card">
            <strong>{{ knowledgeCategories.length - 1 }}</strong>
            <span>个主题方向</span>
          </div>
          <div class="stat-card">
            <strong>0</strong>
            <span>评论区干扰</span>
          </div>
        </div>
      </div>
      <div class="hero-panel">
        <div class="panel-glow"></div>
        <div class="panel-screen">
          <div class="screen-line wide"></div>
          <div class="screen-line"></div>
          <div class="screen-grid">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="screen-chip">Quality Guide</div>
        </div>
      </div>
    </section>

    <section v-if="!selectedArticle && submitVisible" class="knowledge-submit-card">
      <div class="submit-head">
        <div>
          <p class="section-kicker">Share Knowledge</p>
          <h2>分享一条可复用的打印经验</h2>
          <p>建议写清楚适用场景、你做了什么、结果如何。图片可选，但能帮助审核和阅读。</p>
        </div>
        <button class="close-submit-btn" type="button" @click="closeSubmitForm">收起</button>
      </div>

      <div class="submit-grid">
        <label class="field">
          <span>知识标题</span>
          <input v-model.trim="submitForm.title" type="text" maxlength="48" placeholder="例如：PETG 拉丝先别急着加回抽" :class="{ error: submitErrors.title }" />
          <small v-if="submitErrors.title">{{ submitErrors.title }}</small>
        </label>

        <label class="field">
          <span>主题</span>
          <select v-model="submitForm.category">
            <option v-for="category in submitCategories" :key="category" :value="category">{{ category }}</option>
          </select>
        </label>

        <label class="field wide">
          <span>一句摘要</span>
          <input v-model.trim="submitForm.summary" type="text" maxlength="120" placeholder="用一句话说明这条知识解决什么问题" :class="{ error: submitErrors.summary }" />
          <small v-if="submitErrors.summary">{{ submitErrors.summary }}</small>
        </label>

        <div class="field wide">
          <span>成果展示</span>
          <div v-if="resultImagePreview" class="knowledge-image-preview">
            <img :src="resultImagePreview" alt="成果展示预览" />
            <button type="button" @click="removeResultImage">移除图片</button>
          </div>
          <label v-else class="knowledge-image-upload">
            <input type="file" accept="image/*" @change="onResultImageChange" />
            <strong>上传成果图片</strong>
            <small>可选，建议上传清晰的打印结果、参数截图或操作照片</small>
          </label>
        </div>

        <label class="field wide">
          <span>正文内容</span>
          <textarea v-model.trim="submitForm.content" rows="7" maxlength="1800" placeholder="写下具体步骤、判断依据、参数范围、注意事项。支持换行分段。" :class="{ error: submitErrors.content }"></textarea>
          <small v-if="submitErrors.content">{{ submitErrors.content }}</small>
          <em>{{ submitForm.content.length }}/1800</em>
        </label>

        <label class="field wide">
          <span>标签</span>
          <input v-model.trim="submitForm.tags" type="text" maxlength="80" placeholder="例如：PETG、拉丝、回抽，用逗号分隔" />
        </label>

        <div class="field wide">
          <span>图片</span>
          <div v-if="imagePreview" class="knowledge-image-preview">
            <img :src="imagePreview" alt="知识配图预览" />
            <button type="button" @click="removeImage">移除图片</button>
          </div>
          <label v-else class="knowledge-image-upload">
            <input type="file" accept="image/*" @change="onImageChange" />
            <strong>上传图片</strong>
            <small>可选，可上传步骤截图、设备照片或更多补充说明图</small>
          </label>
        </div>
      </div>

      <div v-if="submitErrors.submit" class="submit-error">{{ submitErrors.submit }}</div>
      <div class="submit-actions">
        <button class="secondary-action" type="button" :disabled="submitting" @click="closeSubmitForm">取消</button>
        <button class="primary-action" type="button" :disabled="submitting" @click="submitKnowledge">
          {{ submitting ? '提交中…' : '保存并提交审核' }}
        </button>
      </div>
    </section>

    <section v-if="!selectedArticle" class="featured-section">
      <article
        v-for="article in featuredArticles"
        :key="article.id"
        class="featured-card"
        @click="selectArticle(article)"
      >
        <span class="featured-category">{{ article.category }}</span>
        <span v-if="article.isCommunity" class="community-mark">用户分享</span>
        <h2>{{ article.title }}</h2>
        <p>{{ article.summary }}</p>
        <div class="featured-meta">
          <span>{{ article.readMin }} 分钟阅读</span>
          <span>查看指南</span>
        </div>
      </article>
    </section>

    <section v-if="!selectedArticle" class="library-panel">
      <div class="library-head">
        <div>
          <p class="section-kicker">Knowledge Library</p>
          <h2>按主题查找知识</h2>
          <p v-if="communityLoading" class="library-sub">正在同步用户分享的知识…</p>
        </div>
        <div class="search-box">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.6"/>
            <path d="M12.2 12.2L15 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          <input v-model.trim="searchQuery" type="search" placeholder="搜索：首层、流量、PETG、曝光…" />
        </div>
      </div>

      <div class="category-row">
        <button
          v-for="category in knowledgeCategories"
          :key="category"
          :class="['category-chip', { active: activeCategory === category }]"
          @click="activeCategory = category"
        >
          {{ category }}
        </button>
      </div>

      <div class="result-bar">
        <span>共 {{ filteredArticles.length }} 篇</span>
        <button v-if="activeCategory !== '全部' || searchQuery" class="clear-btn" @click="clearFilters">清除筛选</button>
      </div>

      <div v-if="filteredArticles.length" class="article-grid">
        <article
          v-for="article in filteredArticles"
          :key="article.id"
          class="article-card"
          @click="selectArticle(article)"
        >
          <div class="article-top">
            <span class="article-category">{{ article.category }}</span>
            <span class="article-read">{{ article.readMin }} min</span>
          </div>
          <div v-if="article.cover_image_url || article.image_url" class="article-thumb">
            <img :src="article.cover_image_url || article.image_url" :alt="article.title" />
          </div>
          <span v-if="article.isCommunity" class="community-mark card-mark">用户分享</span>
          <h3>{{ article.title }}</h3>
          <p>{{ article.summary }}</p>
          <div class="tag-row">
            <span v-for="tag in article.tags.slice(0, 4)" :key="tag">{{ tag }}</span>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">
        <strong>没有找到相关知识</strong>
        <span>换个关键词试试，比如“首层”“拉丝”“树脂”“支撑”。</span>
      </div>
    </section>

    <article v-else class="article-detail">
      <button class="back-btn" @click="backToList">← 返回知识库</button>

      <header class="detail-header">
        <div class="detail-meta">
          <span>{{ selectedArticle.category }}</span>
          <span>{{ selectedArticle.readMin }} 分钟阅读</span>
          <span v-if="selectedArticle.isCommunity">用户分享 · {{ selectedArticle.username }}</span>
        </div>
        <h1>{{ selectedArticle.title }}</h1>
        <p>{{ selectedArticle.summary }}</p>
        <div class="detail-actions">
          <button class="primary-action" @click="shareArticle(selectedArticle)">分享这篇知识</button>
          <span v-if="shareState" class="share-state">{{ shareState }}</span>
        </div>
      </header>

      <div class="detail-layout">
        <main class="detail-main">
          <section v-if="selectedArticle.result_image_url" class="content-section image-section">
            <div class="image-caption">成果展示</div>
            <img :src="selectedArticle.result_image_url" :alt="`${selectedArticle.title}成果展示`" />
          </section>
          <section v-if="selectedArticle.image_url" class="content-section image-section">
            <div v-if="selectedArticle.result_image_url" class="image-caption">补充图片</div>
            <img :src="selectedArticle.image_url" :alt="selectedArticle.title" />
          </section>
          <section
            v-for="section in selectedArticle.sections"
            :key="section.title"
            class="content-section"
          >
            <h2>{{ section.title }}</h2>
            <p v-for="paragraph in section.body" :key="paragraph">{{ paragraph }}</p>
          </section>
        </main>

        <aside class="detail-aside">
          <section class="aside-card">
            <h3>检查清单</h3>
            <ul>
              <li v-for="item in selectedArticle.checklist" :key="item">{{ item }}</li>
            </ul>
          </section>

          <section class="aside-card">
            <h3>可能用到</h3>
            <div class="tool-list">
              <span v-for="tool in selectedArticle.tools" :key="tool">{{ tool }}</span>
            </div>
          </section>

          <section v-if="relatedProblems.length" class="aside-card">
            <h3>相关问题</h3>
            <button
              v-for="problem in relatedProblems"
              :key="problem.id"
              class="related-problem"
              @click="emit('go-detail', { id: problem.id, articleId: selectedArticle.id })"
            >
              <span>{{ problem.title }}</span>
              <small>{{ problem.subtitle }}</small>
            </button>
          </section>
        </aside>
      </div>
    </article>
  </div>
</template>

<style scoped>
.knowledge-page {
  min-height: 100vh;
  color: var(--lab-text);
  padding-bottom: 72px;
}

.knowledge-hero {
  max-width: 1280px;
  margin: 0 auto;
  padding: 70px 24px 34px;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 36px;
  align-items: center;
}

.eyebrow,
.section-kicker {
  margin: 0 0 14px;
  color: var(--lab-accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero-copy h1 {
  max-width: 760px;
  margin: 0;
  font-size: clamp(34px, 5vw, 64px);
  line-height: 1.04;
  letter-spacing: -0.055em;
  color: var(--lab-text);
}

.hero-desc {
  max-width: 660px;
  margin: 22px 0 0;
  color: var(--lab-text-soft);
  font-size: 16px;
  line-height: 1.9;
}

.hero-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.hero-actions span {
  color: var(--lab-text-dim);
  font-size: 13px;
}

.share-knowledge-btn {
  border: none;
  border-radius: 999px;
  padding: 13px 20px;
  color: #fff;
  background: linear-gradient(135deg, #172033, var(--lab-accent));
  box-shadow: 0 16px 32px rgba(23, 32, 51, 0.18);
  font-weight: 900;
  cursor: pointer;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  max-width: 580px;
  margin-top: 28px;
}

.stat-card {
  padding: 16px;
  border: 1px solid var(--lab-line);
  border-radius: var(--lab-radius);
  background: rgba(255, 255, 255, 0.7);
  box-shadow: var(--lab-shadow-sm);
}

.stat-card strong {
  display: block;
  font-size: 26px;
  letter-spacing: -0.03em;
  color: var(--lab-text);
}

.stat-card span {
  display: block;
  margin-top: 4px;
  color: var(--lab-text-dim);
  font-size: 13px;
}

.hero-panel {
  position: relative;
  min-height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel-glow {
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(23, 181, 212, 0.28), rgba(37, 104, 232, 0.08) 50%, transparent 72%);
  filter: blur(4px);
}

.panel-screen {
  position: relative;
  width: min(100%, 420px);
  min-height: 292px;
  padding: 28px;
  border-radius: 34px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.94), rgba(239, 247, 253, 0.82)),
    radial-gradient(circle at top right, rgba(23, 181, 212, 0.22), transparent 42%);
  border: 1px solid rgba(88, 125, 170, 0.18);
  box-shadow: 0 26px 72px rgba(15, 31, 56, 0.14);
  overflow: hidden;
}

.panel-screen::before {
  content: "";
  position: absolute;
  inset: -80px auto auto -80px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: rgba(37, 104, 232, 0.12);
}

.screen-line {
  position: relative;
  width: 64%;
  height: 12px;
  border-radius: 999px;
  background: rgba(83, 101, 127, 0.18);
  margin-bottom: 14px;
}

.screen-line.wide {
  width: 86%;
  height: 18px;
  background: linear-gradient(135deg, rgba(37, 104, 232, 0.24), rgba(23, 181, 212, 0.22));
}

.screen-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 34px;
}

.screen-grid span {
  min-height: 72px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(88, 125, 170, 0.14);
}

.screen-grid span:nth-child(1) { background: linear-gradient(135deg, rgba(37, 104, 232, 0.18), rgba(255,255,255,.76)); }
.screen-grid span:nth-child(4) { background: linear-gradient(135deg, rgba(23, 181, 212, 0.18), rgba(255,255,255,.76)); }

.screen-chip {
  position: absolute;
  right: 24px;
  bottom: 24px;
  padding: 10px 14px;
  border-radius: 999px;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  background: linear-gradient(135deg, var(--lab-accent), var(--lab-accent-2));
  box-shadow: 0 14px 30px rgba(37, 104, 232, 0.22);
}

.featured-section,
.library-panel,
.knowledge-submit-card,
.article-detail {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

.featured-section {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.featured-card,
.article-card,
.library-panel,
.knowledge-submit-card,
.detail-header,
.content-section,
.aside-card {
  border: 1px solid var(--lab-line);
  background: var(--lab-surface);
  box-shadow: var(--lab-shadow-sm);
}

.featured-card {
  min-height: 238px;
  padding: 24px;
  border-radius: var(--lab-radius-lg);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.featured-card:hover,
.article-card:hover {
  transform: translateY(-3px);
  border-color: rgba(37, 104, 232, 0.24);
  box-shadow: var(--lab-shadow);
}

.featured-category,
.article-category {
  align-self: flex-start;
  padding: 6px 10px;
  border-radius: 999px;
  color: var(--lab-accent);
  background: var(--lab-accent-soft);
  font-size: 12px;
  font-weight: 800;
}

.featured-card h2 {
  margin: 18px 0 10px;
  font-size: 23px;
  line-height: 1.25;
  letter-spacing: -0.03em;
}

.featured-card p,
.article-card p {
  margin: 0;
  color: var(--lab-text-soft);
  line-height: 1.75;
  font-size: 14px;
}

.community-mark {
  align-self: flex-start;
  margin-top: 8px;
  padding: 5px 9px;
  border-radius: 999px;
  color: #16774d;
  background: rgba(30, 157, 102, 0.12);
  font-size: 11px;
  font-weight: 900;
}

.card-mark {
  margin-top: 12px;
}

.knowledge-submit-card {
  margin-top: 18px;
  padding: 24px;
  border-radius: 30px;
  background:
    radial-gradient(circle at top left, rgba(23, 181, 212, 0.13), transparent 34%),
    rgba(255, 255, 255, 0.92);
}

.submit-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
}

.submit-head h2 {
  margin: 0;
  font-size: 28px;
  letter-spacing: -0.04em;
}

.submit-head p:not(.section-kicker) {
  max-width: 720px;
  margin: 8px 0 0;
  color: var(--lab-text-soft);
  line-height: 1.8;
}

.close-submit-btn,
.secondary-action {
  border: 1px solid var(--lab-line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.75);
  color: var(--lab-text-soft);
  padding: 10px 14px;
  font-weight: 800;
  cursor: pointer;
}

.submit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field.wide {
  grid-column: 1 / -1;
}

.field span {
  color: var(--lab-text);
  font-size: 13px;
  font-weight: 900;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  border: 1px solid var(--lab-line);
  border-radius: 16px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--lab-text);
  font: inherit;
  outline: none;
  box-sizing: border-box;
}

.field textarea {
  resize: vertical;
  line-height: 1.75;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: rgba(37, 104, 232, 0.42);
  box-shadow: 0 0 0 4px rgba(37, 104, 232, 0.08);
}

.field input.error,
.field textarea.error {
  border-color: rgba(219, 77, 92, 0.56);
}

.field small,
.field em {
  color: var(--lab-text-dim);
  font-size: 12px;
  font-style: normal;
}

.field small {
  color: #b42318;
}

.knowledge-image-upload {
  min-height: 150px;
  border: 1.5px dashed rgba(57, 86, 120, 0.18);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.68);
  color: var(--lab-text-dim);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  text-align: center;
}

.knowledge-image-upload input {
  display: none;
}

.knowledge-image-upload strong {
  color: var(--lab-accent);
}

.knowledge-image-preview {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid var(--lab-line);
  background: #fff;
}

.knowledge-image-preview img {
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  display: block;
}

.knowledge-image-preview button {
  position: absolute;
  top: 12px;
  right: 12px;
  border: none;
  border-radius: 999px;
  padding: 8px 12px;
  color: #fff;
  background: rgba(15, 24, 38, 0.68);
  cursor: pointer;
}

.submit-error {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  color: #b42318;
  background: rgba(219, 77, 92, 0.1);
  border: 1px solid rgba(219, 77, 92, 0.16);
  font-size: 13px;
}

.submit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.featured-meta {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--lab-text-dim);
  font-size: 12px;
}

.featured-meta span:last-child {
  color: var(--lab-accent);
  font-weight: 800;
}

.library-panel {
  margin-top: 18px;
  padding: 24px;
  border-radius: 30px;
}

.library-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
}

.library-head h2 {
  margin: 0;
  font-size: 28px;
  letter-spacing: -0.04em;
}

.library-sub {
  margin: 8px 0 0;
  color: var(--lab-text-dim);
  font-size: 13px;
}

.search-box {
  width: min(100%, 420px);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--lab-line);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--lab-text-dim);
}

.search-box input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--lab-text);
  font-size: 14px;
}

.search-box input::placeholder {
  color: #9eadc2;
}

.category-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 22px;
}

.category-chip {
  border: 1px solid var(--lab-line);
  border-radius: 999px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--lab-text-soft);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
}

.category-chip:hover {
  color: var(--lab-text);
  border-color: var(--lab-line-strong);
}

.category-chip.active {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, var(--lab-accent), var(--lab-accent-2));
  box-shadow: 0 12px 24px rgba(37, 104, 232, 0.16);
}

.result-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: 18px 0 14px;
  color: var(--lab-text-dim);
  font-size: 13px;
}

.clear-btn {
  border: none;
  background: transparent;
  color: var(--lab-accent);
  cursor: pointer;
  font-weight: 800;
}

.article-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.article-card {
  min-height: 236px;
  border-radius: 22px;
  padding: 20px;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.article-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.article-thumb {
  margin-top: 14px;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(57, 86, 120, 0.1);
}

.article-thumb img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
}

.article-read {
  color: var(--lab-text-dim);
  font-size: 12px;
  font-family: var(--lab-mono);
}

.article-card h3 {
  margin: 16px 0 10px;
  font-size: 19px;
  line-height: 1.35;
  letter-spacing: -0.025em;
}

.tag-row,
.tool-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-row {
  margin-top: 18px;
}

.tag-row span,
.tool-list span {
  padding: 6px 9px;
  border-radius: 999px;
  background: rgba(37, 104, 232, 0.06);
  color: var(--lab-text-soft);
  font-size: 12px;
  font-weight: 700;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 54px 20px;
  color: var(--lab-text-dim);
  text-align: center;
}

.empty-state strong {
  color: var(--lab-text);
  font-size: 18px;
}

.article-detail {
  padding-top: 42px;
}

.back-btn {
  border: 1px solid var(--lab-line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.76);
  color: var(--lab-text-soft);
  padding: 10px 15px;
  cursor: pointer;
  font-weight: 800;
  transition: all 0.18s ease;
}

.back-btn:hover {
  color: var(--lab-text);
  border-color: var(--lab-line-strong);
  background: #fff;
}

.detail-header {
  margin-top: 18px;
  border-radius: 32px;
  padding: clamp(28px, 5vw, 54px);
  background:
    radial-gradient(circle at top right, rgba(23, 181, 212, 0.16), transparent 35%),
    linear-gradient(145deg, rgba(255,255,255,.95), rgba(244,249,253,.9));
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-meta span {
  padding: 7px 11px;
  border-radius: 999px;
  background: rgba(37, 104, 232, 0.08);
  color: var(--lab-accent);
  font-size: 12px;
  font-weight: 800;
}

.detail-header h1 {
  max-width: 880px;
  margin: 0;
  font-size: clamp(32px, 4.8vw, 58px);
  line-height: 1.08;
  letter-spacing: -0.055em;
}

.detail-header p {
  max-width: 760px;
  margin: 18px 0 0;
  color: var(--lab-text-soft);
  line-height: 1.9;
  font-size: 16px;
}

.detail-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 26px;
}

.primary-action {
  border: none;
  border-radius: 999px;
  padding: 12px 18px;
  color: #fff;
  background: linear-gradient(135deg, var(--lab-accent), var(--lab-accent-2));
  box-shadow: 0 14px 30px rgba(37, 104, 232, 0.2);
  font-weight: 800;
  cursor: pointer;
}

.share-state {
  color: var(--lab-text-dim);
  font-size: 13px;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 18px;
  margin-top: 18px;
}

.detail-main {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.content-section,
.aside-card {
  border-radius: 24px;
  padding: 24px;
}

.content-section h2,
.aside-card h3 {
  margin: 0 0 14px;
  color: var(--lab-text);
  letter-spacing: -0.025em;
}

.content-section h2 {
  font-size: 24px;
}

.content-section p {
  margin: 0;
  color: var(--lab-text-soft);
  font-size: 15px;
  line-height: 1.95;
}

.content-section p + p {
  margin-top: 12px;
}

.image-section {
  position: relative;
  padding: 0;
  overflow: hidden;
}

.image-caption {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 1;
  padding: 7px 11px;
  border-radius: 999px;
  color: #fff;
  background: rgba(15, 24, 38, 0.68);
  font-size: 12px;
  font-weight: 900;
}

.image-section img {
  width: 100%;
  max-height: 480px;
  object-fit: cover;
  display: block;
}

.detail-aside {
  position: sticky;
  top: 76px;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.aside-card h3 {
  font-size: 16px;
}

.aside-card ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.aside-card li {
  position: relative;
  padding-left: 20px;
  color: var(--lab-text-soft);
  font-size: 14px;
  line-height: 1.65;
}

.aside-card li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.75em;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--lab-accent), var(--lab-accent-2));
}

.related-problem {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(57, 86, 120, 0.1);
  background: rgba(255, 255, 255, 0.72);
  color: var(--lab-text);
  cursor: pointer;
  text-align: left;
  transition: all 0.18s ease;
}

.related-problem + .related-problem {
  margin-top: 8px;
}

.related-problem:hover {
  transform: translateX(2px);
  border-color: rgba(37, 104, 232, 0.24);
  color: var(--lab-accent);
}

.related-problem span {
  font-size: 14px;
  font-weight: 800;
}

.related-problem small {
  color: var(--lab-text-dim);
  font-size: 12px;
}

@media (max-width: 920px) {
  .knowledge-hero,
  .detail-layout {
    grid-template-columns: 1fr;
  }

  .hero-panel {
    min-height: 260px;
  }

  .featured-section {
    grid-template-columns: 1fr;
  }

  .library-head {
    align-items: stretch;
    flex-direction: column;
  }

  .search-box {
    width: 100%;
  }

  .detail-aside {
    position: static;
  }
}

@media (max-width: 640px) {
  .knowledge-hero {
    padding: 44px 16px 22px;
  }

  .featured-section,
  .library-panel,
  .knowledge-submit-card,
  .article-detail {
    padding-left: 16px;
    padding-right: 16px;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }

  .hero-panel {
    display: none;
  }

  .library-panel {
    border-radius: 24px;
    padding: 18px;
  }

  .knowledge-submit-card {
    border-radius: 24px;
    padding: 18px;
  }

  .submit-head,
  .submit-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .submit-grid {
    grid-template-columns: 1fr;
  }

  .article-grid {
    grid-template-columns: 1fr;
  }

  .detail-header {
    border-radius: 26px;
  }

  .content-section,
  .aside-card {
    padding: 20px;
  }
}
</style>
