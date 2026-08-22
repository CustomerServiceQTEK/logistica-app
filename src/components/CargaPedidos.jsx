// src/components/CargaPedidos.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function CargaPedidos({ onExito }) {
  const [textoPegado, setTextoPegado] = useState('')
  const [datos, setDatos] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [tipoMensaje, setTipoMensaje] = useState('') // 'exito' | 'advertencia' | 'error'

  // Procesa el texto pegado de SAP B1
  function procesarTextoPegado(e) {
    const texto = e.target.value
    setTextoPegado(texto)
    setMensaje('')

    if (!texto.trim()) {
      setDatos([])
      return
    }

    const filas = texto.trim().split('\n')
    const filasProcesadas = []

    filas.forEach((fila) => {
      // SAP B1 separa columnas por tabuladores (\t) al copiar
      const columnas = fila.split('\t')

      // Ignorar encabezados de SAP
      if (
        columnas[0]?.toLowerCase().includes('document') ||
        columnas[0]?.includes('#') ||
        columnas[1]?.toLowerCase().includes('document')
      ) {
        return
      }

      // Si la fila tiene datos suficientes
      if (columnas.length >= 2) {
        // Mapeo según columnas de SAP B1:
        // Columna 1: Document Number
        // Columna 3: Customer Name
        // Columna 5: E-Mail Vendedor
        // Columna 6: Direccion
        const numFactura = (columnas[1] || columnas[0] || '').trim()
        const cliente = (columnas[3] || columnas[2] || '').trim()
        const emailVendedor = (columnas[5] || columnas[4] || '').trim()
        const direccion = (columnas[6] || columnas[5] || '').trim()

        if (numFactura && numFactura !== '#') {
          filasProcesadas.push({
            numero_factura: numFactura,
            cliente: cliente || 'Cliente SAP',
            direccion: direccion || 'Dirección registrada en SAP',
            vendedor_email: emailVendedor.includes('@') ? emailVendedor : null,
            estatus: 'pendiente',
          })
        }
      }
    })

    setDatos(filasProcesadas)
  }

  async function guardarPedidos() {
    if (datos.length === 0) return

    setGuardando(true)
    setMensaje('')

    // 1. Filtrar duplicados dentro del mismo bloque pegado
    const vistos = new Set()
    const datosSinRepetirEnTexto = datos.filter((fila) => {
      if (vistos.has(fila.numero_factura)) return false
      vistos.add(fila.numero_factura)
      return true
    })

    const numerosFactura = datosSinRepetirEnTexto.map((f) => f.numero_factura)

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
    const nuevos = datosSinRepetirEnTexto.filter(
      (f) => !yaExistentes.has(f.numero_factura)
    )
    const cantidadDuplicados = datosSinRepetirEnTexto.length - nuevos.length

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
      let textoMsg = `Se guardaron ${data.length} pedidos nuevos.`
      if (cantidadDuplicados > 0) {
        textoMsg += ` Se omitieron ${cantidadDuplicados} por estar duplicados.`
      }
      setTipoMensaje('exito')
      setMensaje(textoMsg)
      setDatos([])
      setTextoPegado('')
      if (onExito) onExito()
    }

    setGuardando(false)
  }

  return (
    <div style={estilos.contenedor}>
      <h3 style={estilos.titulo}>📋 Cargar Pedidos desde SAP B1</h3>
      <p style={estilos.subtitulo}>
        En SAP B1 presiona <b>"Copy Data"</b> y pega el contenido aquí abajo con <b>Ctrl + V</b>:
      </p>

      <textarea
        rows={5}
        placeholder="Pega aquí los datos copiados de SAP B1..."
        value={textoPegado}
        onChange={procesarTextoPegado}
        style={estilos.textarea}
      />

      {datos.length > 0 && (
        <div style={{ marginTop: '1.2rem' }}>
          <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            📊 {datos.length} facturas detectadas listas para guardar:
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={estilos.tablaPreview}>
              <thead>
                <tr>
                  <th style={estilos.celdaEncabezado}>Factura</th>
                  <th style={estilos.celdaEncabezado}>Cliente</th>
                  <th style={estilos.celdaEncabezado}>Correo Vendedor</th>
                  <th style={estilos.celdaEncabezado}>Dirección</th>
                </tr>
              </thead>
              <tbody>
                {datos.slice(0, 5).map((fila, indice) => (
                  <tr key={indice}>
                    <td style={{ ...estilos.celda, fontWeight: 'bold' }}>{fila.numero_factura}</td>
                    <td style={estilos.celda}>{fila.cliente}</td>
                    <td style={{ ...estilos.celda, color: '#2563eb' }}>
                      {fila.vendedor_email || 'Sin correo'}
                    </td>
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
            {guardando ? 'Verificando y Guardando...' : `🚀 Guardar ${datos.length} pedidos`}
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
  textarea: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontFamily: 'sans-serif',
    fontSize: '0.85rem',
    boxSizing: 'border-box',
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
    fontSize: '0.88rem',
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
    fontWeight: 'bold',
  },
}

const estilosMensaje = {
  exito: { background: '#f0fdf4', color: '#166534' },
  advertencia: { background: '#fffbeb', color: '#92400e' },
  error: { background: '#fef2f2', color: '#991b1b' },
}

export default CargaPedidos