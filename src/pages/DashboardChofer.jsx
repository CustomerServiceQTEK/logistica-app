// src/pages/DashboardChofer.jsx
import MetricasChofer from '../components/MetricasChofer'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import LogoFlotante from '../components/LogoFlotante'

function DashboardChofer() {
  const { perfil, cerrarSesion } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [evidencias, setEvidencias] = useState({})
  const [cargando, setCargando] = useState(true)
  const [subiendoId, setSubiendoId] = useState(null)
  const [eliminandoEvId, setEliminandoEvId] = useState(null)
  const [mensaje, setMensaje] = useState('')

  // NUEVOS ESTADOS: Filtro activo por defecto en 'pendiente' y modal de confirmación
  const [filtroEstatus, setFiltroEstatus] = useState('pendiente')
  const [evidenciaAEliminar, setEvidenciaAEliminar] = useState(null) // Para el modal flotante

  useEffect(() => {
    if (perfil?.id) {
      cargarMisPedidos()
    }
  }, [perfil])

  async function cargarMisPedidos() {
    setCargando(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const usuarioId = perfil?.id || userData?.user?.id

      if (!usuarioId) return

      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('chofer_id', usuarioId)
        .order('creado_en', { ascending: false })

      if (!error && data) {
        setPedidos(data)
        const pedidoIds = data.map((p) => p.id)
        if (pedidoIds.length > 0) {
          cargarEvidencias(pedidoIds)
        }
      }
    } catch (e) {
      console.error('Error al cargar pedidos del chofer:', e)
    } finally {
      setCargando(false)
    }
  }

  async function cargarEvidencias(pedidoIds) {
    try {
      const { data, error } = await supabase
        .from('evidencias')
        .select('*')
        .in('pedido_id', pedidoIds)
        .order('subido_en', { ascending: false })

      if (!error && data) {
        const mapa = {}
        data.forEach((ev) => {
          if (!mapa[ev.pedido_id]) {
            mapa[ev.pedido_id] = []
          }
          mapa[ev.pedido_id].push(ev)
        })
        setEvidencias(mapa)
      }
    } catch (e) {
      console.error('Error al cargar evidencias:', e)
    }
  }

  async function cambiarEstatus(pedidoId, nuevoEstatus) {
    const { error } = await supabase
      .from('pedidos')
      .update({ estatus: nuevoEstatus })
      .eq('id', pedidoId)

    if (!error) {
      setPedidos((prev) =>
        prev.map((p) => (p.id === pedidoId ? { ...p, estatus: nuevoEstatus } : p))
      )
    }
  }

  // Subir evidencia
  async function manejarSubirEvidencia(e, pedidoId) {
    const archivo = e.target.files[0]
    if (!archivo) return

    setSubiendoId(pedidoId)
    setMensaje('')

    try {
      const { data: userData } = await supabase.auth.getUser()
      const choferIdActual = perfil?.id || userData?.user?.id

      if (!choferIdActual) {
        throw new Error('No se pudo verificar el ID del usuario autenticado. Reintenta iniciar sesión.')
      }

      const extension = archivo.name.split('.').pop()
      const nombreArchivo = `${pedidoId}_${Date.now()}.${extension}`

      const { error: errorStorage } = await supabase.storage
        .from('evidencias')
        .upload(nombreArchivo, archivo, { upsert: true })

      if (errorStorage) throw errorStorage

      const { data: urlData } = supabase.storage
        .from('evidencias')
        .getPublicUrl(nombreArchivo)

      const archivoUrl = urlData.publicUrl

      const { data: evidenciaGuardada, error: errorTabla } = await supabase
        .from('evidencias')
        .insert({
          pedido_id: pedidoId,
          chofer_id: choferIdActual,
          archivo_url: archivoUrl,
        })
        .select()
        .single()

      if (errorTabla) throw errorTabla

      setEvidencias((prev) => ({
        ...prev,
        [pedidoId]: [evidenciaGuardada, ...(prev[pedidoId] || [])],
      }))

      await cambiarEstatus(pedidoId, 'completada')
      setMensaje('✅ Evidencia subida correctamente.')
    } catch (error) {
      console.error('Error al subir evidencia:', error)
      alert('Error al subir el archivo: ' + error.message)
    } finally {
      setSubiendoId(null)
    }
  }

  // ELIMINAR / DESHACER ADJUNTO (Ejecutado tras confirmar en el modal)
  async function confirmarEliminarEvidencia() {
    if (!evidenciaAEliminar) return
    const { ev, pedidoId } = evidenciaAEliminar

    setEliminandoEvId(ev.id)
    setMensaje('')
    setEvidenciaAEliminar(null) // Cerrar modal

    try {
      if (ev.archivo_url) {
        const partesUrl = ev.archivo_url.split('/')
        const nombreArchivo = partesUrl[partesUrl.length - 1]
        if (nombreArchivo) {
          await supabase.storage.from('evidencias').remove([nombreArchivo])
        }
      }

      const { error } = await supabase
        .from('evidencias')
        .delete()
        .eq('id', ev.id)

      if (error) throw error

      const evidenciasRestantes = (evidencias[pedidoId] || []).filter(
        (item) => item.id !== ev.id
      )

      setEvidencias((prev) => ({
        ...prev,
        [pedidoId]: evidenciasRestantes,
      }))

      if (evidenciasRestantes.length === 0) {
        await cambiarEstatus(pedidoId, 'pendiente')
      }

      setMensaje('🗑️ Evidencia eliminada.')
    } catch (error) {
      console.error('Error al eliminar evidencia:', error)
      alert('No se pudo eliminar la evidencia: ' + error.message)
    } finally {
      setEliminandoEvId(null)
    }
  }

  // Lógica de filtrado
  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtroEstatus === 'pendiente') return p.estatus !== 'completada'
    if (filtroEstatus === 'completada') return p.estatus === 'completada'
    return true
  })

  const conteoPendientes = pedidos.filter((p) => p.estatus !== 'completada').length
  const conteoCompletadas = pedidos.filter((p) => p.estatus === 'completada').length

  return (
    <div style={estilos.pagina}>
      {/* ENCABEZADO MÓVIL CON LOGO INTEGRADO */}
      <header style={estilos.header}>
        <div style={estilos.headerIzquierda}>
          <LogoFlotante />
          <div>
            <h2 style={estilos.titulo}>Mis Entregas</h2>
            <span style={estilos.subtitulo}>
              {perfil?.nombre_completo || 'Chofer'}
            </span>
          </div>
        </div>
        <button onClick={cerrarSesion} style={estilos.botonSalir}>
          Salir
        </button>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main style={estilos.contenido}>
        
        {/* === PEGA ESTA LÍNEA AQUÍ === */}
        <MetricasChofer pedidos={pedidos} evidencias={evidencias} />

        {mensaje && <div style={estilos.alerta}>{mensaje}</div>}

        {/* PESTAÑAS / TABS DE FILTRO */}
        <div style={estilos.contenedorTabs}>
          <button
            onClick={() => setFiltroEstatus('pendiente')}
            style={{
              ...estilos.tabBoton,
              ...(filtroEstatus === 'pendiente' ? estilos.tabActivoPendiente : estilos.tabInactivo)
            }}
          >
            ⏳ Por Entregar ({conteoPendientes})
          </button>
          <button
            onClick={() => setFiltroEstatus('completada')}
            style={{
              ...estilos.tabBoton,
              ...(filtroEstatus === 'completada' ? estilos.tabActivoCompletado : estilos.tabInactivo)
            }}
          >
            ✅ Entregadas ({conteoCompletadas})
          </button>
        </div>

        {cargando ? (
          <p style={{ textAlign: 'center', color: '#64748b' }}>
            ⏳ Cargando tus pedidos...
          </p>
        ) : pedidosFiltrados.length === 0 ? (
          <div style={estilos.sinPedidos}>
            <p>
              {filtroEstatus === 'pendiente' 
                ? '🎉 ¡Excelente! No tienes entregas pendientes por ahora.' 
                : 'No hay entregas completadas en esta lista.'}
            </p>
            <button onClick={cargarMisPedidos} style={estilos.botonRefrescar}>
              🔄 Actualizar lista
            </button>
          </div>
        ) : (
          <div style={estilos.listaTarjetas}>
            {pedidosFiltrados.map((pedido) => {
              const esCompletado = pedido.estatus === 'completada'
              const estaCargandoArchivo = subiendoId === pedido.id
              const listaEvidencias = evidencias[pedido.id] || []

              return (
                <div key={pedido.id} style={estilos.tarjeta}>
                  {/* CABECERA TARJETA */}
                  <div style={estilos.tarjetaHeader}>
                    <span style={estilos.numeroFactura}>
                      Factura #{pedido.numero_factura || 'N/A'}
                    </span>
                    <span
                      style={
                        esCompletado
                          ? estilos.badgeCompletado
                          : estilos.badgePendiente
                      }
                    >
                      {esCompletado ? '✅ Completada' : '⏳ Pendiente'}
                    </span>
                  </div>

                  {/* DATOS DE LA ENTREGA */}
                  <div style={estilos.tarjetaCuerpo}>
                    <p style={estilos.lineaInfo}>
                      <strong>👤 Cliente:</strong> {pedido.cliente || '—'}
                    </p>
                    <p style={estilos.lineaInfo}>
                      <strong>📍 Dirección:</strong> {pedido.direccion || '—'}
                    </p>
                  </div>

                  {/* EVIDENCIAS ADJUNTAS */}
                  {listaEvidencias.length > 0 && (
                    <div style={estilos.seccionEvidencias}>
                      <span style={estilos.tituloEvidencias}>
                        📎 Archivos adjuntos ({listaEvidencias.length}):
                      </span>
                      <div style={estilos.listaEvidencias}>
                        {listaEvidencias.map((ev, index) => (
                          <div key={ev.id || index} style={estilos.itemEvidencia}>
                            <a
                              href={ev.archivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={estilos.linkEvidencia}
                            >
                              📄 Evidencia {index + 1}
                            </a>
                            <button
                              onClick={() => setEvidenciaAEliminar({ ev, pedidoId: pedido.id })}
                              disabled={eliminandoEvId === ev.id}
                              style={estilos.botonEliminarEvidencia}
                              title="Eliminar este adjunto"
                            >
                              {eliminandoEvId === ev.id ? '⏳' : '🗑️ Deshacer'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* BOTONES DE ACCIÓN */}
                  <div style={estilos.tarjetaAcciones}>
                    {pedido.direccion && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          pedido.direccion
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={estilos.botonMapa}
                      >
                        🗺️ Ver Mapa
                      </a>
                    )}

                    <label style={estilos.botonSubir}>
                      {estaCargandoArchivo
                        ? '⏳ Subiendo...'
                        : '📷 Agregar Evidencia'}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        capture="environment"
                        onChange={(e) => manejarSubirEvidencia(e, pedido.id)}
                        style={{ display: 'none' }}
                        disabled={estaCargandoArchivo}
                      />
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* MODAL FLOTANTE DE CONFIRMACIÓN */}
      {evidenciaAEliminar && (
        <div style={estilos.modalOverlay}>
          <div style={estilos.modalCaja}>
            <h3 style={{ marginTop: 0, color: '#991b1b' }}>⚠️ Confirmación</h3>
            <p style={{ fontSize: '0.9rem', color: '#334155' }}>
              ¿Estás seguro de que deseas eliminar este archivo adjunto?
            </p>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Esta acción regresará el pedido a la lista de pendientes si se queda sin evidencias.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '1.2rem' }}>
              <button
                onClick={() => setEvidenciaAEliminar(null)}
                style={estilos.botonCancelarModal}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminarEvidencia}
                style={estilos.botonConfirmarModal}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Estilos heredados intactos + estilos para las pestañas y el modal
const estilos = {
  pagina: {
    minHeight: '100vh',
    background: '#f8fafc',
    paddingBottom: '2rem',
  },
  header: {
    background: '#0f172a',
    color: '#fff',
    padding: '1rem 1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  headerIzquierda: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  titulo: {
    margin: 0,
    fontSize: '1.2rem',
  },
  subtitulo: {
    fontSize: '0.85rem',
    color: '#94a3b8',
  },
  botonSalir: {
    padding: '0.4rem 0.8rem',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  contenido: {
    padding: '1rem',
    maxWidth: '500px',
    margin: '0 auto',
  },
  contenedorTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '1.2rem',
  },
  tabBoton: {
    flex: 1,
    padding: '0.75rem 0.5rem',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabActivoPendiente: {
    background: '#2563eb',
    color: '#ffffff',
  },
  tabActivoCompletado: {
    background: '#16a34a',
    color: '#ffffff',
  },
  tabInactivo: {
    background: '#e2e8f0',
    color: '#475569',
  },
  alerta: {
    background: '#e0f2fe',
    color: '#0369a1',
    padding: '0.75rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontSize: '0.9rem',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  sinPedidos: {
    textAlign: 'center',
    padding: '3rem 1rem',
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    color: '#475569',
  },
  botonRefrescar: {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  listaTarjetas: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  tarjeta: {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  tarjetaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '0.5rem',
    marginBottom: '0.75rem',
  },
  numeroFactura: {
    fontWeight: 'bold',
    fontSize: '1rem',
    color: '#0f172a',
  },
  badgePendiente: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '0.25rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
  },
  badgeCompletado: {
    background: '#dcfce7',
    color: '#166534',
    padding: '0.25rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
  },
  tarjetaCuerpo: {
    marginBottom: '0.75rem',
  },
  lineaInfo: {
    margin: '0.35rem 0',
    fontSize: '0.9rem',
    color: '#334155',
  },
  seccionEvidencias: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.6rem',
    marginBottom: '1rem',
  },
  tituloEvidencias: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#475569',
    display: 'block',
    marginBottom: '0.4rem',
  },
  listaEvidencias: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  itemEvidencia: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#fff',
    padding: '0.4rem 0.6rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
  },
  linkEvidencia: {
    color: '#2563eb',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    textDecoration: 'none',
  },
  botonEliminarEvidencia: {
    background: '#fee2e2',
    color: '#991b1b',
    border: 'none',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  tarjetaAcciones: {
    display: 'flex',
    gap: '0.5rem',
  },
  botonMapa: {
    flex: 1,
    textAlign: 'center',
    padding: '0.6rem',
    background: '#f1f5f9',
    color: '#1e293b',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    border: '1px solid #cbd5e1',
  },
  botonSubir: {
    flex: 1.5,
    textAlign: 'center',
    padding: '0.6rem',
    background: '#2563eb',
    color: '#fff',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'inline-block',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: '1rem',
  },
  modalCaja: {
    background: '#ffffff',
    padding: '1.5rem',
    borderRadius: '12px',
    maxWidth: '360px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  },
  botonCancelarModal: {
    flex: 1,
    padding: '0.6rem',
    background: '#e2e8f0',
    color: '#1e293b',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  botonConfirmarModal: {
    flex: 1,
    padding: '0.6rem',
    background: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
}

export default DashboardChofer