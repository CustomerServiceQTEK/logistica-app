// src/utils/obtenerUsoStorage.js
import { supabase } from '../lib/supabaseClient'

export async function obtenerEstadisticasStorage() {
  try {
    // Obtener lista de archivos con paginación para > 1000 archivos
    let archivos = []
    let offset = 0
    const limit = 1000
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase.storage
        .from('evidencias')
        .list('', { limit, offset })

      if (error) throw error

      if (!data || data.length === 0) {
        hasMore = false
      } else {
        archivos = archivos.concat(data)
        if (data.length < limit) {
          hasMore = false
        } else {
          offset += limit
        }
      }
    }

    // Obtener tamaño real de cada archivo usando .stat()
    let totalBytes = 0
    
    for (const archivo of archivos) {
      try {
        const { data: stat } = await supabase.storage
          .from('evidencias')
          .stat(archivo.name)
        
        if (stat && stat.size) {
          totalBytes += stat.size
        }
      } catch (err) {
        console.warn(`No se pudo obtener tamaño de ${archivo.name}:`, err)
      }
    }

    const mbUsados = Number((totalBytes / (1024 * 1024)).toFixed(2))
    const mbLimite = 1024 // 1 GB de límite gratuito
    const porcentaje = Number(((mbUsados / mbLimite) * 100).toFixed(1))

    return {
      mbUsados,
      mbDisponible: Number((mbLimite - mbUsados).toFixed(2)),
      mbLimite,
      porcentaje,
      totalArchivos: archivos.length
    }
  } catch (err) {
    console.error('Error al calcular espacio de Storage:', err)
    return { mbUsados: 0, mbDisponible: 1024, mbLimite: 1024, porcentaje: 0, totalArchivos: 0 }
  }
}