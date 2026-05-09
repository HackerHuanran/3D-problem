/**
 * 上传前压缩图片：Canvas 缩放 + JPEG 输出
 * @param {File} file       原始文件
 * @param {number} maxWidth 最大宽度，默认 1200px
 * @param {number} quality  JPEG 质量 0-1，默认 0.75
 * @returns {Promise<File>} 压缩后的 File
 */
export function compressImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round(height * maxWidth / width)
        width  = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) } // 失败时回退原文件
    img.src = url
  })
}
