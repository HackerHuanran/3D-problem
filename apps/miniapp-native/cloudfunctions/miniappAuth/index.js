const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

function getChinaDayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getChinaHourKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    hour12: false,
  }).format(date)
}

function buildUsageRecordId(dayKey = '', uid = '') {
  return `${String(dayKey || '').trim()}_${String(uid || '').trim()}`.replace(/[^a-zA-Z0-9_-]/g, '')
}

function buildUsageHourRecordId(dayKey = '', hourKey = '', uid = '') {
  return `${String(dayKey || '').trim()}_${String(hourKey || '').trim()}_${String(uid || '').trim()}`.replace(/[^a-zA-Z0-9_-]/g, '')
}

function getRecordTime(record = {}) {
  const value = record?.updated_at || record?.created_at || record?.updatedAt || record?.createdAt || 0
  if (typeof value === 'number') return value
  if (value && typeof value.toDate === 'function') return value.toDate().getTime()
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function isGenericWechatName(name = '') {
  const text = String(name || '').trim()
  if (!text) return true
  if (text === '微信用户') return true
  return /^微信用户[0-9A-F]{0,8}$/i.test(text)
}

function isAdminProfile(profile = {}) {
  const role = String(profile.role || '').trim().toLowerCase()
  return profile.isAdmin === true || profile.isAdmin === 1 || ['admin', 'administrator', 'root'].includes(role)
}

function getProfileScore(record = {}) {
  const source = String(record.source || '').toLowerCase()
  const username = record.username || record.nickName || record.nick_name || record.name || ''
  let score = 0
  if (record.profileEdited === true || source.includes('profile_edit')) score += 1000
  if (!isGenericWechatName(username)) score += 100
  if (record.avatarUrl || record.avatar_url) score += 20
  if (record.phone) score += 5
  if (record.gender && record.gender !== 'unknown') score += 3
  return score
}

function pickPreferredProfile(rows = []) {
  return [...rows].sort((a, b) => {
    const scoreDiff = getProfileScore(b) - getProfileScore(a)
    if (scoreDiff) return scoreDiff
    return getRecordTime(b) - getRecordTime(a)
  })[0] || null
}

function pickWechatName(profile = {}) {
  return profile.nickName || profile.nick_name || profile.username || profile.name || ''
}

function pickWechatAvatar(profile = {}) {
  return profile.avatarUrl || profile.avatar_url || ''
}

function normalizeGender(value) {
  const gender = String(value || 'unknown')
  return ['male', 'female', 'unknown'].includes(gender) ? gender : 'unknown'
}

function normalizePoints(value) {
  const points = Number(value || 0)
  return Number.isFinite(points) && points > 0 ? Math.floor(points) : 0
}

function buildPointsLogId(uid = '', sourceType = '', sourceId = '') {
  return `${String(uid || '').trim()}_${String(sourceType || '').trim()}_${String(sourceId || '').trim()}`
    .replace(/[^a-zA-Z0-9_-]/g, '')
}

function getChinaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function buildUser(openid, profile = {}) {
  const uid = `wx_${openid}`
  const username = String(profile.username || pickWechatName(profile) || `微信用户${String(openid).slice(-4).toUpperCase()}`).trim()
  const avatar = profile.avatar || (username ? username.slice(0, 1) : '微')
  const avatarUrl = profile.avatarUrl || profile.avatar_url || ''
  return {
    id: uid,
    uid,
    username,
    nickName: username,
    displayName: username,
    avatar,
    avatarText: avatar,
    avatarUrl,
    points: profile.points || 0,
    phone: profile.phone || '',
    gender: normalizeGender(profile.gender),
    status: profile.status || 'active',
    isAdmin: isAdminProfile(profile),
    profileEdited: profile.profileEdited === true,
  }
}

function withTimeout(promise, ms = 3000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

async function loadProfileRows(uid) {
  const { data } = await withTimeout(
    db.collection('profiles').where({ uid }).limit(20).get(),
    3000,
  )
  return Array.isArray(data) ? data : []
}

async function cleanupDuplicateProfiles(rows = [], keepId = '') {
  for (const row of rows) {
    if (!row?._id || row._id === keepId) continue
    try {
      await db.collection('profiles').doc(row._id).remove()
    } catch (error) {
      console.warn('cleanup duplicate profile failed', row._id, error)
    }
  }
}

async function saveProfile(uid, profileDraft = {}) {
  const rows = await loadProfileRows(uid)
  const existed = pickPreferredProfile(rows)
  const username = String(profileDraft.username || existed?.username || '微信用户').trim() || '微信用户'
  const avatarUrl = String(profileDraft.avatarUrl || existed?.avatarUrl || '').trim()
  const profile = {
    ...(existed || {}),
    uid,
    username,
    avatar: username.slice(0, 1) || '微',
    avatarUrl,
    phone: String(profileDraft.phone || '').trim(),
    gender: normalizeGender(profileDraft.gender),
    points: existed?.points || 0,
    status: existed?.status || 'active',
    isAdmin: isAdminProfile(existed),
    source: 'miniapp_profile_edit',
    profileEdited: true,
  }
  const payload = {
    uid: profile.uid,
    username: profile.username,
    avatar: profile.avatar,
    avatarUrl: profile.avatarUrl,
    phone: profile.phone,
    gender: profile.gender,
    points: profile.points,
    status: profile.status,
    isAdmin: profile.isAdmin,
    source: profile.source,
    profileEdited: true,
    updated_at: db.serverDate(),
  }

  if (existed?._id) {
    await db.collection('profiles').doc(existed._id).update({ data: payload })
    await cleanupDuplicateProfiles(rows, existed._id)
    return { ...profile, _id: existed._id }
  }

  const addRes = await db.collection('profiles').add({
    data: {
      ...payload,
      created_at: db.serverDate(),
    },
  })
  return { ...profile, _id: addRes?._id || '' }
}

async function syncLoginProfile(uid, openid, wechatProfile = {}) {
  const defaultProfile = {
    uid,
    username: pickWechatName(wechatProfile) || `微信用户${String(openid).slice(-4).toUpperCase()}`,
    avatar: '微',
    avatarUrl: pickWechatAvatar(wechatProfile),
    phone: '',
    gender: 'unknown',
    points: 0,
    status: 'active',
    isAdmin: false,
  }
  const rows = await loadProfileRows(uid)
  const existed = pickPreferredProfile(rows)

  if (existed) {
    const incomingName = pickWechatName(wechatProfile)
    const incomingAvatar = pickWechatAvatar(wechatProfile)
    const shouldFillName = !existed.username && !isGenericWechatName(incomingName)
    const shouldFillAvatar = !existed.avatarUrl && !!incomingAvatar
    const profile = {
      ...defaultProfile,
      ...existed,
      username: existed.username || (!isGenericWechatName(incomingName) ? incomingName : defaultProfile.username),
      avatarUrl: existed.avatarUrl || incomingAvatar || defaultProfile.avatarUrl,
      isAdmin: isAdminProfile(existed),
    }

    if (shouldFillName || shouldFillAvatar) {
      await db.collection('profiles').doc(existed._id).update({
        data: {
          ...(shouldFillName ? { username: profile.username } : {}),
          ...(shouldFillAvatar ? { avatarUrl: profile.avatarUrl } : {}),
          updated_at: db.serverDate(),
        },
      })
    }
    await cleanupDuplicateProfiles(rows, existed._id)
    return profile
  }

  const addProfile = {
    ...defaultProfile,
    source: 'miniapp_wechat',
    profileEdited: false,
    created_at: db.serverDate(),
  }
  await db.collection('profiles').add({ data: addProfile })
  return addProfile
}

async function ensureProfile(uid, openid = '') {
  const rows = await loadProfileRows(uid)
  const existed = pickPreferredProfile(rows)
  if (existed) {
    await cleanupDuplicateProfiles(rows, existed._id)
    return existed
  }

  const username = `微信用户${String(openid || uid).slice(-4).toUpperCase()}`
  const profile = {
    uid,
    username,
    avatar: username.slice(0, 1) || '微',
    avatarUrl: '',
    phone: '',
    gender: 'unknown',
    points: 0,
    status: 'active',
    isAdmin: false,
    source: 'miniapp_auto_create',
    profileEdited: false,
    created_at: db.serverDate(),
    updated_at: db.serverDate(),
  }
  const addRes = await db.collection('profiles').add({ data: profile })
  return {
    ...profile,
    _id: addRes?._id || '',
  }
}

async function awardSubmissionPoints({ uid = '', openid = '', submissionId = '', submissionType = '', operatorUid = '' } = {}) {
  const safeSubmissionId = String(submissionId || '').trim()
  const safeSubmissionType = String(submissionType || 'problem').trim() || 'problem'
  const safeOperatorUid = String(operatorUid || uid || '').trim()
  if (!uid || !safeSubmissionId) {
    return {
      ok: false,
      error: '缺少积分来源信息',
    }
  }

  if (safeOperatorUid && safeOperatorUid !== uid) {
    const rows = await loadProfileRows(safeOperatorUid)
    const operatorProfile = pickPreferredProfile(rows) || {}
    if (!isAdminProfile(operatorProfile)) {
      return {
        ok: false,
        error: '仅管理员可给其他用户发放积分',
      }
    }
  }

  try {
    const { data } = await db.collection('user_problems').where({ _id: safeSubmissionId }).limit(1).get()
    const submission = data?.[0] || null
    if (!submission) {
      return {
        ok: false,
        error: '投稿不存在，无法发放积分',
      }
    }
    if (submission.user_id && submission.user_id !== uid) {
      const rows = await loadProfileRows(safeOperatorUid)
      const operatorProfile = pickPreferredProfile(rows) || {}
      if (!isAdminProfile(operatorProfile)) {
        return {
          ok: false,
          error: '只能给投稿作者发放积分',
        }
      }
    }
    if (submission.status !== 'published') {
      return {
        ok: false,
        error: '投稿审核通过后才会发放积分',
      }
    }
    if (submission?.points_awarded === true) {
      const profile = await ensureProfile(uid, openid)
      return {
        ok: true,
        awarded: false,
        points: normalizePoints(profile.points),
      }
    }
  } catch (error) {
    console.warn('load submission points status failed', safeSubmissionId, error)
    return {
      ok: false,
      error: error?.message || '读取投稿失败',
    }
  }

  const logId = buildPointsLogId(uid, safeSubmissionType, safeSubmissionId)
  try {
    const { data } = await db.collection('points_logs').where({ _id: logId }).limit(1).get()
    if (Array.isArray(data) && data.length) {
      const profile = await ensureProfile(uid, openid)
      return {
        ok: true,
        awarded: false,
        points: normalizePoints(profile.points),
      }
    }
  } catch (error) {
    console.warn('load points log failed', logId, error)
  }

  const dayKey = getChinaDateKey(new Date())
  try {
    const countRes = await db.collection('points_logs')
      .where({
        uid,
        type: 'earn',
        day_key: dayKey,
      })
      .count()
    const todayCount = Number(countRes?.total || countRes?.count || 0)
    if (todayCount >= 5) {
      await db.collection('user_problems').doc(safeSubmissionId).update({
        data: {
          points_awarded: false,
          points_award_skipped: true,
          points_award_skip_reason: 'daily_limit',
          points_award_checked_at: db.serverDate(),
          updated_at: db.serverDate(),
        },
      })
      return {
        ok: true,
        awarded: false,
        dailyLimitReached: true,
        dailyLimit: 5,
        todayCount,
        error: '今日积分奖励已达上限',
      }
    }
  } catch (error) {
    console.warn('count daily points failed', uid, dayKey, error)
  }

  const profile = await ensureProfile(uid, openid)
  const nextPoints = normalizePoints(profile.points) + 1

  if (profile?._id) {
    await db.collection('profiles').doc(profile._id).update({
      data: {
        points: nextPoints,
        updated_at: db.serverDate(),
      },
    })
  }

  try {
    await db.collection('user_problems').doc(safeSubmissionId).update({
      data: {
        points_awarded: true,
        points_awarded_at: db.serverDate(),
        updated_at: db.serverDate(),
      },
    })
  } catch (error) {
    console.warn('mark submission points awarded failed', safeSubmissionId, error)
  }

  try {
    await db.collection('points_logs').add({
      data: {
        _id: logId,
        uid,
        source_type: safeSubmissionType,
        source_id: safeSubmissionId,
        points: 1,
        type: 'earn',
        day_key: dayKey,
        title: safeSubmissionType === 'knowledge' ? '分享知识奖励' : '分享问题奖励',
        created_at: db.serverDate(),
        updated_at: db.serverDate(),
      },
    })
  } catch (error) {
    console.warn('save points log failed', logId, error)
  }

  return {
    ok: true,
    awarded: true,
    points: nextPoints,
    dailyLimit: 5,
  }
}

async function createRewardOrder({ uid = '', openid = '', goodsId = '', addressId = '' } = {}) {
  const safeGoodsId = String(goodsId || '').trim()
  const safeAddressId = String(addressId || '').trim()
  if (!uid) {
    return {
      ok: false,
      error: '请先登录',
    }
  }
  if (!safeGoodsId) {
    return {
      ok: false,
      error: '请选择兑换商品',
    }
  }
  if (!safeAddressId) {
    return {
      ok: false,
      error: '请先填写收货地址',
    }
  }

  const [profile, goodsRes, addressRes] = await Promise.all([
    ensureProfile(uid, openid),
    db.collection('reward_goods').where({ _id: safeGoodsId }).limit(1).get(),
    db.collection('user_addresses').where({ _id: safeAddressId, user_id: uid }).limit(1).get(),
  ])

  const goods = goodsRes?.data?.[0] || null
  const address = addressRes?.data?.[0] || null
  if (!goods) {
    return {
      ok: false,
      error: '兑换商品不存在或已下架',
    }
  }
  if (!address) {
    return {
      ok: false,
      error: '收货地址不存在，请重新选择',
    }
  }

  const currentStock = normalizePoints(goods.quantity)
  const costPoints = normalizePoints(goods.points_cost || goods.pointsCost)
  const userPoints = normalizePoints(profile.points)
  if (currentStock <= 0) {
    return {
      ok: false,
      error: '该商品已兑换完',
    }
  }
  if (costPoints <= 0) {
    return {
      ok: false,
      error: '该商品积分配置异常',
    }
  }
  if (userPoints < costPoints) {
    return {
      ok: false,
      error: '积分不足，暂时无法兑换',
    }
  }

  const nextStock = currentStock - 1
  const nextPoints = userPoints - costPoints

  await db.collection('reward_goods').doc(goods._id).update({
    data: {
      quantity: nextStock,
      updated_at: db.serverDate(),
    },
  })
  await db.collection('profiles').doc(profile._id).update({
    data: {
      points: nextPoints,
      updated_at: db.serverDate(),
    },
  })

  const orderRes = await db.collection('reward_orders').add({
    data: {
      user_id: uid,
      goods_id: goods._id,
      goods_name: goods.name || '',
      goods_image: goods.image_url || '',
      points_cost: costPoints,
      status: 'pending',
      status_text: '待处理',
      address_snapshot: {
        recipient: address.recipient || '',
        phone: address.phone || '',
        region: address.region || [],
        region_text: address.region_text || '',
        detail: address.detail || '',
      },
      created_at: db.serverDate(),
      updated_at: db.serverDate(),
    },
  })

  try {
    await db.collection('points_logs').add({
      data: {
        uid,
        source_type: 'reward_exchange',
        source_id: orderRes?._id || safeGoodsId,
        points: -costPoints,
        type: 'spend',
        title: `兑换商品：${goods.name || '积分商品'}`,
        created_at: db.serverDate(),
        updated_at: db.serverDate(),
      },
    })
  } catch (error) {
    console.warn('save spend points log failed', error)
  }

  return {
    ok: true,
    orderId: orderRes?._id || '',
    points: nextPoints,
    stock: nextStock,
  }
}

async function getRewardOrders({ uid = '', limit = 20 } = {}) {
  if (!uid) {
    return {
      ok: false,
      error: '请先登录',
    }
  }

  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20))
  const { data } = await db.collection('reward_orders')
    .where({ user_id: uid })
    .orderBy('created_at', 'desc')
    .limit(safeLimit)
    .get()

  return {
    ok: true,
    orders: (data || []).map((item) => ({
      id: item._id,
      goodsName: item.goods_name || '',
      goodsImage: item.goods_image || '',
      pointsCost: Number(item.points_cost || 0),
      status: item.status || 'pending',
      statusText: item.status_text || (item.status === 'shipped' ? '已发货' : item.status === 'done' ? '已处理' : '待处理'),
      trackingNo: item.tracking_no || '',
      addressSnapshot: item.address_snapshot || {},
      createdAt: item.created_at || null,
    })),
  }
}

