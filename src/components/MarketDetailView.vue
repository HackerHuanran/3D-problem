<script setup>
import { ref, computed, onMounted } from 'vue'
import { getImageURLs } from '@/composables/useStorage.js'
import { useLocale } from '@/composables/useLocale.js'
import { useReport } from '@/composables/useReport.js'
import { useToast } from '@/composables/useToast.js'

const { t } = useLocale()

const props = defineProps({ post: Object, currentUser: Object })
const emit  = defineEmits(['back', 'open-auth'])

const { submitReport } = useReport()
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

onMounted(async () => {
  const imageResults = await (
    props.post.images?.length
      ? getImageURLs(props.post.images)
      : Promise.resolve([])
  )
  postImages.value = imageResults
})

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
}
</style>
