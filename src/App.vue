<script setup>
import { ref, watch, onMounted, defineAsyncComponent, computed } from 'vue'
import { useAuth } from './composables/useAuth.js'
import { useNotifications } from './composables/useNotifications.js'
import { useLocale } from './composables/useLocale.js'
import { useToast } from './composables/useToast.js'
import { isAvatarImage, avatarFallback } from './lib/avatar.js'
import { siteRecordInfo } from './lib/site.js'

const ProblemsView      = defineAsyncComponent(() => import('./components/ProblemsView.vue'))
const ProblemDetailView = defineAsyncComponent(() => import('./components/ProblemDetailView.vue'))
const MarketView        = defineAsyncComponent(() => import('./components/MarketView.vue'))
const FilamentView      = defineAsyncComponent(() => import('./components/FilamentView.vue'))
const AdminView         = defineAsyncComponent(() => import('./components/AdminView.vue'))
const SubmitProblemView = defineAsyncComponent(() => import('./components/SubmitProblemView.vue'))
const ProfileView       = defineAsyncComponent(() => import('./components/ProfileView.vue'))

let _problemsCache = null
const getProblems = async () => {
  if (!_problemsCache) {
    const mod = await import('./data/problems.js')
    _problemsCache = mod.problems
  }
  return _problemsCache
}

const { currentUser, checkUsername, requestPhoneCode, confirmCode, login, logout, init } = useAuth()
const { notifications, unreadCount, fetchNotifications, markAllRead } = useNotifications()
const { lang, t } = useLocale()
const { toasts, removeToast, success, error, info } = useToast()
const currentAvatarIsImage = computed(() => isAvatarImage(currentUser.value?.avatar))
const currentAvatarFallback = computed(() => avatarFallback(currentUser.value?.avatar, currentUser.value?.username))
const icpRecordCode = computed(() => String(siteRecordInfo.icp?.code || '').trim())
const icpRecordUrl = computed(() => String(siteRecordInfo.icp?.url || 'https://beian.miit.gov.cn/').trim())
const publicSecurityCode = computed(() => String(siteRecordInfo.publicSecurity?.code || '').trim())
const publicSecurityUrl = computed(() => String(siteRecordInfo.publicSecurity?.url || 'https://beian.mps.gov.cn/#/query/webSearch').trim())

const appReady = ref(false)
onMounted(async () => {
  // 从 URL 恢复状态（直接访问 /p/warping 这类链接）
  const path = location.pathname
  if (path.startsWith('/p/')) {
    const id = path.slice(3)
    const probs = await getProblems()
    const p = probs.find(x => x.id === id)
    if (p) {
      currentDetailId.value = id
      currentPage.value = 'detail'
      setMeta(`${p.title} - ${t('seo.baseTitle')}`, p.description || BASE_DESC.value, path)
    }
  } else if (path === '/filament') {
    activeTab.value = 'filament'
    setMeta(t('seo.filament'), BASE_DESC.value, path)
  } else if (path === '/market') {
    activeTab.value = 'market'
    setMeta(t('seo.market'), BASE_DESC.value, path)
  }
  await init()
  appReady.value = true
})

watch(currentUser, (user) => {
  if (user) fetchNotifications(user.id)
  else { notifications.value = []; unreadCount.value = 0 }
})

// ── 页面导航 ──
const currentPage     = ref('list')
const currentDetailId = ref(null)
const activeTab       = ref('home')
const detailReturnContext = ref({ from: 'home', profileTab: 'fav' })
const submitContext = ref(null)

// ── SEO 辅助 ──
const BASE_TITLE = computed(() => t('seo.baseTitle'))
const BASE_DESC  = computed(() => t('seo.baseDesc'))

function setMeta(title, description, path) {
  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  if (path) history.replaceState(null, '', path)
}

const goToDetail = async (id, options = {}) => {
  detailReturnContext.value = {
    from: options.from || 'home',
    profileTab: options.profileTab || 'fav',
  }
  currentDetailId.value = id
  currentPage.value = 'detail'
  window.scrollTo(0, 0)
  const probs = await getProblems()
  const p = probs.find(x => x.id === id)
  if (p) setMeta(`${p.title} - ${t('seo.baseTitle')}`, p.description || BASE_DESC.value, `/p/${id}`)
}
const goBackToList = () => {
  currentPage.value = 'list'
  activeTab.value = 'home'
  currentDetailId.value = null
  showProfile.value = false
  detailReturnContext.value = { from: 'home', profileTab: 'fav' }
  window.scrollTo(0, 0)
  setMeta(BASE_TITLE.value, BASE_DESC.value, '/')
}
const handleDetailBack = () => {
  if (detailReturnContext.value.from === 'profile') {
    currentPage.value = 'list'
    currentDetailId.value = null
    showProfile.value = true
    window.scrollTo(0, 0)
    return
  }
  goBackToList()
}
const switchTab = (tab) => {
  activeTab.value = tab
  currentPage.value = 'list'
  window.scrollTo(0, 0)
  const tabTitles = {
    filament: t('seo.filament'),
    market: t('seo.market'),
  }
  setMeta(tabTitles[tab] || BASE_TITLE.value, BASE_DESC.value, tab === 'home' ? '/' : `/${tab}`)
}
const goToSubmit = (context = null) => {
  submitContext.value = context
  currentPage.value = 'submit'
  window.scrollTo(0, 0)
}

