// src/pages/DashboardAdmin.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import LogoFlotante from '../components/LogoFlotante'
import GraficaAlmacenamiento from '../components/GraficaAlmacenamiento'

function DashboardAdmin() {
  const { perfil, cerrarSesion } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [choferes, setChoferes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('')

  // Estados del formulario para nuevo pedido
  const [numeroFactura, setNumeroFactura] = useState('')
  const [cliente, setCliente] = useState('')
  const [direccion, setDireccion] = useState('')
  const [vendedorEmail, setVendedorEmail] = useState('')
  const [choferSeleccionado, setChoferSeleccionado] = useState('')
  const [creandoPedido, setCreandoPedido] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    try {
      // 1. Cargar pedidos
      const { data: dataPedidos, error: errPedidos } = await supabase
        .from('pedidos')
        .select('*')
        .order('creado_en', { ascending: false })

      if (!errPedidos && dataPedidos) {
        setPedidos(dataPedidos)
      }

      // 2. Cargar usuarios con rol 'chofer'
      const { data: dataChoferes, error: errChoferes } = await supabase
        .from('perfiles')
        .select('*')
        .eq('rol', 'chofer')

      if (!errChoferes && dataChoferes) {
        setChoferes(dataChoferes)
      }
    } catch (e) {
      console.error('Error cargando datos de Admin:', e)
    } finally {
      setCargando(false)
    }
  }

  async function manejarCrearPedido(e) {
    e.preventDefault()
    if (!numeroFactura || !choferSeleccionado) {
      alert('Por favor completa el número de factura y asigna un chofer.')
      return
    }

    setCreandoPedido(true)
    setMensaje('')

    try {
      const { data, error } = await supabase
        .from('pedidos')
        .insert({
          numero_factura: numeroFactura,
          cliente,
          direccion,
          vendedor_email: vendedorEmail,
          chofer_id: choferSeleccionado,
          estatus: 'pendiente',
        })
        .select()
        .single()

      if (error) throw error

      setPedidos((prev) => [data, ...prev])
      setMensaje('✅ Pedido creado y asignado correctamente.')

      // Limpiar formulario
      setNumeroFactura('')
      setCliente('')
      setDireccion('')
      setVendedorEmail('')
      setChoferSeleccionado('')
    } catch (err) {
      console.error('Error al crear pedido:', err)
      alert('No se pudo crear el pedido: ' + err.message)
    } finally {
      setCreandoPedido(false)
    }
  }

  const totalPedidos = pedidos.length
  const completados = pedidos.filter((p) => p.estatus === 'completada').length
  const pendientes = pedidos.filter((p) => p.estatus !== 'completada').length

  return (
    <div style={estilos.pagina}>
      <header style={estilos.header}>
        <div style={estilos.headerIzquierda}>
          <LogoFlotante />
          <div>
            <h2 style={estilos.titulo}>Panel de Administración</h2>
            <span style={estilos.subtitulo}>
              {perfil?.nombre_completo || 'Administrador'}
            </span>
          </div>
        </div>
        <button onClick={cerrarSesion} style={estilos.botonSalir}>
          Salir
        </button>
      </header>

      <main style={estilos.contenido}>
        {mensaje && <div style={estilos.alerta}>{mensaje}</div>}

        {/* --- 💾 GRÁFICA DE ALMACENAMIENTO DE SUPABASE --- */}
        <GraficaAlmacenamiento />

        {/* --- MÉTRICAS GENERALES --- */}
        <div style={estilos.contenedorMetricas}>
          <div style={estilos.tarjetaMetrica}>
            <span style={estilos.valorMetrica}>{totalPedidos}</span>
            <span style={estilos.etiquetaMetrica}>Total Pedidos</span>
          </div>
          <div style={{ ...estilos.tarjetaMetrica, borderLeft: '4px solid #16a34a' }}>
            <span style={estilos.valorMetrica}>{completados}</span>
            <span style={estilos.etiquetaMetrica}>Completados</span>
          </div>
          <div style={{ ...estilos.tarjetaMetrica, borderLeft: '4px solid #d97706' }}>
            <span style={estilos.valorMetrica}>{pendientes}</span>
            <span style={estilos.etiquetaMetrica}>Pendientes</span>
          </div>
        </div>

        {/* --- FORMULARIO PARA CREAR PEDIDOS --- */}
        <div style={estilos.tarjetaFormulario}>
          <h3 style={estilos.tituloSeccion}>➕ Asignar Nuevo Pedido</h3>
          <form onSubmit={manejarCrearPedido} style={estilos.formulario}>
            <div style={estilos.grupoInput}>
              <label style={estilos.label}>Número de Factura *</label>
              <input
                type="text"
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                placeholder="Ej: F-10492"
                style={estilos.input}
                required
              />
            </div>

            <div style={estilos.grupoInput}>
              <label style={estilos.label}>Cliente</label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nombre del cliente o empresa"
                style={estilos.input}
              />
            </div>

            <div style={estilos.grupoInput}>
              <label style={estilos.label}>Dirección de Entrega</label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Calle, número, colonia..."
                style={estilos.input}
              />
            </div>

            <div style={estilos.grupoInput}>
              <label style={estilos.label}>Correo del Vendedor</label>
              <input
                type="email"
                value={vendedorEmail}
                onChange={(e) => setVendedorEmail(e.target.value)}
                placeholder="vendedor@empresa.com"
                style={estilos.input}
              />
            </div>

            <div style={estilos.grupoInput}>
              <label style={estilos.label}>Asignar a Chofer *</label>
              <select
                value={choferSeleccionado}
                onChange={(e) => setChoferSeleccionado(e.target.value)}
                style={estilos.select}
                required
              >
                <option value="">-- Seleccionar chofer --</option>
                {choferes.map((c) => (
                  <option key={c.id} value={c.id}>
                    👤 {c.nombre_completo || c.email}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={creandoPedido}
              style={{
                ...estilos.botonGuardar,
                opacity: creandoPedido ? 0.7 : 1,
              }}
            >
              {creandoPedido ? '⏳ Creando...' : '🚀 Crear y Asignar Pedido'}
            </button>
          </form>
        </div>

        {/* --- TABLA DE HISTORIAL DE PEDIDOS --- */}
        <div style={estilos.tarjetaTabla}>
          <h3 style={estilos.tituloSeccion}>📋 Historial de Envíos</h3>
          {cargando ? (
            <p style={{ textAlign: 'center', color: '#64748b' }}>⏳ Cargando pedidos...</p>
          ) : pedidos.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748b' }}>No hay pedidos registrados aún.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={estilos.tabla}>
                <thead>
                  <tr style={estilos.trHeader}>
                    <th style={estilos.th}>Factura</th>
                    <th style={estilos.th}>Cliente</th>
                    <th style={estilos.th}>Dirección</th>
                    <th style={estilos.th}>Chofer</th>
                    <th style={estilos.th}>Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((p) => {
                    const choferEncontrado = choferes.find((c) => c.id === p.chofer_id)
                    const esCompletado = p.estatus === 'completada'

                    return (
                      <tr key={p.id} style={estilos.trBody}>
                        <td style={estilos.td}><strong>#{p.numero_factura}</strong></td>
                        <td style={estilos.td}>{p.cliente || '—'}</td>
                        <td style={estilos.td}>{p.direccion || '—'}</td>
                        <td style={estilos.td}>
                          {choferEncontrado?.nombre_completo || 'Chofer'}
                        </td>
                        <td style={estilos.td}>
                          <span
                            style={
                              esCompletado
                                ? estilos.badgeCompletado
                                : estilos.badgePendiente
                            }
                          >
                            {esCompletado ? '✅ Completada' : '⏳ Pendiente'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
    maxWidth: '900px',
    margin: '0 auto',
  },
  alerta: {
    background: '#dcfce7',
    color: '#166534',
    padding: '0.75rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontSize: '0.9rem',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  contenedorMetricas: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  tarjetaMetrica: {
    background: '#ffffff',
    padding: '1rem',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  valorMetrica: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#0f172a',
  },
  etiquetaMetrica: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginTop: '0.2rem',
  },
  tarjetaFormulario: {
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    marginBottom: '1.5rem',
  },
  tarjetaTabla: {
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  tituloSeccion: {
    marginTop: 0,
    marginBottom: '1rem',
    fontSize: '1.1rem',
    color: '#0f172a',
  },
  formulario: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  grupoInput: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#475569',
  },
  input: {
    padding: '0.6rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.85rem',
  },
  select: {
    padding: '0.6rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.85rem',
    background: '#fff',
  },
  botonGuardar: {
    gridColumn: '1 / -1',
    padding: '0.75rem',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  tabla: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.85rem',
  },
  trHeader: {
    background: '#f1f5f9',
    color: '#475569',
  },
  th: {
    padding: '0.75rem',
    borderBottom: '2px solid #cbd5e1',
  },
  trBody: {
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '0.75rem',
    color: '#334155',
  },
  badgePendiente: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '0.2rem 0.5rem',
    borderRadius: '10px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
  },
  badgeCompletado: {
    background: '#dcfce7',
    color: '#166534',
    padding: '0.2rem 0.5rem',
    borderRadius: '10px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
  },
}

export default DashboardAdmin