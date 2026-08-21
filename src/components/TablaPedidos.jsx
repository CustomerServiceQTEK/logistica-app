// src/components/TablaPedidos.jsx
import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'
import EliminarPedido from './EliminarPedido'

const PEDIDOS_POR_PAGINA = 25

function TablaPedidos() {
  const [pedidos, setPedidos] = useState([])
  const [choferes, setChoferes] = useState([])
  const [evidencias, setEvidencias] = useState({})
  const [cargando, setCargando] = useState(true)
  const [paginaActual, setPaginaActual] = useState(1)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('todos') // todos | pendiente | completada
  const [filtroChofer, setFiltroChofer] = useState('todos') // todos | sin_asignar | id_del_chofer
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  // Ordenamiento dinámico por columna
  const [campoOrden, setCampoOrden] = useState('creado_en') // creado_en | numero_factura | cliente | direccion | estatus | chofer
  const [direccionOrden, setDireccionOrden] = useState('desc') // asc | desc

  useEffect(() => {
    cargarPedidos()
    cargarChoferes()
    cargarEvidencias()
  }, [])

  async function cargarPedidos() {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('creado_en', { ascending: false })
      if (!error && data) {
        setPedidos(data)
      }
    } catch (e) {
      console.error('Error al cargar pedidos:', e)
    } finally {
      setCargando(false)
    }
  }

  async function cargarChoferes() {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre_completo')
        .eq('rol', 'chofer')
      if (!error && data) {
        setChoferes(data)
      }
    } catch (e) {
      console.error('Error al cargar choferes:', e)
    }
  }

  async function cargarEvidencias() {
    try {
      const { data, error } = await supabase
        .from('evidencias')
        .select('pedido_id, archivo_url, subido_en')
        .order('subido_en', { ascending: false })
      if (!error && data) {
        const mapa = {}
        data.forEach(function (ev) {
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

  async function asignarChofer(pedidoId, choferId) {
    const { error } = await supabase
      .from('pedidos')
      .update({ chofer_id: choferId || null })
      .eq('id', pedidoId)
    if (!error) {
      setPedidos(function (anteriores) {
        return anteriores.map(function (p) {
          return p.id === pedidoId ? { ...p, chofer_id: choferId || null } : p
        })
      })
    }
  }

  function actualizarTodo() {
    cargarPedidos()
    cargarEvidencias()
  }

  function obtenerUrlWhatsApp(pedido) {
    const estatusTexto = pedido.estatus === 'completada' ? 'Completada' : 'Pendiente'
    const mensaje =
      `*DETALLE DE ENTREGA - FACTURA #${pedido.numero_factura || ''}*\n\n` +
      `• *Cliente:* ${pedido.cliente || ''}\n` +
      `• *Dirección:* ${pedido.direccion || ''}\n` +
      `• *Estatus:* ${estatusTexto}\n\n` +
      `Por favor confirmar al completar la entrega.`

    return `https://wa.me/?text=${encodeURIComponent(mensaje)}`
  }

  // Mapa rápido de ID de chofer -> Nombre Completo
  const mapaChoferes = {}
  choferes.forEach(function (ch) {
    mapaChoferes[ch.id] = ch.nombre_completo || ch.id
  })

  // Función para dar formato legible a la fecha y hora
  function formatearFechaHora(fechaIso) {
    if (!fechaIso) return ''
    const f = new Date(fechaIso)
    const fecha = f.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    const hora = f.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    return `${fecha} - ${hora}`
  }

  // Función para manejar el clic de ordenamiento en los encabezados
  function manejarOrden(campo) {
    if (campoOrden === campo) {
      setDireccionOrden(direccionOrden === 'asc' ? 'desc' : 'asc')
    } else {
      setCampoOrden(campo)
      setDireccionOrden('asc')
    }
  }

  // --- LÓGICA DE FILTRADO Y ORDENAMIENTO ---
  const listaPedidos = Array.isArray(pedidos) ? pedidos : []
  const terminoBuscado = (busqueda || '').toLowerCase().trim()

  const pedidosFiltrados = listaPedidos.filter(function (pedido) {
    if (!pedido) return false

    // 1. Filtro de Texto (Factura, Cliente, Dirección)
    const factura = (pedido.numero_factura || '').toString().toLowerCase()
    const cliente = (pedido.cliente || '').toLowerCase()
    const direccion = (pedido.direccion || '').toLowerCase()
    const coincideTexto =
      !terminoBuscado ||
      factura.includes(terminoBuscado) ||
      cliente.includes(terminoBuscado) ||
      direccion.includes(terminoBuscado)

    // 2. Filtro de Estatus
    const coincideEstatus =
      filtroEstatus === 'todos' || pedido.estatus === filtroEstatus

    // 3. Filtro de Chofer
    let coincideChofer = true
    if (filtroChofer === 'sin_asignar') {
      coincideChofer = !pedido.chofer_id
    } else if (filtroChofer !== 'todos') {
      coincideChofer = pedido.chofer_id === filtroChofer
    }

    // 4. Filtro de Fechas
    let coincideFecha = true
    if (pedido.creado_en) {
      const fechaPedido = pedido.creado_en.split('T')[0] // Formato YYYY-MM-DD
      if (fechaDesde && fechaPedido < fechaDesde) {
        coincideFecha = false
      }
      if (fechaHasta && fechaPedido > fechaHasta) {
        coincideFecha = false
      }
    }

    return coincideTexto && coincideEstatus && coincideChofer && coincideFecha
  })

  // ORDENAR LOS RESULTADOS FILTRADOS
  const pedidosOrdenados = [...pedidosFiltrados].sort((a, b) => {
    let valorA = ''
    let valorB = ''

    if (campoOrden === 'chofer') {
      valorA = (mapaChoferes[a.chofer_id] || 'ZZZ_Sin_Asignar').toLowerCase()
      valorB = (mapaChoferes[b.chofer_id] || 'ZZZ_Sin_Asignar').toLowerCase()
    } else if (campoOrden === 'numero_factura') {
      valorA = parseInt(a.numero_factura, 10) || 0
      valorB = parseInt(b.numero_factura, 10) || 0
    } else {
      valorA = (a[campoOrden] || '').toString().toLowerCase()
      valorB = (b[campoOrden] || '').toString().toLowerCase()
    }

    if (valorA < valorB) return direccionOrden === 'asc' ? -1 : 1
    if (valorA > valorB) return direccionOrden === 'asc' ? 1 : -1
    return 0
  })

  // --- LÓGICA DE PAGINACIÓN ---
  const totalPaginas = Math.ceil(pedidosOrdenados.length / PEDIDOS_POR_PAGINA) || 1
  const indiceInicial = (paginaActual - 1) * PEDIDOS_POR_PAGINA
  const pedidosDeLaPagina = pedidosOrdenados.slice(
    indiceInicial,
    indiceInicial + PEDIDOS_POR_PAGINA
  )

  // Indicador de flecha para el encabezado
  function obtenerIconoOrden(campo) {
    if (campoOrden !== campo) return ' ↕'
    return direccionOrden === 'asc' ? ' ▲' : ' ▼'
  }

  // --- EXPORTAR A EXCEL ---
  function exportarAExcel() {
    if (pedidosOrdenados.length === 0) {
      alert('No hay pedidos para exportar con los filtros actuales.')
      return
    }

    const datosExcel = pedidosOrdenados.map(function (pedido) {
      const listaEvs = evidencias[pedido.id] || []
      const urlsEvidencias = listaEvs
        .map(function (e) {
          const fechaEv = e.subido_en ? ` (${formatearFechaHora(e.subido_en)})` : ''
          return `${e.archivo_url}${fechaEv}`
        })
        .join(' | ')

      return {
        'No. Factura': pedido.numero_factura || 'N/A',
        Cliente: pedido.cliente || '—',
        Dirección: pedido.direccion || '—',
        Estatus: pedido.estatus === 'completada' ? 'Completada' : 'Pendiente',
        'Chofer Asignado': mapaChoferes[pedido.chofer_id] || 'Sin asignar',
        'Fecha Carga': pedido.creado_en ? formatearFechaHora(pedido.creado_en) : '—',
        'Evidencias y Fecha Subida': urlsEvidencias || 'Sin evidencias',
      }
    })

    const hoja = XLSX.utils.json_to_sheet(datosExcel)
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Reporte Pedidos')

    hoja['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 35 },
      { wch: 12 },
      { wch: 22 },
      { wch: 20 },
      { wch: 50 },
    ]

    const fechaActual = new Date().toISOString().split('T')[0]
    XLSX.writeFile(libro, `Reporte_Pedidos_${fechaActual}.xlsx`)
  }

  function limpiarFiltros() {
    setBusqueda('')
    setFiltroEstatus('todos')
    setFiltroChofer('todos')
    setFechaDesde('')
    setFechaHasta('')
    setCampoOrden('creado_en')
    setDireccionOrden('desc')
    setPaginaActual(1)
  }

  if (cargando) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        ⏳ Cargando pedidos...
      </div>
    )
  }

  return (
    <div style={estilos.contenedor}>
      {/* ENCABEZADO Y BOTONES PRINCIPALES */}
      <div style={estilos.encabezado}>
        <h3 style={estilos.titulo}>
          📑 Lista de pedidos ({pedidosOrdenados.length})
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={exportarAExcel} style={estilos.botonExcel}>
            📊 Exportar Excel
          </button>
          <button onClick={actualizarTodo} style={estilos.botonActualizar}>
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <div style={estilos.panelFiltros}>
        {/* Buscador */}
        <div style={estilos.grupoFiltroBusqueda}>
          <span style={{ fontSize: '1rem' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por factura, cliente o dirección..."
            value={busqueda}
            onChange={function (e) {
              setBusqueda(e.target.value)
              setPaginaActual(1)
            }}
            style={estilos.inputBuscador}
          />
        </div>

        {/* Filtro por Estatus */}
        <div style={estilos.grupoFiltro}>
          <label style={estilos.labelFiltro}>Estatus:</label>
          <select
            value={filtroEstatus}
            onChange={function (e) {
              setFiltroEstatus(e.target.value)
              setPaginaActual(1)
            }}
            style={estilos.selectFiltro}
          >
            <option value="todos">Todos</option>
            <option value="pendiente">⏳ Pendientes</option>
            <option value="completada">✅ Completadas</option>
          </select>
        </div>

        {/* Filtro por Chofer */}
        <div style={estilos.grupoFiltro}>
          <label style={estilos.labelFiltro}>Chofer:</label>
          <select
            value={filtroChofer}
            onChange={function (e) {
              setFiltroChofer(e.target.value)
              setPaginaActual(1)
            }}
            style={estilos.selectFiltro}
          >
            <option value="todos">Todos los choferes</option>
            <option value="sin_asignar">⚠️ Sin asignar</option>
            {choferes.map(function (ch) {
              return (
                <option key={ch.id} value={ch.id}>
                  👤 {ch.nombre_completo || ch.id.slice(0, 8)}
                </option>
              )
            })}
          </select>
        </div>

        {/* Filtro Fecha Desde */}
        <div style={estilos.grupoFiltro}>
          <label style={estilos.labelFiltro}>Desde:</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={function (e) {
              setFechaDesde(e.target.value)
              setPaginaActual(1)
            }}
            style={estilos.inputFecha}
          />
        </div>

        {/* Filtro Fecha Hasta */}
        <div style={estilos.grupoFiltro}>
          <label style={estilos.labelFiltro}>Hasta:</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={function (e) {
              setFechaHasta(e.target.value)
              setPaginaActual(1)
            }}
            style={estilos.inputFecha}
          />
        </div>

        {/* Botón Limpiar */}
        {(busqueda || filtroEstatus !== 'todos' || filtroChofer !== 'todos' || fechaDesde || fechaHasta) && (
          <button onClick={limpiarFiltros} style={estilos.botonLimpiarFiltros}>
            ✖ Limpiar filtros
          </button>
        )}
      </div>

      {/* TABLA DE PEDIDOS */}
      <div style={estilos.contenedorTabla}>
        <table style={estilos.tabla}>
          <thead>
            <tr>
              <th
                onClick={() => manejarOrden('numero_factura')}
                style={estilos.celdaEncabezadoInteractiva}
                title="Haz clic para ordenar por Factura"
              >
                Factura{obtenerIconoOrden('numero_factura')}
              </th>
              <th
                onClick={() => manejarOrden('cliente')}
                style={estilos.celdaEncabezadoInteractiva}
                title="Haz clic para ordenar por Cliente"
              >
                Cliente{obtenerIconoOrden('cliente')}
              </th>
              <th
                onClick={() => manejarOrden('direccion')}
                style={estilos.celdaEncabezadoInteractiva}
                title="Haz clic para ordenar por Dirección"
              >
                Dirección{obtenerIconoOrden('direccion')}
              </th>
              <th
                onClick={() => manejarOrden('estatus')}
                style={estilos.celdaEncabezadoInteractiva}
                title="Haz clic para ordenar por Estatus"
              >
                Estatus{obtenerIconoOrden('estatus')}
              </th>
              <th
                onClick={() => manejarOrden('chofer')}
                style={estilos.celdaEncabezadoInteractiva}
                title="Haz clic para ordenar por Chofer Asignado"
              >
                Chofer asignado{obtenerIconoOrden('chofer')}
              </th>
              <th style={estilos.celdaEncabezado}>WhatsApp</th>
              <th
                onClick={() => manejarOrden('creado_en')}
                style={estilos.celdaEncabezadoInteractiva}
                title="Haz clic para ordenar por Fecha y Hora de Carga"
              >
                Fecha y Hora de Carga{obtenerIconoOrden('creado_en')}
              </th>
              <th style={estilos.celdaEncabezado}>Evidencias y Hora Subida</th>
              <th style={{ ...estilos.celdaEncabezado, textAlign: 'center' }}>Eliminar</th>
            </tr>
          </thead>
          <tbody>
            {pedidosDeLaPagina.map(function (pedido) {
              if (!pedido) return null
              const listaEvidencias = evidencias[pedido.id] || []

              return (
                <tr key={pedido.id} style={estilos.fila}>
                  <td style={{ ...estilos.celda, fontWeight: 'bold' }}>
                    {pedido.numero_factura || 'N/A'}
                  </td>
                  <td style={estilos.celda}>{pedido.cliente || '—'}</td>
                  <td style={estilos.celda}>{pedido.direccion || '—'}</td>
                  <td style={estilos.celda}>
                    <span
                      style={
                        pedido.estatus === 'completada'
                          ? estilos.badgeCompletada
                          : estilos.badgePendiente
                      }
                    >
                      {pedido.estatus === 'completada'
                        ? '✅ Completada'
                        : '⏳ Pendiente'}
                    </span>
                  </td>
                  <td style={estilos.celda}>
                    <select
                      value={pedido.chofer_id || ''}
                      onChange={function (e) {
                        asignarChofer(pedido.id, e.target.value)
                      }}
                      style={estilos.select}
                    >
                      <option value="">Sin asignar</option>
                      {choferes.map(function (chofer) {
                        return (
                          <option key={chofer.id} value={chofer.id}>
                            {chofer.nombre_completo || chofer.id.slice(0, 8)}
                          </option>
                        )
                      })}
                    </select>
                  </td>
                  <td style={estilos.celda}>
                    <a
                      href={obtenerUrlWhatsApp(pedido)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={estilos.botonWhatsApp}
                      title="Enviar detalles por WhatsApp"
                    >
                      💬 Enviar
                    </a>
                  </td>
                  <td style={estilos.celda}>
                    {pedido.creado_en
                      ? formatearFechaHora(pedido.creado_en)
                      : '—'}
                  </td>
                  <td style={estilos.celda}>
                    {listaEvidencias.length > 0 ? (
                      <div style={estilos.contenedorEvidencias}>
                        {listaEvidencias.map(function (ev, index) {
                          return (
                            <div key={index} style={estilos.bloqueEvidencia}>
                              <a
                                href={ev.archivo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={estilos.linkEvidencia}
                              >
                                📎 Archivo {index + 1}
                              </a>
                              {ev.subido_en && (
                                <span style={estilos.textoHoraSubida}>
                                  ⏱️ {formatearFechaHora(ev.subido_en)}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                  </td>
                  <td style={{ ...estilos.celda, textAlign: 'center' }}>
                    <EliminarPedido
                      pedido={pedido}
                      onEliminado={actualizarTodo}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pedidosOrdenados.length === 0 && (
        <p style={{ color: '#64748b', marginTop: '1rem', textAlign: 'center' }}>
          No se encontraron pedidos con los filtros aplicados.
        </p>
      )}

      {/* PAGINACIÓN */}
      {totalPaginas > 1 && (
        <div style={estilos.paginacion}>
          <button
            onClick={function () {
              setPaginaActual(function (p) {
                return p - 1
              })
            }}
            disabled={paginaActual === 1}
            style={estilos.botonPagina}
          >
            ← Anterior
          </button>

          <span style={estilos.textoPagina}>
            Página {paginaActual} de {totalPaginas}
          </span>

          <button
            onClick={function () {
              setPaginaActual(function (p) {
                return p + 1
              })
            }}
            disabled={paginaActual === totalPaginas}
            style={estilos.botonPagina}
          >
            Siguiente →
          </button>
        </div>
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
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    width: '100%',
    boxSizing: 'border-box',
  },
  encabezado: {
    display: 'flex',
    justify: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  titulo: {
    margin: 0,
    fontSize: '1.1rem',
  },
  botonExcel: {
    padding: '0.5rem 1rem',
    background: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
  botonActualizar: {
    padding: '0.5rem 1rem',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  panelFiltros: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    alignItems: 'center',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.75rem',
    marginBottom: '1.2rem',
  },
  grupoFiltroBusqueda: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '0.4rem 0.6rem',
    flex: '1 1 220px',
  },
  inputBuscador: {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    width: '100%',
    fontSize: '0.85rem',
    color: '#1e293b',
  },
  grupoFiltro: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  labelFiltro: {
    fontSize: '0.8rem',
    color: '#64748b',
    fontWeight: 'bold',
  },
  selectFiltro: {
    padding: '0.4rem 0.6rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.85rem',
    background: '#fff',
  },
  inputFecha: {
    padding: '0.35rem 0.5rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.85rem',
    background: '#fff',
  },
  botonLimpiarFiltros: {
    padding: '0.4rem 0.75rem',
    background: '#fee2e2',
    color: '#991b1b',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 'bold',
  },
  contenedorTabla: {
    overflowX: 'auto',
    width: '100%',
  },
  tabla: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '950px',
  },
  celdaEncabezado: {
    textAlign: 'left',
    padding: '0.6rem 0.5rem',
    borderBottom: '2px solid #e5e7eb',
    background: '#f8fafc',
    fontSize: '0.78rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
  },
  celdaEncabezadoInteractiva: {
    textAlign: 'left',
    padding: '0.6rem 0.5rem',
    borderBottom: '2px solid #e5e7eb',
    background: '#f1f5f9',
    fontSize: '0.78rem',
    color: '#0f172a',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none',
  },
  fila: {
    transition: 'background 0.1s ease',
  },
  celda: {
    padding: '0.7rem 0.5rem',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '0.85rem',
  },
  badgePendiente: {
    background: '#fffbeb',
    color: '#92400e',
    padding: '0.25rem 0.5rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  badgeCompletada: {
    background: '#f0fdf4',
    color: '#166534',
    padding: '0.25rem 0.5rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  select: {
    padding: '0.35rem 0.4rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.82rem',
  },
  botonWhatsApp: {
    display: 'inline-block',
    padding: '0.3rem 0.6rem',
    background: '#25D366',
    color: '#fff',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '0.78rem',
    whiteSpace: 'nowrap',
  },
  contenedorEvidencias: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  bloqueEvidencia: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.1rem',
  },
  linkEvidencia: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '0.8rem',
  },
  textoHoraSubida: {
    fontSize: '0.7rem',
    color: '#64748b',
    fontWeight: '500',
  },
  paginacion: {
    display: 'flex',
    justify: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1.2rem',
  },
  botonPagina: {
    padding: '0.5rem 1rem',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  textoPagina: {
    fontSize: '0.9rem',
    color: '#64748b',
  },
}

export default TablaPedidos