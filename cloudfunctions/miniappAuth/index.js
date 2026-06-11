const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

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
  const key = normalizeServiceAssetKey(value)
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

    if (event.action === 'resolveServiceFileUrls') {
      return await resolveServiceFileUrls({
        uid,
        fileList: event.fileList || [],
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
