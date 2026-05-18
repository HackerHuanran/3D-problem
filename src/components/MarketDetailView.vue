<script setup>
import { ref, computed, onMounted } from 'vue'
import { marked } from 'marked'
import { useMarketDetail } from '@/composables/useMarketDetail.js'
import { getImageURLs } from '@/composables/useStorage.js'
import { useLocale } from '@/composables/useLocale.js'
import { useReport } from '@/composables/useReport.js'
import { useUserGuard } from '@/composables/useUserGuard.js'
import { useToast } from '@/composables/useToast.js'

marked.setOptions({ breaks: true, gfm: true })
const renderMd = (text) => marked.parse(text || '')

const commentTab = ref('write')  // 'write' | 'preview'

const { t } = useLocale()

const props = defineProps({ post: Object, currentUser: Object })
const emit  = defineEmits(['back', 'open-auth'])

const { comments, likedCommentIds, fetchComments, addComment, acceptAnswer, toggleLike } = useMarketDetail()
const { submitReport } = useReport()
const { ensureUserCanInteract } = useUserGuard()
const { success, error: toastError } = useToast()

const REPORT_REASONS = computed(() => [
  t('report.porn'),
  t('report.gambling'),
  t('report.drugs'),
  t('report.fraud'),
  t('report.ad'),
  t('report.other'),
])
const showReportModal  = ref(false)
const reportReason     = ref('')
const reportSubmitting = ref(false)
const reportDone       = ref(false)

