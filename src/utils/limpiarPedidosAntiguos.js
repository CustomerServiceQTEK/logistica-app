import { supabase } from '../lib/supabaseClient'

const DIAS_RETENCION = 45
const TAMANO_PAGINA = 500
const TAMANO_LOTE_IDS = 100
const TAMANO_LOTE_ARCHIVOS = 100

async function consultarTodasLasPaginas(crearConsulta) {
  const registros = []
  let inicio = 0

  while (true) {
    const { data, error } = await crearConsulta()
      .range(inicio, inicio + TAMANO_PAGINA - 1)

    if (error) throw error

    const pagina = data || []
    registros.push(...pagina)
    if (pagina.length < TAMANO_PAGINA) return registros
    inicio += pagina.length
  }
}

async function obtenerPedidosVencidos(fechaCorte) {
  return consultarTodasLasPaginas(() =>
    supabase
      .from('pedidos')
      .select('id, numero_factura, creado_en')
      .lt('creado_en', fechaCorte)
      .order('id', { ascending: true })
  )
}

async function obtenerEvidenciasDePedidos(pedidoIds) {
  const evidencias = []

  for (let inicio = 0; inicio < pedidoIds.length; inicio += TAMANO_LOTE_IDS) {
    const ids = pedidoIds.slice(inicio, inicio + TAMANO_LOTE_IDS)
    const lote = await consultarTodasLasPaginas(() =>
      supabase
        .from('evidencias')
        .select('id, pedido_id, archivo_url')
        .in('pedido_id', ids)
        .order('id', { ascending: true })
    )
    evidencias.push(...lote)
  }

  return evidencias
}

function obtenerRutaStorage(urlArchivo) {
  let url
  try {
    url = new URL(urlArchivo)
  } catch {
    throw new Error('Una evidencia tiene una URL inválida; no se borró su pedido.')
  }

  let origenSupabase
  try {
    origenSupabase = new URL(import.meta.env.VITE_SUPABASE_URL).origin
  } catch {
    throw new Error('La URL de Supabase no está configurada correctamente.')
  }
  if (url.origin !== origenSupabase) {
    throw new Error('Una evidencia pertenece a otro origen; no se borró su pedido.')
  }

  const rutaUrl = url.pathname
  const prefijo = '/storage/v1/object/'
  const indicePrefijo = rutaUrl.indexOf(prefijo)
  if (indicePrefijo === -1) {
    throw new Error('Una evidencia no apunta a una ruta reconocida de Storage.')
  }

  const rutaBucket = rutaUrl.slice(indicePrefijo + prefijo.length)
  const coincidencia = rutaBucket.match(/^(?:public|sign|authenticated)\/evidencias\/(.+)$/)
  if (!coincidencia) {
    throw new Error('Una evidencia no pertenece al bucket evidencias; no se borró su pedido.')
  }

  let ruta
  try {
    ruta = decodeURIComponent(coincidencia[1])
  } catch {
    throw new Error('Una evidencia tiene una ruta codificada inválida.')
  }

  if (ruta.split('/').some((segmento) => !segmento || segmento === '.' || segmento === '..')) {
    throw new Error('Una evidencia tiene una ruta de Storage no válida.')
  }

  return ruta
}

function crearFechaCorte() {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - DIAS_RETENCION)
  return fecha.toISOString()
}

export async function obtenerVistaPreviaLimpieza() {
  const fechaCorte = crearFechaCorte()
  const pedidos = await obtenerPedidosVencidos(fechaCorte)
  const evidencias = await obtenerEvidenciasDePedidos(pedidos.map((pedido) => pedido.id))

  return {
    fechaCorte,
    pedidos,
    totalEvidencias: evidencias.length,
    totalArchivos: evidencias.filter((evidencia) => Boolean(evidencia.archivo_url)).length,
  }
}

async function borrarArchivosStorage(evidencias) {
  const rutas = [...new Set(
    evidencias
      .filter((evidencia) => evidencia.archivo_url)
      .map((evidencia) => obtenerRutaStorage(evidencia.archivo_url))
  )]

  for (let inicio = 0; inicio < rutas.length; inicio += TAMANO_LOTE_ARCHIVOS) {
    const lote = rutas.slice(inicio, inicio + TAMANO_LOTE_ARCHIVOS)
    const { error } = await supabase.storage.from('evidencias').remove(lote)
    if (error) throw error
  }
}

async function borrarEvidencias(evidencias) {
  for (let inicio = 0; inicio < evidencias.length; inicio += TAMANO_PAGINA) {
    const lote = evidencias.slice(inicio, inicio + TAMANO_PAGINA)
    const { data, error } = await supabase
      .from('evidencias')
      .delete()
      .in('id', lote.map((evidencia) => evidencia.id))
      .select('id')

    if (error) throw error
    if ((data || []).length !== lote.length) {
      throw new Error('No se pudieron borrar todos los registros de evidencia.')
    }
  }
}

async function borrarPedido(pedido, fechaCorte) {
  const { data, error } = await supabase
    .from('pedidos')
    .delete()
    .eq('id', pedido.id)
    .lt('creado_en', fechaCorte)
    .select('id')

  if (error) throw error
  if (!data || data.length !== 1) {
    throw new Error('El pedido no se borró; verifica sus permisos y relaciones.')
  }
}

export async function eliminarPedidosVencidos(vistaPrevia) {
  const resultados = { eliminados: 0, fallidos: [] }

  for (const pedido of vistaPrevia.pedidos) {
    try {
      const evidencias = await obtenerEvidenciasDePedidos([pedido.id])
      await borrarArchivosStorage(evidencias)
      await borrarEvidencias(evidencias)
      await borrarPedido(pedido, vistaPrevia.fechaCorte)
      resultados.eliminados += 1
    } catch (error) {
      resultados.fallidos.push({
        numeroFactura: pedido.numero_factura || pedido.id,
        mensaje: error.message || 'Error inesperado durante la limpieza.',
      })
    }
  }

  return resultados
}
