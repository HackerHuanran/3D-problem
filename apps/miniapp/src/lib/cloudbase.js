import cloudbase from '@cloudbase/js-sdk'

const env = import.meta.env?.VITE_TCB_ENV_ID || ''

const app = cloudbase.init({ env })
const auth = app.auth({ persistence: 'local' })
const db = app.database()

export { app, auth, db }
