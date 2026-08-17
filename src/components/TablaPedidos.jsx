// src/components/TablaPedidos.jsx
// Muestra todos los pedidos en una tabla, permite asignar un chofer
// y ver la evidencia subida de cada pedido completado

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import EliminarPedido from './EliminarPedido'
import Skeleton from './Skeleton'

const PEDIDOS_POR_PAGINA = 25

function TablaPedidos() {
  const [pedidos, setPedidos] = useState([])
  const [choferes, setChoferes] = useState([])
  const [evidencias, setEvidencias] = useState({})
  const [cargando, setCargando] = useState(true)
  const [paginaActual, setPaginaActual] = useState(1)

  useEffect(() => {
    cargarPedidos()
    cargarChoferes()
    cargarEvidencias()
  }, [])

  async function cargarPedidos() {
    setCargando(true)
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('creado_en', { ascending: false })
    if (!error) {
      setPedidos(data)
    }
    setCargando(false)
  }

  async function cargarChoferes() {
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, nombre_completo')
      .eq('rol', 'chofer')
    if (!error) {
      setChoferes(data)
    }
  }

  async function cargarEvidencias() {
    const { data, error } = await supabase
      .from('evidencias')
      .select('pedido_id, archivo_url, subido_en')
      .order('subido_en', { ascending: false })
    if (!error) {
      const mapa = {}
      data.forEach(function (ev) {
        if (!mapa[ev.pedido_id]) {
          mapa[ev.pedido_id] = { url: ev.archivo_url, fecha: ev.subido_en }
        }
      })
      setEvidencias(mapa)
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

  // Calculamos cuántas páginas hay en total, y qué pedidos van en la página actual
  const totalPaginas = Math.ceil(pedidos.length / PEDIDOS_POR_PAGINA)
  const indiceInicio = (paginaActual - 1) * PEDIDOS_POR_PAGINA
  const pedidosDeLaPagina = pedidos.slice(indiceInicio, indiceInicio + PEDIDOS_POR_PAGINA)

  if (cargando) {
    return (
      <div style={estilos.contenedor}>
        <Skeleton height="24px" width="200px" style={{ marginBottom: '1.2rem' }} />
        <Skeleton height="40px" style={{ marginBottom: '0.5rem' }} />
        <Skeleton height="40px" style={{ marginBottom: '0.5rem' }} />
        <Skeleton height="40px" style={{ marginBottom: '0.5rem' }} />
        <Skeleton height="40px" style={{ marginBottom: '0.5rem' }} />
        <Skeleton height="40px" />
      </div>
    )
  }

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.encabezado}>
        <h3 style={estilos.titulo}>📑 Lista de pedidos ({pedidos.length})</h3>
        <button onClick={actualizarTodo} style={estilos.botonActualizar}>
          🔄 Actualizar
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={estilos.tabla}>
          <thead>
            <tr>
              <th style={estilos.celdaEncabezado}>Factura</th>
              <th style={estilos.celdaEncabezado}>Cliente</th>
              <th style={estilos.celdaEncabezado}>Dirección</th>
              <th style={estilos.celdaEncabezado}>Estatus</th>
              <th style={estilos.celdaEncabezado}>Chofer asignado</th>
              <th style={estilos.celdaEncabezado}>Fecha de carga</th>
              <th style={estilos.celdaEncabezado}>Fecha de evidencia</th>
              <th style={estilos.celdaEncabezado}>Evidencia</th>
              <th style={estilos.celdaEncabezado}>Eliminar</th>
            </tr>
          </thead>
          <tbody>
            {pedidosDeLaPagina.map(function (pedido) {
              return (
                <tr key={pedido.id} style={estilos.fila}>
                  <td style={{ ...estilos.celda, fontWeight: 'bold' }}>{pedido.numero_factura}</td>
                  <td style={estilos.celda}>{pedido.cliente}</td>
                  <td style={estilos.celda}>{pedido.direccion}</td>
                  <td style={estilos.celda}>
                    <span style={pedido.estatus === 'completada' ? estilos.badgeCompletada : estilos.badgePendiente}>
                      {pedido.estatus === 'completada' ? '✅ Completada' : '⏳ Pendiente'}
                    </span>
                  </td>
                  <td style={estilos.celda}>
                    <select
                      value={pedido.chofer_id || ''}
                      onChange={function (e) { asignarChofer(pedido.id, e.target.value) }}
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
                    {new Date(pedido.creado_en).toLocaleDateString()}
                  </td>
                  <td style={estilos.celda}>
                    {evidencias[pedido.id]
                      ? new Date(evidencias[pedido.id].fecha).toLocaleDateString()
                      : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td style={estilos.celda}>
                    {evidencias[pedido.id] ? (
                      <a href={evidencias[pedido.id].url} target="_blank" rel="noopener noreferrer" style={estilos.linkEvidencia}>
                        📎 Ver archivo
                      </a>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                  </td>
                  <td style={estilos.celda}>
                    <EliminarPedido pedido={pedido} onEliminado={actualizarTodo} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pedidos.length === 0 && <p style={{ color: '#64748b', marginTop: '1rem' }}>No hay pedidos cargados todavía.</p>}

      {/* Controles de paginación, solo se muestran si hay más de 1 página */}
      {totalPaginas > 1 && (
        <div style={estilos.paginacion}>
          <button
            onClick={function () { setPaginaActual(function (p) { return p - 1 }) }}
            disabled={paginaActual === 1}
            style={estilos.botonPagina}
          >
            ← Anterior
          </button>

          <span style={estilos.textoPagina}>
            Página {paginaActual} de {totalPaginas}
          </span>

          <button
            onClick={function () { setPaginaActual(function (p) { return p + 1 }) }}
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
  },
  encabezado: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.2rem',
  },
  titulo: {
    margin: 0,
    fontSize: '1.1rem',
  },
  botonActualizar: {
    padding: '0.5rem 1rem',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  tabla: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '700px',
  },
  celdaEncabezado: {
    textAlign: 'left',
    padding: '0.7rem',
    borderBottom: '2px solid #e5e7eb',
    background: '#f8fafc',
    fontSize: '0.8rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  fila: {
    transition: 'background 0.1s ease',
  },
  celda: {
    padding: '0.8rem 0.7rem',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '0.9rem',
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
  select: {
    padding: '0.4rem 0.5rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.85rem',
  },
  linkEvidencia: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  paginacion: {
    display: 'flex',
    justifyContent: 'center',
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