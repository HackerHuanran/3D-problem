const db = wx.cloud.database()
const MISSING_COLLECTION_CODE = -502005

function mapPost(doc) {
  return {
    id: doc._id,
    userId: doc.user_id || '',
    title: doc.title || '',
    description: doc.description || '',
    category: doc.category || '未分类',
    budget: doc.budget || '',
    contact: doc.contact || '',
    status: doc.status || '待解决',
    viewCount: doc.view_count || 0,
    interestCount: doc.interest_count || 0,
    createdAt: doc.created_at || null,
  }
}

async function listMarketPosts({ status = '待解决', limit = 30 } = {}) {
  try {
    let query = db.collection('market_posts').orderBy('created_at', 'desc').limit(limit)
    if (status) query = query.where({ status })
    const { data } = await query.get()
    return { list: (data || []).map(mapPost) }
  } catch (error) {
    if (error?.errCode === MISSING_COLLECTION_CODE) {
      console.warn('market_posts collection not exists')
      return { list: [], missingCollection: 'market_posts' }
    }
    console.warn('listMarketPosts failed', error)
    return { list: [], error: error?.message || '加载需求失败' }
  }
}

async function getMarketPostDetail(postId) {
  if (!postId) return { detail: null }
  try {
    const res = await db.collection('market_posts').doc(postId).get()
    if (!res?.data) return { detail: null }
    return { detail: mapPost(res.data) }
  } catch (error) {
    if (error?.errCode === MISSING_COLLECTION_CODE) {
      return { detail: null, missingCollection: 'market_posts' }
    }
    console.warn('getMarketPostDetail failed', error)
    return { detail: null, error: error?.message || '加载需求详情失败' }
  }
}

module.exports = {
  listMarketPosts,
  getMarketPostDetail,
}
