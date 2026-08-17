// src/components/CargaPedidos.jsx
import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'

function CargaPedidos({ onExito }) {
  const [datos, setDatos] = useState([])
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [tipoMensaje, setTipoMensaje] = useState('') // 'exito' | 'advertencia' | 'error'

  function manejarArchivo(e) {
    const archivo = e.target.files[0]
    if (!archivo) return

    setNombreArchivo(archivo.name)
    setMensaje('')

    const lector = new FileReader()

    lector.onload = (evento) => {
      const workbook = XLSX.read(evento.target.result, { type: 'binary' })
      const primeraHoja = workbook.Sheets[workbook.SheetNames[0]]
      const filas = XLSX.utils.sheet_to_json(primeraHoja)

      // Normalizar datos para evitar fallos por espacios o formato
      const filasLimpias = filas.map((fila) => {
        // Buscar la llave 'numero_factura' ignorando mayúsculas/espacios
        const claveFactura = Object.keys(fila).find(
          (k) => k.trim().toLowerCase() === 'numero_factura'
        )
        const numFactura = claveFactura ? String(fila[claveFactura]).trim() : ''

        return {
          ...fila,
          numero_factura: numFactura,
        }
      }).filter(f => f.numero_factura !== '') // Descartar filas sin factura

      setDatos(filasLimpias)
    }

    lector.readAsBinaryString(archivo)
  }

  async function guardarPedidos() {
    setGuardando(true)
    setMensaje('')

    // 1. Filtrar duplicados dentro del mismo archivo
    const vistos = new Set()
    const datosSinRepetirEnArchivo = datos.filter((fila) => {
      if (vistos.has(fila.numero_factura)) return false
      vistos.add(fila.numero_factura)
      return true
    })

    const numerosFactura = datosSinRepetirEnArchivo.map((f) => f.numero_factura)

    // 2. Consultar a Supabase qué facturas ya existen
    const { data: existentes, error: errorConsulta } = await supabase
      .from('pedidos')
      .select('numero_factura')
      .in('numero_factura', numerosFactura)

    if (errorConsulta) {
      setTipoMensaje('error')
      setMensaje('Error al verificar duplicados: ' + errorConsulta.message)
      setGuardando(false)
      return
    }

    // 3. Separar solo las facturas verdaderamente nuevas
    const yaExistentes = new Set(
      existentes ? existentes.map((p) => String(p.numero_factura).trim()) : []
    )
    const nuevos = datosSinRepetirEnArchivo.filter(
      (f) => !yaExistentes.has(f.numero_factura)
    )
    const cantidadDuplicados = datosSinRepetirEnArchivo.length - nuevos.length

    if (nuevos.length === 0) {
      setTipoMensaje('advertencia')
      setMensaje(`Las ${cantidadDuplicados} facturas ya existían en la base de datos. No se guardó nada nuevo.`)
      setGuardando(false)
      return
    }

    // 4. Insertar ÚNICAMENTE los registros nuevos
    const { data, error } = await supabase
      .from('pedidos')
      .insert(nuevos)
      .select()

    if (error) {
      setTipoMensaje('error')
      setMensaje('Error al guardar: ' + error.message)
    } else {
      let texto = `Se guardaron ${data.length} pedidos nuevos.`
      if (cantidadDuplicados > 0) {
        texto += ` Se omitieron ${cantidadDuplicados} por estar duplicados.`
      }
      setTipoMensaje('exito')
      setMensaje(texto)
      setDatos([])
      setNombreArchivo('')
      if (onExito) onExito()
    }

    setGuardando(false)
  }

  return (
    <div style={estilos.contenedor}>
      <h3 style={estilos.titulo}>📤 Cargar lista de pedidos</h3>
      <p style={estilos.subtitulo}>Archivos Excel (.xlsx) o CSV con columnas: numero_factura, cliente, direccion</p>

      <label style={estilos.zonaCarga}>
        <span style={{ fontSize: '1.5rem' }}>📁</span>
        <span style={{ fontWeight: 'bold' }}>
          {nombreArchivo || 'Selecciona un archivo'}
        </span>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={manejarArchivo} style={{ display: 'none' }} />
      </label>

      {datos.length > 0 && (
        <div style={{ marginTop: '1.2rem' }}>
          <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.5rem' }}>
            {datos.length} filas listas para procesar
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={estilos.tablaPreview}>
              <thead>
                <tr>
                  <th style={estilos.celdaEncabezado}>Factura</th>
                  <th style={estilos.celdaEncabezado}>Cliente</th>
                  <th style={estilos.celdaEncabezado}>Dirección</th>
                </tr>
              </thead>
              <tbody>
                {datos.slice(0, 5).map((fila, indice) => (
                  <tr key={indice}>
                    <td style={estilos.celda}>{fila.numero_factura}</td>
                    <td style={estilos.celda}>{fila.cliente}</td>
                    <td style={estilos.celda}>{fila.direccion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {datos.length > 5 && (
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.4rem' }}>
              Mostrando 5 de {datos.length} filas
            </p>
          )}

          <button onClick={guardarPedidos} disabled={guardando} style={estilos.boton}>
            {guardando ? 'Guardando...' : `Guardar ${datos.length} pedidos`}
          </button>
        </div>
      )}

      {mensaje && (
        <p style={{ ...estilos.mensaje, ...estilosMensaje[tipoMensaje] }}>
          {mensaje}
        </p>
      )}
    </div>
  )
}

const estilos = {
  contenedor: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  titulo: {
    margin: 0,
    fontSize: '1.1rem',
  },
  subtitulo: {
    margin: '0.3rem 0 1rem 0',
    fontSize: '0.85rem',
    color: '#64748b',
  },
  zonaCarga: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1.5rem',
    border: '2px dashed #cbd5e1',
    borderRadius: '10px',
    cursor: 'pointer',
    background: '#f8fafc',
    textAlign: 'center',
  },
  tablaPreview: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  celdaEncabezado: {
    textAlign: 'left',
    padding: '0.5rem',
    borderBottom: '2px solid #e5e7eb',
    background: '#f8fafc',
    fontSize: '0.85rem',
    color: '#475569',
  },
  celda: {
    padding: '0.5rem',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '0.9rem',
  },
  boton: {
    marginTop: '1rem',
    padding: '0.7rem 1.4rem',
    background: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: 'bold',
  },
  mensaje: {
    marginTop: '1rem',
    padding: '0.7rem 1rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
  },
}

const estilosMensaje = {
  exito: { background: '#f0fdf4', color: '#166534' },
  advertencia: { background: '#fffbeb', color: '#92400e' },
  error: { background: '#fef2f2', color: '#991b1b' },
}

export default CargaPedidos