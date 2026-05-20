const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

function buildFallbackUser(openid, profile = {}) {
  const uid = `wx_${openid}`
  return {
    id: uid,
    username: profile.username || `微信用户${String(openid).slice(-4).toUpperCase()}`,
    avatar: profile.avatar || '微',
    avatarUrl: profile.avatarUrl || '',
    points: profile.points || 0,
    phone: profile.phone || '',
    status: profile.status || 'active',
  }
}

function withTimeout(promise, ms = 3000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const wechatProfile = event?.profile || {}

    if (!openid) {
      return {
        ok: false,
        error: '未获取到微信 OPENID，请确认当前是在真机/正式调试环境，并且云开发环境绑定正确。',
      }
    }

    const uid = `wx_${openid}`
    let profile = {
      uid,
      username: wechatProfile.nickName || `微信用户${String(openid).slice(-4).toUpperCase()}`,
      avatar: '微',
      avatarUrl: wechatProfile.avatarUrl || '',
      phone: '',
      points: 0,
      status: 'active',
    }
    let profileSynced = false

    // 尽量同步 profile，但无论成功失败都不影响登录返回
    try {
      const syncTask = withTimeout(
        db.collection('profiles').where({ uid }).limit(1).get(),
        1200,
      )

      syncTask.then(async ({ data }) => {
        const existed = data && data[0]
        if (existed) {
          profile = {
            ...profile,
            ...existed,
            username: wechatProfile.nickName || existed.username || profile.username,
            avatarUrl: wechatProfile.avatarUrl || existed.avatarUrl || profile.avatarUrl,
          }
          if (wechatProfile.nickName || wechatProfile.avatarUrl) {
            await db.collection('profiles').doc(existed._id).update({
              data: {
                username: profile.username,
                avatarUrl: profile.avatarUrl,
                updated_at: db.serverDate(),
              },
            })
          }
          profileSynced = true
          return
        }

        const nextProfile = {
          uid,
          username: profile.username,
          avatar: profile.avatar,
          avatarUrl: profile.avatarUrl,
          phone: '',
          points: 0,
          status: 'active',
          source: 'miniapp_wechat',
          created_at: db.serverDate(),
        }
        await db.collection('profiles').add({ data: nextProfile })
        profileSynced = true
      }).catch(() => {})
    } catch (syncError) {
      profileSynced = false
    }

    return {
      ok: true,
      openid,
      profileSynced,
      user: buildFallbackUser(openid, profile),
    }
  } catch (error) {
    return {
      ok: false,
      error: error?.message || 'miniappAuth 执行失败',
    }
  }
}