async function getUserAddresses({ uid = '', limit = 20 } = {}) {
  if (!uid) {
    return {
      ok: false,
      error: '请先登录',
    }
  }

  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20))
  const { data } = await db.collection('user_addresses')
    .where({ user_id: uid })
    .orderBy('updated_at', 'desc')
    .limit(safeLimit)
    .get()

  return {
    ok: true,
    addresses: (data || []).map((item) => ({
      id: item._id,
      recipient: item.recipient || item.name || item.receiver || '',
      phone: item.phone || item.mobile || item.tel || '',
      region: item.region || [],
      regionText: item.region_text || item.regionText || '',
      detail: item.detail || item.detail_address || item.address || '',
      isDefault: item.is_default === true || item.isDefault === true,
      updatedAt: item.updated_at || null,
    })),
  }
}

async function upsertUsageRecord(collectionName = '', recordId = '', createData = {}, updateData = {}) {
  const collection = db.collection(collectionName)
  try {
    const { data } = await collection.where({ _id: recordId }).limit(1).get()
    if (Array.isArray(data) && data.length) {
      await collection.doc(recordId).update({
        data: {
          ...updateData,
          last_seen_at: db.serverDate(),
        },
      })
      return { tracked: false }
    }
  } catch (error) {
    console.warn('upsert usage query failed', collectionName, recordId, error)
  }

  await collection.add({
    data: {
      _id: recordId,
      ...createData,
      created_at: db.serverDate(),
      first_seen_at: db.serverDate(),
      last_seen_at: db.serverDate(),
    },
  })
  return { tracked: true }
}

