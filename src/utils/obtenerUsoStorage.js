// src/utils/obtenerUsoStorage.js
import { supabase } from '../lib/supabaseClient'

export async function obtenerEstadisticasStorage() {
  try {
    const { data: archivos, error } = await supabase.storage
      .from('evidencias')
      .list('', { limit: 1000 })

    if (error) throw error

    const totalBytes = (archivos || []).reduce((acc, curr) => acc + (curr.metadata?.size || 0), 0)
    
    const mbUsados = Number((totalBytes / (1024 * 1024)).toFixed(2))
    const mbLimite = 1024 // 1 GB de límite gratuito
    const porcentaje = Number(((mbUsados / mbLimite) * 100).toFixed(1))

    return {
      mbUsados,
      mbDisponible: Number((mbLimite - mbUsados).toFixed(2)),
      mbLimite,
      porcentaje,
      totalArchivos: (archivos || []).length
    }
  } catch (err) {
    console.error('Error al calcular espacio de Storage:', err)
    return { mbUsados: 0, mbDisponible: 1024, mbLimite: 1024, porcentaje: 0, totalArchivos: 0 }
  }
}