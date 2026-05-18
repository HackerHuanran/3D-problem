import { db, cmd } from '@/lib/tcb.js'
import { getImageURLs, uploadImages } from '@/composables/useStorage.js'

const REVIEW_COLLECTION = 'filament_reviews'
const USAGE_COLLECTION = 'filament_usage_records'
const METRIC_KEYS = ['printability', 'adhesion', 'stringing_control', 'surface_quality', 'strength', 'value']

const reviewBundleCache = new Map()
const reviewBundlePromiseCache = new Map()
const usageCache = new Map()
const usagePromiseCache = new Map()

function normalizeReviewStatus(value) {
  const status = String(value || '').trim()
  if (['pending', 'published', 'hidden', 'rejected'].includes(status)) return status
  return 'published'
}

function isMissingCollectionError(error) {
  const message = String(error?.message || error || '')
  return /collection/i.test(message) && /(not exist|does not exist|不存在|未创建)/i.test(message)
}

function formatCollectionError(error, collectionName) {
  if (isMissingCollectionError(error)) {
    return new Error(`请先在云数据库创建集合：${collectionName}`)
  }
  return error instanceof Error ? error : new Error(String(error || '操作失败'))
}

function normalizeTimestamp(value) {
  if (!value) return Date.now()
  if (value instanceof Date) return value.getTime()
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  if (typeof value === 'number') return value
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : Date.now()
}

function average(values) {
  const list = values.filter((value) => Number.isFinite(Number(value)) && Number(value) > 0).map(Number)
  if (!list.length) return 0
  return Number((list.reduce((sum, value) => sum + value, 0) / list.length).toFixed(1))
}

function buildRatingSummary(reviews) {
  return {
    count: reviews.length,
    overall: average(reviews.map((item) => item.overallRating)),
    metrics: {
      printability: average(reviews.map((item) => item.ratings?.printability)),
      adhesion: average(reviews.map((item) => item.ratings?.adhesion)),
      stringing_control: average(reviews.map((item) => item.ratings?.stringing_control)),
      surface_quality: average(reviews.map((item) => item.ratings?.surface_quality)),
      strength: average(reviews.map((item) => item.ratings?.strength)),
      value: average(reviews.map((item) => item.ratings?.value)),
    },
  }
}

async function resolveImages(fileIDs) {
  if (!Array.isArray(fileIDs) || !fileIDs.length) return []
  const rows = await getImageURLs(fileIDs)
  return rows.filter((item) => item.url)
}

function invalidateReviewBundle(filamentId) {
  if (!filamentId) {
    reviewBundleCache.clear()
    reviewBundlePromiseCache.clear()
    return
  }
  reviewBundleCache.delete(filamentId)
  reviewBundlePromiseCache.delete(filamentId)
}

function invalidateUsageCache(filamentId, userId) {
  if (!filamentId || !userId) {
    usageCache.clear()
    usagePromiseCache.clear()
    return
  }
  const key = `${filamentId}:${userId}`
  usageCache.delete(key)
  usagePromiseCache.delete(key)
}