async function trackMiniappUsage({ uid = '', openid = '', dayKey = '', hourKey = '', scene = '' } = {}) {
  if (!uid || !openid) {
    return { ok: false, error: 'missing_uid_or_openid' }
  }

  const safeDayKey = /^\d{4}-\d{2}-\d{2}$/.test(String(dayKey || '').trim())
    ? String(dayKey).trim()
    : getChinaDayKey(new Date())
  const safeHourKey = /^\d{2}$/.test(String(hourKey || '').trim())
    ? String(hourKey).trim()
    : getChinaHourKey(new Date())

  const recordId = buildUsageRecordId(safeDayKey, uid)
  const hourRecordId = buildUsageHourRecordId(safeDayKey, safeHourKey, uid)

  const dailyResult = await upsertUsageRecord(
    'miniapp_usage_records',
    recordId,
    {
      day: safeDayKey,
      uid,
      openid,
      scene: String(scene || '').trim(),
    },
    {
      scene: String(scene || '').trim(),
    },
  )

  const hourlyResult = await upsertUsageRecord(
    'miniapp_usage_hourly_records',
    hourRecordId,
    {
      day: safeDayKey,
      hour: safeHourKey,
      uid,
      openid,
      scene: String(scene || '').trim(),
    },
    {
      scene: String(scene || '').trim(),
    },
  )

  return {
    ok: true,
    tracked: dailyResult.tracked,
    hourlyTracked: hourlyResult.tracked,
    day: safeDayKey,
    hour: safeHourKey,
  }
}

async function getUsageHourlyTimeline(dayKey = '') {
  const hourKeys = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
  const counts = await Promise.all(hourKeys.map(async (hour) => {
    try {
      const res = await db.collection('miniapp_usage_hourly_records').where({
        day: dayKey,
        hour,
      }).count()
      return {
        hour,
        userCount: Number(res?.total || res?.count || 0),
      }
    } catch (error) {
      console.warn('usage hourly count failed', dayKey, hour, error)
      return {
        hour,
        userCount: 0,
      }
    }
  }))

  return counts.filter((item) => item.userCount > 0).map((item) => ({
    ...item,
    label: `${item.hour}:00`,
  }))
}

async function getMiniappUsageStats({ uid = '', days = 14 } = {}) {
  const rows = await loadProfileRows(uid)
  const profile = pickPreferredProfile(rows) || {}
  if (!isAdminProfile(profile)) {
    return {
      ok: false,
      error: '仅管理员可查看使用统计',
    }
  }

  const safeDays = Math.min(30, Math.max(1, Number(days) || 14))
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const dayKeys = []
  const now = new Date()
  for (let offset = 0; offset < safeDays; offset += 1) {
    const current = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000)
    dayKeys.push(formatter.format(current))
  }

  const collection = db.collection('miniapp_usage_records')
  const counts = await Promise.all(dayKeys.map(async (day) => {
    try {
      const res = await collection.where({ day }).count()
      return {
        day,
        userCount: Number(res?.total || res?.count || 0),
      }
    } catch (error) {
      console.warn('usage count failed', day, error)
      return {
        day,
        userCount: 0,
      }
    }
  }))

  const today = counts[0]?.userCount || 0
  const yesterday = counts[1]?.userCount || 0
  const total = counts.reduce((sum, item) => sum + Number(item.userCount || 0), 0)
  const [todayTimeline, yesterdayTimeline] = await Promise.all([
    getUsageHourlyTimeline(dayKeys[0]),
    getUsageHourlyTimeline(dayKeys[1]),
  ])

  return {
    ok: true,
    today,
    yesterday,
    total,
    stats: counts,
    todayTimeline,
    yesterdayTimeline,
  }
}

async function resolveFileUrlsForAdmin({ uid = '', fileList = [] } = {}) {
  const rows = await loadProfileRows(uid)
  const profile = pickPreferredProfile(rows) || {}
  if (!isAdminProfile(profile)) {
    return {
      ok: false,
      error: '仅管理员可解析管理端图片',
    }
  }

  const safeFileList = (Array.isArray(fileList) ? fileList : [])
    .map((item) => String(item || '').trim())
    .filter((item) => item.startsWith('cloud://'))
    .slice(0, 50)

  if (!safeFileList.length) {
    return {
      ok: true,
      fileList: [],
      urlMap: {},
    }
  }

  const res = await cloud.getTempFileURL({
    fileList: safeFileList,
  })
  const resolvedList = Array.isArray(res?.fileList) ? res.fileList : []
  const urlMap = resolvedList.reduce((acc, item) => {
    const fileID = item.fileID || item.fileId || ''
    const url = item.tempFileURL || item.tempFileUrl || ''
    if (fileID && url) acc[fileID] = url
    return acc
  }, {})

  return {
    ok: true,
    fileList: resolvedList,
    urlMap,
  }
}

function normalizeServiceFileAsset(value = '') {
  if (!value) return ''
  if (typeof value === 'object') {
    return String(
      value.fileID
      || value.fileId
      || value.cloudPath
      || value.cloud_path
      || value.url
      || value.src
      || value.path
      || value.tempFileURL
      || value.tempFileUrl
      || value.download_url
      || ''
    ).trim()
  }
  return String(value || '').trim()
}

