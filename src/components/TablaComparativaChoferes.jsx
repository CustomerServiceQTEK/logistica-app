// src/components/TablaComparativaChoferes.jsx
// Muestra una tabla comparativa del desempeño de todos los choferes
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Skeleton from './Skeleton'

function TablaComparativaChoferes({ refrescar }) {
  const [datosChoferes, setDatosChoferes] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    calcularComparativa()
  }, [refrescar])

  async function calcularComparativa() {
    setCargando(true)
    try {
      // 1. Traer todos los pedidos con su chofer asignado
      const { data: pedidos, error: errPedidos } = await supabase
        .from('pedidos')
        .select('id, estatus, creado_en, chofer_id, perfiles:chofer_id(id, nombre_completo)')
        .not('chofer_id', 'is', null)

      // 2. Traer las evidencias para el cálculo de tiempos
      const { data: evidencias, error: errEvidencias } = await supabase
        .from('evidencias')
        .select('pedido_id, subido_en')
        .order('subido_en', { ascending: true })

      if (errPedidos || !pedidos) {
        setCargando(false)
        return
      }

      // Mapa de la primera evidencia por pedido (para cálculo de tiempo)
      const mapaEvidencias = {}
      ;(evidencias || []).forEach((ev) => {
        if (!mapaEvidencias[ev.pedido_id]) {
          mapaEvidencias[ev.pedido_id] = ev.subido_en
        }
      })

      // Agrupar métricas por chofer
      const acumulador = {}

      pedidos.forEach((pedido) => {
        const choferId = pedido.chofer_id
        const nombreChofer =
          pedido.perfiles?.nombre_completo || `Chofer (${choferId.slice(0, 5)}...)`

        if (!acumulador[choferId]) {
          acumulador[choferId] = {
            id: choferId,
            nombre: nombreChofer,
            asignados: 0,
            pendientes: 0,
            completados: 0,
            tiemposHoras: [],
          }
        }

        const info = acumulador[choferId]
        info.asignados += 1

        if (pedido.estatus === 'completada') {
          info.completados += 1

          // Calcular tiempo si hay evidencia
          const fechaEvidencia = mapaEvidencias[pedido.id]
          if (fechaEvidencia) {
            const horas =
              (new Date(fechaEvidencia) - new Date(pedido.creado_en)) / (1000 * 60 * 60)
            if (horas >= 0) info.tiemposHoras.push(horas)
          }
        } else {
          info.pendientes += 1
        }
      })

      // Convertir el acumulador a un arreglo procesado
      const resultado = Object.values(acumulador).map((ch) => {
        // Promedio de tiempo
        let promedioTexto = '—'
        if (ch.tiemposHoras.length > 0) {
          const suma = ch.tiemposHoras.reduce((a, b) => a + b, 0)
          const prom = suma / ch.tiemposHoras.length
          promedioTexto =
            prom >= 24 ? (prom / 24).toFixed(1) + ' días' : prom.toFixed(1) + ' hrs'
        }

        // Porcentaje de eficiencia
        const eficiencia =
          ch.asignados > 0 ? Math.round((ch.completados / ch.asignados) * 100) : 0

        return {
          ...ch,
          promedioTexto,
          eficiencia,
        }
      })

      setDatosChoferes(resultado)
    } catch (e) {
      console.error('Error calculando tabla comparativa:', e)
    } finally {
      setCargando(false)
    }
  }

  if (cargando) {
    return (
      <div style={{ marginBottom: '2rem' }}>
        <Skeleton height="150px" style={{ borderRadius: '12px' }} />
      </div>
    )
  }

  if (datosChoferes.length === 0) {
  return (
    <div style={estilos.contenedor}>
      <h3 style={estilos.titulo}>📊 Comparativa de Desempeño por Chofer</h3>
      <p style={{ color: '#64748b', margin: 0 }}>
        No se encontraron choferes con pedidos asignados para generar la comparativa.
      </p>
    </div>
  )
}

  return (
    <div style={estilos.contenedor}>
      <h3 style={estilos.titulo}>📊 Comparativa de Desempeño por Chofer</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={estilos.tabla}>
          <thead>
            <tr>
              <th style={estilos.th}>Chofer</th>
              <th style={estilos.thCenter}>Asignados</th>
              <th style={estilos.thCenter}>Pendientes</th>
              <th style={estilos.thCenter}>Completados</th>
              <th style={estilos.thCenter}>Tiempo Promedio</th>
              <th style={estilos.thCenter}>% Eficiencia</th>
            </tr>
          </thead>
          <tbody>
            {datosChoferes.map((ch) => (
              <tr key={ch.id} style={estilos.tr}>
                <td style={{ ...estilos.td, fontWeight: 'bold' }}>{ch.nombre}</td>
                <td style={estilos.tdCenter}>{ch.asignados}</td>
                <td style={{ ...estilos.tdCenter, color: '#d97706', fontWeight: '600' }}>
                  {ch.pendientes}
                </td>
                <td style={{ ...estilos.tdCenter, color: '#16a34a', fontWeight: '600' }}>
                  {ch.completados}
                </td>
                <td style={estilos.tdCenter}>{ch.promedioTexto}</td>
                <td style={estilos.tdCenter}>
                  <span
                    style={{
                      ...estilos.badgeEficiencia,
                      background: ch.eficiencia >= 80 ? '#dcfce7' : '#fef3c7',
                      color: ch.eficiencia >= 80 ? '#15803d' : '#b45309',
                    }}
                  >
                    {ch.eficiencia}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const estilos = {
  contenedor: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.2rem 1.5rem',
    marginBottom: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  titulo: {
    margin: '0 0 1rem 0',
    fontSize: '1.05rem',
    color: '#0f172a',
  },
  tabla: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
  },
  th: {
    textAlign: 'left',
    padding: '0.6rem 0.8rem',
    borderBottom: '2px solid #e2e8f0',
    color: '#64748b',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
  },
  thCenter: {
    textAlign: 'center',
    padding: '0.6rem 0.8rem',
    borderBottom: '2px solid #e2e8f0',
    color: '#64748b',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '0.75rem 0.8rem',
    color: '#1e293b',
  },
  tdCenter: {
    padding: '0.75rem 0.8rem',
    textAlign: 'center',
    color: '#1e293b',
  },
  badgeEficiencia: {
    padding: '0.25rem 0.6rem',
    borderRadius: '12px',
    fontWeight: 'bold',
    fontSize: '0.8rem',
  },
}

export default TablaComparativaChoferes