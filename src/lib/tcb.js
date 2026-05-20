import cloudbase from '@cloudbase/js-sdk'

if (!import.meta.env.VITE_TCB_ENV_ID) {
  console.error('❌ 缺少 VITE_TCB_ENV_ID 环境变量')
}

export const TCB_COS_ORIGIN = import.meta.env.VITE_TCB_COS_ORIGIN || ''
export const TCB_CDN_BASE = import.meta.env.VITE_TCB_CDN_BASE || ''

// 开发环境：把 SDK 内部对 COS 的直接 PUT 请求拦截，转走 Vite 代理，绕开浏览器 CORS 限制
if (import.meta.env.DEV && TCB_COS_ORIGIN) {
  const _open = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (typeof url === 'string' && url.startsWith(TCB_COS_ORIGIN)) {
      url = '/cos-proxy' + url.slice(TCB_COS_ORIGIN.length)
    }
    return _open.call(this, method, url, ...rest)
  }
}

const app = cloudbase.init({ env: import.meta.env.VITE_TCB_ENV_ID })

export { app }
export const auth = app.auth({ persistence: 'local' })
export const db   = app.database()
export const cmd  = db.command
