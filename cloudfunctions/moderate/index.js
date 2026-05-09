const tencentcloudTms = require('tencentcloud-sdk-nodejs-tms')
const tencentcloudIms = require('tencentcloud-sdk-nodejs-ims')

const credential = () => ({
  secretId:  process.env.SECRET_ID,
  secretKey: process.env.SECRET_KEY,
})

exports.main = async (event) => {
  const { text, imageBase64 } = event

  // 文本审核
  if (text?.trim()) {
    try {
      const client = new tencentcloudTms.tms.v20201229.Client({ credential: credential(), region: 'ap-shanghai' })
      const res = await client.TextModeration({
        Content: Buffer.from(text.trim().slice(0, 5000)).toString('base64'),
        BizType: '',
      })
      if (res.Suggestion === 'Block') {
        return { pass: false, label: res.Label, suggestion: res.Suggestion }
      }
    } catch (e) {
      console.error('[moderate] TMS error:', e.message)
    }
  }

  // 图片审核
  if (imageBase64) {
    try {
      const client = new tencentcloudIms.ims.v20201229.Client({ credential: credential(), region: 'ap-shanghai' })
      const res = await client.ImageModeration({ FileContent: imageBase64 })
      if (res.Suggestion === 'Block') {
        return { pass: false, label: res.Label, suggestion: res.Suggestion }
      }
    } catch (e) {
      console.error('[moderate] IMS error:', e.message)
    }
  }

  return { pass: true }
}
