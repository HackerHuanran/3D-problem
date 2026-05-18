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
          <div class="user-avatar">
            <img v-if="isAvatarImage(currentUser.avatar)" :src="currentUser.avatar" alt="用户头像" class="avatar-image" />
            <span v-else>{{ avatarFallback(currentUser.avatar, currentUser.username) }}</span>
          </div>
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
                    <div v-if="solutionActionSteps(sol).length" class="sol-checklist">
                      <div class="sol-checklist-title">新手操作清单</div>
                      <ol class="sol-checklist-list">
                        <li v-for="(item, actionIndex) in solutionActionSteps(sol)" :key="`${sol.step}-${actionIndex}`">
                          {{ item }}
                        </li>
                      </ol>
                    </div>
                    <img v-if="sol.image_url" :src="sol.image_url" class="sol-img" alt="步骤图片" loading="lazy" />
                  </div>
                </Transition>
              </div>
            </div>
          </section>

          <section class="section solution-cta-section">
            <div class="solution-cta-card">
              <div>
                <h2 class="section-title solution-cta-title">
                  <span class="section-icon" style="background:rgba(92,186,122,0.15);color:#5cba7a">➕</span>
                  添加解决方案
                </h2>
                <p class="solution-cta-desc">如果你有这个问题的处理经验，可以补充到问题库里，帮助后面的人更快解决。</p>
              </div>
              <button
                class="solution-cta-btn"
                @click="currentUser ? $emit('go-submit', { mode: 'solution', targetProblemId: problem.id, targetProblemTitle: problem.title, category: problem.category }) : $emit('open-auth', 'login')"
              >
                {{ currentUser ? '去添加解决方案' : '登录后添加' }}
              </button>
            </div>
          </section>

          <section class="section solution-submissions-section">
            <h2 class="section-title">
              <span class="section-icon" style="background:rgba(37,104,232,0.12);color:#2568e8">★</span>
              补充解决方案
              <span class="count-badge">{{ solutionSubmissionCountText }}</span>
            </h2>

            <div v-if="loadingSolutionSubmissions" class="loading-state">
              <span class="spinner"></span>
              <span>正在加载补充方案…</span>
            </div>

            <div v-else-if="solutionSubmissions.length" class="solution-submission-grid">
              <article
                v-for="item in solutionSubmissions"
                :key="item.id"
                class="solution-submission-card"
                @click="openSolutionModal(item)"
              >
                <div class="submission-card-head">
                  <div class="submission-head-main">
                    <h3 class="submission-title">{{ item.title }}</h3>
                    <p class="submission-meta">{{ item.username }} · {{ formatTime(item.createdAt) }}</p>
                  </div>
                  <span v-if="item.likeCount > 0" class="submission-like-count">👍 {{ item.likeCount }}</span>
                </div>

                <p class="submission-desc">{{ item.description || item.subtitle || '投稿者补充了一个可复现的处理方案。' }}</p>

                <div v-if="item.solutions?.length" class="submission-steps compact">
                  <div v-for="step in item.solutions" :key="`${item.id}-${step.step}`" class="submission-step">
                    <span class="submission-step-index">{{ step.step }}</span>
                    <div class="submission-step-body">
                      <div class="submission-step-title">{{ step.title }}</div>
                      <p v-if="step.detail" class="submission-step-detail">{{ step.detail }}</p>
                    </div>
                  </div>
                </div>

                <div class="submission-footer">
                  <button
                    class="like-btn submission-like-btn"
                    :class="{ liked: item.likedByCurrentUser, pending: likingSolutionId === item.id }"
                    :disabled="likingSolutionId === item.id"
                    @click.stop="handleSolutionLike(item)"
                  >
                    {{ item.likedByCurrentUser ? '已点赞' : '点赞' }}
                    <span>{{ item.likeCount > 0 ? item.likeCount : '' }}</span>
                  </button>
                  <span class="submission-footer-hint">
                    {{ currentUser ? '每个账号可点赞一次，再点可取消' : '登录后可点赞这个方案' }}
                  </span>
                </div>
              </article>
            </div>

            <div v-else class="community-empty">
              <span>🧩</span>
              <p>还没有补充方案，你可以成为第一个完善这个问题的人。</p>
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
              <div class="avatar">
                <img v-if="isAvatarImage(currentUser.avatar)" :src="currentUser.avatar" alt="用户头像" class="avatar-image" />
                <span v-else>{{ avatarFallback(currentUser.avatar, currentUser.username) }}</span>
              </div>
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
                <div class="avatar">
                  <img v-if="isAvatarImage(comment.avatar)" :src="comment.avatar" alt="用户头像" class="avatar-image" />
                  <span v-else>{{ avatarFallback(comment.avatar, comment.username) }}</span>
                </div>
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
    <div v-if="showReportModal" class="report-mask">
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

  <Transition name="report-fade">
    <div v-if="activeSolutionSubmission" class="solution-modal-mask">
      <div class="solution-modal">
        <div class="solution-modal-head">
          <div class="solution-modal-head-copy">
            <div class="solution-modal-kicker">补充方案详情</div>
            <h3 class="solution-modal-title">{{ activeSolutionSubmission.title }}</h3>
            <p class="solution-modal-meta">
              {{ activeSolutionSubmission.username }} · {{ formatTime(activeSolutionSubmission.createdAt) }}
            </p>
          </div>
          <button class="pd-close-btn" @click="closeSolutionModal">✕</button>
        </div>

        <div class="solution-modal-body">
          <p v-if="activeSolutionSubmission.description || activeSolutionSubmission.subtitle" class="solution-modal-desc">
            {{ activeSolutionSubmission.description || activeSolutionSubmission.subtitle }}
          </p>

          <div v-if="activeSolutionSubmission.solutions?.length" class="solution-modal-steps">
            <div
              v-for="step in activeSolutionSubmission.solutions"
              :key="`${activeSolutionSubmission.id}-${step.step}`"
              class="solution-modal-step"
            >
              <span class="solution-modal-step-index">{{ step.step }}</span>
              <div class="solution-modal-step-body">
                <div class="solution-modal-step-title">{{ step.title }}</div>
                <p v-if="step.detail" class="solution-modal-step-detail">{{ step.detail }}</p>
                <img
                  v-if="step.image_url"
                  :src="step.image_url"
                  class="solution-modal-step-image"
                  alt="方案步骤图片"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          <div class="solution-modal-actions">
            <button
              class="like-btn submission-like-btn"
              :class="{ liked: activeSolutionSubmission.likedByCurrentUser, pending: likingSolutionId === activeSolutionSubmission.id }"
              :disabled="likingSolutionId === activeSolutionSubmission.id"
              @click="handleSolutionLike(activeSolutionSubmission)"
            >
              {{ activeSolutionSubmission.likedByCurrentUser ? '已点赞' : '点赞' }}
              <span>{{ activeSolutionSubmission.likeCount > 0 ? activeSolutionSubmission.likeCount : '' }}</span>
            </button>
          </div>
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
import { useProblemSolutions } from '@/composables/useProblemSolutions.js'
import { useToast } from '@/composables/useToast.js'
import { isAvatarImage, avatarFallback } from '@/lib/avatar.js'

