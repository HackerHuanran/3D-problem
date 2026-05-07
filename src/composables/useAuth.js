// src/composables/useAuth.js
import { ref } from 'vue'
import { supabase } from '@/lib/supabase.js'

const currentUser = ref(null)

async function loadProfile(user) {
  currentUser.value = {
    id: user.id,
    email: user.email,
    username: user.email.split('@')[0],
    avatar: user.email[0].toUpperCase()
  }
  try {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar')
      .eq('id', user.id)
      .maybeSingle()
    if (data) {
      currentUser.value = {
        id: user.id,
        email: user.email,
        username: data.username || user.email.split('@')[0],
        avatar: data.avatar || user.email[0].toUpperCase()
      }
    }
  } catch (e) {
    console.warn('loadProfile 失败:', e.message)
  }
}

supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) loadProfile(session.user)
})

supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth event:', event)
  if (event === 'SIGNED_IN' && session?.user) {
    await loadProfile(session.user)
  } else if (event === 'SIGNED_OUT') {
    currentUser.value = null
  }
})

export function useAuth() {

  const register = async (username, email, password) => {
    const { data: existing } = await supabase
      .from('profiles').select('id').eq('username', username).maybeSingle()
    if (existing) throw new Error('用户名已被占用')

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username } }
    })
    if (error) {
      if (error.message.includes('already registered')) throw new Error('该邮箱已注册')
      throw new Error(error.message)
    }
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username,
        avatar: username[0].toUpperCase()
      })
      await loadProfile(data.user)
    }
  }

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error('邮箱或密码错误')
    if (data.user) await loadProfile(data.user)
  }

  const logout = async () => {
    // 先立即清空本地状态，不等网络请求
    currentUser.value = null

    // 再异步通知 Supabase，加 2 秒超时
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('signOut timeout')), 2000)
    )
    try {
      await Promise.race([supabase.auth.signOut(), timeout])
    } catch (e) {
      console.warn('signOut:', e.message)
      // 即使超时或报错，本地状态已经清空，用户看到的是已退出
    }

    // 清除本地 Supabase session 缓存
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) localStorage.removeItem(key)
    })
  }

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) await loadProfile(session.user)
  }

  return { currentUser, register, login, logout, init }
}
