// src/lib/supabase.js
// Supabase 客户端初始化
// 
// 使用方法：
// 1. 去 Supabase 控制台 → Settings → API
// 2. 复制 Project URL 和 anon public key
// 3. 在项目根目录创建 .env 文件填入下面两个变量

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少 Supabase 环境变量，请检查 .env 文件')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
