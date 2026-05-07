// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// 兼容新版 Publishable key 和旧版 anon key
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 环境变量，请检查 .env 文件')
} else {
  console.log('✅ Supabase 初始化成功:', supabaseUrl)
}

export const supabase = createClient(supabaseUrl, supabaseKey)