const handleSubmitBack = () => {
  if (submitContext.value?.mode === 'solution' && submitContext.value?.targetProblemId) {
    currentPage.value = 'detail'
    currentDetailId.value = submitContext.value.targetProblemId
    window.scrollTo(0, 0)
    return
  }
  goBackToList()
}

const onSubmitted = () => {
  if (submitContext.value?.mode === 'solution' && submitContext.value?.targetProblemId) {
    const targetProblemId = submitContext.value.targetProblemId
    submitContext.value = null
    currentDetailId.value = targetProblemId
    currentPage.value = 'detail'
    window.scrollTo(0, 0)
    return
  }
  submitContext.value = null
  currentPage.value = 'list'
  activeTab.value = 'home'
  window.scrollTo(0, 0)
}

// ── 个人主页 ──
const showProfile = ref(false)
const openProfile = () => { showUserMenu.value = false; showProfile.value = true; window.scrollTo(0, 0) }
const profileInitialTab = ref('fav')

// ── 通知面板 ──
const showNotifPanel = ref(false)
const openNotifPanel = async () => {
  showNotifPanel.value = !showNotifPanel.value
  if (showNotifPanel.value && currentUser.value) await fetchNotifications(currentUser.value.id)
}

function notifTimeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return t('time.justNow')
  if (s < 3600) return t('time.minAgo', { n: Math.floor(s / 60) })
  if (s < 86400) return t('time.hourAgo', { n: Math.floor(s / 3600) })
  return t('time.dayAgo', { n: Math.floor(s / 86400) })
}

// ── 用户菜单 ──
const showUserMenu = ref(false)

// ── 登录/注册弹窗 ──
const showAuthModal = ref(false)
const authMode      = ref('login')  // 'login' | 'register'
const authForm      = ref({ username: '', phone: '', password: '', code: '' })
const authError     = ref('')
const authLoading   = ref(false)
const codeSent      = ref(false)
const countdown     = ref(0)
let   countdownTimer = null
let   verifyOtpFn    = null

// ── 密码可见性 ──
const showRegPwd   = ref(false)
const showLoginPwd = ref(false)

// ── 表单实时校验 ──
const authTouched = ref({ username: false, phone: false, password: false })

function validatePhone(v) {
  if (!v?.trim()) return t('v.phoneRequired')
  if (!/^1[3-9]\d{9}$/.test(v.trim())) return t('v.phoneInvalid')
  return ''
}
function validateRegPassword(v) {
  if (!v) return t('v.passwordRequired')
  if (v.length < 6) return t('v.passwordMin')
  if (!/[a-zA-Z]/.test(v)) return t('v.passwordLetter')
  if (!/[0-9]/.test(v)) return t('v.passwordDigit')
  return ''
}
function validateUsername(v) {
  if (!v?.trim()) return t('v.usernameRequired')
  if (v.trim().length < 2) return t('v.usernameMin')
  if (v.trim().length > 20) return t('v.usernameMax')
  return ''
}

const openAuth = (mode = 'login') => {
  authMode.value     = mode
  authError.value    = ''
  authForm.value     = { username: '', phone: '', password: '', code: '' }
  codeSent.value     = false
  countdown.value    = 0
  verifyOtpFn        = null
  showUserMenu.value = false
  clearInterval(countdownTimer)
  showAuthModal.value = true
  authTouched.value   = { username: false, phone: false, password: false }
  showRegPwd.value    = false
  showLoginPwd.value  = false
}
const closeAuth = () => { showAuthModal.value = false; verifyOtpFn = null; clearInterval(countdownTimer) }

const startCountdown = () => {
  countdown.value = 60
  countdownTimer = setInterval(() => { countdown.value--; if (countdown.value <= 0) clearInterval(countdownTimer) }, 1000)
}

const handleSendCode = async () => {
  authError.value = ''
  authTouched.value = { username: true, phone: true, password: true }
  const { username, phone, password } = authForm.value
  if (validateUsername(username) || validatePhone(phone) || validateRegPassword(password)) return
  try { await checkUsername(username.trim()) } catch (e) { authError.value = e.message; return }
  authLoading.value = true
  try {
    verifyOtpFn    = await requestPhoneCode(phone.trim(), password)
    codeSent.value = true
    startCountdown()
  } catch (e) {
    authError.value = e.message || String(e)
  } finally {
    authLoading.value = false
  }
}

const submitAuth = async () => {
  authError.value = ''
  authLoading.value = true
  try {
    const { username, phone, code, password } = authForm.value
    if (authMode.value === 'register') {
      if (!code.trim()) { authError.value = t('v.codeRequired'); return }
      await confirmCode(verifyOtpFn, code.trim(), username.trim(), phone.trim())
    } else {
      if (!phone.trim()) { authError.value = t('v.phoneRequired'); return }
      if (!password)     { authError.value = t('v.passwordRequired'); return }
      await login(phone.trim(), password)
    }
    closeAuth()
    success(authMode.value === 'register' ? '注册成功，已自动登录' : '登录成功')
  } catch (e) {
    authError.value = e.message || e.error_description || String(e)
  } finally {
    authLoading.value = false
  }
}

// ── 管理后台 ──
const showAdmin = ref(false)
const openAdmin = () => { showUserMenu.value = false; showAdmin.value = true; window.scrollTo(0, 0) }

// ── 积分弹窗 ──
const showPoints = ref(false)
const openPoints = () => { showUserMenu.value = false; showPoints.value = true }

// ── 语言切换 ──
const showLangMenu = ref(false)

const handleLogout = async () => { showUserMenu.value = false; await logout() }


</script>

