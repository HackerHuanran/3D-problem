<script setup>
import { ref, watch, onMounted } from 'vue'
import { useAuth } from './composables/useAuth.js'
import { useNotifications } from './composables/useNotifications.js'
import { useLocale } from './composables/useLocale.js'
import ProblemsView from './components/ProblemsView.vue'
import ProblemDetailView from './components/ProblemDetailView.vue'
import NewsView from './components/NewsView.vue'
import MarketView from './components/MarketView.vue'
import FilamentView from './components/FilamentView.vue'
import ServicesView from './components/ServicesView.vue'
import AdminView from './components/AdminView.vue'
import MyPostsView from './components/MyPostsView.vue'
import MyProblemsView from './components/MyProblemsView.vue'
import SubmitProblemView from './components/SubmitProblemView.vue'

const { currentUser, checkUsername, requestPhoneCode, confirmCode, login, setupProfile, changePassword, logout, init } = useAuth()
const { notifications, unreadCount, fetchNotifications, markAllRead } = useNotifications()
const { lang, t } = useLocale()

const appReady = ref(false)
onMounted(async () => { await init(); appReady.value = true })

watch(currentUser, (user) => {
  if (user) fetchNotifications(user.id)
  else { notifications.value = []; unreadCount.value = 0 }
})

// ── 页面导航 ──
const currentPage     = ref('list')
const currentDetailId = ref(null)
const activeTab       = ref('home')

const goToDetail = (id) => { currentDetailId.value = id; currentPage.value = 'detail'; window.scrollTo(0, 0) }
const goBackToList = () => { currentPage.value = 'list'; activeTab.value = 'home'; currentDetailId.value = null; window.scrollTo(0, 0) }
const switchTab = (tab) => { activeTab.value = tab; currentPage.value = 'list'; window.scrollTo(0, 0) }
const goToSubmit = () => { currentPage.value = 'submit'; window.scrollTo(0, 0) }
const onSubmitted = () => { currentPage.value = 'list'; activeTab.value = 'home'; window.scrollTo(0, 0) }

// ── 我发布的需求 ──
const showMyPosts = ref(false)
const openMyPosts = () => { showUserMenu.value = false; showMyPosts.value = true; window.scrollTo(0, 0) }

// ── 我发布的问题 ──
const showMyProblems = ref(false)
const openMyProblems = () => { showUserMenu.value = false; showMyProblems.value = true; window.scrollTo(0, 0) }

// ── 通知面板 ──
const showNotifPanel = ref(false)
const openNotifPanel = async () => {
  showNotifPanel.value = !showNotifPanel.value
  if (showNotifPanel.value && currentUser.value) await fetchNotifications(currentUser.value.id)
}

function notifTimeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)    return '刚刚'
  if (s < 3600)  return `${Math.floor(s / 60)} 分钟前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`
  return `${Math.floor(s / 86400)} 天前`
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
  if (!v?.trim()) return '请输入手机号'
  if (!/^1[3-9]\d{9}$/.test(v.trim())) return '请输入有效的手机号（11位）'
  return ''
}
function validateRegPassword(v) {
  if (!v) return '请输入密码'
  if (v.length < 6) return '密码至少 6 位'
  if (!/[a-zA-Z]/.test(v)) return '密码需包含至少一个字母'
  if (!/[0-9]/.test(v)) return '密码需包含至少一个数字'
  return ''
}
function validateUsername(v) {
  if (!v?.trim()) return '请输入用户名'
  if (v.trim().length < 2) return '用户名至少 2 个字符'
  if (v.trim().length > 20) return '用户名最多 20 个字符'
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
      if (!code.trim()) { authError.value = '请输入验证码'; return }
      await confirmCode(verifyOtpFn, code.trim(), username.trim(), phone.trim())
    } else {
      if (!phone.trim()) { authError.value = '请输入手机号'; return }
      if (!password)     { authError.value = '请输入密码'; return }
      await login(phone.trim(), password)
    }
    closeAuth()
  } catch (e) {
    authError.value = e.message || e.error_description || String(e)
  } finally {
    authLoading.value = false
  }
}

