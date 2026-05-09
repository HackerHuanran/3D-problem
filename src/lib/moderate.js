import { app } from '@/lib/tcb.js'

const LABEL_ZH = {
  Porn: '色情', Illegal: '违法违禁', Abuse: '谩骂',
  Ad: '广告', Custom: '违禁词',
}

export async function checkContent(text) {
  if (!text?.trim()) return { pass: true, msg: '' }
  try {
    const res = await app.callFunction({ name: 'moderate', data: { text } })
    const r   = res.result ?? {}
    const pass = r.pass !== false
    return { pass, msg: pass ? '' : `内容含有${LABEL_ZH[r.label] || '违规'}信息，请修改后重试` }
  } catch {
    return { pass: true, msg: '' }
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function checkImage(file) {
  if (!file) return { pass: true, msg: '' }
  try {
    const imageBase64 = await fileToBase64(file)
    const res  = await app.callFunction({ name: 'moderate', data: { imageBase64 } })
    const r    = res.result ?? {}
    const pass = r.pass !== false
    return { pass, msg: pass ? '' : '图片含有违规内容，请更换后重试' }
  } catch {
    return { pass: true, msg: '' }
  }
}
