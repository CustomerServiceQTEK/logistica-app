// src/pages/DashboardChofer.jsx
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

  useEffect(() => {
    if (perfil?.id) {
      cargarMisPedidos()
    }
  }, [perfil])

  async function cargarMisPedidos() {
    setCargando(true)
    try {
      // Garantizar que obtenemos el ID del usuario autenticado
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
        // Cargar las evidencias asociadas a estos pedidos
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
      // Obtener de forma segura el ID del chofer autenticado
      const { data: userData } = await supabase.auth.getUser()
      const choferIdActual = perfil?.id || userData?.user?.id

      if (!choferIdActual) {
        throw new Error('No se pudo verificar el ID del usuario autenticado. Reintenta iniciar sesión.')
      }

      const extension = archivo.name.split('.').pop()
      const nombreArchivo = `${pedidoId}_${Date.now()}.${extension}`

      // 1. Subir al Storage
      const { error: errorStorage } = await supabase.storage
        .from('evidencias')
        .upload(nombreArchivo, archivo, { upsert: true })

      if (errorStorage) throw errorStorage

      // 2. URL pública
      const { data: urlData } = supabase.storage
        .from('evidencias')
        .getPublicUrl(nombreArchivo)

      const archivoUrl = urlData.publicUrl

      // 3. Registrar en base de datos especificando explícitamente el chofer_id
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

      // Actualizar estado local de evidencias
      setEvidencias((prev) => ({
        ...prev,
        [pedidoId]: [evidenciaGuardada, ...(prev[pedidoId] || [])],
      }))

      // Cambiar estatus a completada
      await cambiarEstatus(pedidoId, 'completada')
      setMensaje('✅ Evidencia subida correctamente.')
    } catch (error) {
      console.error('Error al subir evidencia:', error)
      alert('Error al subir el archivo: ' + error.message)
    } finally {
      setSubiendoId(null)
    }
  }

  // ELIMINAR / DESHACER ADJUNTO
  async function eliminarEvidencia(evidencia, pedidoId) {
    const confirmar = window.confirm(
      '¿Estás seguro de que deseas eliminar este archivo adjunto?'
    )
    if (!confirmar) return

    setEliminandoEvId(evidencia.id)
    setMensaje('')

    try {
      // 1. Intentar borrar el archivo del Storage de Supabase
      if (evidencia.archivo_url) {
        const partesUrl = evidencia.archivo_url.split('/')
        const nombreArchivo = partesUrl[partesUrl.length - 1]
        if (nombreArchivo) {
          await supabase.storage.from('evidencias').remove([nombreArchivo])
        }
      }

      // 2. Eliminar el registro de la tabla 'evidencias'
      const { error } = await supabase
        .from('evidencias')
        .delete()
        .eq('id', evidencia.id)

      if (error) throw error

      // 3. Actualizar estado local
      const evidenciasRestantes = (evidencias[pedidoId] || []).filter(
        (ev) => ev.id !== evidencia.id
      )

      setEvidencias((prev) => ({
        ...prev,
        [pedidoId]: evidenciasRestantes,
      }))

      // 4. Si ya no le quedan evidencias al pedido, regresar a "pendiente"
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
        {mensaje && <div style={estilos.alerta}>{mensaje}</div>}

        {cargando ? (
          <p style={{ textAlign: 'center', color: '#64748b' }}>
            ⏳ Cargando tus pedidos...
          </p>
        ) : pedidos.length === 0 ? (
          <div style={estilos.sinPedidos}>
            <p>🎉 No tienes entregas asignadas.</p>
            <button onClick={cargarMisPedidos} style={estilos.botonRefrescar}>
              🔄 Actualizar lista
            </button>
          </div>
        ) : (
          <div style={estilos.listaTarjetas}>
            {pedidos.map((pedido) => {
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
                              onClick={() => eliminarEvidencia(ev, pedido.id)}
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
    </div>
  )
}

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
}

export default DashboardChofer