async function loadReviewBundle(filamentId, { force = false } = {}) {
  if (!filamentId) return { reviews: [], summary: buildRatingSummary([]) }
  if (!force && reviewBundleCache.has(filamentId)) return reviewBundleCache.get(filamentId)
  if (!force && reviewBundlePromiseCache.has(filamentId)) return reviewBundlePromiseCache.get(filamentId)

  const loadPromise = (async () => {
    try {
      const { data: reviewDocs } = await db.collection(REVIEW_COLLECTION)
        .where({ filament_id: filamentId })
        .orderBy('created_at', 'desc')
        .limit(100)
        .get()

      if (!reviewDocs?.length) {
        const emptyPayload = { reviews: [], summary: buildRatingSummary([]) }
        reviewBundleCache.set(filamentId, emptyPayload)
        return emptyPayload
      }

      const userIds = [...new Set(reviewDocs.map((item) => item.user_id).filter(Boolean))]

      const [profileRes, imageResults] = await Promise.all([
        userIds.length
          ? db.collection('profiles').where({ uid: cmd.in(userIds) }).limit(userIds.length).get()
          : Promise.resolve({ data: [] }),
        Promise.all(reviewDocs.map((item) => resolveImages(item.images))),
      ])

      const profileMap = {}
      ;(profileRes.data || []).forEach((profile) => {
        profileMap[profile.uid] = profile
      })

      const reviews = reviewDocs
        .map((item, index) => {
        const profile = profileMap[item.user_id] || {}
        const metricRatings = METRIC_KEYS.reduce((acc, key) => {
          acc[key] = Number(item.ratings?.[key] || 0)
          return acc
        }, {})

        return {
          id: item._id,
          userId: item.user_id,
          username: item.username || profile.username || '匿名用户',
          avatar: item.user_avatar || profile.avatar || (item.username || profile.username || '?').slice(0, 1).toUpperCase(),
          title: item.title || '',
          content: item.content || '',
          ratings: metricRatings,
          overallRating: Number(item.overall_rating || average(Object.values(metricRatings))),
          status: normalizeReviewStatus(item.status),
          isVerifiedUse: item.is_verified_use !== false,
          images: imageResults[index] || [],
          createdAt: normalizeTimestamp(item.created_at),
        }
        })
        .filter((item) => item.status === 'published')

      const payload = {
        reviews,
        summary: buildRatingSummary(reviews),
      }
      reviewBundleCache.set(filamentId, payload)
      return payload
    } catch (error) {
      if (isMissingCollectionError(error)) {
        const emptyPayload = { reviews: [], summary: buildRatingSummary([]) }
        reviewBundleCache.set(filamentId, emptyPayload)
        return emptyPayload
      }
      throw formatCollectionError(error, REVIEW_COLLECTION)
    } finally {
      reviewBundlePromiseCache.delete(filamentId)
    }
  })()

  reviewBundlePromiseCache.set(filamentId, loadPromise)
  return loadPromise
}

