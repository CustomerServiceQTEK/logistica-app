// src/utils/obtenerUsoStorage.js
import { supabase } from '../lib/supabaseClient'

export async function obtenerEstadisticasStorage() {
  const bucket = supabase.storage.from('evidencias')
  const tamanoPagina = 1000
  const rutasPendientes = ['']
  let totalBytes = 0
  let totalArchivos = 0

  while (rutasPendientes.length > 0) {
    const ruta = rutasPendientes.pop()
    let inicio = 0

    while (true) {
      const { data, error } = await bucket.list(ruta, {
        limit: tamanoPagina,
        offset: inicio,
        sortBy: { column: 'name', order: 'asc' },
      })

      if (error) throw error

      const objetos = data || []
      for (const objeto of objetos) {
        if (objeto.id === null && objeto.metadata === null) {
          rutasPendientes.push(ruta ? `${ruta}/${objeto.name}` : objeto.name)
          continue
        }

        const bytes = Number(objeto.metadata?.size)
        if (!Number.isFinite(bytes) || bytes < 0) {
          throw new Error(`El objeto "${objeto.name}" no tiene un tamaño válido en Storage.`)
        }

        totalBytes += bytes
        totalArchivos += 1
      }

      if (objetos.length < tamanoPagina) break
      inicio += objetos.length
    }
  }

  const mbUsados = Number((totalBytes / (1024 * 1024)).toFixed(2))
  const mbLimite = 1024 // 1 GB de límite gratuito
  const porcentaje = Number(((mbUsados / mbLimite) * 100).toFixed(1))

  return {
    mbUsados,
    mbDisponible: Number(Math.max(0, mbLimite - mbUsados).toFixed(2)),
    mbLimite,
    porcentaje,
    totalArchivos,
  }
}