const props = defineProps({ problemId: { type: String, required: true } })
const emit = defineEmits(['back', 'go-detail', 'open-auth', 'go-submit'])

const { currentUser } = useAuth()
const { userProblems } = useUserProblems()
const { favorites, fetchFavorites, toggleFavorite } = useFavorites()
const { metaMap, fetchProblemMeta } = useProblemMeta()
const { getProblemCommunity, getComments, addComment, deleteComment, toggleCommentLike, toggleEncounter } = useCommunity()
const { getProblemSolutions, toggleProblemSolutionLike, invalidateProblemSolutionCache } = useProblemSolutions()
const { t } = useLocale()
const { submitReport } = useReport()
const { ensureUserCanInteract } = useUserGuard()
const { success, error: toastError, info } = useToast()

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
    success('举报提交成功，我们会尽快处理')
  } catch (e) {
    console.error(e)
    toastError('举报提交失败，请稍后重试')
  } finally {
    reportSubmitting.value = false
  }
}

// ── 步骤展开 ──
const expandedSet = ref(new Set())
const initExpanded = () => { expandedSet.value = new Set() }
initExpanded()
watch(() => props.problemId, async () => {
  loadedProblemId.value = null
  await loadProblem()
  initExpanded()
  loadData()
})

watch(
  () => currentUser.value?.id || '',
  async (nextUserId, prevUserId) => {
    if (nextUserId === prevUserId) return
    if (!problem.value?.id) return
    await loadData()
  },
)
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
    info(added ? '已记录为“我也遇到过”' : '已取消“我也遇到过”')
  } catch (e) {
    console.error('encounter failed:', e?.message)
    toastError(e?.message || '操作失败，请稍后重试')
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
  try {
    const nextIsFav = !isFav.value
    await toggleFavorite(props.problemId, currentUser.value.id)
    success(nextIsFav ? '已加入收藏' : '已取消收藏')
  }
  catch (e) {
    console.error('favorite failed:', e?.message)
    toastError(e?.message || '收藏操作失败')
  }
  finally { favLoading.value = false }
}