function extractServiceCloudPath(value = '') {
  const raw = normalizeServiceFileAsset(value)
  if (!raw || raw.startsWith('wxfile://') || raw.startsWith('http://tmp/') || raw.startsWith('data:image/')) return ''
  let clean = raw.split('?')[0].split('#')[0]
  try {
    clean = decodeURIComponent(clean)
  } catch (error) {}
  const match = clean.match(/(?:^|\/)((?:service-submits|service-submits-qr|studio-services|studio-services-qr)\/[^?#\s]+)/)
  return match?.[1] || ''
}

function normalizeServiceAssetKey(value = '') {
  const raw = normalizeServiceFileAsset(value)
  if (!raw) return ''
  const cloudPath = extractServiceCloudPath(raw)
  if (cloudPath) return cloudPath.replace(/^\/+/, '')
  if (raw.startsWith('cloud://')) {
    return raw.replace(/^cloud:\/\/[^/]+\//, '')
  }
  return ''
}

function addServiceAsset(referenceSet, value = '') {
  const raw = normalizeServiceFileAsset(value)
  const key = normalizeServiceAssetKey(raw)
  if (key) referenceSet.add(key)
}

function addServiceAssetsFromRecord(referenceSet, item = {}) {
  const service = item.service || {}
  const images = Array.isArray(item.images) ? item.images : [item.images]
  const serviceImages = Array.isArray(service.images) ? service.images : [service.images]
  images.forEach((image) => addServiceAsset(referenceSet, image))
  serviceImages.forEach((image) => addServiceAsset(referenceSet, image))
  addServiceAsset(referenceSet, item.environmentImage)
  addServiceAsset(referenceSet, item.environment_image)
  addServiceAsset(referenceSet, item.wechatQrImage)
  addServiceAsset(referenceSet, item.wechat_qr_image)
  addServiceAsset(referenceSet, item.image_url)
  addServiceAsset(referenceSet, item.imageUrl)
  addServiceAsset(referenceSet, item.coverImage)
  addServiceAsset(referenceSet, item.cover_image)
  addServiceAsset(referenceSet, service.environmentImage)
  addServiceAsset(referenceSet, service.environment_image)
  addServiceAsset(referenceSet, service.wechatQrImage)
  addServiceAsset(referenceSet, service.wechat_qr_image)
  addServiceAsset(referenceSet, service.image_url)
  addServiceAsset(referenceSet, service.imageUrl)
  addServiceAsset(referenceSet, service.coverImage)
  addServiceAsset(referenceSet, service.cover_image)
}

async function collectServiceAssetReferences({ uid = '', limit = 500 } = {}) {
  const referenceSet = new Set()
  const pageSize = 100
  const safeLimit = Math.max(100, Math.min(1000, Number(limit) || 500))

  for (let skip = 0; skip < safeLimit; skip += pageSize) {
    const { data } = await db.collection('studio_services')
      .skip(skip)
      .limit(pageSize)
      .get()
    const rows = Array.isArray(data) ? data : []
    rows.forEach((item) => addServiceAssetsFromRecord(referenceSet, item))
    if (rows.length < pageSize) break
  }

  if (uid) {
    for (let skip = 0; skip < safeLimit; skip += pageSize) {
      const { data } = await db.collection('user_problems')
        .where({
          user_id: uid,
          submission_type: 'service',
        })
        .skip(skip)
        .limit(pageSize)
        .get()
      const rows = Array.isArray(data) ? data : []
      rows.forEach((item) => addServiceAssetsFromRecord(referenceSet, item))
      if (rows.length < pageSize) break
    }
  }

  return referenceSet
}

async function resolveServiceFileUrls({ uid = '', fileList = [] } = {}) {
  const requestedFiles = (Array.isArray(fileList) ? fileList : [])
    .map((item) => normalizeServiceFileAsset(item))
    .filter((item) => item.startsWith('cloud://'))
  const requestedRows = [...new Map(requestedFiles
    .map((fileID) => [fileID, normalizeServiceAssetKey(fileID)])
    .filter(([, key]) => !!key))]
    .slice(0, 50)

  if (!requestedRows.length) {
    return {
      ok: true,
      fileList: [],
      urlMap: {},
    }
  }

  const referenceSet = await collectServiceAssetReferences({ uid })
  const safeFileList = requestedRows
    .filter(([, key]) => referenceSet.has(key))
    .map(([fileID]) => fileID)
  if (!safeFileList.length) {
    return {
      ok: true,
      fileList: [],
      urlMap: {},
    }
  }

  const res = await cloud.getTempFileURL({
    fileList: safeFileList,
  })
  const resolvedList = Array.isArray(res?.fileList) ? res.fileList : []
  const urlMap = resolvedList.reduce((acc, item) => {
    const fileID = item.fileID || item.fileId || ''
    const url = item.tempFileURL || item.tempFileUrl || item.download_url || ''
    if (fileID && url) acc[fileID] = url
    return acc
  }, {})

  return {
    ok: true,
    fileList: resolvedList,
    urlMap,
  }
}

function normalizeProblemTextList(list = []) {
  if (!Array.isArray(list)) return []
  return list.map((item) => {
    if (typeof item === 'string') return item.trim()
    return String(item?.text || item?.detail || item?.title || '').trim()
  }).filter(Boolean)
}

function normalizeAdminAsset(value = '') {
  if (!value) return ''
  if (typeof value === 'object') {
    return String(
      value.fileID
      || value.fileId
      || value.cloudPath
      || value.cloud_path
      || value.url
      || value.src
      || value.path
      || value.tempFileURL
      || value.tempFileUrl
      || value.download_url
      || ''
    ).trim()
  }
  return String(value || '').trim()
}

function isDisplayableRemoteAsset(value = '') {
  const raw = normalizeAdminAsset(value)
  return raw.startsWith('cloud://') || raw.startsWith('http://') || raw.startsWith('https://')
}

function normalizeProblemSolutions(list = []) {
  if (!Array.isArray(list)) return []
  return list.map((item, index) => {
    const detail = String(item?.detail || item?.text || item?.title || '').trim()
    const title = String(item?.title || (detail ? `步骤 ${index + 1}` : '')).trim()
    const imageUrl = normalizeAdminAsset(item?.image_url || item?.image || '')
    return {
      step: Number(item?.step || index + 1),
      title,
      detail,
      image_url: imageUrl,
    }
  }).filter((item) => item.detail || item.image_url)
}

function buildProblemSearchText(problem = {}) {
  const solutionTexts = (problem.solutions || []).flatMap((solution) => [
    solution?.title,
    solution?.detail,
  ])
  return [
    problem.title,
    problem.subtitle,
    problem.description,
    problem.category,
    problem.difficulty,
    ...(problem.causes || []),
    problem.tips,
    ...solutionTexts,
  ].filter(Boolean).join(' ')
}

function normalizeAdminProblem(doc = {}) {
  const solutions = normalizeProblemSolutions(doc.solutions || doc.steps || [])
  return {
    docId: doc._id || '',
    id: doc.problem_id || doc.id || doc._id || '',
    problemId: doc.problem_id || doc.id || doc._id || '',
    title: doc.title || '',
    subtitle: doc.subtitle || '',
    description: doc.description || '',
    category: doc.category || '未分类',
    difficulty: doc.difficulty || '',
    image_url: normalizeAdminAsset(doc.image_url || doc.cover_image || ''),
    causes: normalizeProblemTextList(doc.causes || []),
    solutions,
    tips: doc.tips || '',
    search_text: doc.search_text || buildProblemSearchText({ ...doc, solutions }),
    created_at: doc.created_at || null,
    updated_at: doc.updated_at || null,
  }
}

async function loadProblemCoverFromIndex(problemId = '') {
  const safeProblemId = String(problemId || '').trim()
  if (!safeProblemId) return ''

  async function loadFromCollection(collectionName = '') {
    try {
      const { data } = await db.collection(collectionName).where({ problem_id: safeProblemId }).limit(1).get()
      const row = data?.[0] || null
      return normalizeAdminAsset(row?.image_url || row?.file_id || row?.fileID || '')
    } catch (error) {
      console.warn('load problem cover index failed', collectionName, safeProblemId, error)
      return ''
    }
  }

  return await loadFromCollection('problem_public_covers') || await loadFromCollection('problem_meta')
}

async function hydrateAdminProblemImage(problem = {}) {
  const imageUrl = normalizeAdminAsset(problem.image_url)
  if (isDisplayableRemoteAsset(imageUrl)) return { ...problem, image_url: imageUrl }
  const indexedImage = await loadProblemCoverFromIndex(problem.problemId || problem.id || problem.docId)
  return {
    ...problem,
    image_url: indexedImage || imageUrl,
  }
}

async function hydrateAdminProblemImages(problems = []) {
  const rows = []
  for (const problem of problems) {
    rows.push(await hydrateAdminProblemImage(problem))
  }
  return rows
}

async function ensureAdminProfile(uid = '', error = '仅管理员可操作') {
  const rows = await loadProfileRows(uid)
  const profile = pickPreferredProfile(rows) || {}
  if (!isAdminProfile(profile)) {
    return {
      ok: false,
      error,
    }
  }
  return {
    ok: true,
    profile,
  }
}

function problemMatchesKeyword(problem = {}, keyword = '') {
  const q = String(keyword || '').trim().toLowerCase()
  if (!q) return true
  const text = [
    problem.problemId,
    problem.title,
    problem.subtitle,
    problem.description,
    problem.category,
    problem.difficulty,
    ...(problem.causes || []),
    problem.tips,
    ...(problem.solutions || []).flatMap((item) => [item.title, item.detail]),
    problem.search_text,
  ].filter(Boolean).join(' ').toLowerCase()
  return text.includes(q)
}

async function listProblemsForAdmin({ uid = '', keyword = '', page = 1, pageSize = 20 } = {}) {
  const admin = await ensureAdminProfile(uid, '仅管理员可查看问题库')
  if (!admin.ok) return admin

  const safePage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || 20))
  const safeKeyword = String(keyword || '').trim()
  const collection = db.collection('problems')

  if (safeKeyword) {
    const allRows = []
    let skip = 0
    const batchSize = 100
    while (skip < 1000) {
      const { data } = await collection.orderBy('problem_id', 'asc').skip(skip).limit(batchSize).get()
      const rows = data || []
      allRows.push(...rows)
      if (rows.length < batchSize) break
      skip += rows.length
    }
    const matched = allRows.map(normalizeAdminProblem).filter((item) => problemMatchesKeyword(item, safeKeyword))
    const start = (safePage - 1) * safePageSize
    const problems = await hydrateAdminProblemImages(matched.slice(start, start + safePageSize))
    return {
      ok: true,
      problems,
      total: matched.length,
      page: safePage,
      pageSize: safePageSize,
      hasMore: start + safePageSize < matched.length,
    }
  }

  const countRes = await collection.count()
  const total = Number(countRes?.total || 0)
  const { data } = await collection
    .orderBy('problem_id', 'asc')
    .skip((safePage - 1) * safePageSize)
    .limit(safePageSize)
    .get()
  const problems = await hydrateAdminProblemImages((data || []).map(normalizeAdminProblem))
  return {
    ok: true,
    problems,
    total,
    page: safePage,
    pageSize: safePageSize,
    hasMore: (safePage - 1) * safePageSize + problems.length < total,
  }
}

async function getProblemForAdmin({ uid = '', problemDocId = '', problemId = '' } = {}) {
  const admin = await ensureAdminProfile(uid, '仅管理员可查看问题详情')
  if (!admin.ok) return admin

  const safeDocId = String(problemDocId || '').trim()
  const safeProblemId = String(problemId || '').trim()
  let rows = []
  if (safeDocId) {
    const res = await db.collection('problems').where({ _id: safeDocId }).limit(1).get()
    rows = res?.data || []
  }
  if (!rows.length && safeProblemId) {
    const res = await db.collection('problems').where({ problem_id: safeProblemId }).limit(1).get()
    rows = res?.data || []
  }
  const problem = rows[0] || null
  if (!problem) {
    return {
      ok: false,
      error: '问题不存在或已删除',
    }
  }
  return {
    ok: true,
    problem: await hydrateAdminProblemImage(normalizeAdminProblem(problem)),
  }
}

async function upsertProblemImageIndex(collectionName = '', problemId = '', imageUrl = '') {
  if (!collectionName || !problemId) return
  try {
    const collection = db.collection(collectionName)
    const { data } = await collection.where({ problem_id: problemId }).limit(1).get()
    const payload = {
      problem_id: problemId,
      image_url: imageUrl,
      updated_at: db.serverDate(),
    }
    if (String(imageUrl || '').startsWith('cloud://')) {
      payload.file_id = imageUrl
    }
    if (data?.length) {
      await collection.doc(data[0]._id).update({ data: payload })
      return
    }
    await collection.add({
      data: {
        ...payload,
        created_at: db.serverDate(),
      },
    })
  } catch (error) {
    console.warn('sync problem image index failed', collectionName, problemId, error)
  }
}

async function removeRowsByWhere(collectionName = '', where = {}) {
  try {
    const { data } = await db.collection(collectionName).where(where).limit(100).get()
    for (const row of data || []) {
      if (row?._id) await db.collection(collectionName).doc(row._id).remove()
    }
  } catch (error) {
    console.warn('remove related problem rows failed', collectionName, where, error)
  }
}

async function updateProblemForAdmin({ uid = '', problemDocId = '', problem = {} } = {}) {
  const admin = await ensureAdminProfile(uid, '仅管理员可修改问题')
  if (!admin.ok) return admin

  const safeDocId = String(problemDocId || problem.docId || '').trim()
  if (!safeDocId) {
    return {
      ok: false,
      error: '缺少问题文档 ID',
    }
  }

  const currentRes = await db.collection('problems').where({ _id: safeDocId }).limit(1).get()
  const current = currentRes?.data?.[0] || null
  if (!current) {
    return {
      ok: false,
      error: '问题不存在或已删除',
    }
  }

  const title = String(problem.title || '').trim()
  const description = String(problem.description || '').trim()
  if (!title) {
    return {
      ok: false,
      error: '请填写问题标题',
    }
  }
  if (!description) {
    return {
      ok: false,
      error: '请填写问题描述',
    }
  }

  const problemId = String(current.problem_id || problem.problemId || safeDocId).trim()
  const causes = normalizeProblemTextList(problem.causes || [])
  const solutions = normalizeProblemSolutions(problem.solutions || [])
  const payload = {
    problem_id: problemId,
    title,
    subtitle: String(problem.subtitle || description.slice(0, 80)).trim(),
    description,
    category: String(problem.category || current.category || '未分类').trim() || '未分类',
    difficulty: String(problem.difficulty || current.difficulty || '').trim(),
    image_url: String(problem.image_url || '').trim(),
    causes,
    steps: solutions.map((solution) => ({
      step: solution.step,
      text: solution.detail,
      image_url: solution.image_url,
    })),
    solutions,
    tips: String(problem.tips || '').trim(),
    updated_at: db.serverDate(),
  }
  payload.search_text = buildProblemSearchText(payload)

  await db.collection('problems').doc(safeDocId).update({
    data: payload,
  })

  await Promise.all([
    upsertProblemImageIndex('problem_meta', problemId, payload.image_url),
    upsertProblemImageIndex('problem_public_covers', problemId, payload.image_url),
  ])

  return {
    ok: true,
    problem: normalizeAdminProblem({
      ...current,
      ...payload,
      _id: safeDocId,
    }),
  }
}

async function deleteProblemForAdmin({ uid = '', problemDocId = '', problemId = '' } = {}) {
  const admin = await ensureAdminProfile(uid, '仅管理员可删除问题')
  if (!admin.ok) return admin

  const safeDocId = String(problemDocId || '').trim()
  const safeProblemId = String(problemId || '').trim()
  let current = null
  if (safeDocId) {
    const res = await db.collection('problems').where({ _id: safeDocId }).limit(1).get()
    current = res?.data?.[0] || null
  }
  if (!current && safeProblemId) {
    const res = await db.collection('problems').where({ problem_id: safeProblemId }).limit(1).get()
    current = res?.data?.[0] || null
  }
  if (!current?._id) {
    return {
      ok: true,
      deleted: false,
    }
  }

  const finalProblemId = current.problem_id || safeProblemId || current._id
  await db.collection('problems').doc(current._id).remove()
  await Promise.all([
    removeRowsByWhere('problem_meta', { problem_id: finalProblemId }),
    removeRowsByWhere('problem_public_covers', { problem_id: finalProblemId }),
    removeRowsByWhere('problem_likes', { problem_id: finalProblemId }),
    removeRowsByWhere('problem_dislikes', { problem_id: finalProblemId }),
    removeRowsByWhere('problem_favorites', { problem_id: finalProblemId }),
    removeRowsByWhere('problem_history', { problem_id: finalProblemId }),
  ])

  return {
    ok: true,
    deleted: true,
    problemId: finalProblemId,
  }
}

function normalizeAnnouncement(item = {}) {
  return {
    id: item._id || '',
    title: item.title || '',
    content: item.content || '',
    confirmText: item.confirm_text || '知道了',
    enabled: item.enabled === true,
    statusText: item.enabled === true ? '启用中' : '已停用',
    created_at: item.created_at || null,
    updated_at: item.updated_at || item.created_at || null,
  }
}

async function listAnnouncementsForAdmin({ uid = '', limit = 50 } = {}) {
  const admin = await ensureAdminProfile(uid, '仅管理员可查看公告')
  if (!admin.ok) return admin

  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50))
  const { data } = await db.collection('app_announcements')
    .orderBy('updated_at', 'desc')
    .limit(safeLimit)
    .get()

  return {
    ok: true,
    announcements: (data || []).map(normalizeAnnouncement),
  }
}

