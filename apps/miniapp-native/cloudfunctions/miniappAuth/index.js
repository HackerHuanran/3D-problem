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
      statusText: item.status_text || (item.status === 'pending' ? '待处理' : item.status || ''),
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

exports.main = async (event = {}) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    if (!openid) {
      return {
        ok: false,
        error: '未获取到微信 OPENID，请确认当前是在真机/正式调试环境，并且云开发环境绑定正确。',
      }
    }

    const uid = `wx_${openid}`

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
