const cloud = require('wx-server-sdk')
const tencentcloudFaceid = require('tencentcloud-sdk-nodejs-faceid')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

function credential() {
  const secretId = process.env.SECRET_ID || process.env.TENCENTCLOUD_SECRET_ID
  const secretKey = process.env.SECRET_KEY || process.env.TENCENTCLOUD_SECRET_KEY
  if (!secretId || !secretKey) {
    throw new Error('云函数缺少 SECRET_ID / SECRET_KEY，请先在云函数环境变量中配置腾讯云密钥')
  }
  return { secretId, secretKey }
}

function maskRealname(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.length <= 1) return text
  if (text.length === 2) return `${text[0]}*`
  return `${text[0]}${'*'.repeat(Math.max(1, text.length - 2))}${text[text.length - 1]}`
}

function maskIdNumber(value) {
  const text = String(value || '').trim().toUpperCase()
  if (!text) return ''
  if (text.length <= 8) return text
  return `${text.slice(0, 3)}********${text.slice(-4)}`
}

function normalizePhone(value) {
  return String(value || '').trim()
}

async function getProfileByUid(uid) {
  const { data } = await db.collection('profiles').where({ uid }).limit(1).get()
  return data?.[0] || null
}

async function upsertRealnameRequest(userId, payload) {
  const { data } = await db.collection('realname_requests')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .limit(1)
    .get()

  if (data?.length) {
    await db.collection('realname_requests').doc(data[0]._id).update({
      ...payload,
      updated_at: db.serverDate(),
    })
    return data[0]._id
  }

  const { id } = await db.collection('realname_requests').add({
    user_id: userId,
    ...payload,
    created_at: db.serverDate(),
    updated_at: db.serverDate(),
  })
  return id
}

exports.main = async (event = {}, context = {}) => {
  try {
    const auth = cloud.getWXContext?.() || {}
    const tcbUid =
      context?.auth?.uid ||
      context?.userInfo?.uid ||
      context?.uid ||
      auth?.UID ||
      auth?.uid ||
      event?.userId ||
      ''

    const realname = String(event.realname || '').trim()
    const idNumber = String(event.idNumber || '').trim().toUpperCase()
    const phone = normalizePhone(event.phone)

    if (!tcbUid) {
      return { ok: false, error: '未获取到当前登录用户，请重新登录后再试' }
    }
    if (!realname) {
      return { ok: false, error: '请填写真实姓名' }
    }
    if (!/^[\u4e00-\u9fa5·]{2,20}$/.test(realname)) {
      return { ok: false, error: '请输入正确的真实姓名' }
    }
    if (!/^\d{17}[\dX]$/.test(idNumber)) {
      return { ok: false, error: '请输入正确的18位身份证号' }
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return { ok: false, error: '请输入正确的手机号' }
    }

    const profile = await getProfileByUid(tcbUid)
    if (!profile?._id) {
      return { ok: false, error: '未找到账号资料，请重新登录后再试' }
    }

    const FaceidClient = tencentcloudFaceid.faceid.v20180301.Client
    const client = new FaceidClient({
      credential: credential(),
      region: 'ap-beijing',
      profile: {
        httpProfile: {
          endpoint: 'faceid.tencentcloudapi.com',
        },
      },
    })

    const verifyRes = await client.PhoneVerification({
      IdCard: idNumber,
      Name: realname,
      Phone: phone,
    })

    const result = String(verifyRes?.Result || '').trim()
    const description = String(verifyRes?.Description || '').trim()
    const requestId = String(verifyRes?.RequestId || '').trim()
    const isVerified = result === '0' || /^一致/.test(description)

    const requestPayload = {
      username: profile.username || '',
      realname,
      phone,
      status: isVerified ? 'verified' : 'rejected',
      review_note: isVerified ? '' : (description || '三要素核验未通过'),
      reviewer_id: 'system_faceid',
      reviewer_name: '腾讯云三要素核验',
      verified_channel: 'tencent_faceid_phone_verification',
      verified_result_code: result,
      verified_result_desc: description,
      request_id: requestId,
      masked_name: maskRealname(realname),
      masked_id_number: maskIdNumber(idNumber),
      submitted_at: db.serverDate(),
      reviewed_at: db.serverDate(),
    }

    await upsertRealnameRequest(tcbUid, requestPayload)

    await db.collection('profiles').doc(profile._id).update({
      realname_status: isVerified ? 'verified' : 'rejected',
      realname_masked_name: maskRealname(realname),
      realname_masked_id: maskIdNumber(idNumber),
      realname_verified_at: isVerified ? db.serverDate() : null,
      realname_rejected_reason: isVerified ? '' : (description || '三要素核验未通过'),
      phone,
      updated_at: db.serverDate(),
    })

    return {
      ok: isVerified,
      verified: isVerified,
      status: isVerified ? 'verified' : 'rejected',
      maskedName: maskRealname(realname),
      maskedIdNumber: maskIdNumber(idNumber),
      message: isVerified ? '实名认证成功' : (description || '实名认证未通过'),
      resultCode: result,
      requestId,
    }
  } catch (error) {
    console.error('[realnameVerify] failed:', error)
    return {
      ok: false,
      verified: false,
      error: error?.message || '实名认证失败，请稍后重试',
    }
  }
}