async function saveAnnouncementForAdmin({ uid = '', announcement = {} } = {}) {
  const admin = await ensureAdminProfile(uid, '仅管理员可保存公告')
  if (!admin.ok) return admin

  const id = String(announcement.id || '').trim()
  const title = String(announcement.title || '').trim()
  const content = String(announcement.content || '').trim()
  const confirmText = String(announcement.confirmText || announcement.confirm_text || '').trim() || '知道了'
  const enabled = announcement.enabled === true

  if (!title || !content) {
    return {
      ok: false,
      error: '请填写公告标题和内容',
    }
  }

  const payload = {
    title,
    content,
    confirm_text: confirmText,
    enabled,
    updated_at: db.serverDate(),
  }

  if (id) {
    await db.collection('app_announcements').doc(id).update({ data: payload })
    return {
      ok: true,
      id,
      announcement: normalizeAnnouncement({
        _id: id,
        ...payload,
      }),
    }
  }

  const created = await db.collection('app_announcements').add({
    data: {
      ...payload,
      created_at: db.serverDate(),
    },
  })
  return {
    ok: true,
    id: created?._id || '',
    announcement: normalizeAnnouncement({
      _id: created?._id || '',
      ...payload,
    }),
  }
}

async function toggleAnnouncementForAdmin({ uid = '', announcementId = '' } = {}) {
  const admin = await ensureAdminProfile(uid, '仅管理员可切换公告状态')
  if (!admin.ok) return admin

  const safeId = String(announcementId || '').trim()
  if (!safeId) {
    return {
      ok: false,
      error: '缺少公告 ID',
    }
  }

  const { data } = await db.collection('app_announcements').where({ _id: safeId }).limit(1).get()
  const item = data?.[0] || null
  if (!item) {
    return {
      ok: false,
      error: '公告不存在或已删除',
    }
  }
  const enabled = item.enabled !== true
  await db.collection('app_announcements').doc(safeId).update({
    data: {
      enabled,
      updated_at: db.serverDate(),
    },
  })
  return {
    ok: true,
    enabled,
    statusText: enabled ? '启用中' : '已停用',
  }
}

