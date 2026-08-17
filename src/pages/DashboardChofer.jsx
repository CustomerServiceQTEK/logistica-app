// src/pages/DashboardChofer.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import SubirEvidencia from '../components/SubirEvidencia'
import EditarEvidencia from '../components/EditarEvidencia'

function DashboardChofer() {
  const { usuario, perfil, cerrarSesion } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [evidencias, setEvidencias] = useState({})
  const [cargando, setCargando] = useState(true)

  useEffect(function () {
    cargarMisPedidos()
    cargarMisEvidencias()
  }, [])

  async function cargarMisPedidos() {
    setCargando(true)
    const resultado = await supabase
      .from('pedidos')
      .select('*')
      .eq('chofer_id', usuario.id)
      .order('creado_en', { ascending: false })
    if (!resultado.error) {
      setPedidos(resultado.data)
    }
    setCargando(false)
  }

  async function cargarMisEvidencias() {
    const resultado = await supabase
      .from('evidencias')
      .select('id, pedido_id, archivo_url, subido_en')
      .eq('chofer_id', usuario.id)
      .order('subido_en', { ascending: false })

    if (!resultado.error) {
      const mapa = {}
      resultado.data.forEach(function (ev) {
        if (!mapa[ev.pedido_id]) {
          mapa[ev.pedido_id] = ev
        }
      })
      setEvidencias(mapa)
    }
  }

  function actualizarTodo() {
    cargarMisPedidos()
    cargarMisEvidencias()
  }

  const pendientes = pedidos.filter(function (p) { return p.estatus === 'pendiente' })
  const completadas = pedidos.filter(function (p) { return p.estatus === 'completada' })

  return (
    <div style={estilos.pagina}>
      <header style={estilos.header}>
        <div style={estilos.headerContenido}>
          <h2 style={estilos.titulo}>Panel de Chofer</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={estilos.textoNombre}>{perfil?.nombre_completo || usuario?.email}</span>
            <button onClick={cerrarSesion} style={estilos.botonSalir}>
              Cerrar sesion
            </button>
          </div>
        </div>
      </header>

      <div style={estilos.contenido}>
        <div style={estilos.resumen}>
          <span style={estilos.chipPendiente}>{pendientes.length} pendientes</span>
          <span style={estilos.chipCompletada}>{completadas.length} completadas</span>
        </div>

        {cargando && <p>Cargando...</p>}

        {!cargando && pedidos.length === 0 && (
          <div style={estilos.vacio}>
            <p>No tienes pedidos asignados por el momento.</p>
          </div>
        )}

        {!cargando && pedidos.map(function (pedido) {
          const evidencia = evidencias[pedido.id]

          return (
            <div key={pedido.id} style={estilos.tarjetaPedido}>
              <div>
                <p style={estilos.numeroFactura}>{pedido.numero_factura}</p>
                <p style={estilos.datoCliente}>{pedido.cliente}</p>
                <p style={estilos.datoCliente}>{pedido.direccion}</p>

                {evidencia && (<a href={evidencia.archivo_url} target="_blank" rel="noopener noreferrer" style={estilos.linkVerEvidencia}>Ver evidencia actual</a>)}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.6rem' }}>
                <span style={pedido.estatus === 'completada' ? estilos.badgeCompletada : estilos.badgePendiente}>
                  {pedido.estatus === 'completada' ? 'Completada' : 'Pendiente'}
                </span>

                {pedido.estatus === 'pendiente' && (
                  <SubirEvidencia
                    pedido={pedido}
                    choferId={usuario.id}
                    onCompletado={actualizarTodo}
                  />
                )}

                {pedido.estatus === 'completada' && evidencia && (
                  <EditarEvidencia
                    pedido={pedido}
                    evidenciaActual={evidencia}
                    onActualizado={actualizarTodo}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const estilos = {
  pagina: {
    minHeight: '100vh',
  },
  header: {
    background: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  headerContenido: {
    maxWidth: '700px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
  },
  titulo: {
    margin: 0,
    color: '#fff',
    fontSize: '1.3rem',
  },
  textoNombre: {
    color: '#cbd5e1',
    fontSize: '0.9rem',
  },
  botonSalir: {
    padding: '0.5rem 1rem',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  contenido: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
  resumen: {
    display: 'flex',
    gap: '0.8rem',
    marginBottom: '1.5rem',
  },
  chipPendiente: {
    background: '#fffbeb',
    color: '#92400e',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  chipCompletada: {
    background: '#f0fdf4',
    color: '#166534',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  vacio: {
    background: '#fff',
    border: '1px dashed #cbd5e1',
    borderRadius: '12px',
    padding: '2.5rem',
    textAlign: 'center',
    color: '#64748b',
  },
  tarjetaPedido: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.2rem',
    marginBottom: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  numeroFactura: {
    margin: 0,
    fontWeight: 'bold',
    fontSize: '1.05rem',
  },
  datoCliente: {
    margin: '0.3rem 0 0 0',
    color: '#64748b',
    fontSize: '0.9rem',
  },
  linkVerEvidencia: {
    display: 'inline-block',
    marginTop: '0.5rem',
    color: '#2563eb',
    textDecoration: 'none',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
  badgePendiente: {
    background: '#fffbeb',
    color: '#92400e',
    padding: '0.3rem 0.7rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  badgeCompletada: {
    background: '#f0fdf4',
    color: '#166534',
    padding: '0.3rem 0.7rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
}

export default DashboardChofer