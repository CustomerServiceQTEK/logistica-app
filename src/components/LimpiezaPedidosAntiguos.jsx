import { useState } from 'react'
import {
  eliminarPedidosVencidos,
  obtenerVistaPreviaLimpieza,
} from '../utils/limpiarPedidosAntiguos'

function LimpiezaPedidosAntiguos({ onCompletado }) {
  const [vistaPrevia, setVistaPrevia] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [fallidos, setFallidos] = useState([])

  async function cargarVistaPrevia() {
    setCargando(true)
    setMensaje('')
    setFallidos([])
    setVistaPrevia(null)

    try {
      setVistaPrevia(await obtenerVistaPreviaLimpieza())
    } catch (error) {
      console.error('Error al obtener vista previa de limpieza:', error)
      setMensaje(`No se pudo cargar la vista previa: ${error.message}`)
    } finally {
      setCargando(false)
    }
  }

  async function confirmarLimpieza() {
    if (!vistaPrevia || vistaPrevia.pedidos.length === 0) return

    const fechaCorte = new Date(vistaPrevia.fechaCorte).toLocaleString('es-MX')
    const confirmado = window.confirm(
      `Se eliminarán ${vistaPrevia.pedidos.length} pedidos creados antes del ${fechaCorte}, junto con ${vistaPrevia.totalArchivos} archivos y ${vistaPrevia.totalEvidencias} registros de evidencia. Esta acción no se puede deshacer. ¿Continuar?`
    )
    if (!confirmado) return

    setCargando(true)
    setMensaje('')
    setFallidos([])

    try {
      const resultado = await eliminarPedidosVencidos(vistaPrevia)
      setFallidos(resultado.fallidos)
      setMensaje(
        `Limpieza terminada: ${resultado.eliminados} pedidos eliminados y ${resultado.fallidos.length} con errores.`
      )
      setVistaPrevia(null)
      if (resultado.eliminados > 0 && onCompletado) onCompletado()
    } catch (error) {
      console.error('Error durante limpieza de pedidos:', error)
      setMensaje(`La limpieza no pudo completarse: ${error.message}`)
    } finally {
      setCargando(false)
    }
  }

  const pedidosMuestra = vistaPrevia?.pedidos.slice(0, 10) || []
  const restantes = (vistaPrevia?.pedidos.length || 0) - pedidosMuestra.length

  return (
    <section style={estilos.contenedor} aria-labelledby="titulo-limpieza">
      <h3 id="titulo-limpieza" style={estilos.titulo}>Limpieza de pedidos antiguos</h3>
      <p style={estilos.descripcion}>
        Permite revisar y eliminar pedidos creados hace más de 45 días, junto con sus archivos y registros de evidencia.
      </p>

      <button
        type="button"
        onClick={cargarVistaPrevia}
        disabled={cargando}
        style={estilos.botonVistaPrevia}
      >
        {cargando ? 'Procesando...' : 'Buscar pedidos anteriores a 45 días'}
      </button>

      {vistaPrevia && (
        <div style={estilos.resultado}>
          <p>
            <strong>{vistaPrevia.pedidos.length}</strong> pedidos,{' '}
            <strong>{vistaPrevia.totalEvidencias}</strong> registros de evidencia y{' '}
            <strong>{vistaPrevia.totalArchivos}</strong> archivos anteriores al{' '}
            {new Date(vistaPrevia.fechaCorte).toLocaleString('es-MX')}.
          </p>

          {pedidosMuestra.length > 0 && (
            <ul style={estilos.lista}>
              {pedidosMuestra.map((pedido) => (
                <li key={pedido.id}>
                  Factura {pedido.numero_factura || pedido.id} —{' '}
                  {new Date(pedido.creado_en).toLocaleDateString('es-MX')}
                </li>
              ))}
            </ul>
          )}
          {restantes > 0 && <p>Y {restantes} pedidos más.</p>}

          {vistaPrevia.pedidos.length > 0 ? (
            <button
              type="button"
              onClick={confirmarLimpieza}
              disabled={cargando}
              style={estilos.botonEliminar}
            >
              Eliminar pedidos, evidencias y archivos antiguos
            </button>
          ) : (
            <p>No hay pedidos que cumplan el criterio de antigüedad.</p>
          )}
        </div>
      )}

      {mensaje && <p role="status" style={estilos.mensaje}>{mensaje}</p>}

      {fallidos.length > 0 && (
        <ul role="alert" style={estilos.errores}>
          {fallidos.map((fallido, indice) => (
            <li key={`${fallido.numeroFactura}-${indice}`}>
              Factura {fallido.numeroFactura}: {fallido.mensaje}
            </li>
          ))}
        </ul>
      )}
    </section>
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
  titulo: { margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#0f172a' },
  descripcion: { margin: '0 0 1rem', color: '#475569', fontSize: '0.9rem' },
  botonVistaPrevia: {
    padding: '0.65rem 1rem',
    background: '#e2e8f0',
    color: '#1e293b',
    border: 'none',
    borderRadius: '7px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  resultado: {
    marginTop: '1rem',
    padding: '1rem',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    color: '#334155',
    fontSize: '0.9rem',
  },
  lista: { margin: '0.75rem 0', paddingLeft: '1.25rem', lineHeight: 1.6 },
  botonEliminar: {
    marginTop: '0.75rem',
    padding: '0.65rem 1rem',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '7px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  mensaje: { margin: '1rem 0 0', color: '#334155', fontSize: '0.9rem' },
  errores: {
    margin: '0.75rem 0 0',
    paddingLeft: '1.25rem',
    color: '#b91c1c',
    fontSize: '0.85rem',
  },
}

export default LimpiezaPedidosAntiguos