async function deleteAnnouncementForAdmin({ uid = '', announcementId = '' } = {}) {
  const admin = await ensureAdminProfile(uid, '仅管理员可删除公告')
  if (!admin.ok) return admin

  const safeId = String(announcementId || '').trim()
  if (!safeId) {
    return {
      ok: false,
      error: '缺少公告 ID',
    }
  }
  await db.collection('app_announcements').doc(safeId).remove()
  return {
    ok: true,
  }
}

function normalizeRewardCategory(value = '') {
  const raw = String(value || '').trim()
  if (/模型|model/i.test(raw)) return 'model'
  if (/其他|其它|other/i.test(raw)) return 'other'
  return 'filament'
}

function getRewardCategoryText(category = '') {
  if (category === 'model') return '模型'
  if (category === 'other') return '其他'
  return '耗材'
}

function normalizeRewardGood(item = {}) {
  const category = normalizeRewardCategory(item.category || item.type || item.goods_type || '')
  return {
    id: item._id || '',
    name: item.name || '',
    imageUrl: normalizeAdminAsset(item.image_url || ''),
    image_url: normalizeAdminAsset(item.image_url || ''),
    quantity: Number(item.quantity || 0),
    pointsCost: Number(item.points_cost || item.pointsCost || 0),
    category,
    categoryText: getRewardCategoryText(category),
    created_at: item.created_at || null,
    updated_at: item.updated_at || item.created_at || null,
  }
}

async function listRewardGoodsForAdmin({ uid = '', limit = 100 } = {}) {
  const admin = await ensureAdminProfile(uid, '仅管理员可查看积分商品')
  if (!admin.ok) return admin

  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 100))
  const { data } = await db.collection('reward_goods')
    .orderBy('updated_at', 'desc')
    .limit(safeLimit)
    .get()

  return {
    ok: true,
    goods: (data || []).map(normalizeRewardGood),
  }
}

async function saveRewardGoodForAdmin({ uid = '', goods = {} } = {}) {
  const admin = await ensureAdminProfile(uid, '仅管理员可保存积分商品')
  if (!admin.ok) return admin

  const id = String(goods.id || '').trim()
  const name = String(goods.name || '').trim()
  const imageUrl = normalizeAdminAsset(goods.imageUrl || goods.image_url || '')
  const quantity = Math.max(0, Math.floor(Number(goods.quantity || 0)))
  const pointsCost = Math.max(0, Math.floor(Number(goods.pointsCost || goods.points_cost || 0)))
  const category = normalizeRewardCategory(goods.category)

  if (!name || pointsCost <= 0) {
    return {
      ok: false,
      error: '请完整填写商品名称和所需积分',
    }
  }

  const payload = {
    name,
    image_url: imageUrl,
    quantity,
    points_cost: pointsCost,
    category,
    updated_at: db.serverDate(),
  }

  if (id) {
    await db.collection('reward_goods').doc(id).update({ data: payload })
    return {
      ok: true,
      id,
      goods: normalizeRewardGood({
        _id: id,
        ...payload,
      }),
    }
  }

  const created = await db.collection('reward_goods').add({
    data: {
      ...payload,
      created_at: db.serverDate(),
    },
  })
  return {
    ok: true,
    id: created?._id || '',
    goods: normalizeRewardGood({
      _id: created?._id || '',
      ...payload,
    }),
  }
}

async function deleteRewardGoodForAdmin({ uid = '', goodsId = '' } = {}) {
  const admin = await ensureAdminProfile(uid, '仅管理员可删除积分商品')
  if (!admin.ok) return admin

  const safeId = String(goodsId || '').trim()
  if (!safeId) {
    return {
      ok: false,
      error: '缺少商品 ID',
    }
  }

  await db.collection('reward_goods').doc(safeId).remove()
  return {
    ok: true,
  }
}

async function deleteSubmissionForAdmin({ uid = '', submissionId = '' } = {}) {
  const rows = await loadProfileRows(uid)
  const profile = pickPreferredProfile(rows) || {}
  if (!isAdminProfile(profile)) {
    return {
      ok: false,
      error: '仅管理员可删除投稿',
    }
  }

  const safeSubmissionId = String(submissionId || '').trim()
  if (!safeSubmissionId) {
    return {
      ok: false,
      error: '缺少投稿 ID',
    }
  }

  const { data } = await db.collection('user_problems').where({ _id: safeSubmissionId }).limit(1).get()
  const item = data?.[0] || null
  if (!item) {
    return {
      ok: true,
      deleted: false,
      error: '投稿已不存在',
    }
  }

  await db.collection('user_problems').doc(safeSubmissionId).remove()
  await removePublishedContentForSubmission(item, safeSubmissionId)

  return {
    ok: true,
    deleted: true,
  }
}

async function removePublishedContentForSubmission(item = {}, submissionId = '') {
  async function removeProblemRowsByWhere(where = {}, label = '') {
    try {
      const problemRows = await db.collection('problems').where(where).limit(50).get()
      for (const row of problemRows?.data || []) {
        if (row?._id) {
          await db.collection('problems').doc(row._id).remove()
        }
      }
      return problemRows?.data?.length || 0
    } catch (error) {
      console.warn('admin remove linked problems failed', label, where, error)
      return 0
    }
  }

  const submissionType = item.submission_type || 'problem'
  if (submissionType === 'service') {
    const serviceId = item.service_id || ''
    if (serviceId) {
      try {
        await db.collection('studio_services').doc(serviceId).remove()
      } catch (error) {
        console.warn('admin remove linked studio service failed', serviceId, error)
      }
    }
    try {
      const serviceRows = await db.collection('studio_services').where({ submission_id: submissionId }).limit(20).get()
      for (const row of serviceRows?.data || []) {
        if (row?._id && row._id !== serviceId) {
          await db.collection('studio_services').doc(row._id).remove()
        }
      }
    } catch (error) {
      console.warn('admin remove submission studio services failed', submissionId, error)
    }
  }

  const problemId = item.problem_id || ''
  if (submissionType !== 'knowledge') {
    const removeTasks = []
    if (problemId) removeTasks.push(removeProblemRowsByWhere({ problem_id: problemId }, 'problem_id'))
    if (submissionId) {
      removeTasks.push(removeProblemRowsByWhere({ _id: submissionId }, 'doc_id'))
      removeTasks.push(removeProblemRowsByWhere({ source_submission_id: submissionId }, 'source_submission_id'))
      removeTasks.push(removeProblemRowsByWhere({ submission_id: submissionId }, 'submission_id'))
      removeTasks.push(removeProblemRowsByWhere({ user_problem_id: submissionId }, 'user_problem_id'))
    }
    if (item.title) {
      removeTasks.push(removeProblemRowsByWhere({
        title: item.title,
        source: 'user_submitted',
      }, 'title_user_submitted'))
    }
    await Promise.all(removeTasks)
  }
}

