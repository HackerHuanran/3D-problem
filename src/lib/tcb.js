import cloudbase from '@cloudbase/js-sdk'

if (!import.meta.env.VITE_TCB_ENV_ID) {
  console.error('❌ 缺少 VITE_TCB_ENV_ID 环境变量')
}

const app = cloudbase.init({ env: import.meta.env.VITE_TCB_ENV_ID })

export const auth = app.auth({ persistence: 'local' })
export const db   = app.database()
export const cmd  = db.command
