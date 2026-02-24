/**
 * Compress image file while maintaining quality
 * @param {File} file - Image file to compress
 * @param {object} options - Compression options
 * @param {number} options.maxWidth - Maximum width (default: 1920)
 * @param {number} options.maxHeight - Maximum height (default: 1920)
 * @param {number} options.quality - WebP quality 0-1 (default: 0.85)
 * @param {number} options.maxSizeMB - Maximum file size in MB (default: 2)
 * @returns {Promise<File>} Compressed file
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    maxSizeMB = 2,
  } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        // Draw image with high quality
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to blob with quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }

            // If file is still too large, compress more aggressively
            const sizeMB = blob.size / (1024 * 1024)
            if (sizeMB > maxSizeMB && quality > 0.5) {
              // Recursively compress with lower quality
              const newQuality = Math.max(0.5, quality - 0.1)
              compressImage(file, { maxWidth, maxHeight, quality: newQuality, maxSizeMB })
                .then(resolve)
                .catch(reject)
              return
            }

            // Create new file with original name but .webp extension
            const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
            const newFileName = `${originalName}.webp`

            const compressedFile = new File([blob], newFileName, {
              type: 'image/webp',
              lastModified: Date.now(),
            })

            resolve(compressedFile)
          },
          'image/webp',
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target.result
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Compress multiple images
 * @param {File[]} files - Array of image files
 * @param {object} options - Compression options
 * @returns {Promise<File[]>} Array of compressed files
 */
export async function compressImages(files, options = {}) {
  const results = await Promise.all(
    files.map((file) => compressImage(file, options))
  )
  return results
}
