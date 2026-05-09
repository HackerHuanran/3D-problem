import cloudbase from '@cloudbase/js-sdk'

if (!import.meta.env.VITE_TCB_ENV_ID) {
  console.error('❌ 缺少 VITE_TCB_ENV_ID 环境变量')
}

// 开发环境：把 SDK 内部对 COS 的直接 PUT 请求拦截，转走 Vite 代理，绕开浏览器 CORS 限制
if (import.meta.env.DEV) {
  const COS_ORIGIN = 'https://7072-problem-d1gg06meg3dd7da6b-1257726828.cos.ap-shanghai.myqcloud.com'
  const _open = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (typeof url === 'string' && url.startsWith(COS_ORIGIN)) {
      url = '/cos-proxy' + url.slice(COS_ORIGIN.length)
    }
    return _open.call(this, method, url, ...rest)
  }
}

const app = cloudbase.init({ env: import.meta.env.VITE_TCB_ENV_ID })

export { app }
export const auth = app.auth({ persistence: 'local' })
export const db   = app.database()
export const cmd  = db.command