async function loadUsageRecords(filamentId, userId, { force = false } = {}) {
  if (!filamentId || !userId) return []
  const key = `${filamentId}:${userId}`
  if (!force && usageCache.has(key)) return usageCache.get(key)
  if (!force && usagePromiseCache.has(key)) return usagePromiseCache.get(key)

  const loadPromise = (async () => {
    try {
      const { data } = await db.collection(USAGE_COLLECTION)
        .where({ filament_id: filamentId, user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(20)
        .get()

      const imageResults = await Promise.all((data || []).map((item) => resolveImages(item.images)))
      const rows = (data || []).map((item, index) => ({
        id: item._id,
        userId: item.user_id,
        filamentId: item.filament_id,
        printerModel: item.printer_model || '',
        notes: item.notes || '',
        material: item.material || '',
        status: item.status || 'submitted',
        params: item.params || {},
        images: imageResults[index] || [],
        createdAt: normalizeTimestamp(item.created_at),
      }))
      usageCache.set(key, rows)
      return rows
    } catch (error) {
      if (isMissingCollectionError(error)) {
        usageCache.set(key, [])
        return []
      }
      throw formatCollectionError(error, USAGE_COLLECTION)
    } finally {
      usagePromiseCache.delete(key)
    }
  })()

  usagePromiseCache.set(key, loadPromise)
  return loadPromise
}

export function useFilamentReviews() {
  const fetchFilamentReviews = async (filamentId, options = {}) => {
    const payload = await loadReviewBundle(filamentId, options)
    return payload.reviews
  }

  const fetchFilamentRatingSummary = async (filamentId, options = {}) => {
    const payload = await loadReviewBundle(filamentId, options)
    return payload.summary
  }

  const fetchUserUsageRecords = async (filamentId, userId, options = {}) => {
    return loadUsageRecords(filamentId, userId, options)
  }

  const hasVerifiedUsage = async (filamentId, userId, options = {}) => {
    const rows = await loadUsageRecords(filamentId, userId, options)
    return rows.length > 0
  }

  const fetchUserFilamentReview = async (filamentId, userId, options = {}) => {
    if (!filamentId || !userId) return null
    try {
      const { data } = await db.collection(REVIEW_COLLECTION)
        .where({ filament_id: filamentId, user_id: userId })
        .limit(1)
        .get()

      if (!data?.length) return null

      const reviewDoc = data[0]
      const images = await resolveImages(reviewDoc.images)
      const metricRatings = METRIC_KEYS.reduce((acc, key) => {
        acc[key] = Number(reviewDoc.ratings?.[key] || 0)
        return acc
      }, {})

      return {
        id: reviewDoc._id,
        userId: reviewDoc.user_id,
        username: reviewDoc.username || userId,
        avatar: reviewDoc.user_avatar || '?',
        content: reviewDoc.content || '',
        ratings: metricRatings,
        overallRating: Number(reviewDoc.overall_rating || average(Object.values(metricRatings))),
        status: normalizeReviewStatus(reviewDoc.status),
        images,
        createdAt: normalizeTimestamp(reviewDoc.created_at),
      }
    } catch (error) {
      if (isMissingCollectionError(error)) return null
      throw formatCollectionError(error, REVIEW_COLLECTION)
    }
  }

  const submitUsageRecord = async (userId, userProfile, filament, payload = {}) => {
    const imageIDs = payload.images?.length ? await uploadImages(payload.images, userId) : []
    try {
      await db.collection(USAGE_COLLECTION).add({
        user_id: userId,
        username: userProfile?.username || '',
        user_avatar: userProfile?.avatar || '',
        filament_id: filament.id,
        filament_brand: filament.brand,
        filament_variant: filament.variant,
        filament_material: filament.material,
        printer_model: payload.printerModel?.trim() || '',
        material: payload.material?.trim() || filament.material,
        notes: payload.notes?.trim() || '',
        params: payload.params || {},
        images: imageIDs,
        status: 'submitted',
        created_at: db.serverDate(),
        updated_at: db.serverDate(),
      })
    } catch (error) {
      throw formatCollectionError(error, USAGE_COLLECTION)
    }

    invalidateUsageCache(filament.id, userId)
    invalidateReviewBundle(filament.id)
  }

  const submitFilamentReview = async (userId, userProfile, filament, payload = {}) => {
    const metricRatings = METRIC_KEYS.reduce((acc, key) => {
      acc[key] = Number(payload.ratings?.[key] || 0)
      return acc
    }, {})
    if (!payload.content?.trim()) throw new Error('请填写详细评价内容')
    if (METRIC_KEYS.some((key) => Number(metricRatings[key]) < 1)) throw new Error('请把评分项全部打完')

    const overallRating = Number(payload.overallRating || average(Object.values(metricRatings)))
    const imageIDs = payload.images?.length ? await uploadImages(payload.images, userId) : []

    try {
      const { data: existing } = await db.collection(REVIEW_COLLECTION)
        .where({ filament_id: filament.id, user_id: userId })
        .limit(1)
        .get()

      const reviewDoc = {
        user_id: userId,
        username: userProfile?.username || '',
        user_avatar: userProfile?.avatar || '',
        filament_id: filament.id,
        filament_brand: filament.brand,
        filament_variant: filament.variant,
        filament_material: filament.material,
        ratings: metricRatings,
        overall_rating: overallRating,
        content: payload.content?.trim() || '',
        images: imageIDs,
        is_verified_use: false,
        status: 'pending',
        updated_at: db.serverDate(),
      }

      if (existing?.length) {
        await db.collection(REVIEW_COLLECTION).doc(existing[0]._id).update(reviewDoc)
      } else {
        await db.collection(REVIEW_COLLECTION).add({
          ...reviewDoc,
          created_at: db.serverDate(),
        })
      }
    } catch (error) {
      throw formatCollectionError(error, REVIEW_COLLECTION)
    }

    invalidateReviewBundle(filament.id)
  }

  const deleteFilamentReview = async (filamentId, userId) => {
    if (!filamentId || !userId) return
    try {
      const { data } = await db.collection(REVIEW_COLLECTION)
        .where({ filament_id: filamentId, user_id: userId })
        .limit(1)
        .get()

      if (!data?.length) return
      await db.collection(REVIEW_COLLECTION).doc(data[0]._id).remove()
    } catch (error) {
      throw formatCollectionError(error, REVIEW_COLLECTION)
    }

    invalidateReviewBundle(filamentId)
  }

  return {
    fetchFilamentReviews,
    fetchFilamentRatingSummary,
    fetchUserUsageRecords,
    hasVerifiedUsage,
    fetchUserFilamentReview,
    submitUsageRecord,
    submitFilamentReview,
    deleteFilamentReview,
  }
}