async function rejectSubmissionForAdmin({ uid = '', submissionId = '' } = {}) {
  const rows = await loadProfileRows(uid)
  const profile = pickPreferredProfile(rows) || {}
  if (!isAdminProfile(profile)) {
    return {
      ok: false,
      error: '仅管理员可拒绝投稿',
    }
  }

  const safeSubmissionId = String(submissionId || '').trim()
  if (!safeSubmissionId) {
    return {
      ok: false,
      error: '缺少投稿 ID',
    }
  }

  const { data } = await db.collection('user_problems').where({ _id: safeSubmissionId }).limit(1).get()
  const item = data?.[0] || null
  if (!item) {
    return {
      ok: false,
      error: '投稿不存在',
    }
  }

  await db.collection('user_problems').doc(safeSubmissionId).update({
    data: {
      status: 'rejected',
      updated_at: db.serverDate(),
    },
  })
  await removePublishedContentForSubmission(item, safeSubmissionId)

  return {
    ok: true,
  }
}

async function publishServiceFromSubmission(item = {}, submissionId = '') {
  const service = item.service || {}
  const studioName = String(service.studioName || item.studioName || item.title || '').trim()
  const machineModel = String(service.machineModel || item.machineModel || '').trim()
  const machineCount = String(service.machineCount || item.machineCount || '').trim()
  const description = String(service.description || item.description || '').trim()
  const contact = String(service.contact || item.contact || '').trim()
  const images = Array.isArray(service.images || item.images) ? (service.images || item.images).filter(Boolean).slice(0, 3) : []
  const wechatQrImage = String(service.wechatQrImage || item.wechatQrImage || '').trim()

  if (!studioName || !machineModel || !machineCount || !description) {
    throw new Error('服务入驻信息不完整，无法通过')
  }

  const payload = {
    studioName,
    machineModel,
    machineCount,
    contact,
    description,
    images,
    environmentImage: service.environmentImage || item.environmentImage || images[0] || '',
    wechatQrImage,
    source: 'user_submitted',
    submission_id: submissionId,
    user_id: item.user_id || '',
    updated_at: db.serverDate(),
  }

  const { data } = await db.collection('studio_services').where({ submission_id: submissionId }).limit(1).get()
  if (data?.length) {
    await db.collection('studio_services').doc(data[0]._id).update({ data: payload })
    return data[0]._id
  }
  const created = await db.collection('studio_services').add({
    data: {
      ...payload,
      created_at: db.serverDate(),
    },
  })
  return created?._id || ''
}

async function upsertProblemFromSubmission(item = {}, submissionId = '') {
  const problemId = item.problem_id || submissionId
  if (!problemId) return ''
  const steps = Array.isArray(item.steps) ? item.steps : []
  const solutions = Array.isArray(item.solutions) && item.solutions.length
    ? item.solutions
    : steps.map((step, index) => ({
        step: step.step || index + 1,
        title: step.title || step.text || `步骤 ${index + 1}`,
        detail: step.detail || step.text || '',
        image_url: step.image_url || step.image || '',
      }))
  const payload = {
    category: item.category || '未分类',
    difficulty: item.difficulty || '常见',
    title: item.title || '',
    subtitle: item.subtitle || String(item.description || '').slice(0, 80),
    description: item.description || '',
    causes: item.causes || [],
    solutions,
    tips: item.tips || '',
    image_url: item.image_url || '',
    source: 'user_submitted',
    source_submission_id: submissionId,
    submission_id: submissionId,
    user_problem_id: submissionId,
    updated_at: db.serverDate(),
  }

  const { data } = await db.collection('problems').where({ problem_id: problemId }).limit(1).get()
  if (data?.length) {
    await db.collection('problems').doc(data[0]._id).update({ data: payload })
    return data[0]._id
  }
  const created = await db.collection('problems').add({
    data: {
      problem_id: problemId,
      ...payload,
      created_at: db.serverDate(),
    },
  })
  return created?._id || ''
}

async function approveSubmissionForAdmin({ uid = '', openid = '', submissionId = '' } = {}) {
  const rows = await loadProfileRows(uid)
  const profile = pickPreferredProfile(rows) || {}
  if (!isAdminProfile(profile)) {
    return {
      ok: false,
      error: '仅管理员可通过投稿',
    }
  }

  const safeSubmissionId = String(submissionId || '').trim()
  if (!safeSubmissionId) {
    return {
      ok: false,
      error: '缺少投稿 ID',
    }
  }

  const { data } = await db.collection('user_problems').where({ _id: safeSubmissionId }).limit(1).get()
  const item = data?.[0] || null
  if (!item) {
    return {
      ok: false,
      error: '投稿不存在',
    }
  }
  if (item.status === 'published') {
    return {
      ok: true,
      alreadyPublished: true,
      submission: item,
    }
  }

  const submissionType = item.submission_type || 'problem'
  const updatePayload = {
    status: 'published',
    updated_at: db.serverDate(),
  }

  if (submissionType === 'service') {
    const serviceId = await publishServiceFromSubmission(item, safeSubmissionId)
    updatePayload.service_id = serviceId
  } else if (submissionType === 'knowledge') {
    const detailBlocks = Array.isArray(item.detail_blocks) ? item.detail_blocks : []
    const effectImages = Array.isArray(item.effect_images) ? item.effect_images : []
    updatePayload.title = item.title || ''
    updatePayload.subtitle = item.subtitle || String(item.description || '').slice(0, 80)
    updatePayload.description = item.description || ''
    updatePayload.image_url = item.image_url || effectImages[0] || ''
    updatePayload.detail_blocks = detailBlocks
    updatePayload.effect_images = effectImages
    updatePayload.category = item.category || '知识心得'
    updatePayload.submission_type = 'knowledge'
  } else {
    await upsertProblemFromSubmission(item, safeSubmissionId)
  }

  await db.collection('user_problems').doc(safeSubmissionId).update({
    data: updatePayload,
  })

  const pointsResult = await awardSubmissionPoints({
    uid: item.user_id || '',
    openid,
    operatorUid: uid,
    submissionId: safeSubmissionId,
    submissionType,
  })

  return {
    ok: true,
    pointsResult,
    submission: {
      ...item,
      ...updatePayload,
      status: 'published',
    },
  }
}

async function resolveFeedbackForAdmin({ uid = '', feedbackId = '' } = {}) {
  const rows = await loadProfileRows(uid)
  const profile = pickPreferredProfile(rows) || {}
  if (!isAdminProfile(profile)) {
    return {
      ok: false,
      error: '仅管理员可处理反馈',
    }
  }

  const safeFeedbackId = String(feedbackId || '').trim()
  if (!safeFeedbackId) {
    return {
      ok: false,
      error: '缺少反馈 ID',
    }
  }

  await db.collection('user_feedback').doc(safeFeedbackId).update({
    data: {
      status: 'resolved',
      status_text: '已处理',
      updated_at: db.serverDate(),
    },
  })

  return {
    ok: true,
  }
}

async function markRewardOrderDoneForAdmin({ uid = '', orderId = '' } = {}) {
  const rows = await loadProfileRows(uid)
  const profile = pickPreferredProfile(rows) || {}
  if (!isAdminProfile(profile)) {
    return {
      ok: false,
      error: '仅管理员可处理兑换订单',
    }
  }

  const safeOrderId = String(orderId || '').trim()
  if (!safeOrderId) {
    return {
      ok: false,
      error: '缺少订单 ID',
    }
  }

  await db.collection('reward_orders').doc(safeOrderId).update({
    data: {
      status: 'done',
      status_text: '已处理',
      updated_at: db.serverDate(),
    },
  })

  return {
    ok: true,
  }
}