async function handleReport() {
  if (!reportReason.value || reportSubmitting.value || reportDone.value) return
  reportSubmitting.value = true
  try {
    await submitReport(props.currentUser.id, {
      type: 'market', targetId: props.post.id, targetTitle: props.post.title, reason: reportReason.value,
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

const isOwner = computed(() => props.currentUser?.id === props.post?.userId)

const postImages = ref([]) // { id, url }[]

// accept answer
const acceptLoading = ref(false)
async function handleAccept(commentId) {
  if (acceptLoading.value) return
  acceptLoading.value = true
  try {
    await acceptAnswer(commentId, props.post.id)
    await fetchComments(props.post.id)
    props.post.status = '已解决'
  } catch (e) {
    console.error('acceptAnswer:', e)
  } finally {
    acceptLoading.value = false
  }
}

// comment
const commentText    = ref('')
const commentError   = ref('')
const commentLoading = ref(false)

onMounted(async () => {
  const [imageResults] = await Promise.all([
    props.post.images?.length
      ? getImageURLs(props.post.images)
      : Promise.resolve([]),
    fetchComments(props.post.id, props.currentUser?.id),
  ])
  postImages.value = imageResults
})

async function handleLike(commentId) {
  if (!props.currentUser) { emit('open-auth', 'login'); return }
  await toggleLike(commentId, props.post.id, props.currentUser.id)
}

async function submitComment() {
  if (!props.currentUser) { emit('open-auth', 'login'); return }
  if (!commentText.value.trim()) return
  commentError.value   = ''
  commentLoading.value = true
  try {
    await ensureUserCanInteract(props.currentUser.id, '发布回答')
    await addComment(props.post.id, props.currentUser.id, commentText.value, {
      postOwnerId:  props.post.userId,
      postTitle:    props.post.title,
      fromUsername: props.currentUser.username,
    })
    commentText.value = ''
    await fetchComments(props.post.id, props.currentUser?.id)
    success('回答提交成功')
  } catch (e) {
    commentError.value = e.message
    toastError(commentError.value || '回答提交失败')
  } finally {
    commentLoading.value = false
  }
}

const CAT_STYLE = {
  '代打服务': { background: 'rgba(249,115,22,.18)', color: '#fb923c' },
  '求购耗材': { background: 'rgba(99,102,241,.18)', color: '#818cf8' },
  '出售设备': { background: 'rgba(168,85,247,.18)', color: '#c084fc' },
  '技术求助': { background: 'rgba(6,182,212,.18)',  color: '#22d3ee' },
  '其他':     { background: 'rgba(107,114,128,.18)', color: '#9ca3af' },
}

function catLabel(c) {
  const map = {
    '技术求助': t('mc.help'),
    '其他':     t('mc.other'),
  }
  return map[c] ?? c
}

const lightboxUrl = ref('')
function openImg(url) { lightboxUrl.value = url }
function closeLightbox() { lightboxUrl.value = '' }

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return t('time.justNow')
  if (s < 3600) return t('time.minAgo', { n: Math.floor(s / 60) })
  if (s < 86400) return t('time.hourAgo', { n: Math.floor(s / 3600) })
  return t('time.dayAgo', { n: Math.floor(s / 86400) })
}
</script>

<template>
  <div class="detail-page">
    <div class="detail-inner">

      <button class="back-btn" @click="emit('back')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ t('md.back') }}
      </button>

      <!-- 帖子主体 -->
      <div class="post-card">
        <div class="post-top">
          <div class="badges">
            <span class="badge" :style="CAT_STYLE[post.category]">{{ catLabel(post.category) }}</span>
            <span :class="['status-tag', (post.status === '待解决' || post.status === '进行中') ? 'status-active' : 'status-done']">{{ (post.status === '待解决' || post.status === '进行中') ? t('m.active') : t('m.done') }}</span>
          </div>
        </div>

        <h1 class="post-title">{{ post.title }}</h1>
        <p class="post-desc">{{ post.description }}</p>

        <div v-if="postImages.length" class="post-images">
          <img
            v-for="img in postImages"
            :key="img.id"
            :src="img.url"
            loading="lazy"
            class="post-img"
            @click="openImg(img.url)"
          />
        </div>

        <div class="post-footer">
          <div class="poster">
            <div class="avatar">{{ post.avatar }}</div>
            <span class="uname">{{ post.username }}</span>
          </div>
          <span class="time">{{ timeAgo(post.createdAt) }}</span>
          <button v-if="currentUser && !isOwner" class="report-link" @click="showReportModal = true">{{ t('md.report') }}</button>
        </div>
      </div>

      <!-- 回答 -->
      <div class="section">
        <h2 class="sec-title">{{ t('md.comments') }} <span class="sec-count">{{ comments.length }}</span></h2>

        <div v-if="props.currentUser" class="comment-box">
          <div class="editor-tabs">
            <button :class="['editor-tab', { active: commentTab === 'write' }]" @click="commentTab = 'write'">{{ t('md.write') }}</button>
            <button :class="['editor-tab', { active: commentTab === 'preview' }]" @click="commentTab = 'preview'">{{ t('md.preview') }}</button>
            <span class="md-hint">{{ t('md.markdown') }}</span>
          </div>
          <textarea
            v-if="commentTab === 'write'"
            v-model="commentText"
            class="comment-input"
            :placeholder="t('md.cmtPh')"
            rows="5"
            maxlength="2000"
            @keydown.ctrl.enter="submitComment"
          ></textarea>
          <div v-else class="md-preview" v-html="renderMd(commentText) || `<p class='preview-empty'>${t('md.previewEmpty')}</p>`"></div>
          <div class="comment-footer">
            <span class="char-hint">{{ commentText.length }}/2000 · Ctrl+Enter</span>
            <button
              class="submit-btn small"
              :disabled="commentLoading || !commentText.trim()"
              @click="submitComment"
            >{{ commentLoading ? t('md.sending') : t('md.send') }}</button>
          </div>
          <div v-if="commentError" class="form-error" style="margin-top:8px">{{ commentError }}</div>
        </div>
        <div v-else class="login-prompt" @click="emit('open-auth', 'login')">
          <span>✏️</span>
          <span>{{ t('pd.loginComment') }}</span>
          <span class="prompt-arrow">→</span>
        </div>

        <p v-if="comments.length === 0" class="empty-hint">{{ t('md.noComments') }}</p>
        <div v-else class="comment-list">
          <div v-for="c in comments" :key="c.id" :class="['comment-item', { accepted: c.isAccepted }]">
            <div v-if="c.isAccepted" class="accepted-tag">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 7l3 3 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ t('md.accepted') }}
            </div>
            <div class="c-header">
              <div class="avatar sm">{{ c.avatar }}</div>
              <span class="uname">{{ c.username }}</span>
              <span class="time">{{ timeAgo(c.createdAt) }}</span>
              <button
                v-if="isOwner && !c.isAccepted && (post.status === '待解决' || post.status === '进行中')"
                class="accept-btn"
                :disabled="acceptLoading"
                @click="handleAccept(c.id)"
              >{{ t('md.acceptAnswer') }}</button>
            </div>
            <div class="c-content md-body" v-html="renderMd(c.content)"></div>
            <div class="c-actions">
              <button :class="['like-btn', { liked: likedCommentIds.has(c.id) }]" @click="handleLike(c.id)">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M8 13.5C5 12 1 9 1 5.5a3.5 3.5 0 0 1 7 0 3.5 3.5 0 0 1 7 0c0 3.5-4.5 6.5-7 8z"
                    :fill="likedCommentIds.has(c.id) ? '#ff6b6b' : 'none'"
                    :stroke="likedCommentIds.has(c.id) ? '#ff6b6b' : 'currentColor'"
                    stroke-width="1.4" stroke-linejoin="round"/>
                </svg>
                <span>{{ c.likeCount || 0 }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- 图片灯箱 -->
  <Transition name="lb">
    <div v-if="lightboxUrl" class="lightbox" @click="closeLightbox">
      <button class="lb-close" @click.stop="closeLightbox">✕</button>
      <img :src="lightboxUrl" class="lb-img" @click.stop />
    </div>
  </Transition>

  <!-- 举报弹窗 -->
  <Transition name="lb">
    <div v-if="showReportModal" class="lightbox report-mask">
      <div class="report-box">
        <div class="report-head">
          <h3>{{ t('md.reportTitle') }}</h3>
          <button class="close-btn" @click="showReportModal = false">✕</button>
        </div>
        <p class="report-hint">{{ t('md.reportHint') }}</p>
        <div class="reason-list">
          <label v-for="r in REPORT_REASONS" :key="r" class="reason-item">
            <input type="radio" :value="r" v-model="reportReason" />
            <span>{{ r }}</span>
          </label>
        </div>
        <div v-if="reportDone" class="report-success">{{ t('md.reportSuccess') }}</div>
        <div class="report-actions">
          <button class="cancel-btn" @click="showReportModal = false">{{ t('common.cancel') }}</button>
          <button class="submit-btn" :disabled="!reportReason || reportSubmitting || reportDone" @click="handleReport">
            {{ reportSubmitting ? t('md.submitting') : reportDone ? t('md.reportSubmitted') : t('md.reportSubmit') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.detail-page  { min-height: 100vh; background: #f5f5f7; }
.detail-inner { max-width: 720px; margin: 0 auto; padding: 32px 24px 80px; }

.back-btn { display: inline-flex; align-items: center; gap: 6px; background: transparent; border: none; color: #6e6e73; font-size: 14px; font-family: inherit; cursor: pointer; padding: 0; margin-bottom: 28px; transition: color 0.15s; }
.back-btn:hover { color: #1d1d1f; }

/* Post card */
.post-card { background: #fff; border: 1px solid rgba(0,0,0,0.08); border-radius: 20px; padding: 28px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.post-top  { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.badges    { display: flex; align-items: center; gap: 8px; flex: 1; }
.badge     { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 100px; }
.status-tag    { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 100px; }
.status-active { background: rgba(34,197,94,.12); color: #16a34a; }
.status-done   { background: rgba(107,114,128,.12); color: #6b7280; }

.owner-actions { display: flex; gap: 8px; flex-shrink: 0; }
.act-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); background: transparent; color: #6e6e73; font-size: 12px; font-family: inherit; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.act-btn:hover:not(:disabled) { border-color: rgba(0,0,0,0.2); color: #1d1d1f; }
.act-btn.danger { border-color: rgba(255,59,48,0.2); color: #ff3b30; }
.act-btn.danger:hover { background: rgba(255,59,48,0.06); }
.act-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.post-title { font-size: 22px; font-weight: 700; color: #1d1d1f; line-height: 1.35; letter-spacing: -0.02em; margin-bottom: 12px; }
.post-desc  { font-size: 15px; color: #6e6e73; line-height: 1.7; margin-bottom: 16px; white-space: pre-wrap; }

.post-images { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.post-img    { width: 120px; height: 120px; object-fit: cover; border-radius: 10px; cursor: zoom-in; transition: opacity 0.15s, transform 0.15s; border: 1px solid rgba(0,0,0,0.08); }
.post-img:hover { opacity: 0.88; transform: scale(1.03); }

/* Lightbox */
.lightbox { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.88); display: flex; align-items: center; justify-content: center; cursor: zoom-out; }
.lb-img   { max-width: 90vw; max-height: 88vh; object-fit: contain; border-radius: 8px; cursor: default; box-shadow: 0 8px 40px rgba(0,0,0,0.6); }
.lb-close { position: fixed; top: 20px; right: 24px; background: rgba(255,255,255,0.15); border: none; color: #fff; font-size: 18px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
.lb-close:hover { background: rgba(255,255,255,0.25); }
.lb-enter-active, .lb-leave-active { transition: opacity 0.2s; }
.lb-enter-from, .lb-leave-to { opacity: 0; }

.meta-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.meta-tag  { font-size: 13px; color: #6e6e73; background: rgba(0,0,0,0.04); padding: 6px 12px; border-radius: 8px; }

.post-footer { display: flex; align-items: center; gap: 10px; }
.poster { display: flex; align-items: center; gap: 8px; flex: 1; }
.avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg,#ff6b6b,#ffb347); color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar.sm { width: 24px; height: 24px; font-size: 10px; }
.uname { font-size: 13px; color: #6e6e73; }
.time  { font-size: 12px; color: #aeaeb2; white-space: nowrap; }

/* Section */
.section   { background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 20px; padding: 24px 28px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.sec-title { font-size: 16px; font-weight: 600; color: #1d1d1f; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.sec-count { font-size: 13px; color: #6e6e73; font-weight: 400; }
.empty-hint { font-size: 13px; color: #aeaeb2; }

/* Interest */
.already-tag  { font-size: 14px; color: #16a34a; background: rgba(34,197,94,0.08); padding: 12px 16px; border-radius: 10px; }
.interest-btn { padding: 11px 28px; background: #1d1d1f; color: #fff; border: none; border-radius: 100px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 0.15s; }
.interest-btn:hover { background: #3a3a3c; }
.interest-form { display: flex; flex-direction: column; gap: 12px; }
.form-hint  { font-size: 13px; color: #6e6e73; }
.form-input { background: #f5f5f7; border: 1px solid rgba(0,0,0,0.1); border-radius: 10px; padding: 11px 14px; color: #1d1d1f; font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.2s; }
.form-input:focus { border-color: rgba(0,0,0,0.25); }
.form-input::placeholder { color: #c7c7cc; }
.form-error { font-size: 13px; color: #ff3b30; }
.form-row   { display: flex; gap: 8px; justify-content: flex-end; }
.cancel-btn { padding: 9px 18px; background: transparent; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; color: #6e6e73; font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.15s; }
.cancel-btn:hover { border-color: rgba(0,0,0,0.2); color: #1d1d1f; }
.submit-btn { padding: 9px 20px; background: #1d1d1f; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 0.15s; }
.submit-btn:hover:not(:disabled) { background: #3a3a3c; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.submit-btn.small { padding: 7px 16px; font-size: 12px; }

/* Interest list */
.interest-list { display: flex; flex-direction: column; gap: 10px; }
.interest-row  { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(0,0,0,0.02); border-radius: 10px; flex-wrap: wrap; }
.i-user    { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.i-contact { font-size: 13px; color: #1d1d1f; background: rgba(0,0,0,0.05); padding: 4px 10px; border-radius: 6px; white-space: nowrap; }

.login-prompt { display: flex; align-items: center; gap: 10px; background: #f5f5f7; border: 1px dashed rgba(0,0,0,0.12); border-radius: 12px; padding: 14px 18px; font-size: 14px; color: #6e6e73; cursor: pointer; transition: all 0.2s; margin-bottom: 20px; }
.login-prompt:hover { border-color: rgba(0,0,0,0.22); color: #1d1d1f; }
.prompt-arrow { margin-left: auto; color: #007aff; font-size: 15px; }

/* Comments */
.comment-box    { margin-bottom: 20px; }
.editor-tabs    { display: flex; align-items: center; gap: 2px; margin-bottom: 8px; }
.editor-tab     { padding: 5px 14px; border-radius: 8px; border: none; background: transparent; font-size: 13px; color: #6e6e73; cursor: pointer; font-family: inherit; transition: all 0.15s; }
.editor-tab.active { background: #1d1d1f; color: #fff; font-weight: 500; }
.editor-tab:hover:not(.active) { background: rgba(0,0,0,0.06); color: #1d1d1f; }
.md-hint        { font-size: 11px; color: #aeaeb2; margin-left: auto; }
.comment-input  { width: 100%; background: #f5f5f7; border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 12px 14px; color: #1d1d1f; font-size: 14px; font-family: 'SF Mono','Menlo',monospace; outline: none; resize: vertical; transition: border-color 0.2s; display: block; }
.comment-input:focus { border-color: rgba(0,0,0,0.22); }
.comment-input::placeholder { color: #c7c7cc; font-family: inherit; }
.md-preview     { min-height: 110px; background: #f5f5f7; border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 12px 14px; font-size: 14px; color: #1d1d1f; line-height: 1.7; }
.comment-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.char-hint      { font-size: 11px; color: #aeaeb2; }

/* Markdown 渲染样式 */
.md-body :deep(p)          { margin: 0 0 8px; line-height: 1.7; }
.md-body :deep(p:last-child) { margin-bottom: 0; }
.md-body :deep(code)       { background: rgba(0,0,0,0.06); border-radius: 4px; padding: 1px 5px; font-size: 12px; font-family: 'SF Mono','Menlo',monospace; }
.md-body :deep(pre)        { background: #1d1d1f; border-radius: 10px; padding: 14px 16px; overflow-x: auto; margin: 8px 0; }
.md-body :deep(pre code)   { background: none; color: #e2e8f0; font-size: 13px; padding: 0; }
.md-body :deep(ul),.md-body :deep(ol) { padding-left: 20px; margin: 6px 0; }
.md-body :deep(li)         { margin: 3px 0; }
.md-body :deep(strong)     { font-weight: 600; color: #1d1d1f; }
.md-body :deep(em)         { font-style: italic; }
.md-body :deep(blockquote) { border-left: 3px solid rgba(0,0,0,0.15); margin: 8px 0; padding: 4px 12px; color: #6e6e73; }
.md-body :deep(a)          { color: #007aff; text-decoration: none; }
.md-body :deep(a:hover)    { text-decoration: underline; }
.md-body :deep(hr)         { border: none; border-top: 1px solid rgba(0,0,0,0.08); margin: 10px 0; }
.md-preview :deep(.preview-empty) { color: #aeaeb2; font-style: italic; }

.comment-list { display: flex; flex-direction: column; gap: 12px; }
.comment-item { border-radius: 14px; padding: 16px; background: rgba(0,0,0,0.02); border: 1.5px solid transparent; }
.comment-item.accepted { background: rgba(52,199,89,0.05); border-color: rgba(52,199,89,0.3); }
.accepted-tag { display: inline-flex; align-items: center; gap: 5px; background: rgba(52,199,89,0.12); color: #16a34a; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 100px; margin-bottom: 10px; }
.c-header  { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.c-content { font-size: 14px; color: #6e6e73; line-height: 1.65; white-space: pre-wrap; }
.c-actions { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
.like-btn { display: inline-flex; align-items: center; gap: 5px; background: transparent; border: 1px solid rgba(0,0,0,0.1); border-radius: 100px; padding: 4px 12px; font-size: 12px; color: #6e6e73; cursor: pointer; font-family: inherit; transition: all 0.18s; }
.like-btn:hover { border-color: #ff6b6b; color: #ff6b6b; }
.like-btn.liked { border-color: rgba(255,107,107,0.3); color: #ff6b6b; background: rgba(255,107,107,0.06); }
.accept-btn { margin-left: auto; padding: 4px 12px; background: transparent; border: 1px solid rgba(52,199,89,0.4); border-radius: 100px; color: #16a34a; font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.accept-btn:hover:not(:disabled) { background: rgba(52,199,89,0.08); }
.accept-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.report-link { background: transparent; border: none; color: #aeaeb2; font-size: 12px; font-family: inherit; cursor: pointer; padding: 0; margin-left: 8px; transition: color 0.15s; }
.report-link:hover { color: #ff3b30; }

.report-mask { align-items: center; justify-content: center; cursor: default; }
.report-box  { background: #fff; border-radius: 20px; width: 100%; max-width: 400px; padding: 24px; box-shadow: 0 16px 48px rgba(0,0,0,0.18); cursor: default; }
.report-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.report-head h3 { font-size: 16px; font-weight: 700; color: #1d1d1f; }
.report-hint { font-size: 13px; color: #6e6e73; margin-bottom: 12px; }
.reason-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.reason-item { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #1d1d1f; cursor: pointer; }
.reason-item input[type=radio] { accent-color: #1d1d1f; width: 16px; height: 16px; cursor: pointer; }
.report-success { font-size: 13px; color: #16a34a; background: rgba(34,197,94,0.08); padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; }
.report-actions { display: flex; gap: 8px; justify-content: flex-end; }

@media (max-width: 600px) {
  .detail-inner { padding: 20px 16px 60px; }
  .post-card { padding: 20px 18px; }
  .post-title { font-size: 18px; }
  .section { padding: 18px 16px; }
  .post-images { gap: 6px; }
  .post-img { width: 90px; height: 90px; }
  .c-header { flex-wrap: wrap; gap: 6px; }
  .accept-btn { margin-left: 0; }
}
</style>
