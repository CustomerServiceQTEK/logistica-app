// src/utils/evaluarNitidez.js
export function calcularNitidezImagen(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = function (e) {
      const img = new Image()
      img.onload = function () {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        // Redimensionar para procesamiento ultrarrápido en móvil
        const maxDim = 300
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width
            width = maxDim
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data
        const gray = new Float32Array(width * height)

        // Convertir a escala de grises
        for (let i = 0; i < data.length; i += 4) {
          gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        }

        // Algoritmo de varianza del Laplaciano para detectar bordes y enfoque
        let sum = 0
        let sumSq = 0
        let count = 0

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x
            const laplacian =
              gray[idx - width] +
              gray[idx + width] +
              gray[idx - 1] +
              gray[idx + 1] -
              4 * gray[idx]

            sum += laplacian
            sumSq += laplacian * laplacian
            count++
          }
        }

        const mean = sum / count
        const variance = sumSq / count - mean * mean

        // Normalizar la puntuación a un porcentaje razonable (0 - 100%)
        let porcentaje = Math.round(Math.min(100, Math.max(10, (variance / 350) * 100)))
        resolve(porcentaje)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}