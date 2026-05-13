<template>
  <div v-if="detailLoading" class="detail-loading">
    <span class="spinner large"></span>
    <span>正在加载问题详情…</span>
  </div>

  <div class="detail-page" v-else-if="problem">

    <nav class="back-nav" :class="{ scrolled: navScrolled }">
      <button class="back-btn" @click="$emit('back')">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 4L6 9l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ t('pd.back') }}
      </button>
      <div class="nav-right">
        <div v-if="currentUser" class="nav-user">
          <div class="user-avatar">{{ currentUser.avatar }}</div>
          <span>{{ currentUser.username }}</span>
        </div>
        <button v-else class="nav-login-btn" @click="$emit('open-auth', 'login')">{{ t('nav.login') }}</button>
      </div>
    </nav>

    <!-- Hero -->
    <header class="detail-hero" :style="{ background: problem.bgGradient }">
      <div class="hero-content">
        <div class="hero-emoji">{{ problem.emoji }}</div>
        <div class="hero-glow" :style="{ background: problem.color }"></div>
        <div class="hero-meta">
          <span class="hero-category" :style="{ color: problem.color }">{{ problem.category }}</span>
          <h1 class="hero-title">{{ problem.title }}</h1>
          <p class="hero-subtitle">{{ problem.subtitle }}</p>
          <div class="hero-stats">
            <span class="stat-badge" :class="'diff-' + diffClass(problem.difficulty)">{{ problem.difficulty }}</span>
            <span class="stat-badge neutral">{{ t('pd.comments', { n: comments.length }) }}</span>
            <span class="stat-badge neutral">{{ t('pd.solutions', { n: solutions.length }) }}</span>
          </div>
          <div class="hero-actions">
            <button
              class="encounter-btn"
              :class="{ active: hasEncountered, loading: encounterLoading }"
              @click="handleEncounter"
              :disabled="encounterLoading"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2C5.8 2 4 3.8 4 6c0 3.5 4 8 4 8s4-4.5 4-8c0-2.2-1.8-4-4-4z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" :fill="hasEncountered ? 'currentColor' : 'none'"/>
              </svg>
              <span>{{ hasEncountered ? '我遇到过 ✓' : '我也遇到了' }}</span>
              <span v-if="encounterCount > 0" class="encounter-count">{{ encounterCount }}</span>
            </button>
            <button
              class="fav-btn"
              :class="{ faved: isFav }"
              :disabled="favLoading"
              @click="handleFavorite"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 13.5S2 9.5 2 5.5A3.5 3.5 0 018 3a3.5 3.5 0 016 2c0 4-6 8.5-6 8.5z"
                  stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"
                  :fill="isFav ? 'currentColor' : 'none'" />
              </svg>
              {{ isFav ? '已收藏' : '收藏' }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="detail-content">
      <div class="detail-layout">
        <div class="detail-main">
          <section class="section">
            <p class="desc-text">{{ problem.description }}</p>
            <img v-if="metaMap[problem?.id]?.image_url || problem.image_url"
              :src="metaMap[problem?.id]?.image_url || problem.image_url"
              class="problem-img" alt="问题图片" loading="lazy" />
          </section>

          <section class="section">
            <h2 class="section-title">
              <span class="section-icon" :style="{ background: problem.color + '22', color: problem.color }">⚡</span>
              {{ t('pd.causes') }}
            </h2>
            <div class="causes-grid">
              <div v-for="(cause, i) in problem.causes" :key="i" class="cause-item" :style="{ '--color': problem.color }">
                <span class="cause-num" :style="{ color: problem.color }">0{{ i + 1 }}</span>
                <span class="cause-text">{{ cause }}</span>
              </div>
            </div>
          </section>

          <section class="section">
            <h2 class="section-title">
              <span class="section-icon" :style="{ background: problem.color + '22', color: problem.color }">🔧</span>
              {{ t('pd.steps') }}
              <button class="toggle-all-btn" @click="toggleAll">{{ allExpanded ? t('pd.collapseAll') : t('pd.expandAll') }}</button>
            </h2>
            <div class="solutions-list">
              <div
                v-for="(sol, i) in problem.solutions" :key="sol.step"
                class="solution-item" :class="{ expanded: expandedSet.has(i) }"
                :style="{ '--color': problem.color }" @click="toggleSol(i)"
              >
                <div class="sol-head">
                  <span class="sol-step" :style="{ background: problem.color }">{{ sol.step }}</span>
                  <span class="sol-title">{{ sol.title }}</span>
                  <svg class="sol-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <Transition name="expand">
                  <div class="sol-detail" v-if="expandedSet.has(i)">
                    <p>{{ sol.detail }}</p>
                    <img v-if="sol.image_url" :src="sol.image_url" class="sol-img" alt="步骤图片" loading="lazy" />
                  </div>
                </Transition>
              </div>
            </div>
          </section>

          <!-- ── 社区方案 ── -->
          <section class="section community-section">
            <h2 class="section-title">
              <span class="section-icon" style="background:rgba(92,186,122,0.15);color:#5cba7a">🌟</span>
              {{ t('pd.community') }}
              <span class="count-badge">{{ solutions.length }}</span>
            </h2>

            <div v-if="loadingSolutions" class="loading-state">
              <span class="spinner"></span>{{ t('pd.loadingSol') }}
            </div>
            <div v-else>
              <div v-if="solutions.length > 0" class="community-cards">
                <div v-for="sol in solutions" :key="sol.id" class="community-card">
                  <div class="card-head">
                    <div class="avatar">{{ sol.avatar }}</div>
                    <div class="card-info">
                      <span class="card-user">{{ sol.username }}</span>
                      <span class="card-time">{{ formatTime(sol.createdAt) }}</span>
                    </div>
                    <button class="like-btn" :class="{ liked: sol.likes.includes(currentUser?.id) }" @click="handleSolLike(sol.id, sol.likes)">
                      👍 {{ sol.likes.length || '' }}
                    </button>
                    <button v-if="currentUser?.id === sol.userId" class="delete-btn" @click="handleDeleteSol(sol.id)">{{ t('pd.delete') }}</button>
                  </div>
                  <div class="card-title">{{ sol.title }}</div>
                  <div class="card-detail">{{ sol.detail }}</div>
                </div>
              </div>
              <div v-else class="community-empty"><span>🔍</span><p>{{ t('pd.noSol') }}</p></div>

              <div v-if="currentUser" class="submit-form">
                <div class="form-label">{{ t('pd.shareLabel') }}</div>
                <input v-model="newSolTitle" class="form-input" :placeholder="t('pd.solTitlePh')" maxlength="60" />
                <textarea v-model="newSolDetail" class="form-textarea" :placeholder="t('pd.solDetailPh')" rows="4" maxlength="500"></textarea>
                <div class="form-footer">
                  <span class="char-count">{{ newSolDetail.length }}/500</span>
                  <button class="submit-btn" @click="submitSolution" :disabled="submittingSol || !newSolTitle.trim() || !newSolDetail.trim()">
                    <span v-if="submittingSol" class="btn-spinner"></span>
                    {{ submittingSol ? t('pd.publishing') : t('pd.publish') }}
                  </button>
                </div>
              </div>
              <div v-else class="login-prompt" @click="$emit('open-auth', 'login')">
                <span>💬</span><span>{{ t('pd.loginShare') }}</span><span class="prompt-arrow">→</span>
              </div>
            </div>
          </section>

          <!-- ── 评论区 ── -->
          <section class="section community-section">
            <h2 class="section-title">
              <span class="section-icon" style="background:rgba(116,185,255,0.15);color:#74b9ff">💬</span>
              {{ t('pd.discussion') }}
              <span class="count-badge">{{ comments.length }}</span>
            </h2>

            <div v-if="currentUser" class="comment-input-wrap">
              <div class="avatar">{{ currentUser.avatar }}</div>
              <div class="comment-input-inner">
                <textarea v-model="newComment" class="comment-textarea" :placeholder="t('pd.cmtPh', { u: currentUser.username })" rows="2" maxlength="300" @keydown.ctrl.enter="submitComment"></textarea>
                <div class="form-footer">
                  <span class="char-count">{{ t('pd.charHint', { n: newComment.length }) }}</span>
                  <button class="submit-btn" @click="submitComment" :disabled="submittingComment || !newComment.trim()">
                    <span v-if="submittingComment" class="btn-spinner"></span>
                    {{ submittingComment ? t('pd.sending') : t('pd.send') }}
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="login-prompt" @click="$emit('open-auth', 'login')">
              <span>✏️</span><span>{{ t('pd.loginComment') }}</span><span class="prompt-arrow">→</span>
            </div>

            <div v-if="loadingComments" class="loading-state">
              <span class="spinner"></span>{{ t('pd.loadingCmt') }}
            </div>
            <div v-else-if="comments.length > 0" class="comments-list">
              <div v-for="comment in comments" :key="comment.id" class="comment-item">
                <div class="avatar">{{ comment.avatar }}</div>
                <div class="comment-body">
                  <div class="comment-head">
                    <span class="comment-user">{{ comment.username }}</span>
                    <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
                  </div>
                  <p class="comment-text">{{ comment.content }}</p>
                  <div class="comment-actions">
                    <button class="like-btn small" :class="{ liked: comment.likes.includes(currentUser?.id) }" @click="handleCommentLike(comment.id)">
                      👍 {{ comment.likes.length > 0 ? comment.likes.length : '' }}
                    </button>
                    <button v-if="currentUser?.id === comment.userId" class="delete-btn" @click="handleDeleteComment(comment.id)">{{ t('pd.delete') }}</button>
                  </div>
                </div>
              </div>
            </div>
            <div v-else-if="currentUser" class="community-empty"><span>💭</span><p>{{ t('pd.noCmt') }}</p></div>
          </section>
        </div>

        <aside class="detail-side">
          <!-- 视频教程 -->
          <section v-if="problem.video" class="section side-section video-section">
            <h2 class="section-title">
              <span class="section-icon" :style="{ background: problem.color + '22', color: problem.color }">▶</span>
              视频教程
            </h2>
            <div class="bili-wrap">
              <iframe
                :src="`https://player.bilibili.com/player.html?bvid=${problem.video}&page=1&high_quality=1&danmaku=0&autoplay=0`"
                class="bili-player"
                scrolling="no"
                frameborder="0"
                allowfullscreen
              ></iframe>
            </div>
          </section>

          <section class="section side-section" :style="{ '--color': problem.color }">
            <div class="tip-box">
              <div class="tip-header"><span>💡</span><span class="tip-label">{{ t('pd.tip') }}</span></div>
              <p class="tip-text">{{ problem.tips }}</p>
            </div>
          </section>

          <!-- 相关问题 -->
          <section class="section side-section" v-if="relatedProblems.length">
            <h2 class="section-title">
              <span class="section-icon" style="background:rgba(255,255,255,0.06);color:#86868b">📎</span>
              {{ t('pd.related') }}
            </h2>
            <div class="related-grid">
              <div v-for="rel in relatedProblems" :key="rel.id" class="related-card" :style="{ '--color': rel.color }" @click="$emit('go-detail', rel.id)">
                <span class="related-emoji">{{ rel.emoji }}</span>
                <div><div class="related-title">{{ rel.title }}</div><div class="related-sub">{{ rel.subtitle }}</div></div>
                <svg class="related-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>

    <div class="float-back">
      <button class="float-back-btn" @click="$emit('back')">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M10 3L5 7.5l5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        {{ t('pd.backList') }}
      </button>
      <button v-if="currentUser" class="float-report-btn" @click="showReportModal = true">举报</button>
    </div>
  </div>

  <div class="not-found" v-else>
    <p>😵 找不到这个问题</p>
    <button @click="$emit('back')">返回列表</button>
  </div>

  <!-- 举报弹窗 -->
  <Transition name="report-fade">
    <div v-if="showReportModal" class="report-mask" @click.self="showReportModal = false">
      <div class="report-box">
        <div class="report-head">
          <h3>举报内容</h3>
          <button class="pd-close-btn" @click="showReportModal = false">✕</button>
        </div>
        <p class="report-hint">请选择举报原因：</p>
        <div class="reason-list">
          <label v-for="r in REPORT_REASONS" :key="r" class="reason-item">
            <input type="radio" :value="r" v-model="reportReason" />
            <span>{{ r }}</span>
          </label>
        </div>
        <div v-if="reportDone" class="report-success">举报已提交，我们将尽快处理。</div>
        <div class="report-actions">
          <button class="pd-cancel-btn" @click="showReportModal = false">取消</button>
          <button class="pd-submit-btn" :disabled="!reportReason || reportSubmitting || reportDone" @click="handleReport">
            {{ reportSubmitting ? '提交中…' : reportDone ? '已举报' : '提交举报' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useUserProblems } from '@/composables/useUserProblems.js'
import { useAuth } from '@/composables/useAuth.js'
import { useCommunity } from '@/composables/useCommunity.js'
import { useLocale } from '@/composables/useLocale.js'
import { useReport } from '@/composables/useReport.js'
import { useFavorites } from '@/composables/useFavorites.js'
import { useProblemMeta } from '@/composables/useProblemMeta.js'
import { useUserGuard } from '@/composables/useUserGuard.js'
import { getProblemDetail, getRelatedProblemSummaries } from '@/composables/useProblemLibrary.js'

const props = defineProps({ problemId: { type: String, required: true } })
const emit = defineEmits(['back', 'go-detail', 'open-auth'])

const { currentUser } = useAuth()
const { userProblems } = useUserProblems()
const { favorites, fetchFavorites, toggleFavorite } = useFavorites()
const { metaMap, fetchProblemMeta } = useProblemMeta()
const { getProblemCommunity, getComments, addComment, deleteComment, toggleCommentLike, getSolutions, addSolution, deleteSolution, toggleSolutionLike, toggleEncounter } = useCommunity()
const { t } = useLocale()
const { submitReport } = useReport()
const { ensureUserCanInteract } = useUserGuard()

const REPORT_REASONS = ['色情低俗', '赌博内容', '毒品违禁品', '虚假欺诈', '垃圾广告', '其他违规']
const showReportModal  = ref(false)
const reportReason     = ref('')
const reportSubmitting = ref(false)
const reportDone       = ref(false)
const problem = ref(null)
const detailLoading = ref(true)
const loadedProblemId = ref(null)

async function handleReport() {
  if (!reportReason.value || reportSubmitting.value || reportDone.value) return
  reportSubmitting.value = true
  try {
    await submitReport(currentUser.value.id, {
      type: 'problem', targetId: problem.value.id, targetTitle: problem.value.title, reason: reportReason.value,
    })
    reportDone.value = true
  } catch (e) {
    console.error(e)
  } finally {
    reportSubmitting.value = false
  }
}

// ── 步骤展开 ──
const expandedSet = ref(new Set())
const initExpanded = () => { if (problem.value) expandedSet.value = new Set(problem.value.solutions.map((_, i) => i)) }
initExpanded()
watch(() => props.problemId, async () => {
  await loadProblem()
  initExpanded()
  loadData()
})
const toggleSol = (i) => { const s = new Set(expandedSet.value); s.has(i) ? s.delete(i) : s.add(i); expandedSet.value = s }
const allExpanded = computed(() => problem.value && expandedSet.value.size === problem.value.solutions.length)
const toggleAll = () => { allExpanded.value ? (expandedSet.value = new Set()) : (expandedSet.value = new Set(problem.value.solutions.map((_, i) => i))) }

// ── 我也遇到了 ──
const encounterCount   = ref(0)
const hasEncountered   = ref(false)
const encounterLoading = ref(false)

const handleEncounter = async () => {
  if (!currentUser.value) { emit('open-auth', 'login'); return }
  encounterLoading.value = true
  try {
    const added = await toggleEncounter(props.problemId, currentUser.value.id)
    hasEncountered.value = added
    encounterCount.value += added ? 1 : -1
  } catch (e) {
    console.error('encounter failed:', e?.message)
  } finally {
    encounterLoading.value = false
  }
}

// ── 收藏 ──
const isFav     = computed(() => favorites.value.has(props.problemId))
const favLoading = ref(false)

const handleFavorite = async () => {
  if (!currentUser.value) { emit('open-auth', 'login'); return }
  favLoading.value = true
  try { await toggleFavorite(props.problemId, currentUser.value.id) }
  catch (e) { console.error('favorite failed:', e?.message) }
  finally { favLoading.value = false }
}

// ── 社区数据 ──
const comments = ref([])
const solutions = ref([])
const loadingComments = ref(true)
const loadingSolutions = ref(true)
const relatedProblems = ref([])

async function loadProblem() {
  if (loadedProblemId.value === props.problemId && problem.value) return
  detailLoading.value = true
  try {
    problem.value = await getProblemDetail(props.problemId, { extraItems: userProblems.value })
    relatedProblems.value = await getRelatedProblemSummaries(props.problemId, { extraItems: userProblems.value, limit: 3 })
    loadedProblemId.value = props.problemId
  } finally {
    detailLoading.value = false
  }
}

const loadData = async () => {
  loadingComments.value = true
  loadingSolutions.value = true
  const community = await getProblemCommunity(props.problemId, currentUser.value?.id)
  comments.value = community.comments
  solutions.value = community.solutions
  encounterCount.value = community.encounter.count
  hasEncountered.value = community.encounter.hasEncountered
  loadingComments.value = false
  loadingSolutions.value = false
}
loadProblem().then(() => {
  initExpanded()
  loadData()
})

// ── 评论 ──
const newComment = ref('')
const submittingComment = ref(false)
const submitComment = async () => {
  if (!newComment.value.trim() || !currentUser.value) return
  submittingComment.value = true
  try {
    await ensureUserCanInteract(currentUser.value.id, '发表评论')
    const content = newComment.value.trim()
    await addComment(props.problemId, currentUser.value.id, content)
    newComment.value = ''
    comments.value = await getComments(props.problemId, { force: true })
  } catch (e) { alert(e.message) }
  finally { submittingComment.value = false }
}
const handleCommentLike = async (id) => {
  if (!currentUser.value) return
  const target = comments.value.find(comment => comment.id === id)
  if (!target) return
  const liked = target.likes.includes(currentUser.value.id)
  target.likes = liked
    ? target.likes.filter(userId => userId !== currentUser.value.id)
    : [...target.likes, currentUser.value.id]
  await toggleCommentLike(id, currentUser.value.id, props.problemId)
}
const handleDeleteComment = async (id) => {
  if (!confirm('确定删除这条评论？')) return
  await deleteComment(id, props.problemId)
  comments.value = comments.value.filter(comment => comment.id !== id)
}

// ── 方案 ──
const newSolTitle = ref('')
const newSolDetail = ref('')
const submittingSol = ref(false)
const submitSolution = async () => {
  if (!newSolTitle.value.trim() || !newSolDetail.value.trim() || !currentUser.value) return
  submittingSol.value = true
  try {
    await ensureUserCanInteract(currentUser.value.id, '补充方案')
    await addSolution(props.problemId, currentUser.value.id, newSolTitle.value.trim(), newSolDetail.value.trim())
    newSolTitle.value = ''
    newSolDetail.value = ''
    solutions.value = await getSolutions(props.problemId, { force: true })
  } catch (e) { alert(e.message) }
  finally { submittingSol.value = false }
}
const handleSolLike = async (id) => {
  if (!currentUser.value) return
  const target = solutions.value.find(solution => solution.id === id)
  if (!target) return
  const liked = target.likes.includes(currentUser.value.id)
  target.likes = liked
    ? target.likes.filter(userId => userId !== currentUser.value.id)
    : [...target.likes, currentUser.value.id]
  await toggleSolutionLike(id, currentUser.value.id, props.problemId)
}
const handleDeleteSol = async (id) => {
  if (!confirm('确定删除这个方案？')) return
  await deleteSolution(id, props.problemId)
  solutions.value = solutions.value.filter(solution => solution.id !== id)
}

const formatTime = (ts) => {
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 2592000000) return `${Math.floor(diff / 86400000)} 天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}
const diffClass = (d) => { if (d === '紧急') return 'urgent'; if (d === '需处理') return 'warn'; if (d === '进阶') return 'advanced'; return 'normal' }

// ── JSON-LD HowTo 结构化数据 ──
let _jsonLdEl = null
const injectJsonLd = (p) => {
  if (_jsonLdEl) { _jsonLdEl.remove(); _jsonLdEl = null }
  if (!p) return
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `如何解决3D打印${p.title}`,
    description: p.description || p.subtitle || '',
    step: (p.solutions || []).map((sol, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: sol.title,
      text: sol.detail,
    })),
  }
  _jsonLdEl = document.createElement('script')
  _jsonLdEl.type = 'application/ld+json'
  _jsonLdEl.textContent = JSON.stringify(schema)
  document.head.appendChild(_jsonLdEl)
}
watch(problem, (p) => injectJsonLd(p), { immediate: true })

// ── 滚动导航栏毛玻璃 ──
const navScrolled = ref(false)
const onScroll = () => { navScrolled.value = window.scrollY > 260 }
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  if (currentUser.value) fetchFavorites(currentUser.value.id)
  fetchProblemMeta()
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  if (_jsonLdEl) { _jsonLdEl.remove(); _jsonLdEl = null }
})
</script>

<style scoped>
.detail-loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--lab-bg-soft);
  color: var(--lab-text-soft);
  font-size: 15px;
  font-family: -apple-system, "SF Pro Display", "PingFang SC", "Helvetica Neue", sans-serif;
}
.detail-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(37, 104, 232, 0.12), transparent 24%),
    linear-gradient(180deg, #f7fbfd 0%, #eef4f8 42%, #f8fbfd 100%);
  color: var(--lab-text);
  font-family: -apple-system, "SF Pro Display", "PingFang SC", "Helvetica Neue", sans-serif;
  padding-bottom: 120px;
}
.back-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 14px 28px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: background 0.28s, backdrop-filter 0.28s, border-color 0.28s, box-shadow 0.28s;
  border-bottom: 1px solid transparent;
}
.back-nav.scrolled {
  background: rgba(247, 251, 253, 0.86);
  backdrop-filter: blur(18px);
  border-bottom-color: rgba(57, 86, 120, 0.12);
  box-shadow: 0 10px 30px rgba(15, 31, 56, 0.06);
}
.back-nav.scrolled .back-btn,
.back-nav.scrolled .nav-login-btn {
  background: rgba(255, 255, 255, 0.88);
  color: var(--lab-text);
  border-color: rgba(57, 86, 120, 0.14);
}
.back-nav.scrolled .back-btn:hover,
.back-nav.scrolled .nav-login-btn:hover {
  border-color: rgba(37, 104, 232, 0.24);
  color: var(--lab-accent);
}
.back-nav.scrolled .nav-user {
  color: var(--lab-text);
}
.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
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
}
.back-btn:hover {
  background: rgba(10, 20, 36, 0.42);
  transform: translateY(-1px);
}
.nav-right { display: flex; align-items: center; gap: 8px; }
.nav-user { display: flex; align-items: center; gap: 8px; font-size: 14px; color: rgba(255,255,255,0.92); }
.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2568e8, #17b5d4);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 24px rgba(37, 104, 232, 0.22);
}
.nav-login-btn {
  background: rgba(10, 20, 36, 0.28);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.18s, border-color 0.18s, transform 0.18s;
}
.nav-login-btn:hover {
  background: rgba(10, 20, 36, 0.42);
  transform: translateY(-1px);
}
.detail-hero {
  padding-top: 58px;
  min-height: 312px;
  position: relative;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}
.detail-hero::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(8, 16, 30, 0.08) 0%, rgba(8, 16, 30, 0.42) 100%),
    linear-gradient(90deg, rgba(8, 16, 30, 0.28) 0%, rgba(8, 16, 30, 0.08) 55%, rgba(8, 16, 30, 0.2) 100%);
}
.hero-content {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 56px 32px 40px;
  display: flex;
  align-items: flex-end;
  gap: 28px;
  position: relative;
  z-index: 2;
}
.hero-emoji { font-size: 80px; line-height: 1; flex-shrink: 0; filter: drop-shadow(0 12px 32px rgba(0,0,0,0.5)); animation: floatIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both; font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; }
@keyframes floatIn { from { opacity:0; transform:scale(0.6) rotate(-10deg); } to { opacity:1; transform:scale(1) rotate(0deg); } }
.hero-glow { position: absolute; width: 200px; height: 200px; border-radius: 50%; opacity: 0.2; filter: blur(60px); left: 24px; bottom: 20px; }
.hero-meta { flex: 1; min-width: 0; }
.hero-category {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  display: block;
  margin-bottom: 10px;
}
.hero-title {
  font-size: clamp(2rem, 4.6vw, 3.2rem);
  font-weight: 750;
  letter-spacing: -0.04em;
  line-height: 1.06;
  color: #f8fbff;
  margin-bottom: 10px;
}
.hero-subtitle { font-size: 15px; color: rgba(235, 243, 255, 0.72); margin-bottom: 16px; max-width: 720px; }
.hero-stats { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.stat-badge {
  display: inline-block;
  font-size: 11px;
  padding: 6px 11px;
  border-radius: 999px;
  letter-spacing: 0.05em;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.stat-badge.neutral { background: rgba(255,255,255,0.14); color: rgba(245, 250, 255, 0.82); }
.hero-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.encounter-btn {
  display: inline-flex; align-items: center; gap: 7px;
  background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.85); border-radius: 100px;
  padding: 8px 18px; font-size: 13px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all 0.2s; backdrop-filter: blur(8px);
}
.encounter-btn:hover:not(:disabled) { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); }
.encounter-btn.active { background: rgba(255,100,100,0.25); border-color: rgba(255,120,120,0.5); color: #ffb3b3; }
.encounter-btn.loading { opacity: 0.6; cursor: not-allowed; }
.encounter-count { background: rgba(255,255,255,0.2); border-radius: 100px; padding: 1px 8px; font-size: 12px; }
.fav-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.85); border-radius: 100px;
  padding: 8px 18px; font-size: 13px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all 0.2s; backdrop-filter: blur(8px);
}
.fav-btn:hover:not(:disabled) { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); }
.fav-btn.faved { background: rgba(255,59,48,0.28); border-color: rgba(255,100,90,0.55); color: #ffb3b3; }
.fav-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.diff-normal { background:rgba(255,255,255,0.12); color:rgba(255,255,255,0.7); }
.diff-urgent { background:rgba(232,92,92,0.22); color:#ff6b6b; }
.diff-warn { background:rgba(162,155,254,0.18); color:#a29bfe; }
.diff-advanced { background:rgba(116,185,255,0.18); color:#74b9ff; }
.detail-content {
  max-width: 1280px;
  margin: 0 auto;
  padding: 28px 32px 44px;
}
.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.42fr) minmax(300px, 0.82fr);
  gap: 22px;
  align-items: start;
}
.detail-main,
.detail-side {
  min-width: 0;
}
.detail-side {
  position: sticky;
  top: 88px;
}
.section {
  padding: 28px;
  margin-bottom: 18px;
  border: 1px solid var(--lab-line);
  border-radius: 24px;
  background: rgba(255,255,255,0.94);
  box-shadow: var(--lab-shadow-sm);
  backdrop-filter: blur(12px);
}
.section:last-child { margin-bottom: 0; }
.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 20px;
  letter-spacing: -0.02em;
  color: var(--lab-text);
}
.section-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}
.count-badge {
  background: rgba(37, 104, 232, 0.08);
  color: var(--lab-text-soft);
  font-size: 12px;
  padding: 3px 9px;
  border-radius: 999px;
  font-weight: 500;
}
.toggle-all-btn {
  margin-left: auto;
  background: rgba(37, 104, 232, 0.06);
  border: 1px solid rgba(37, 104, 232, 0.14);
  color: var(--lab-text-soft);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.18s;
}
.toggle-all-btn:hover {
  color: var(--lab-accent);
  border-color: rgba(37, 104, 232, 0.24);
  background: rgba(37, 104, 232, 0.1);
}
.desc-text { font-size: 16px; color: var(--lab-text-soft); line-height: 1.9; padding: 2px 2px 0; }
.problem-img,
.sol-img {
  width: 100%;
  object-fit: cover;
  border-radius: 18px;
  margin-top: 18px;
  display: block;
  border: 1px solid var(--lab-line);
  background: rgba(255, 255, 255, 0.86);
  padding: 12px;
}
.problem-img { max-height: 360px; }
.sol-img { max-height: 240px; }
.bili-wrap {
  position: relative;
  width: 100%;
  padding-top: 56.25%;
  border-radius: 18px;
  overflow: hidden;
  background: #09101a;
  margin-top: 4px;
  border: 1px solid rgba(57, 86, 120, 0.16);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
}
.bili-player { position: absolute; inset: 0; width: 100%; height: 100%; border: none; }
.causes-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(180px,1fr)); gap: 10px; }
.cause-item {
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248, 251, 254, 0.96));
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid rgba(57, 86, 120, 0.09);
  box-shadow: 0 6px 18px rgba(15, 31, 56, 0.04);
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
}
.cause-item:hover {
  box-shadow: 0 12px 24px rgba(15, 31, 56, 0.08);
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--color) 20%, rgba(57, 86, 120, 0.09));
}
.cause-num { font-size: 12px; font-weight: 700; }
.cause-text { font-size: 14px; color: var(--lab-text); line-height: 1.55; font-weight: 600; }
.solutions-list { display: flex; flex-direction: column; gap: 8px; }
.solution-item {
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(57, 86, 120, 0.08);
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(15, 31, 56, 0.04);
  transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s;
}
.solution-item:hover {
  box-shadow: 0 12px 26px rgba(15, 31, 56, 0.08);
  transform: translateY(-1px);
}
.solution-item.expanded { border-color: color-mix(in srgb, var(--color) 35%, transparent); }
.sol-head { display: flex; align-items: center; gap: 14px; padding: 16px 18px; }
.sol-step { width: 26px; height: 26px; border-radius: 50%; font-size: 12px; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sol-title { flex: 1; font-size: 15px; font-weight: 600; color: var(--lab-text); }
.sol-arrow { color: var(--lab-text-dim); transition: transform 0.25s, color 0.2s; flex-shrink: 0; }
.solution-item.expanded .sol-arrow { transform: rotate(180deg); color: var(--color); }
.sol-detail { padding: 0 18px 18px 58px; }
.sol-detail p { font-size: 14px; color: var(--lab-text-soft); line-height: 1.8; }
.expand-enter-active, .expand-leave-active { transition: all 0.22s ease; overflow: hidden; }
.expand-enter-from, .expand-leave-to { max-height: 0; opacity: 0; }
.expand-enter-to, .expand-leave-from { max-height: 400px; opacity: 1; }
.tip-box {
  background: color-mix(in srgb, var(--color) 7%, #fff);
  border: 1px solid color-mix(in srgb, var(--color) 22%, transparent);
  border-radius: 18px;
  padding: 20px 22px;
}
.tip-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.tip-label { font-size: 13px; font-weight: 600; color: var(--color); letter-spacing: 0.04em; }
.tip-text { font-size: 14px; color: var(--lab-text-soft); line-height: 1.8; }
.loading-state { display: flex; align-items: center; justify-content: center; gap: 10px; color: var(--lab-text-dim); font-size: 14px; padding: 32px 0; }
.spinner { width: 18px; height: 18px; border: 2px solid rgba(57, 86, 120, 0.12); border-top-color: var(--lab-accent); border-radius: 50%; animation: spin 0.75s linear infinite; flex-shrink: 0; }
.spinner.large { width: 24px; height: 24px; border-width: 2.5px; }
.btn-spinner { width: 12px; height: 12px; border: 1.5px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2568e8, #17b5d4);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 8px 20px rgba(37, 104, 232, 0.16);
}
.community-cards { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.community-card {
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250, 252, 255, 0.96));
  border: 1px solid rgba(57, 86, 120, 0.08);
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 8px 22px rgba(15, 31, 56, 0.04);
}
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.card-info { flex: 1; min-width: 0; }
.card-user { font-size: 13px; font-weight: 600; color: var(--lab-text); display: block; }
.card-time { font-size: 11px; color: var(--lab-text-dim); }
.card-title { font-size: 15px; font-weight: 700; color: var(--lab-text); margin-bottom: 8px; }
.card-detail { font-size: 14px; color: var(--lab-text-soft); line-height: 1.8; }
.like-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(37, 104, 232, 0.04);
  border: 1px solid rgba(57, 86, 120, 0.12);
  color: var(--lab-text-soft);
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.18s;
  font-family: inherit;
}
.like-btn:hover { border-color: rgba(37, 104, 232, 0.24); color: var(--lab-accent); }
.like-btn.liked { background: rgba(255,214,0,0.12); border-color: rgba(200,160,0,0.3); color: #8c6900; }
.like-btn.small { padding: 3px 8px; font-size: 12px; }
.delete-btn { background: transparent; border: none; color: var(--lab-text-dim); font-size: 12px; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: color 0.15s; font-family: inherit; }
.delete-btn:hover { color: #ff3b30; }
.submit-form {
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250, 252, 255, 0.96));
  border: 1px solid rgba(57, 86, 120, 0.09);
  border-radius: 18px;
  padding: 18px;
  margin-top: 16px;
  box-shadow: 0 8px 22px rgba(15, 31, 56, 0.04);
}
.form-label { font-size: 13px; font-weight: 600; color: var(--lab-text-soft); margin-bottom: 12px; letter-spacing: 0.04em; }
.form-input, .form-textarea, .comment-textarea {
  width: 100%;
  background: rgba(244, 248, 252, 0.96);
  border: 1px solid rgba(57, 86, 120, 0.12);
  border-radius: 14px;
  padding: 12px 14px;
  color: var(--lab-text);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.form-input:focus, .form-textarea:focus, .comment-textarea:focus {
  border-color: rgba(37, 104, 232, 0.28);
  box-shadow: 0 0 0 4px rgba(37, 104, 232, 0.08);
  background: rgba(255, 255, 255, 0.98);
}
.form-input::placeholder, .form-textarea::placeholder, .comment-textarea::placeholder { color: #9aa8bc; }
.form-input { margin-bottom: 10px; resize: none; }
.form-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.char-count { font-size: 11px; color: var(--lab-text-dim); }
.submit-btn {
  background: linear-gradient(135deg, var(--lab-accent), var(--lab-accent-2));
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 9px 20px;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.18s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 12px 24px rgba(37, 104, 232, 0.18);
}
.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(37, 104, 232, 0.24);
}
.submit-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.login-prompt {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px dashed rgba(57, 86, 120, 0.16);
  border-radius: 16px;
  padding: 16px 20px;
  font-size: 14px;
  color: var(--lab-text-soft);
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 12px;
}
.login-prompt:hover { border-color: rgba(37, 104, 232, 0.24); color: var(--lab-text); }
.prompt-arrow { margin-left: auto; color: var(--lab-accent); }
.comment-input-wrap { display: flex; gap: 12px; margin-bottom: 20px; }
.comment-input-inner { flex: 1; }
.comment-textarea { min-height: 70px; }
.comments-list { display: flex; flex-direction: column; gap: 16px; }
.comment-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(248,250,253,0.94);
  border: 1px solid rgba(57, 86, 120, 0.06);
}
.comment-body { flex: 1; min-width: 0; }
.comment-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.comment-user { font-size: 13px; font-weight: 600; color: var(--lab-text); }
.comment-time { font-size: 11px; color: var(--lab-text-dim); }
.comment-text { font-size: 14px; color: var(--lab-text-soft); line-height: 1.72; margin-bottom: 8px; word-break: break-word; }
.comment-actions { display: flex; align-items: center; gap: 8px; }
.community-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px; color: var(--lab-text-dim); font-size: 14px; text-align: center; }
.community-empty span { font-size: 24px; }
.side-section {
  padding: 22px;
}
.video-section .section-title,
.side-section .section-title {
  font-size: 18px;
  margin-bottom: 16px;
}
.related-grid { display: flex; flex-direction: column; gap: 8px; }
.related-card {
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248, 251, 254, 0.96));
  border: 1px solid rgba(57, 86, 120, 0.08);
  border-radius: 16px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(15, 31, 56, 0.04);
  transition: all 0.2s;
}
.related-card:hover {
  box-shadow: 0 12px 28px rgba(15, 31, 56, 0.08);
  border-color: color-mix(in srgb, var(--color) 30%, rgba(57, 86, 120, 0.08));
  transform: translateX(4px);
}
.related-emoji { font-size: 28px; flex-shrink: 0; font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; }
.related-title { font-size: 15px; font-weight: 600; color: var(--lab-text); margin-bottom: 2px; }
.related-sub { font-size: 12px; color: var(--lab-text-dim); }
.related-arrow { color: var(--lab-text-dim); flex-shrink: 0; margin-left: auto; transition: color 0.2s, transform 0.2s; }
.related-card:hover .related-arrow { color: var(--color); transform: translateX(2px); }
.float-back { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); z-index: 80; display: flex; align-items: center; gap: 10px; }
.float-back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(57, 86, 120, 0.14);
  color: var(--lab-text);
  padding: 11px 22px;
  border-radius: 999px;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  backdrop-filter: blur(16px);
  box-shadow: 0 12px 28px rgba(15, 31, 56, 0.12);
  transition: all 0.2s;
}
.float-back-btn:hover { transform: translateY(-2px); box-shadow: 0 16px 34px rgba(15, 31, 56, 0.16); }
.float-report-btn {
  background: rgba(255,255,255,0.7);
  border: 1px solid rgba(57, 86, 120, 0.12);
  color: var(--lab-text-dim);
  font-size: 12px;
  font-family: inherit;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  backdrop-filter: blur(16px);
  transition: all 0.15s;
}
.float-report-btn:hover { color: #ff3b30; border-color: rgba(255,59,48,0.25); }

.report-mask { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.5); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.report-box  { background: #fff; border-radius: 24px; width: 100%; max-width: 400px; padding: 24px; box-shadow: 0 24px 56px rgba(0,0,0,0.2); border: 1px solid rgba(57, 86, 120, 0.1); }
.report-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.report-head h3 { font-size: 16px; font-weight: 700; color: var(--lab-text); }
.pd-close-btn { background: rgba(37, 104, 232, 0.06); border: none; color: var(--lab-text-soft); font-size: 13px; cursor: pointer; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.report-hint { font-size: 13px; color: var(--lab-text-soft); margin-bottom: 12px; }
.reason-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.reason-item { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--lab-text); cursor: pointer; }
.reason-item input[type=radio] { accent-color: var(--lab-accent); width: 16px; height: 16px; cursor: pointer; }
.report-success { font-size: 13px; color: #16a34a; background: rgba(34,197,94,0.08); padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; }
.report-actions { display: flex; gap: 8px; justify-content: flex-end; }
.pd-cancel-btn { padding: 9px 18px; background: transparent; border: 1px solid rgba(57, 86, 120, 0.12); border-radius: 10px; color: var(--lab-text-soft); font-size: 13px; font-family: inherit; cursor: pointer; }
.pd-submit-btn { padding: 9px 20px; background: linear-gradient(135deg, var(--lab-accent), var(--lab-accent-2)); color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; }
.pd-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.report-fade-enter-active, .report-fade-leave-active { transition: opacity 0.2s; }
.report-fade-enter-from, .report-fade-leave-to { opacity: 0; }
.not-found { min-height: 100vh; background: var(--lab-bg-soft); color: var(--lab-text-soft); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; font-family: -apple-system,'PingFang SC',sans-serif; }
.not-found button { background: #fff; border: 1px solid rgba(57, 86, 120, 0.12); color: var(--lab-accent); padding: 10px 24px; border-radius: 999px; cursor: pointer; font-size: 15px; font-family: inherit; }

@media (max-width: 1080px) {
  .detail-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .detail-side {
    position: static;
  }
}

@media (max-width: 760px) {
  .back-nav {
    padding: 12px 16px;
  }

  .hero-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 78px 20px 30px;
  }
  .hero-emoji { font-size: 56px; }
  .detail-content { padding: 18px 16px 40px; }
  .section { padding: 20px 18px; border-radius: 20px; }
  .side-section {
    padding: 18px;
  }
  .causes-grid { grid-template-columns: 1fr 1fr; }
  .sol-detail { padding: 0 14px 14px 48px; }
  .float-back { bottom: 20px; }
  .float-report-btn { display: none; }
}
@media (max-width: 480px) {
  .back-btn,
  .nav-login-btn {
    padding: 7px 13px;
  }
  .section { padding: 18px 16px; }
  .section-title { font-size: 17px; gap: 8px; }
  .desc-text { font-size: 15px; }
  .sol-head { padding: 13px 14px; gap: 10px; }
  .sol-step { width: 24px; height: 24px; font-size: 11px; }
  .sol-title { font-size: 14px; }
  .sol-detail { padding: 0 12px 12px 44px; }
  .comment-input-wrap { gap: 8px; }
  .causes-grid { grid-template-columns: 1fr; }
}
</style>
