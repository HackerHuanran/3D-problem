import { app } from '@/lib/tcb.js'

export async function uploadImages(files, userId) {
  const fileIDs = []
  for (const file of files) {
    const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
    const cloudPath = `market-images/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    let result
    try {
      result = await app.uploadFile({ cloudPath, filePath: file })
    } catch (e) {
      throw new Error('图片上传失败：' + (e?.message || e))
    }
    if (!result?.fileID) {
      throw new Error('图片上传失败：未获取到 fileID')
    }
    fileIDs.push(result.fileID)
  }
  return fileIDs
}

export async function getImageURLs(fileIDs) {
  if (!fileIDs?.length) return []
  try {
    const { fileList } = await app.getTempFileURL({ fileList: fileIDs })
    return fileList.map(f => ({ id: f.fileID, url: f.tempFileURL || '' }))
  } catch {
    return fileIDs.map(id => ({ id, url: '' }))
  }
}