// ── 修改密码弹窗 ──
const showChangePwd   = ref(false)
const changePwdForm   = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const changePwdError  = ref('')
const changePwdLoading = ref(false)

const openChangePwd = () => {
  showUserMenu.value    = false
  changePwdForm.value   = { oldPassword: '', newPassword: '', confirmPassword: '' }
  changePwdError.value  = ''
  showChangePwd.value   = true
}
const closeChangePwd = () => { showChangePwd.value = false }

const submitChangePwd = async () => {
  changePwdError.value = ''
  const { oldPassword, newPassword, confirmPassword } = changePwdForm.value
  if (!oldPassword)                           { changePwdError.value = '请输入原密码'; return }
  if (newPassword.length < 6)                 { changePwdError.value = '新密码至少6位'; return }
  if (newPassword !== confirmPassword)        { changePwdError.value = '两次密码不一致'; return }
  changePwdLoading.value = true
  try {
    await changePassword(oldPassword, newPassword)
    closeChangePwd()
  } catch (e) {
    changePwdError.value = e.message || String(e)
  } finally {
    changePwdLoading.value = false
  }
}

// ── 管理后台 ──
const showAdmin = ref(false)
const openAdmin = () => { showUserMenu.value = false; showAdmin.value = true; window.scrollTo(0, 0) }

// ── 服务商入驻 ──
const autoOpenJoinService = ref(false)
const openJoinService = () => {
  showUserMenu.value = false
  activeTab.value = 'services'
  currentPage.value = 'list'
  window.scrollTo(0, 0)
  autoOpenJoinService.value = true
}

// ── 积分弹窗 ──
const showPoints = ref(false)
const openPoints = () => { showUserMenu.value = false; showPoints.value = true }

// ── 关于我们 ──
const showAbout = ref(false)

// ── 语言切换 ──
const showLangMenu = ref(false)

const handleLogout = async () => { showUserMenu.value = false; await logout() }

// ── 修改用户名弹窗 ──
const showEditUsername   = ref(false)
const editUsernameForm   = ref({ username: '' })
const editUsernameError  = ref('')
const editUsernameLoading = ref(false)

const openEditUsername = () => {
  showUserMenu.value       = false
  editUsernameForm.value   = { username: currentUser.value?.username || '' }
  editUsernameError.value  = ''
  showEditUsername.value   = true
}

const submitEditUsername = async () => {
  editUsernameError.value = ''
  if (!editUsernameForm.value.username.trim()) { editUsernameError.value = '请输入用户名'; return }
  editUsernameLoading.value = true
  try {
    await setupProfile(editUsernameForm.value.username.trim())
    showEditUsername.value = false
  } catch (e) {
    editUsernameError.value = e.message || String(e)
  } finally {
    editUsernameLoading.value = false
  }
}
</script>