<template>
  <AdminView
    v-if="showAdmin"
    :current-user="currentUser"
    @back="showAdmin = false"
  />

  <ProfileView
    v-else-if="showProfile && currentUser"
    :current-user="currentUser"
    :initial-tab="profileInitialTab"
    @back="showProfile = false"
    @go-detail="({ id, tab }) => { profileInitialTab = tab || 'fav'; showProfile = false; goToDetail(id, { from: 'profile', profileTab: profileInitialTab }) }"
    @go-submit="() => { showProfile = false; goToSubmit() }"
    @go-home="() => { showProfile = false; goBackToList() }"
    @go-market="() => { showProfile = false; switchTab('market') }"
  />

  <SubmitProblemView
    v-else-if="currentPage === 'submit'"
    :current-user="currentUser"
    :context="submitContext"
    @back="handleSubmitBack"
    @submitted="onSubmitted"
  />

  <div v-else-if="!showAdmin" v-show="currentPage !== 'detail'" class="app-shell">
    <nav class="app-nav">
      <div class="nav-inner">
        <div class="nav-logo" @click="goBackToList">
          <span class="logo-mark">▲</span>
          <span class="logo-text">{{ t('app.logo') }}</span>
        </div>
        <div class="nav-tabs">
          <button :class="['nav-tab', { active: activeTab === 'home' }]"   @click="switchTab('home')">{{ t('nav.home') }}</button>
          <button :class="['nav-tab', { active: activeTab === 'filament' }]"  @click="switchTab('filament')">{{ t('nav.filament') }}</button>
          <button :class="['nav-tab', { active: activeTab === 'market' }]"   @click="switchTab('market')">{{ t('nav.market') }}</button>
        </div>
        <div class="nav-right">
          <template v-if="!currentUser">
            <div class="lang-wrap">
              <button class="icon-btn" @click="showLangMenu = !showLangMenu">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7.5" stroke="currentColor" stroke-width="1.4"/>
                  <ellipse cx="9" cy="9" rx="3" ry="7.5" stroke="currentColor" stroke-width="1.4"/>
                  <path d="M1.5 6h15M1.5 12h15" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
              </button>
              <Transition name="dropdown">
                <div v-if="showLangMenu" class="lang-dropdown">
                  <button class="lang-item" :class="{ active: lang === 'zh' }" @click="lang = 'zh'; showLangMenu = false">
                    <span class="lang-flag">🇨🇳</span><span>{{ t('lang.zh') }}</span>
                  </button>
                  <button class="lang-item" :class="{ active: lang === 'en' }" @click="lang = 'en'; showLangMenu = false">
                    <span class="lang-flag">🇺🇸</span><span>{{ t('lang.en') }}</span>
                  </button>
                </div>
              </Transition>
              <div v-if="showLangMenu" class="menu-backdrop" @click="showLangMenu = false"></div>
            </div>
            <button class="nav-btn ghost" @click="openAuth('login')">{{ t('nav.login') }}</button>
            <button class="nav-btn solid" @click="openAuth('register')">{{ t('nav.register') }}</button>
          </template>
          <template v-else>
            <!-- 铃铛通知 -->
            <div class="bell-wrap">
              <button class="bell-btn" @click="openNotifPanel">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2a5.5 5.5 0 00-5.5 5.5c0 2.5-.8 3.8-1.5 4.5h14c-.7-.7-1.5-2-1.5-4.5A5.5 5.5 0 009 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
                  <path d="M7 14.5a2 2 0 004 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
                <span v-if="unreadCount > 0" class="bell-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
              </button>
              <Transition name="dropdown">
                <div v-if="showNotifPanel" class="notif-panel">
                  <div class="notif-head">
                    <span class="notif-title-text">{{ t('notif.title') }}</span>
                    <button v-if="unreadCount > 0" class="notif-read-all" @click="markAllRead">{{ t('notif.markRead') }}</button>
                  </div>
                  <div v-if="notifications.length === 0" class="notif-empty">{{ t('notif.empty') }}</div>
                  <div v-else class="notif-list">
                    <div v-for="n in notifications" :key="n.id" :class="['notif-item', { unread: !n.read }]">
                      <div class="notif-item-title">{{ n.title }}</div>
                      <div class="notif-item-body">{{ n.body }}</div>
                      <div class="notif-item-time">{{ notifTimeAgo(n.createdAt) }}</div>
                    </div>
                  </div>
                </div>
              </Transition>
              <div v-if="showNotifPanel" class="menu-backdrop" @click="showNotifPanel = false"></div>
            </div>

            <!-- 地球语言切换 -->
            <div class="lang-wrap">
              <button class="icon-btn" @click="showLangMenu = !showLangMenu">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7.5" stroke="currentColor" stroke-width="1.4"/>
                  <ellipse cx="9" cy="9" rx="3" ry="7.5" stroke="currentColor" stroke-width="1.4"/>
                  <path d="M1.5 6h15M1.5 12h15" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
              </button>
              <Transition name="dropdown">
                <div v-if="showLangMenu" class="lang-dropdown">
                  <button class="lang-item" :class="{ active: lang === 'zh' }" @click="lang = 'zh'; showLangMenu = false">
                    <span class="lang-flag">🇨🇳</span><span>{{ t('lang.zh') }}</span>
                  </button>
                  <button class="lang-item" :class="{ active: lang === 'en' }" @click="lang = 'en'; showLangMenu = false">
                    <span class="lang-flag">🇺🇸</span><span>{{ t('lang.en') }}</span>
                  </button>
                </div>
              </Transition>
              <div v-if="showLangMenu" class="menu-backdrop" @click="showLangMenu = false"></div>
            </div>

            <!-- 用户菜单 -->
            <div class="user-wrap">
              <div class="nav-user" @click="showUserMenu = !showUserMenu">
                <div class="user-avatar">
                  <img v-if="currentAvatarIsImage" :src="currentUser.avatar" alt="用户头像" class="avatar-image" />
                  <span v-else>{{ currentAvatarFallback }}</span>
                </div>
                <span class="user-name">{{ currentUser.username }}</span>
                <span class="menu-caret" :class="{ open: showUserMenu }">▾</span>
              </div>
              <Transition name="dropdown">
                <div v-if="showUserMenu" class="user-dropdown">
                  <button v-if="currentUser.isAdmin" class="dropdown-item admin-item" @click="openAdmin">{{ t('nav.admin') }}</button>
                  <div v-if="currentUser.isAdmin" class="dropdown-divider"></div>
                  <button class="dropdown-item" @click="openProfile">{{ t('nav.profile') }}</button>
                  <button class="dropdown-item" @click="openPoints">{{ t('user.points') }}</button>
                  <div class="dropdown-divider"></div>
                  <button class="dropdown-item danger" @click="handleLogout">{{ t('nav.logout') }}</button>
                </div>
              </Transition>
            </div>
            <div v-if="showUserMenu" class="menu-backdrop" @click="showUserMenu = false"></div>
          </template>
        </div>
      </div>
    </nav>

    <template v-if="appReady">
      <ProblemsView  v-if="activeTab === 'home'"     :current-user="currentUser" @go-detail="goToDetail" @open-auth="openAuth" @go-submit="goToSubmit" @go-filament="switchTab('filament')" />
      <MarketView    v-else-if="activeTab === 'market'"   :current-user="currentUser" @open-auth="openAuth" />
      <FilamentView  v-else-if="activeTab === 'filament'" :current-user="currentUser" @open-auth="openAuth" />
    </template>
    <div v-else class="app-loading">
      <span class="loading-spinner"></span>
    </div>

    <footer class="site-footer">
      <div class="site-footer-inner">
        <div class="site-footer-brand">
          <span class="site-footer-mark">▲</span>
          <div>
            <div class="site-footer-title">{{ t('app.logo') }}</div>
            <div class="site-footer-desc">{{ t('about.desc') }}</div>
          </div>
        </div>
        <div class="site-footer-meta">
          <span>{{ t('about.wechat') }}：crazy0568</span>
          <span>{{ t('about.phone') }}：+86-17111469098</span>
          <div v-if="icpRecordCode || publicSecurityCode" class="site-footer-records">
            <a
              v-if="icpRecordCode"
              class="site-footer-link"
              :href="icpRecordUrl"
              target="_blank"
              rel="noreferrer"
            >
              {{ t('about.icp') }}：{{ icpRecordCode }}
            </a>
            <a
              v-if="publicSecurityCode"
              class="site-footer-link"
              :href="publicSecurityUrl"
              target="_blank"
              rel="noreferrer"
            >
              {{ t('about.publicSecurity') }}：{{ publicSecurityCode }}
            </a>
          </div>
          <span>{{ t('about.copy') }}</span>
        </div>
      </div>
    </footer>
  </div>

  <ProblemDetailView
    v-if="!showAdmin && !showProfile && currentPage === 'detail'"
    :problem-id="currentDetailId"
    @back="handleDetailBack"
    @go-detail="goToDetail"
    @open-auth="openAuth"
    @go-submit="goToSubmit"
  />

  <!-- 登录/注册弹窗 -->
  <Transition name="modal">
    <div v-if="showAuthModal" class="modal-mask">
      <div class="modal-box">
        <div class="modal-tabs">
          <button :class="['tab', { active: authMode === 'login' }]"    @click="authMode = 'login';    authError = ''">{{ t('nav.login') }}</button>
          <button :class="['tab', { active: authMode === 'register' }]" @click="authMode = 'register'; authError = ''; codeSent = false">{{ t('nav.register') }}</button>
        </div>
        <div class="modal-body">
          <template v-if="authMode === 'login'">
            <h2 class="modal-title">{{ t('auth.loginTitle') }}</h2>
            <p class="modal-sub">{{ t('auth.loginSub') }}</p>
            <div class="form-fields">
              <div class="field">
                <label>{{ t('auth.phone') }}</label>
                <input v-model="authForm.phone" type="tel" :placeholder="t('auth.phonePh')" required
                  @blur="authTouched.phone = true" @keyup.enter="submitAuth" />
                <span v-if="authTouched.phone && validatePhone(authForm.phone)" class="field-error">
                  {{ validatePhone(authForm.phone) }}
                </span>
              </div>
              <div class="field">
                <label>{{ t('auth.password') }}</label>
                <div class="pwd-wrap">
                  <input v-model="authForm.password" :type="showLoginPwd ? 'text' : 'password'"
                    :placeholder="t('auth.pwdPh')" required
                    @blur="authTouched.password = true" @keyup.enter="submitAuth" />
                  <button type="button" class="eye-btn" tabindex="-1" @click="showLoginPwd = !showLoginPwd">
                    <svg v-if="showLoginPwd" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2l12 12M6.5 6.6A2 2 0 0110 9.4M4.2 4.3C2.8 5.3 1.8 6.5 1 8c1.3 2.6 4 4.5 7 4.5 1.2 0 2.4-.3 3.4-.9M7 3.6C7.3 3.5 7.7 3.5 8 3.5c3 0 5.7 1.9 7 4.5-.4.8-1 1.6-1.7 2.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                    </svg>
                    <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M1 8c1.3-2.6 4-4.5 7-4.5S13.7 5.4 15 8c-1.3 2.6-4 4.5-7 4.5S2.3 10.6 1 8z" stroke="currentColor" stroke-width="1.3"/>
                      <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <h2 class="modal-title">{{ t('auth.regTitle') }}</h2>
            <p class="modal-sub">{{ t('auth.regSub') }}</p>
            <div class="form-fields">
              <div class="field">
                <label>{{ t('auth.username') }}</label>
                <input v-model="authForm.username" :placeholder="t('auth.usernamePh')" required :disabled="codeSent"
                  @blur="authTouched.username = true" />
                <span v-if="authTouched.username && validateUsername(authForm.username)" class="field-error">
                  {{ validateUsername(authForm.username) }}
                </span>
              </div>
              <div class="field">
                <label>{{ t('auth.password') }}</label>
                <div class="pwd-wrap">
                  <input v-model="authForm.password" :type="showRegPwd ? 'text' : 'password'"
                    :placeholder="t('auth.regPwdPh')" required :disabled="codeSent"
                    @blur="authTouched.password = true" />
                  <button type="button" class="eye-btn" tabindex="-1" :disabled="codeSent"
                    @click="showRegPwd = !showRegPwd">
                    <svg v-if="showRegPwd" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2l12 12M6.5 6.6A2 2 0 0110 9.4M4.2 4.3C2.8 5.3 1.8 6.5 1 8c1.3 2.6 4 4.5 7 4.5 1.2 0 2.4-.3 3.4-.9M7 3.6C7.3 3.5 7.7 3.5 8 3.5c3 0 5.7 1.9 7 4.5-.4.8-1 1.6-1.7 2.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                    </svg>
                    <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M1 8c1.3-2.6 4-4.5 7-4.5S13.7 5.4 15 8c-1.3 2.6-4 4.5-7 4.5S2.3 10.6 1 8z" stroke="currentColor" stroke-width="1.3"/>
                      <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/>
                    </svg>
                  </button>
                </div>
                <span v-if="authTouched.password && validateRegPassword(authForm.password)" class="field-error">
                  {{ validateRegPassword(authForm.password) }}
                </span>
              </div>
              <div class="field">
                <label>{{ t('auth.phone') }}</label>
                <div class="phone-row">
                  <input v-model="authForm.phone" type="tel" :placeholder="t('auth.regPhonePh')" class="phone-input" required
                    :disabled="codeSent" @blur="authTouched.phone = true" />
                  <button class="send-btn"
                    :disabled="authLoading || countdown > 0 || !!validateUsername(authForm.username) || !!validatePhone(authForm.phone) || !!validateRegPassword(authForm.password)"
                    @click="handleSendCode">
                    {{ countdown > 0 ? countdown + 's' : (codeSent ? t('auth.resend') : t('auth.getCode')) }}
                  </button>
                </div>
                <span v-if="authTouched.phone && validatePhone(authForm.phone)" class="field-error">
                  {{ validatePhone(authForm.phone) }}
                </span>
              </div>
              <div v-if="codeSent" class="field">
                <label>{{ t('auth.codeLab') }}</label>
                <input v-model="authForm.code" :placeholder="t('auth.codePh')" maxlength="6" required
                  @keyup.enter="submitAuth" autofocus />
              </div>
            </div>
          </template>

          <div v-if="authError" class="auth-error">{{ authError }}</div>
          <button class="submit-btn" :class="{ loading: authLoading }" @click="submitAuth"
            :disabled="authLoading || (authMode === 'register' && (!codeSent || !authForm.code.trim())) || (authMode === 'login' && (!authForm.phone.trim() || !authForm.password))">
            <span v-if="authLoading" class="btn-spinner"></span>
            {{ authLoading ? t('auth.loading') : (authMode === 'login' ? t('auth.loginBtn') : t('auth.regBtn')) }}
          </button>
        </div>
        <button class="modal-close" @click="closeAuth">✕</button>
      </div>
    </div>
  </Transition>

  <!-- 积分弹窗 -->
  <Transition name="modal">
    <div v-if="showPoints" class="modal-mask">
      <div class="modal-box">
        <div class="modal-body" style="padding-top:32px;text-align:center">
          <h2 class="modal-title">{{ t('pts.title') }}</h2>
          <div class="points-display">
            <span class="points-value">{{ currentUser?.points ?? 0 }}</span>
            <span class="points-unit">{{ t('pts.unit') }}</span>
          </div>
          <p class="modal-sub" style="margin-top:12px">{{ t('pts.sub') }}</p>
        </div>
        <button class="modal-close" @click="showPoints = false">✕</button>
      </div>
    </div>
  </Transition>

  <Teleport to="body">
    <div class="toast-stack">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast-item', toast.type]"
          @click="removeToast(toast.id)"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { color: var(--lab-text); font-family: -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif; }
