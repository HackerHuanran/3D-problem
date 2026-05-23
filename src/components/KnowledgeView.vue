<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { knowledgeArticles, knowledgeCategories, getKnowledgeArticleById } from '@/data/knowledge.js'
import { problemSummaries } from '@/data/problemSummaries.js'

const props = defineProps({
  initialArticleId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['go-detail'])

const activeCategory = ref('全部')
const searchQuery = ref('')
const selectedId = ref(props.initialArticleId || '')
const shareState = ref('')

const problemMap = new Map(problemSummaries.map((problem) => [problem.id, problem]))

const selectedArticle = computed(() => getKnowledgeArticleById(selectedId.value))

const featuredArticles = computed(() => knowledgeArticles.slice(0, 3))

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
  return knowledgeArticles.filter((article) => {
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
          这里整理参数调校、材料选择、设备维护和光固化经验。内容由站点整理发布，不开放评论，适合收藏和分享给同样遇到问题的朋友。
        </p>
        <div class="hero-stats">
          <div class="stat-card">
            <strong>{{ knowledgeArticles.length }}</strong>
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

    <section v-if="!selectedArticle" class="featured-section">
      <article
        v-for="article in featuredArticles"
        :key="article.id"
        class="featured-card"
        @click="selectArticle(article)"
      >
        <span class="featured-category">{{ article.category }}</span>
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
