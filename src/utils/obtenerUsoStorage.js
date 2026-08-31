// src/utils/obtenerUsoStorage.js
import { supabase } from '../lib/supabaseClient'

export async function obtenerEstadisticasStorage() {
  try {
    // Obtener tamaño total directamente de la tabla evidencias
    // que almacena el tamaño de cada archivo
    const { data: evidencias, error } = await supabase
      .from('evidencias')
      .select('archivo_size')

    if (error) throw error

    const totalBytes = (evidencias || []).reduce((acc, curr) => acc + (curr.archivo_size || 0), 0)
    
    const mbUsados = Number((totalBytes / (1024 * 1024)).toFixed(2))
    const mbLimite = 1024 // 1 GB de límite gratuito
    const porcentaje = Number(((mbUsados / mbLimite) * 100).toFixed(1))

    return {
      mbUsados,
      mbDisponible: Number((mbLimite - mbUsados).toFixed(2)),
      mbLimite,
      porcentaje,
      totalArchivos: (evidencias || []).length
    }
  } catch (err) {
    console.error('Error al calcular espacio de Storage:', err)
    return { mbUsados: 0, mbDisponible: 1024, mbLimite: 1024, porcentaje: 0, totalArchivos: 0 }
  }
}