// src/pages/DashboardChofer.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

function DashboardChofer() {
  const { perfil, cerrarSesion } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [subiendoId, setSubiendoId] = useState(null) // ID del pedido subiendo archivo
  const [mensajeExito, setMensajeExito] = useState('')

  useEffect(() => {
    if (perfil?.id) {
      cargarMisPedidos()
    }
  }, [perfil])

  async function cargarMisPedidos() {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('chofer_id', perfil.id)
        .order('creado_en', { ascending: false })

      if (!error && data) {
        setPedidos(data)
      }
    } catch (e) {
      console.error('Error al cargar pedidos del chofer:', e)
    } finally {
      setCargando(false)
    }
  }

  // Cambiar estatus de entrega
  async function cambiarEstatus(pedidoId, nuevoEstatus) {
    const { error } = await supabase
      .from('pedidos')
      .update({ estatus: nuevoEstatus })
      .eq('id', pedidoId)

    if (!error) {
      setPedidos(function (prev) {
        return prev.map(function (p) {
          return p.id === pedidoId ? { ...p, estatus: nuevoEstatus } : p
        })
      })
    }
  }

  // Subir foto/PDF de evidencia
  async function manejarSubirEvidencia(e, pedidoId) {
    const archivo = e.target.files[0]
    if (!archivo) return

    setSubiendoId(pedidoId)
    setMensajeExito('')

    try {
      // 1. Nombre de archivo único
      const extension = archivo.name.split('.').pop()
      const nombreArchivo = `${pedidoId}_${Date.now()}.${extension}`

      // 2. Subir archivo a Supabase Storage (bucket: evidencias)
      const { error: errorStorage } = await supabase.storage
        .from('evidencias')
        .upload(nombreArchivo, archivo, { upsert: true })

      if (errorStorage) throw errorStorage

      // 3. Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('evidencias')
        .getPublicUrl(nombreArchivo)

      const archivoUrl = urlData.publicUrl

      // 4. Guardar registro en la tabla 'evidencias'
      const { error: errorTabla } = await supabase
        .from('evidencias')
        .insert({
          pedido_id: pedidoId,
          archivo_url: archivoUrl,
        })

      if (errorTabla) throw errorTabla

      // 5. Marcar automáticamente como completada
      await cambiarEstatus(pedidoId, 'completada')
      setMensajeExito('✅ Evidencia subida y pedido completado.')
    } catch (error) {
      console.error('Error al subir evidencia:', error)
      alert('Error al subir el archivo: ' + error.message)
    } finally {
      setSubiendoId(null)
    }
  }

  return (
    <div style={estilos.pagina}>
      {/* ENCABEZADO MÓVIL */}
      <header style={estilos.header}>
        <div>
          <h2 style={estilos.titulo}>🚚 Mis Entregas</h2>
          <span style={estilos.subtitulo}>
            {perfil?.nombre_completo || 'Chofer'}
          </span>
        </div>
        <button onClick={cerrarSesion} style={estilos.botonSalir}>
          Salir
        </button>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main style={estilos.contenido}>
        {mensajeExito && (
          <div style={estilos.alertaExito}>{mensajeExito}</div>
        )}

        {cargando ? (
          <p style={{ textAlign: 'center', color: '#64748b' }}>
            ⏳ Cargando tus pedidos...
          </p>
        ) : pedidos.length === 0 ? (
          <div style={estilos.sinPedidos}>
            <p>🎉 No tienes entregas pendientes asignadas.</p>
            <button onClick={cargarMisPedidos} style={estilos.botonRefrescar}>
              🔄 Actualizar lista
            </button>
          </div>
        ) : (
          <div style={estilos.listaTarjetas}>
            {pedidos.map(function (pedido) {
              const esCompletado = pedido.estatus === 'completada'
              const estaCargandoArchivo = subiendoId === pedido.id

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

                  {/* BOTONES DE ACCIÓN */}
                  <div style={estilos.tarjetaAcciones}>
                    {/* Botón Abrir Mapa */}
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

                    {/* Botón Subir Evidencia */}
                    <label style={estilos.botonSubir}>
                      {estaCargandoArchivo
                        ? '⏳ Subiendo...'
                        : '📷 Subir Evidencia'}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        capture="environment" // Abre cámara directa en celulares
                        onChange={function (e) {
                          manejarSubirEvidencia(e, pedido.id)
                        }}
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
  alertaExito: {
    background: '#dcfce7',
    color: '#166534',
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
    marginBottom: '1rem',
  },
  lineaInfo: {
    margin: '0.35rem 0',
    fontSize: '0.9rem',
    color: '#334155',
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