</style>

<style scoped>
.app-shell { min-height: 100vh; background: transparent; }
.app-nav {
  position: sticky;
  top: 0;
  z-index: 200;
  background: rgba(247, 250, 253, 0.84);
  backdrop-filter: blur(22px) saturate(140%);
  border-bottom: 1px solid var(--lab-line);
  box-shadow: 0 8px 26px rgba(14, 29, 52, 0.04);
  min-height: 56px;
}
.nav-inner {
  max-width: 1280px;
  margin: 0 auto;
  min-height: 56px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 0;
}
.nav-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.15s;
  flex-shrink: 0;
  margin-right: 20px;
}
.nav-logo:hover { opacity: 0.78; }
.logo-mark {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #f7fbff;
  background: linear-gradient(135deg, var(--lab-accent) 0%, var(--lab-accent-2) 100%);
  box-shadow: 0 8px 18px rgba(37, 104, 232, 0.2);
}
.logo-text { font-size: 15px; font-weight: 700; color: var(--lab-text); letter-spacing: -0.01em; }
.nav-tabs { display: flex; align-items: center; height: 100%; flex: 1; }
.nav-tab {
  padding: 0 14px;
  height: 56px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  color: var(--lab-text-soft);
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.nav-tab:hover { color: var(--lab-text); }
.nav-tab.active { color: var(--lab-text); border-bottom-color: var(--lab-accent); }
.nav-more-wrap { position: relative; display: flex; align-items: stretch; height: 100%; }
.nav-tab-more { display: inline-flex; align-items: center; gap: 6px; }
.nav-more-caret { font-size: 11px; transition: transform 0.18s; }
.nav-more-caret.open { transform: rotate(180deg); }
.nav-more-menu {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  min-width: 176px;
  background: rgba(252, 253, 255, 0.98);
  border: 1px solid var(--lab-line);
  border-radius: 16px;
  overflow: hidden;
  z-index: 300;
  box-shadow: var(--lab-shadow);
  backdrop-filter: blur(18px);
}
.nav-more-item {
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: var(--lab-text);
  font-size: 14px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}
.nav-more-item:hover { background: rgba(37, 104, 232, 0.06); }
.nav-right { display: flex; align-items: center; gap: 8px; position: relative; flex-shrink: 0; }
.nav-btn { border-radius: 999px; font-size: 13px; cursor: pointer; font-family: inherit; padding: 7px 16px; transition: all 0.18s; border: 1px solid transparent; }
.nav-btn.ghost { background: rgba(248, 251, 254, 0.76); border-color: var(--lab-line); color: var(--lab-text-soft); }
.nav-btn.ghost:hover { border-color: var(--lab-line-strong); color: var(--lab-text); }
.nav-btn.solid {
  background: linear-gradient(135deg, var(--lab-accent) 0%, var(--lab-accent-2) 100%);
  color: #fff;
  border-color: transparent;
  font-weight: 600;
  box-shadow: 0 10px 22px rgba(37, 104, 232, 0.18);
}
.nav-btn.solid:hover { filter: brightness(1.03); }

/* 铃铛 */
.bell-wrap { position: relative; }
.bell-btn  {
  position: relative;
  background: rgba(248, 251, 254, 0.76);
  border: 1px solid transparent;
  color: var(--lab-text-soft);
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  border-radius: 12px;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.bell-btn:hover { color: var(--lab-text); border-color: var(--lab-line); background: rgba(255,255,255,0.92); }
.bell-badge { position: absolute; top: 1px; right: 1px; min-width: 16px; height: 16px; padding: 0 4px; background: #ff6b6b; color: #fff; font-size: 10px; font-weight: 700; border-radius: 100px; display: flex; align-items: center; justify-content: center; }

.notif-panel { position: absolute; top: calc(100% + 10px); right: 0; width: 320px; background: rgba(252, 253, 255, 0.98); border: 1px solid var(--lab-line); border-radius: 18px; overflow: hidden; z-index: 300; box-shadow: var(--lab-shadow); backdrop-filter: blur(18px); }
.notif-head  { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 10px; border-bottom: 1px solid rgba(0,0,0,0.06); }
.notif-title-text { font-size: 14px; font-weight: 700; color: var(--lab-text); }
.notif-read-all   { background: transparent; border: none; font-size: 12px; color: var(--lab-text-soft); cursor: pointer; font-family: inherit; transition: color 0.15s; }
.notif-read-all:hover { color: var(--lab-text); }
.notif-empty { padding: 24px 16px; font-size: 13px; color: var(--lab-text-dim); text-align: center; }
.notif-list  { max-height: 360px; overflow-y: auto; }
.notif-item  { padding: 12px 16px; border-bottom: 1px solid rgba(0,0,0,0.05); transition: background 0.15s; }
.notif-item:last-child { border-bottom: none; }
.notif-item.unread { background: rgba(37, 104, 232, 0.04); }
.notif-item-title { font-size: 13px; font-weight: 600; color: var(--lab-text); margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
.notif-item.unread .notif-item-title::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #ff6b6b; flex-shrink: 0; }
.notif-item-body  { font-size: 12px; color: var(--lab-text-soft); line-height: 1.5; margin-bottom: 4px; }
.notif-item-time  { font-size: 11px; color: var(--lab-text-dim); }

/* 用户菜单 */
.user-wrap { position: relative; }
.nav-user { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 8px; border-radius: 100px; transition: background 0.15s; user-select: none; }
.nav-user:hover { background: rgba(255,255,255,0.72); }
.user-avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #2568e8, #18b5d4); color: #fff; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 8px 18px rgba(37, 104, 232, 0.18); overflow: hidden; }
.avatar-image { width: 100%; height: 100%; object-fit: cover; display: block; }
.user-name { font-size: 14px; color: var(--lab-text); }
.menu-caret { font-size: 11px; color: var(--lab-text-soft); transition: transform 0.2s; }
.menu-caret.open { transform: rotate(180deg); }

.user-dropdown { position: absolute; top: calc(100% + 8px); right: 0; background: rgba(252, 253, 255, 0.98); border: 1px solid var(--lab-line); border-radius: 16px; min-width: 156px; overflow: hidden; z-index: 300; box-shadow: var(--lab-shadow); backdrop-filter: blur(18px); }
.dropdown-item { width: 100%; padding: 12px 16px; background: transparent; border: none; color: var(--lab-text); font-size: 14px; font-family: inherit; text-align: left; cursor: pointer; transition: background 0.15s; }
.dropdown-item:hover { background: rgba(37, 104, 232, 0.06); }
.dropdown-item.danger { color: var(--lab-danger); }
.dropdown-item.admin-item { color: #0f3460; font-weight: 600; }
.dropdown-divider { height: 1px; background: rgba(0,0,0,0.06); margin: 2px 0; }
.menu-backdrop { position: fixed; inset: 0; z-index: 250; }

.dropdown-enter-active, .dropdown-leave-active { transition: all 0.15s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-6px); }


.modal-mask { position: fixed; inset: 0; z-index: 500; background: rgba(12,20,32,0.42); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-box { background: rgba(252, 253, 255, 0.98); border: 1px solid var(--lab-line); border-radius: 26px; width: 100%; max-width: 400px; position: relative; overflow: hidden; box-shadow: var(--lab-shadow-lg); backdrop-filter: blur(20px); }
.modal-tabs { display: flex; border-bottom: 1px solid rgba(0,0,0,0.08); }
.tab { flex: 1; padding: 16px; background: transparent; border: none; color: var(--lab-text-soft); font-size: 15px; font-family: inherit; cursor: pointer; transition: all 0.18s; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tab.active { color: var(--lab-text); border-bottom-color: var(--lab-accent); }
.tab:hover:not(.active) { color: var(--lab-text); }
.modal-body { padding: 28px 28px 32px; }
.modal-title { font-size: 22px; font-weight: 700; color: var(--lab-text); margin-bottom: 6px; letter-spacing: -0.02em; }
.modal-sub { font-size: 13px; color: var(--lab-text-soft); margin-bottom: 24px; line-height: 1.5; }
.form-fields { display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 12px; color: var(--lab-text-soft); letter-spacing: 0.04em; }
.field input { background: rgba(244,248,252,0.95); border: 1px solid var(--lab-line); border-radius: 12px; padding: 11px 14px; color: var(--lab-text); font-size: 15px; font-family: inherit; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
.field input:focus { border-color: rgba(37, 104, 232, 0.34); box-shadow: 0 0 0 4px rgba(37, 104, 232, 0.08); }
.field input::placeholder { color: #9eadc2; }
.field input:disabled { opacity: 0.5; cursor: not-allowed; }
.field-error { font-size: 11px; color: var(--lab-danger); margin-top: -2px; }
.pwd-wrap { position: relative; }
.pwd-wrap input { padding-right: 42px; width: 100%; }
.eye-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: var(--lab-text-dim); cursor: pointer; padding: 4px; display: flex; align-items: center; transition: color 0.15s; }
.eye-btn:hover:not(:disabled) { color: var(--lab-text-soft); }
.eye-btn:disabled { cursor: not-allowed; }
.phone-row { display: flex; gap: 8px; }
.phone-input { flex: 1; background: rgba(244,248,252,0.95); border: 1px solid var(--lab-line); border-radius: 12px; padding: 11px 14px; color: var(--lab-text); font-size: 15px; font-family: inherit; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
.phone-input:focus { border-color: rgba(37, 104, 232, 0.34); box-shadow: 0 0 0 4px rgba(37, 104, 232, 0.08); }
.phone-input::placeholder { color: #9eadc2; }
.phone-input:disabled { opacity: 0.5; }
.send-btn { flex-shrink: 0; padding: 11px 14px; background: rgba(244,248,252,0.98); border: 1px solid var(--lab-line); border-radius: 12px; color: var(--lab-text-soft); font-size: 13px; font-family: inherit; cursor: pointer; white-space: nowrap; transition: all 0.18s; }
.send-btn:hover:not(:disabled) { border-color: var(--lab-line-strong); color: var(--lab-text); }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.auth-error { background: rgba(213,82,103,0.08); border: 1px solid rgba(213,82,103,0.18); border-radius: 10px; padding: 10px 14px; font-size: 13px; color: var(--lab-danger); margin-bottom: 14px; }
.submit-btn { width: 100%; padding: 13px; background: linear-gradient(135deg, var(--lab-accent) 0%, var(--lab-accent-2) 100%); color: #fff; border: none; border-radius: 14px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.18s; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 12px 24px rgba(37, 104, 232, 0.18); }
.submit-btn:hover:not(:disabled) { filter: brightness(1.03); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.submit-btn.loading { background: #a6b5c8; color: #fff; box-shadow: none; }
.btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
.modal-close { position: absolute; top: 12px; right: 14px; background: rgba(19,32,51,0.06); border: none; color: var(--lab-text-soft); font-size: 13px; cursor: pointer; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
.modal-close:hover { background: rgba(19,32,51,0.1); color: var(--lab-text); }
.modal-enter-active, .modal-leave-active { transition: all 0.25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

/* 积分 */
.points-display { display: flex; align-items: baseline; justify-content: center; gap: 6px; margin: 24px 0 4px; }
.points-value { font-size: 56px; font-weight: 700; color: var(--lab-text); letter-spacing: -0.04em; font-family: var(--lab-mono); }
.points-unit { font-size: 18px; color: var(--lab-text-soft); }

/* 地球语言切换 */
.lang-wrap { position: relative; }
.icon-btn { background: rgba(248, 251, 254, 0.76); border: 1px solid transparent; color: var(--lab-text-soft); cursor: pointer; padding: 6px; display: flex; align-items: center; border-radius: 12px; transition: color 0.15s, border-color 0.15s, background 0.15s; }
.icon-btn:hover { color: var(--lab-text); border-color: var(--lab-line); background: rgba(255,255,255,0.92); }
.lang-dropdown { position: absolute; top: calc(100% + 10px); right: 0; background: rgba(252, 253, 255, 0.98); border: 1px solid var(--lab-line); border-radius: 16px; overflow: hidden; z-index: 300; box-shadow: var(--lab-shadow); min-width: 130px; backdrop-filter: blur(18px); }
.lang-item { width: 100%; padding: 11px 16px; background: transparent; border: none; color: var(--lab-text); font-size: 14px; font-family: inherit; text-align: left; cursor: pointer; transition: background 0.15s; display: flex; align-items: center; gap: 10px; }
.lang-item:hover { background: rgba(37, 104, 232, 0.06); }
.lang-item.active { font-weight: 600; }
.lang-flag { font-size: 18px; line-height: 1; }

/* 页脚 */
.site-footer {
  border-top: 1px solid var(--lab-line);
  background: linear-gradient(180deg, rgba(247, 250, 253, 0.52) 0%, rgba(243, 247, 252, 0.9) 100%);
  margin-top: 32px;
}
.site-footer-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.site-footer-brand {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.site-footer-mark {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #f7fbff;
  background: linear-gradient(135deg, var(--lab-accent) 0%, var(--lab-accent-2) 100%);
  box-shadow: 0 8px 18px rgba(37, 104, 232, 0.18);
  flex-shrink: 0;
}
.site-footer-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--lab-text);
  margin-bottom: 4px;
}
.site-footer-desc {
  font-size: 13px;
  color: var(--lab-text-soft);
  line-height: 1.6;
  max-width: 520px;
}
.site-footer-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--lab-text-dim);
  text-align: right;
}
.site-footer-records {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}
.site-footer-link {
  color: var(--lab-text-soft);
  transition: color 0.18s ease;
}
.site-footer-link:hover {
  color: var(--lab-accent);
}

/* Auth init loading */
.app-loading { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 52px); }
.loading-spinner { width: 28px; height: 28px; border: 2.5px solid rgba(0,0,0,0.1); border-top-color: var(--lab-accent); border-radius: 50%; animation: spin 0.75s linear infinite; }

.toast-stack {
  position: fixed;
  top: 84px;
  right: 20px;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}
.toast-item {
  min-width: 220px;
  max-width: min(420px, calc(100vw - 32px));
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(15, 24, 38, 0.08);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(14px);
  font-size: 13px;
  line-height: 1.5;
  color: var(--lab-text);
  pointer-events: auto;
  cursor: pointer;
}
.toast-item.success {
  border-color: rgba(30, 157, 102, 0.18);
  background: rgba(242, 251, 246, 0.98);
  color: #176b47;
}
.toast-item.error {
  border-color: rgba(219, 77, 92, 0.18);
  background: rgba(255, 246, 247, 0.98);
  color: #b42318;
}
.toast-item.info {
  border-color: rgba(82, 116, 217, 0.18);
  background: rgba(245, 248, 255, 0.98);
  color: #3555b5;
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.22s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px) translateX(10px);
}

/* ── 移动端导航：上栏(logo+操作) + 下栏(可横滑 tabs) ── */
@media (max-width: 768px) {
  /* 防止 iOS 输入框自动缩放 */
  .field input, .phone-input { font-size: 16px; }
  .app-nav { height: auto; }
  .nav-inner { flex-wrap: wrap; padding: 0; height: auto; max-width: 100%; align-items: stretch; }
  .nav-logo { padding: 10px 16px; margin-right: 0; flex: 1; align-self: center; }
  .nav-right { padding: 8px 12px; gap: 4px; align-self: center; }
  .nav-tabs {
    width: 100%; flex: none; height: 40px;
    border-top: 1px solid rgba(0,0,0,0.07);
    overflow-x: auto; overflow-y: hidden;
    scrollbar-width: none; -webkit-overflow-scrolling: touch;
    padding: 0 8px; gap: 0;
  }
  .nav-tabs::-webkit-scrollbar { display: none; }
  .nav-tab { height: 40px; padding: 0 11px; font-size: 13px; }
  .nav-more-wrap { height: 40px; }
  .nav-more-menu { left: 8px; top: calc(100% + 8px); }
  .user-name { display: none; }
  .menu-caret { display: none; }
  .nav-btn { padding: 5px 11px; font-size: 12px; }
  .app-loading { min-height: calc(100vh - 84px); }
  .site-footer-inner {
    padding: 20px 16px;
    flex-direction: column;
    align-items: flex-start;
  }
  .site-footer-meta { text-align: left; }
  .site-footer-records { align-items: flex-start; }
  /* 下拉面板位置微调 */
  .notif-panel { width: 290px; }
  .user-dropdown { right: 0; }
  .toast-stack {
    top: 92px;
    left: 16px;
    right: 16px;
  }
  .toast-item {
    min-width: 0;
    max-width: none;
  }
}
@media (max-width: 400px) {
  .nav-logo { padding: 10px 12px; }
  .logo-text { display: none; }
  .nav-right { padding: 8px 10px; }
}
</style>