async function shipRewardOrderForAdmin({ uid = '', orderId = '', trackingNo = '' } = {}) {
  const rows = await loadProfileRows(uid)
  const profile = pickPreferredProfile(rows) || {}
  if (!isAdminProfile(profile)) {
    return {
      ok: false,
      error: '仅管理员可发货兑换订单',
    }
  }

  const safeOrderId = String(orderId || '').trim()
  const safeTrackingNo = String(trackingNo || '').trim()
  if (!safeOrderId) {
    return {
      ok: false,
      error: '缺少订单 ID',
    }
  }
  if (!safeTrackingNo) {
    return {
      ok: false,
      error: '请填写快递单号',
    }
  }

  await db.collection('reward_orders').doc(safeOrderId).update({
    data: {
      status: 'shipped',
      status_text: '已发货',
      tracking_no: safeTrackingNo,
      shipped_at: db.serverDate(),
      updated_at: db.serverDate(),
    },
  })

  return {
    ok: true,
    trackingNo: safeTrackingNo,
  }
}

async function adjustUserPointsForAdmin({ uid = '', targetUserId = '', delta = 0, reason = '' } = {}) {
  const rows = await loadProfileRows(uid)
  const profile = pickPreferredProfile(rows) || {}
  if (!isAdminProfile(profile)) {
    return {
      ok: false,
      error: '仅管理员可调整积分',
    }
  }

  const safeTargetUserId = String(targetUserId || '').trim()
  const safeDelta = Math.trunc(Number(delta || 0))
  const safeReason = String(reason || '').trim()
  if (!safeTargetUserId) {
    return {
      ok: false,
      error: '请填写用户 ID',
    }
  }
  if (!safeDelta) {
    return {
      ok: false,
      error: '请填写非 0 的调整积分',
    }
  }

  const targetProfile = await ensureProfile(safeTargetUserId, safeTargetUserId.replace(/^wx_/, ''))
  const currentPoints = normalizePoints(targetProfile.points)
  const nextPoints = Math.max(0, currentPoints + safeDelta)
  if (targetProfile?._id) {
    await db.collection('profiles').doc(targetProfile._id).update({
      data: {
        points: nextPoints,
        updated_at: db.serverDate(),
      },
    })
  }

  try {
    await db.collection('points_logs').add({
      data: {
        uid: safeTargetUserId,
        source_type: 'admin_adjustment',
        source_id: `${safeTargetUserId}_${Date.now()}`,
        points: safeDelta,
        type: safeDelta > 0 ? 'earn' : 'spend',
        title: safeReason || (safeDelta > 0 ? '管理员增加积分' : '管理员扣减积分'),
        operator_uid: uid,
        created_at: db.serverDate(),
        updated_at: db.serverDate(),
      },
    })
  } catch (error) {
    console.warn('save admin points adjustment log failed', error)
  }

  return {
    ok: true,
    points: nextPoints,
    previousPoints: currentPoints,
    delta: safeDelta,
  }
}

exports.main = async (event = {}) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID || wxContext.FROM_OPENID || ''

    if (event.action === 'debugContext') {
      return {
        ok: true,
        wxContext,
        openid,
      }
    }

    if (!openid) {
      return {
        ok: false,
        error: '未获取到微信 OPENID，请确认当前是在真机/正式调试环境，并且云开发环境或环境共享绑定正确。',
      }
    }

    const uid = `wx_${openid}`

    if (event.action === 'resolveFileUrls') {
      return await resolveFileUrlsForAdmin({
        uid,
        fileList: event.fileList || [],
      })
    }

    if (event.action === 'resolveServiceFileUrls') {
      return await resolveServiceFileUrls({
        uid,
        fileList: event.fileList || [],
      })
    }

    if (event.action === 'adminDeleteSubmission') {
      return await deleteSubmissionForAdmin({
        uid,
        submissionId: event.submissionId,
      })
    }

    if (event.action === 'adminListProblems') {
      return await listProblemsForAdmin({
        uid,
        keyword: event.keyword,
        page: event.page,
        pageSize: event.pageSize,
      })
    }

    if (event.action === 'adminGetProblem') {
      return await getProblemForAdmin({
        uid,
        problemDocId: event.problemDocId,
        problemId: event.problemId,
      })
    }

    if (event.action === 'adminUpdateProblem') {
      return await updateProblemForAdmin({
        uid,
        problemDocId: event.problemDocId,
        problem: event.problem || {},
      })
    }

    if (event.action === 'adminDeleteProblem') {
      return await deleteProblemForAdmin({
        uid,
        problemDocId: event.problemDocId,
        problemId: event.problemId,
      })
    }

    if (event.action === 'adminListAnnouncements') {
      return await listAnnouncementsForAdmin({
        uid,
        limit: event.limit,
      })
    }

    if (event.action === 'adminSaveAnnouncement') {
      return await saveAnnouncementForAdmin({
        uid,
        announcement: event.announcement || {},
      })
    }

    if (event.action === 'adminToggleAnnouncement') {
      return await toggleAnnouncementForAdmin({
        uid,
        announcementId: event.announcementId,
      })
    }

    if (event.action === 'adminDeleteAnnouncement') {
      return await deleteAnnouncementForAdmin({
        uid,
        announcementId: event.announcementId,
      })
    }

    if (event.action === 'adminListRewardGoods') {
      return await listRewardGoodsForAdmin({
        uid,
        limit: event.limit,
      })
    }

    if (event.action === 'adminSaveRewardGood') {
      return await saveRewardGoodForAdmin({
        uid,
        goods: event.goods || {},
      })
    }

    if (event.action === 'adminDeleteRewardGood') {
      return await deleteRewardGoodForAdmin({
        uid,
        goodsId: event.goodsId,
      })
    }

    if (event.action === 'adminRejectSubmission') {
      return await rejectSubmissionForAdmin({
        uid,
        submissionId: event.submissionId,
      })
    }

    if (event.action === 'adminApproveSubmission') {
      return await approveSubmissionForAdmin({
        uid,
        openid,
        submissionId: event.submissionId,
      })
    }

    if (event.action === 'adminResolveFeedback') {
      return await resolveFeedbackForAdmin({
        uid,
        feedbackId: event.feedbackId,
      })
    }

    if (event.action === 'adminMarkRewardOrderDone') {
      return await markRewardOrderDoneForAdmin({
        uid,
        orderId: event.orderId,
      })
    }

    if (event.action === 'adminShipRewardOrder') {
      return await shipRewardOrderForAdmin({
        uid,
        orderId: event.orderId,
        trackingNo: event.trackingNo,
      })
    }

    if (event.action === 'adminAdjustUserPoints') {
      return await adjustUserPointsForAdmin({
        uid,
        targetUserId: event.targetUserId,
        delta: event.delta,
        reason: event.reason,
      })
    }

    if (event.action === 'trackUsage') {
      return await trackMiniappUsage({
        uid,
        openid,
        dayKey: event.dayKey,
        hourKey: event.hourKey,
        scene: event.scene,
      })
    }

    if (event.action === 'getUsageStats') {
      return await getMiniappUsageStats({
        uid,
        days: event.days,
      })
    }

    if (event.action === 'saveProfile') {
      const savedProfile = await saveProfile(uid, event.profile || {})
      return {
        ok: true,
        openid,
        profileSynced: true,
        user: buildUser(openid, savedProfile),
      }
    }

    if (event.action === 'awardSubmissionPoints') {
      const targetUserId = String(event.targetUserId || uid).trim()
      return await awardSubmissionPoints({
        uid: targetUserId,
        openid,
        operatorUid: uid,
        submissionId: event.submissionId,
        submissionType: event.submissionType,
      })
    }

    if (event.action === 'redeemRewardGoods') {
      return await createRewardOrder({
        uid,
        openid,
        goodsId: event.goodsId,
        addressId: event.addressId,
      })
    }

    if (event.action === 'getRewardOrders') {
      return await getRewardOrders({
        uid,
        limit: event.limit,
      })
    }

    if (event.action === 'getUserAddresses') {
      return await getUserAddresses({
        uid,
        limit: event.limit,
      })
    }

    let profileSynced = true
    let profile
    try {
      profile = await syncLoginProfile(uid, openid, event.profile || {})
    } catch (syncError) {
      profileSynced = false
      profile = {
        uid,
        username: pickWechatName(event.profile || {}) || `微信用户${String(openid).slice(-4).toUpperCase()}`,
        avatar: '微',
        avatarUrl: pickWechatAvatar(event.profile || {}),
        status: 'active',
      }
    }

    return {
      ok: true,
      openid,
      profileSynced,
      user: buildUser(openid, profile),
    }
  } catch (error) {
    return {
      ok: false,
      error: error?.message || 'miniappAuth 执行失败',
    }
  }
}