// ── 社区数据 ──
const comments = ref([])
const loadingComments = ref(true)
const relatedProblems = ref([])
const solutionSubmissions = ref([])
const loadingSolutionSubmissions = ref(true)
const likingSolutionId = ref('')
const activeSolutionSubmission = ref(null)

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
  loadingSolutionSubmissions.value = true
  try {
    const [community, solutionRows] = await Promise.all([
      getProblemCommunity(props.problemId, currentUser.value?.id),
      getProblemSolutions(props.problemId, currentUser.value?.id, { force: true }),
    ])
    comments.value = community.comments
    encounterCount.value = community.encounter.count
    hasEncountered.value = community.encounter.hasEncountered
    solutionSubmissions.value = solutionRows
  } finally {
    loadingComments.value = false
    loadingSolutionSubmissions.value = false
  }
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
    success('评论发表成功')
  } catch (e) {
    toastError(e.message || '评论提交失败')
  }
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

const formatTime = (ts) => {
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 2592000000) return `${Math.floor(diff / 86400000)} 天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}

const solutionSubmissionCountText = computed(() => `${solutionSubmissions.value.length} 个补充方案`)

function openSolutionModal(solution) {
  activeSolutionSubmission.value = solution
}

function closeSolutionModal() {
  activeSolutionSubmission.value = null
}

async function handleSolutionLike(solution) {
  if (!currentUser.value) {
    emit('open-auth', 'login')
    return
  }

  likingSolutionId.value = solution.id
  const previousRows = solutionSubmissions.value.map((item) => ({ ...item, likes: [...(item.likes || [])] }))
  const target = solutionSubmissions.value.find((item) => item.id === solution.id)
  if (target) {
    const liked = !!target.likedByCurrentUser
    const nextLikes = liked
      ? (target.likes || []).filter((userId) => userId !== currentUser.value.id)
      : [...new Set([...(target.likes || []), currentUser.value.id])]
    target.likes = nextLikes
    target.likeCount = nextLikes.length
    target.likedByCurrentUser = !liked
  }

  try {
    await ensureUserCanInteract(currentUser.value.id, '点赞解决方案')
    const nextRow = await toggleProblemSolutionLike(solution, currentUser.value.id)
    solutionSubmissions.value = solutionSubmissions.value.map((item) => (
      item.id === solution.id
        ? {
            ...item,
            ...nextRow,
            likes: [...(nextRow.likes || [])],
          }
        : item
    ))
    if (activeSolutionSubmission.value?.id === solution.id) {
      activeSolutionSubmission.value = solutionSubmissions.value.find((item) => item.id === solution.id) || null
    }
    invalidateProblemSolutionCache(props.problemId)
    success(nextRow.likedByCurrentUser ? '点赞成功' : '已取消点赞')
  } catch (e) {
    solutionSubmissions.value = previousRows
    if (activeSolutionSubmission.value?.id === solution.id) {
      activeSolutionSubmission.value = previousRows.find((item) => item.id === solution.id) || null
    }
    toastError(e?.message || '点赞失败，请稍后重试')
  } finally {
    likingSolutionId.value = ''
  }
}

const diffClass = (d) => { if (d === '紧急') return 'urgent'; if (d === '需处理') return 'warn'; if (d === '进阶') return 'advanced'; return 'normal' }

function normalizeGuideText(text = '') {
  return text.replace(/\s+/g, '').toLowerCase()
}

const OPERATION_GUIDES = [
  {
    keywords: ['调平热床', '床网格', '自动调平', 'abl', 'g29'],
    steps: [
      '先清理喷嘴头部残料，并把热床加热到你平时打印的常用温度。',
      '回零后移动到四个角和中间位置，用一张 A4 纸放在喷嘴和热床之间。',
      '调节旋钮或执行自动调平，让纸张能被轻微拖动，但不会被完全压死。',
      '至少重复一轮五点检查，确认每个位置阻力接近一致，再打印首层测试复核。',
    ],
  },
  {
    keywords: ['清洁热床', '热床表面', 'ipa', '异丙醇'],
    steps: [
      '等待热床降到不烫手，或保持微温状态后再处理。',
      '用无尘布或纸巾蘸少量异丙醇，沿一个方向把整块热床擦一遍。',
      '如果有顽固残胶或指纹，重复擦拭 2 到 3 次，不要直接用手再去触摸表面。',
      '完全挥发后再开始打印，先观察第一层线条是否更均匀、更容易粘住。',
    ],
  },
  {
    keywords: ['回抽', 'retraction'],
    steps: [
      '先确认你的机器是直驱还是 Bowden，直驱回抽通常更短，Bowden 回抽通常更长。',
      '只调整一个参数做对比测试，先改回抽距离，再改回抽速度，避免一次改太多看不出原因。',
      '每次改完打印一个小型拉丝测试件，观察丝线是否减少以及是否出现堵头或断料。',
      '如果拉丝减轻但开始断料，说明回抽过激，需要把距离或速度往回收一点。',
    ],
  },
  {
    keywords: ['降低打印温度', '提高打印温度', '喷嘴温度', '热床温度'],
    steps: [
      '先记下当前温度，避免改完后忘记回退。',
      '每次只调整 5°C 左右，并打印同一个小测试件做对比。',
      '观察表面、拉丝、层间结合和出丝顺畅度，不要只看单一现象。',
      '找到明显改善的区间后，再做一次长一点的实际模型确认是否稳定。',
    ],
  },
  {
    keywords: ['烘干耗材', '耗材受潮', '干燥箱'],
    steps: [
      '先确认耗材材质，再按对应建议温度设置干燥箱或烘干设备。',
      '把线盘放入设备前去掉外包装标签和容易受热变形的附属件。',
      '按建议时长完整烘干，中途尽量不要频繁开盖散热。',
      '烘干后立刻打印测试件，或者直接放进密封箱保存，避免刚烘干又重新吸潮。',
    ],
  },
  {
    keywords: ['冷拔', '热拔', '清洁喷嘴', 'atomic pull'],
    steps: [
      '先把喷嘴加热到当前材料正常打印温度，确认残料能被推进。',
      '手动送入一小段新耗材，看到喷嘴开始稳定出丝后停止推进。',
      '按所用材料要求把温度降到适合拔丝的区间，再稳稳向上拔出耗材。',
      '观察拔出的头部是否带出焦料或杂质，必要时重复 2 到 3 次直到喷嘴更通畅。',
    ],
  },
  {
    keywords: ['e-step', 'estep', '挤出步进', '100mm挤出'],
    steps: [
      '在进料口上方量出 120mm，并在 100mm 和 120mm 位置做清晰标记。',
      '预热喷嘴，命令打印机挤出 100mm，避免冷态空挤导致结果失真。',
      '测量剩余长度，算出真实挤出量，再按比例修正 E-step 数值。',
      '保存参数后重复一次同样的 100mm 测试，确认误差已经明显变小。',
    ],
  },
  {
    keywords: ['brim', '裙边'],
    steps: [
      '在切片软件中找到 Brim 或裙边设置，而不是只加一圈普通 skirt。',
      '先把宽度设在 5 到 10mm 之间，底面积越小的模型越需要更宽一点。',
      '重新切片后确认 Brim 确实和模型底边连在一起，而不是悬空分离。',
      '打印结束后等热床稍冷再慢慢掰掉，避免把模型边角一起拉伤。',
    ],
  },
  {
    keywords: ['z轴偏移', 'z-offset', 'baby step', '微抬z偏移'],
    steps: [
      '先打印一个大面积首层测试，不要直接在正式模型上盲调。',
      '每次只改 0.02 到 0.05mm，边打印边观察线条是否从“压扁发亮”变成均匀铺开。',
      '如果线条开始互相分离或不粘床，说明已经抬得过高，需要回退一点。',
      '找到合适值后保存到机器或切片配置里，避免下次开机丢失。',
    ],
  },
  {
    keywords: ['附着力', '胶棒', '发胶', 'pei'],
    steps: [
      '先确认热床已经清洁，再决定是否额外加胶，不要把胶当成替代清洁的办法。',
      '在冷床或微温状态下薄薄涂一层胶棒，尽量均匀，不要厚成块。',
      '重新加热后打印一小块首层测试，观察是否更容易稳定贴住热床。',
      '打印结束后等热床冷却再取件，很多材料冷却后会自己变松，取件更安全。',
    ],
  },
  {
    keywords: ['线盘', '卡料', '放料阻力', '耗材是否用完', '送丝器'],
    steps: [
      '先看线盘上是否还有足够耗材，并检查有没有绕线交叉、打结或卡在盘边。',
      '手动慢慢拉动耗材，确认从线盘到进料口整段路径都顺畅不卡。',
      '再看挤出机齿轮有没有磨出粉末、打滑空转或把耗材咬得太扁。',
      '整理好供料路径后，再手动推进一点耗材，确认喷嘴端已经能恢复正常出丝。',
    ],
  },
  {
    keywords: ['散热风扇', '热爬升', 'heat creep'],
    steps: [
      '开机预热后先看热端散热风扇是否立刻稳定转动，而不是忽快忽慢。',
      '检查风道和散热片上有没有灰尘、断线或被残丝缠住。',
      '长时间打印前先做 10 到 20 分钟空打或短件测试，确认不会越打越难出丝。',
      '如果风扇异常、风量明显变小或有噪音，优先更换风扇再继续排查。',
    ],
  },
  {
    keywords: ['fep', '曝光测试', 'rerf', '树脂'],
    steps: [
      '先把料槽和平台清理干净，确认树脂没有沉淀结块，再开始测试。',
      '一次只改一个变量，例如只改曝光，不同时改抬升速度和支撑。',
      '打印同一份测试片，重点比较细节、边缘锐利度和成型成功率。',
      '记录最终可用参数，按树脂品牌、颜色和环境温度分别保存，方便以后直接复用。',
    ],
  },
]

function splitDetailToActionSteps(detail = '') {
  return detail
    .replace(/\r/g, '\n')
    .split(/[\n。；;]+/)
    .map(item => item.trim().replace(/^[\-•\d.、\s]+/, ''))
    .filter(item => item.length >= 4)
    .slice(0, 5)
}

function solutionActionSteps(solution) {
  const titleText = normalizeGuideText(solution?.title || '')
  const detailText = normalizeGuideText(solution?.detail || '')
  const matchedGuide = OPERATION_GUIDES.find((guide) =>
    guide.keywords.some((keyword) => titleText.includes(keyword) || detailText.includes(keyword))
  )

  if (matchedGuide) return matchedGuide.steps
  return splitDetailToActionSteps(solution?.detail || '')
}

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
  overflow: hidden;
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
.sol-checklist {
  margin-top: 14px;
  padding: 14px 14px 14px 16px;
  border-radius: 16px;
  background: rgba(37, 104, 232, 0.05);
  border: 1px solid rgba(37, 104, 232, 0.1);
}
.sol-checklist-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--lab-accent);
  margin-bottom: 10px;
}
.sol-checklist-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  color: var(--lab-text-soft);
  font-size: 13px;
  line-height: 1.65;
}
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
  overflow: hidden;
}
.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.solution-cta-section {
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
}
.solution-cta-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 22px 24px;
  border-radius: 22px;
  border: 1px solid rgba(57, 86, 120, 0.08);
  background: linear-gradient(135deg, rgba(246, 250, 255, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%);
  box-shadow: 0 12px 30px rgba(15, 31, 56, 0.05);
}
.solution-cta-title {
  margin-bottom: 8px;
}
.solution-cta-desc {
  font-size: 14px;
  color: var(--lab-text-soft);
  line-height: 1.75;
}
.solution-cta-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  padding: 12px 20px;
  background: linear-gradient(135deg, var(--lab-accent), var(--lab-accent-2));
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 12px 26px rgba(37, 104, 232, 0.18);
  transition: transform 0.18s, box-shadow 0.18s, filter 0.18s;
}
.solution-cta-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(37, 104, 232, 0.24);
}
.solution-submission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
}
.solution-submission-card {
  border: 1px solid rgba(57, 86, 120, 0.08);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,250,255,0.95));
  padding: 14px;
  box-shadow: 0 10px 26px rgba(15, 31, 56, 0.05);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  cursor: pointer;
  transition: box-shadow 0.18s, transform 0.18s, border-color 0.18s;
}
.solution-submission-card:hover {
  transform: translateY(-2px);
  border-color: rgba(37, 104, 232, 0.16);
  box-shadow: 0 14px 30px rgba(15, 31, 56, 0.08);
}
.submission-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.submission-head-main {
  min-width: 0;
}
.submission-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--lab-text);
  margin: 0 0 4px;
  line-height: 1.45;
}
.submission-meta {
  margin: 0;
  font-size: 11px;
  color: var(--lab-text-dim);
}
.submission-like-count {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 214, 0, 0.12);
  border: 1px solid rgba(200, 160, 0, 0.18);
  color: #8c6900;
  font-size: 11px;
  font-weight: 700;
}
.submission-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.68;
  color: var(--lab-text-soft);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.submission-steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.submission-steps.compact {
  max-height: 148px;
  overflow: auto;
  padding-right: 2px;
}
.submission-step {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(247, 251, 253, 0.9);
  border: 1px solid rgba(57, 86, 120, 0.06);
}
.submission-step-index {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--lab-accent), var(--lab-accent-2));
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}
.submission-step-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--lab-text);
  margin-bottom: 3px;
}
.submission-step-detail {
  margin: 0;
  font-size: 11px;
  line-height: 1.55;
  color: var(--lab-text-soft);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.submission-footer {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid rgba(57, 86, 120, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.submission-footer-hint {
  font-size: 11px;
  color: var(--lab-text-soft);
  text-align: right;
}
.submission-like-btn {
  flex-shrink: 0;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
}
.submission-like-btn.pending {
  opacity: 0.7;
  cursor: wait;
}
.solution-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(7, 16, 28, 0.48);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.solution-modal {
  width: min(880px, 100%);
  max-height: min(86vh, 920px);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(57, 86, 120, 0.12);
  border-radius: 28px;
  box-shadow: 0 28px 68px rgba(15, 31, 56, 0.2);
  display: flex;
  flex-direction: column;
}
.solution-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 26px 18px;
  background: rgba(255, 255, 255, 0.98);
  border-bottom: 1px solid rgba(57, 86, 120, 0.08);
  flex-shrink: 0;
}
.solution-modal-head-copy {
  min-width: 0;
}
.solution-modal-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--lab-accent);
  margin-bottom: 8px;
}
.solution-modal-body {
  overflow-y: auto;
  padding: 18px 26px 24px;
}
.solution-modal-title {
  margin: 0 0 8px;
  font-size: 22px;
  line-height: 1.35;
  color: var(--lab-text);
}
.solution-modal-meta {
  margin: 0;
  font-size: 13px;
  color: var(--lab-text-dim);
}
.solution-modal-desc {
  margin: 0 0 18px;
  font-size: 14px;
  line-height: 1.82;
  color: var(--lab-text-soft);
}
.solution-modal-steps {
  display: grid;
  gap: 12px;
}
.solution-modal-step {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 14px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(247, 251, 253, 0.92);
  border: 1px solid rgba(57, 86, 120, 0.08);
}
.solution-modal-step-index {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--lab-accent), var(--lab-accent-2));
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}
.solution-modal-step-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--lab-text);
  margin-bottom: 6px;
}
.solution-modal-step-detail {
  margin: 0;
  font-size: 14px;
  line-height: 1.76;
  color: var(--lab-text-soft);
}
.solution-modal-step-image {
  width: 100%;
  margin-top: 12px;
  border-radius: 16px;
  border: 1px solid rgba(57, 86, 120, 0.08);
  background: #fff;
  padding: 10px;
  display: block;
}
.solution-modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
  padding-top: 4px;
}
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
  .solution-cta-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .solution-cta-btn {
    width: 100%;
  }
  .submission-card-head,
  .submission-footer {
    flex-direction: column;
    align-items: flex-start;
  }
  .submission-footer-hint {
    text-align: left;
  }
  .solution-modal {
    border-radius: 22px;
  }
  .solution-modal-head {
    padding: 20px 20px 16px;
  }
  .solution-modal-body {
    padding: 16px 20px 20px;
  }
  .solution-modal-step {
    grid-template-columns: 30px minmax(0, 1fr);
    gap: 12px;
    padding: 12px 14px;
  }
  .solution-modal-step-index {
    width: 30px;
    height: 30px;
  }
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
  .solution-modal-mask {
    padding: 14px;
  }
  .solution-modal-title {
    font-size: 18px;
  }
  }
</style>
