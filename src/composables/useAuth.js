// src/composables/useAuth.js
// 用户认证 —— 对接 Supabase Auth

import { ref } from 'vue'
import { supabase } from '@/lib/supabase.js'

const currentUser = ref(null)

// 监听登录状态变化（刷新页面自动恢复登录）
supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    await loadProfile(session.user)
  } else {
    currentUser.value = null
  }
})

async function loadProfile(user) {
  const { data } = await supabase
    .from('profiles')
    .select('username, avatar')
    .eq('id', user.id)
    .single()
  currentUser.value = {
    id: user.id,
    email: user.email,
    username: data?.username || user.email.split('@')[0],
    avatar: data?.avatar || user.email[0].toUpperCase()
  }
}

export function useAuth() {
  const register = async (username, email, password) => {
    const { data: existing } = await supabase
      .from('profiles').select('id').eq('username', username).maybeSingle()
    if (existing) throw new Error('用户名已被占用')

    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username } }
    })
    if (error) throw new Error(error.message === 'User already registered' ? '该邮箱已注册' : error.message)
  }

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error('邮箱或密码错误')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    currentUser.value = null
  }

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) await loadProfile(session.user)
  }

  return { currentUser, register, login, logout, init }
}