<template>
  <AdminView
    v-if="showAdmin"
    :current-user="currentUser"
    @back="showAdmin = false"
  />

  <MyPostsView
    v-else-if="showMyPosts"
    :current-user="currentUser"
    @back="showMyPosts = false"
  />

  <MyProblemsView
    v-else-if="!showAdmin && showMyProblems"
    :current-user="currentUser"
    @back="showMyProblems = false"
  />

  <SubmitProblemView
    v-else-if="currentPage === 'submit'"
    :current-user="currentUser"
    @back="goBackToList"
    @submitted="onSubmitted"
  />

  <ProblemDetailView
    v-else-if="currentPage === 'detail'"
    :problem-id="currentDetailId"
    @back="goBackToList"
    @go-detail="goToDetail"
    @open-auth="openAuth"
  />

  <div v-else-if="!showAdmin && !showMyPosts" class="app-shell">
    <nav class="app-nav">
      <div class="nav-inner">
        <div class="nav-logo" @click="goBackToList">
          <span class="logo-mark">▲</span>
          <span class="logo-text">3D 故障库</span>
        </div>
        <div class="nav-tabs">
          <button :class="['nav-tab', { active: activeTab === 'home' }]"   @click="switchTab('home')">{{ t('nav.home') }}</button>
          <button :class="['nav-tab', { active: activeTab === 'news' }]"   @click="switchTab('news')">{{ t('nav.news') }}</button>
          <button :class="['nav-tab', { active: activeTab === 'market' }]"   @click="switchTab('market')">{{ t('nav.market') }}</button>
          <button :class="['nav-tab', { active: activeTab === 'filament' }]"  @click="switchTab('filament')">耗材参数库</button>
          <button :class="['nav-tab', { active: activeTab === 'services' }]" @click="switchTab('services')">服务商目录</button>
          <button class="nav-tab" @click="showAbout = true">{{ t('nav.about') }}</button>
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
                <div class="user-avatar">{{ currentUser.avatar }}</div>
                <span class="user-name">{{ currentUser.username }}</span>
                <span class="menu-caret" :class="{ open: showUserMenu }">▾</span>
              </div>
              <Transition name="dropdown">
                <div v-if="showUserMenu" class="user-dropdown">
                  <button v-if="currentUser.isAdmin" class="dropdown-item admin-item" @click="openAdmin">管理后台</button>
                  <div v-if="currentUser.isAdmin" class="dropdown-divider"></div>
                  <button class="dropdown-item" @click="openMyPosts">{{ t('user.myPosts') }}</button>
                  <button class="dropdown-item" @click="openMyProblems">我发布的问题</button>
                  <button class="dropdown-item" @click="openJoinService">服务商入驻</button>
                  <div class="dropdown-divider"></div>
                  <button class="dropdown-item" @click="openEditUsername">{{ t('user.editUsername') }}</button>
                  <button class="dropdown-item" @click="openChangePwd">{{ t('user.changePwd') }}</button>
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
      <ProblemsView  v-if="activeTab === 'home'"     :current-user="currentUser" @go-detail="goToDetail" @open-auth="openAuth" @go-submit="goToSubmit" />
      <NewsView      v-else-if="activeTab === 'news'" />
      <MarketView    v-else-if="activeTab === 'market'"   :current-user="currentUser" @open-auth="openAuth" />
      <FilamentView  v-else-if="activeTab === 'filament'" />
      <ServicesView  v-else-if="activeTab === 'services'"
        :current-user="currentUser"
        :auto-open-join="autoOpenJoinService"
        @open-auth="openAuth"
        @join-opened="autoOpenJoinService = false"
      />
    </template>
    <div v-else class="app-loading">
      <span class="loading-spinner"></span>
    </div>
  </div>

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

  <!-- 修改密码弹窗 -->
  <Transition name="modal">
    <div v-if="showChangePwd" class="modal-mask">
      <div class="modal-box">
        <div class="modal-body" style="padding-top:32px">
          <h2 class="modal-title">{{ t('pwd.title') }}</h2>
          <p class="modal-sub">{{ t('pwd.sub') }}</p>
          <div class="form-fields">
            <div class="field">
              <label>{{ t('pwd.old') }}</label>
              <input v-model="changePwdForm.oldPassword" type="password" :placeholder="t('pwd.oldPh')" required @keyup.enter="submitChangePwd" />
            </div>
            <div class="field">
              <label>{{ t('pwd.new') }}</label>
              <input v-model="changePwdForm.newPassword" type="password" :placeholder="t('pwd.newPh')" required @keyup.enter="submitChangePwd" />
            </div>
            <div class="field">
              <label>{{ t('pwd.confirm') }}</label>
              <input v-model="changePwdForm.confirmPassword" type="password" :placeholder="t('pwd.confirmPh')" required @keyup.enter="submitChangePwd" />
            </div>
          </div>
          <div v-if="changePwdError" class="auth-error">{{ changePwdError }}</div>
          <button class="submit-btn" :class="{ loading: changePwdLoading }" @click="submitChangePwd" :disabled="changePwdLoading">
            <span v-if="changePwdLoading" class="btn-spinner"></span>
            {{ changePwdLoading ? t('auth.loading') : t('pwd.submit') }}
          </button>
        </div>
        <button class="modal-close" @click="closeChangePwd">✕</button>
      </div>
    </div>
  </Transition>

  <!-- 修改用户名弹窗 -->
  <Transition name="modal">
    <div v-if="showEditUsername" class="modal-mask">
      <div class="modal-box">
        <div class="modal-body" style="padding-top:32px">
          <h2 class="modal-title">{{ t('eu.title') }}</h2>
          <p class="modal-sub">{{ t('eu.sub') }}</p>
          <div class="form-fields">
            <div class="field">
              <label>{{ t('auth.username') }}</label>
              <input v-model="editUsernameForm.username" :placeholder="t('eu.ph')" @keyup.enter="submitEditUsername" autofocus />
            </div>
          </div>
          <div v-if="editUsernameError" class="auth-error">{{ editUsernameError }}</div>
          <button class="submit-btn" :class="{ loading: editUsernameLoading }" @click="submitEditUsername" :disabled="editUsernameLoading">
            <span v-if="editUsernameLoading" class="btn-spinner"></span>
            {{ editUsernameLoading ? t('auth.loading') : t('eu.submit') }}
          </button>
        </div>
        <button class="modal-close" @click="showEditUsername = false">✕</button>
      </div>
    </div>
  </Transition>

  <!-- 积分弹窗 -->
  <Transition name="modal">
    <div v-if="showPoints" class="modal-mask" @click.self="showPoints = false">
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

  <!-- 关于我们弹窗 -->
  <Transition name="modal">
    <div v-if="showAbout" class="modal-mask" @click.self="showAbout = false">
      <div class="modal-box about-box">
        <div class="about-header">
          <span class="about-logo-mark">▲</span>
          <span class="about-logo-text">3D 故障库</span>
        </div>
        <div class="modal-body" style="padding-top:20px">
          <p class="about-desc">{{ t('about.desc') }}</p>
          <div class="about-contacts">
            <div class="contact-item">
              <div class="contact-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="4" width="16" height="13" rx="3" stroke="currentColor" stroke-width="1.4"/>
                  <path d="M7 9c0 2.2 1.6 4 3.5 4a3.3 3.3 0 002.5-1.2V13h1.5V9H12v1.3a1.7 1.7 0 01-1.5.9C9.4 11.2 8.5 10.2 8.5 9c0-1.2.9-2.2 2-2.2.6 0 1.1.3 1.5.7L13 6.4A3.3 3.3 0 0010.5 5C8.6 5 7 6.8 7 9z" fill="currentColor"/>
                </svg>
              </div>
              <div class="contact-info">
                <span class="contact-label">{{ t('about.wechat') }}</span>
                <span class="contact-value">crazy0568</span>
              </div>
            </div>
            <div class="contact-item">
              <div class="contact-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4.5 3.5h3l1.5 3.5-1.8 1.1a9 9 0 004.2 4.2L12.5 10.5l3.5 1.5v3c0 .8-.7 1.5-1.5 1.5C6.9 16.5 3.5 13.1 3.5 5c0-.8.7-1.5 1.5-1.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="contact-info">
                <span class="contact-label">{{ t('about.phone') }}</span>
                <span class="contact-value">+86-17111469098</span>
              </div>
            </div>
          </div>
          <p class="about-footer">{{ t('about.copy') }}</p>
        </div>
        <button class="modal-close" @click="showAbout = false">✕</button>
      </div>
    </div>
  </Transition>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #f5f5f7; font-family: -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif; color: #1d1d1f; }
