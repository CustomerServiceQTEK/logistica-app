// src/components/ExportarExcel.jsx
// Botón para que el Administrador exporte todos los pedidos a un archivo Excel,
// incluyendo un link a la evidencia de cada uno (si existe)

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'

function ExportarExcel() {
  const [exportando, setExportando] = useState(false)

  async function exportar() {
    setExportando(true)

    // 1. Traemos todos los pedidos
    const { data: pedidos, error: errorPedidos } = await supabase
      .from('pedidos')
      .select('*')
      .order('creado_en', { ascending: false })

    if (errorPedidos) {
      alert('Error al obtener pedidos: ' + errorPedidos.message)
      setExportando(false)
      return
    }

    // 2. Traemos todas las evidencias, para asociarlas por pedido_id
    const { data: evidencias } = await supabase
      .from('evidencias')
      .select('pedido_id, archivo_url, subido_en')
      .order('subido_en', { ascending: false })

    const mapaEvidencias = {}
    ;(evidencias || []).forEach((ev) => {
      if (!mapaEvidencias[ev.pedido_id]) {
        mapaEvidencias[ev.pedido_id] = ev.archivo_url
      }
    })

    // 3. Traemos los choferes, para mostrar su nombre en vez de solo el ID
    const { data: choferes } = await supabase
      .from('perfiles')
      .select('id, nombre_completo')

    const mapaChoferes = {}
    ;(choferes || []).forEach((c) => {
      mapaChoferes[c.id] = c.nombre_completo || 'Sin nombre'
    })

    // 4. Armamos las filas en un formato limpio para el Excel
    const filas = pedidos.map((pedido) => ({
      'Numero de Factura': pedido.numero_factura,
      'Cliente': pedido.cliente || '',
      'Direccion': pedido.direccion || '',
      'Estatus': pedido.estatus,
      'Chofer Asignado': pedido.chofer_id ? (mapaChoferes[pedido.chofer_id] || 'Desconocido') : 'Sin asignar',
      'Link de Evidencia': mapaEvidencias[pedido.id] || 'Sin evidencia',
      'Fecha de Creacion': new Date(pedido.creado_en).toLocaleString(),
    }))

    // 5. Convertimos a hoja de Excel y descargamos el archivo
    const hoja = XLSX.utils.json_to_sheet(filas)
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Entregas')

    // Nombre del archivo con la fecha de hoy, para diferenciarlos
    const fechaHoy = new Date().toISOString().split('T')[0]
    XLSX.writeFile(libro, `entregas_${fechaHoy}.xlsx`)

    setExportando(false)
  }

  return (
    <button onClick={exportar} disabled={exportando} style={estilos.boton}>
      {exportando ? 'Exportando...' : '📊 Exportar a Excel'}
    </button>
  )
}

const estilos = {
  boton: {
    padding: '0.5rem 1rem',
    background: '#0f766e',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 'normal',
  },
}

export default ExportarExcel