</style>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f7; }
.app-nav { position: sticky; top: 0; z-index: 200; background: rgba(255,255,255,0.88); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0,0,0,0.08); height: 52px; }
.nav-inner { max-width: 1200px; margin: 0 auto; height: 100%; padding: 0 24px; display: flex; align-items: center; gap: 0; }
.nav-logo { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; transition: opacity 0.15s; flex-shrink: 0; margin-right: 20px; }
.nav-logo:hover { opacity: 0.7; }
.logo-mark { font-size: 16px; color: #ff6b6b; }
.logo-text { font-size: 15px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.01em; }
.nav-tabs { display: flex; align-items: center; height: 100%; flex: 1; }
.nav-tab { padding: 0 14px; height: 100%; background: transparent; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px; color: #6e6e73; font-size: 14px; font-weight: 500; font-family: inherit; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.nav-tab:hover { color: #1d1d1f; }
.nav-tab.active { color: #1d1d1f; border-bottom-color: #1d1d1f; }
.nav-right { display: flex; align-items: center; gap: 8px; position: relative; flex-shrink: 0; }
.nav-btn { border-radius: 100px; font-size: 13px; cursor: pointer; font-family: inherit; padding: 6px 16px; transition: all 0.18s; border: 1px solid transparent; }
.nav-btn.ghost { background: transparent; border-color: rgba(0,0,0,0.15); color: #6e6e73; }
.nav-btn.ghost:hover { border-color: rgba(0,0,0,0.3); color: #1d1d1f; }
.nav-btn.solid { background: #1d1d1f; color: #fff; border-color: #1d1d1f; font-weight: 500; }
.nav-btn.solid:hover { background: #3a3a3c; }

/* 铃铛 */
.bell-wrap { position: relative; }
.bell-btn  { position: relative; background: transparent; border: none; color: #6e6e73; cursor: pointer; padding: 6px; display: flex; align-items: center; border-radius: 8px; transition: color 0.15s; }
.bell-btn:hover { color: #1d1d1f; }
.bell-badge { position: absolute; top: 1px; right: 1px; min-width: 16px; height: 16px; padding: 0 4px; background: #ff6b6b; color: #fff; font-size: 10px; font-weight: 700; border-radius: 100px; display: flex; align-items: center; justify-content: center; }

.notif-panel { position: absolute; top: calc(100% + 10px); right: 0; width: 320px; background: #fff; border: 1px solid rgba(0,0,0,0.1); border-radius: 16px; overflow: hidden; z-index: 300; box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
.notif-head  { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 10px; border-bottom: 1px solid rgba(0,0,0,0.06); }
.notif-title-text { font-size: 14px; font-weight: 600; color: #1d1d1f; }
.notif-read-all   { background: transparent; border: none; font-size: 12px; color: #6e6e73; cursor: pointer; font-family: inherit; transition: color 0.15s; }
.notif-read-all:hover { color: #1d1d1f; }
.notif-empty { padding: 24px 16px; font-size: 13px; color: #aeaeb2; text-align: center; }
.notif-list  { max-height: 360px; overflow-y: auto; }
.notif-item  { padding: 12px 16px; border-bottom: 1px solid rgba(0,0,0,0.05); transition: background 0.15s; }
.notif-item:last-child { border-bottom: none; }
.notif-item.unread { background: rgba(0,122,255,0.04); }
.notif-item-title { font-size: 13px; font-weight: 500; color: #1d1d1f; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
.notif-item.unread .notif-item-title::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #ff6b6b; flex-shrink: 0; }
.notif-item-body  { font-size: 12px; color: #6e6e73; line-height: 1.5; margin-bottom: 4px; }
.notif-item-time  { font-size: 11px; color: #aeaeb2; }

/* 用户菜单 */
.user-wrap { position: relative; }
.nav-user { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 8px; border-radius: 100px; transition: background 0.15s; user-select: none; }
.nav-user:hover { background: rgba(0,0,0,0.05); }
.user-avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg,#ff6b6b,#ffb347); color: #fff; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.user-name { font-size: 14px; color: #1d1d1f; }
.menu-caret { font-size: 11px; color: #6e6e73; transition: transform 0.2s; }
.menu-caret.open { transform: rotate(180deg); }

.user-dropdown { position: absolute; top: calc(100% + 8px); right: 0; background: #fff; border: 1px solid rgba(0,0,0,0.1); border-radius: 14px; min-width: 140px; overflow: hidden; z-index: 300; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
.dropdown-item { width: 100%; padding: 12px 16px; background: transparent; border: none; color: #1d1d1f; font-size: 14px; font-family: inherit; text-align: left; cursor: pointer; transition: background 0.15s; }
.dropdown-item:hover { background: rgba(0,0,0,0.04); }
.dropdown-item.danger { color: #ff3b30; }
.dropdown-item.admin-item { color: #0f3460; font-weight: 600; }
.dropdown-divider { height: 1px; background: rgba(0,0,0,0.06); margin: 2px 0; }
.menu-backdrop { position: fixed; inset: 0; z-index: 250; }

.dropdown-enter-active, .dropdown-leave-active { transition: all 0.15s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-6px); }


.modal-mask { position: fixed; inset: 0; z-index: 500; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-box { background: #fff; border: 1px solid rgba(0,0,0,0.1); border-radius: 24px; width: 100%; max-width: 400px; position: relative; overflow: hidden; box-shadow: 0 16px 48px rgba(0,0,0,0.18); }
.modal-tabs { display: flex; border-bottom: 1px solid rgba(0,0,0,0.08); }
.tab { flex: 1; padding: 16px; background: transparent; border: none; color: #6e6e73; font-size: 15px; font-family: inherit; cursor: pointer; transition: all 0.18s; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tab.active { color: #1d1d1f; border-bottom-color: #1d1d1f; }
.tab:hover:not(.active) { color: #1d1d1f; }
.modal-body { padding: 28px 28px 32px; }
.modal-title { font-size: 22px; font-weight: 700; color: #1d1d1f; margin-bottom: 6px; letter-spacing: -0.02em; }
.modal-sub { font-size: 13px; color: #6e6e73; margin-bottom: 24px; line-height: 1.5; }
.form-fields { display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 12px; color: #6e6e73; letter-spacing: 0.04em; }
.field input { background: #f5f5f7; border: 1px solid rgba(0,0,0,0.1); border-radius: 10px; padding: 11px 14px; color: #1d1d1f; font-size: 15px; font-family: inherit; outline: none; transition: border-color 0.2s; }
.field input:focus { border-color: rgba(0,0,0,0.25); }
.field input::placeholder { color: #c7c7cc; }
.field input:disabled { opacity: 0.5; cursor: not-allowed; }
.field-error { font-size: 11px; color: #ff3b30; margin-top: -2px; }
.pwd-wrap { position: relative; }
.pwd-wrap input { padding-right: 42px; width: 100%; }
.eye-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: #aeaeb2; cursor: pointer; padding: 4px; display: flex; align-items: center; transition: color 0.15s; }
.eye-btn:hover:not(:disabled) { color: #6e6e73; }
.eye-btn:disabled { cursor: not-allowed; }
.phone-row { display: flex; gap: 8px; }
.phone-input { flex: 1; background: #f5f5f7; border: 1px solid rgba(0,0,0,0.1); border-radius: 10px; padding: 11px 14px; color: #1d1d1f; font-size: 15px; font-family: inherit; outline: none; transition: border-color 0.2s; }
.phone-input:focus { border-color: rgba(0,0,0,0.25); }
.phone-input::placeholder { color: #c7c7cc; }
.phone-input:disabled { opacity: 0.5; }
.send-btn { flex-shrink: 0; padding: 11px 14px; background: #f5f5f7; border: 1px solid rgba(0,0,0,0.12); border-radius: 10px; color: #6e6e73; font-size: 13px; font-family: inherit; cursor: pointer; white-space: nowrap; transition: all 0.18s; }
.send-btn:hover:not(:disabled) { border-color: rgba(0,0,0,0.25); color: #1d1d1f; }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.auth-error { background: rgba(255,59,48,0.08); border: 1px solid rgba(255,59,48,0.2); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #ff3b30; margin-bottom: 14px; }
.submit-btn { width: 100%; padding: 13px; background: #1d1d1f; color: #fff; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.18s; display: flex; align-items: center; justify-content: center; gap: 8px; }
.submit-btn:hover:not(:disabled) { background: #3a3a3c; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.submit-btn.loading { background: #aeaeb2; color: #fff; }
.btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
.modal-close { position: absolute; top: 12px; right: 14px; background: rgba(0,0,0,0.06); border: none; color: #6e6e73; font-size: 13px; cursor: pointer; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
.modal-close:hover { background: rgba(0,0,0,0.1); color: #1d1d1f; }
.modal-enter-active, .modal-leave-active { transition: all 0.25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

/* 积分 */
.points-display { display: flex; align-items: baseline; justify-content: center; gap: 6px; margin: 24px 0 4px; }
.points-value { font-size: 56px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.04em; }
.points-unit { font-size: 18px; color: #6e6e73; }

/* 地球语言切换 */
.lang-wrap { position: relative; }
.icon-btn { background: transparent; border: none; color: #6e6e73; cursor: pointer; padding: 6px; display: flex; align-items: center; border-radius: 8px; transition: color 0.15s; }
.icon-btn:hover { color: #1d1d1f; }
.lang-dropdown { position: absolute; top: calc(100% + 10px); right: 0; background: #fff; border: 1px solid rgba(0,0,0,0.1); border-radius: 14px; overflow: hidden; z-index: 300; box-shadow: 0 4px 24px rgba(0,0,0,0.1); min-width: 130px; }
.lang-item { width: 100%; padding: 11px 16px; background: transparent; border: none; color: #1d1d1f; font-size: 14px; font-family: inherit; text-align: left; cursor: pointer; transition: background 0.15s; display: flex; align-items: center; gap: 10px; }
.lang-item:hover { background: rgba(0,0,0,0.04); }
.lang-item.active { font-weight: 600; }
.lang-flag { font-size: 18px; line-height: 1; }

/* 关于我们弹窗 */
.about-box { max-width: 360px; }
.about-header { display: flex; align-items: center; gap: 8px; padding: 24px 28px 0; }
.about-logo-mark { font-size: 20px; color: #ff6b6b; }
.about-logo-text { font-size: 17px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.01em; }
.about-desc { font-size: 14px; color: #6e6e73; line-height: 1.7; margin-bottom: 24px; }
.about-contacts { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
.contact-item { display: flex; align-items: center; gap: 14px; background: #f5f5f7; border-radius: 14px; padding: 14px 16px; }
.contact-icon { width: 36px; height: 36px; border-radius: 10px; background: #fff; display: flex; align-items: center; justify-content: center; color: #1d1d1f; flex-shrink: 0; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.contact-info { display: flex; flex-direction: column; gap: 2px; }
.contact-label { font-size: 11px; color: #aeaeb2; letter-spacing: 0.04em; }
.contact-value { font-size: 15px; font-weight: 600; color: #1d1d1f; letter-spacing: 0.01em; }
.about-footer { font-size: 11px; color: #c7c7cc; text-align: center; }

/* Auth init loading */
.app-loading { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 52px); }
.loading-spinner { width: 28px; height: 28px; border: 2.5px solid rgba(0,0,0,0.1); border-top-color: #1d1d1f; border-radius: 50%; animation: spin 0.75s linear infinite; }
</style>
