// src/components/MetricasTiempos.jsx
// Calcula y muestra métricas basadas en fechas:
// tiempo promedio de entrega, completadas esta semana, y pedidos atrasados

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Skeleton from './Skeleton'

const DIAS_PARA_ATRASO = 5

function MetricasTiempos() {
  const [tiempoPromedio, setTiempoPromedio] = useState(null)
  const [completadasSemana, setCompletadasSemana] = useState(0)
  const [atrasados, setAtrasados] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(function () {
    calcularMetricas()
  }, [])

  async function calcularMetricas() {
    setCargando(true)

    // Traemos todos los pedidos
    const resultadoPedidos = await supabase
      .from('pedidos')
      .select('id, numero_factura, cliente, estatus, creado_en')

    // Traemos todas las evidencias (para saber cuándo se completó cada pedido)
    const resultadoEvidencias = await supabase
      .from('evidencias')
      .select('pedido_id, subido_en')
      .order('subido_en', { ascending: true })

    const pedidos = resultadoPedidos.data || []
    const evidencias = resultadoEvidencias.data || []

    // Armamos un mapa pedido_id -> fecha de evidencia (la más antigua, o sea la original)
    const mapaFechaEvidencia = {}
    evidencias.forEach(function (ev) {
      if (!mapaFechaEvidencia[ev.pedido_id]) {
        mapaFechaEvidencia[ev.pedido_id] = ev.subido_en
      }
    })

    // 1. TIEMPO PROMEDIO DE ENTREGA
    // Para cada pedido completado, calculamos cuántas horas pasaron
    // entre que se cargó (creado_en) y se subió la evidencia (subido_en)
    const tiempos = []
    pedidos.forEach(function (pedido) {
      const fechaEvidencia = mapaFechaEvidencia[pedido.id]
      if (fechaEvidencia) {
        const horas = (new Date(fechaEvidencia) - new Date(pedido.creado_en)) / (1000 * 60 * 60)
        tiempos.push(horas)
      }
    })

    if (tiempos.length > 0) {
      const promedioHoras = tiempos.reduce(function (a, b) { return a + b }, 0) / tiempos.length
      setTiempoPromedio(promedioHoras)
    } else {
      setTiempoPromedio(null)
    }

    // 2. COMPLETADAS ESTA SEMANA (últimos 7 días)
    const hace7Dias = new Date()
    hace7Dias.setDate(hace7Dias.getDate() - 7)

    const contadorSemana = evidencias.filter(function (ev) {
      return new Date(ev.subido_en) >= hace7Dias
    }).length
    setCompletadasSemana(contadorSemana)

    // 3. PEDIDOS ATRASADOS (pendientes desde hace más de DIAS_PARA_ATRASO)
    const limiteAtraso = new Date()
    limiteAtraso.setDate(limiteAtraso.getDate() - DIAS_PARA_ATRASO)

    const listaAtrasados = pedidos.filter(function (pedido) {
      return pedido.estatus === 'pendiente' && new Date(pedido.creado_en) < limiteAtraso
    })
    setAtrasados(listaAtrasados)

    setCargando(false)
  }

  // Convierte horas a un texto legible ("2.5 días" o "8 horas")
  function formatearTiempo(horas) {
    if (horas >= 24) {
      return (horas / 24).toFixed(1) + ' días'
    }
    return horas.toFixed(1) + ' horas'
  }

  if (cargando) {
    return (
      <div style={{ ...estilos.contenedorTarjetas, marginBottom: '2rem' }}>
        <Skeleton height="86px" style={{ borderRadius: '12px' }} />
        <Skeleton height="86px" style={{ borderRadius: '12px' }} />
        <Skeleton height="86px" style={{ borderRadius: '12px' }} />
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={estilos.contenedorTarjetas}>
        <div style={estilos.tarjeta}>
          <div style={{ ...estilos.iconoContenedor, background: '#eff6ff' }}>
            <span style={{ fontSize: '1.4rem' }}>⏱️</span>
          </div>
          <div>
            <p style={estilos.tituloTarjeta}>Tiempo promedio de entrega</p>
            <p style={{ ...estilos.valorTarjeta, color: '#2563eb' }}>
              {tiempoPromedio !== null ? formatearTiempo(tiempoPromedio) : 'Sin datos'}
            </p>
          </div>
        </div>

        <div style={estilos.tarjeta}>
          <div style={{ ...estilos.iconoContenedor, background: '#f0fdf4' }}>
            <span style={{ fontSize: '1.4rem' }}>📅</span>
          </div>
          <div>
            <p style={estilos.tituloTarjeta}>Completadas esta semana</p>
            <p style={{ ...estilos.valorTarjeta, color: '#16a34a' }}>{completadasSemana}</p>
          </div>
        </div>

        <div style={estilos.tarjeta}>
          <div style={{ ...estilos.iconoContenedor, background: '#fef2f2' }}>
            <span style={{ fontSize: '1.4rem' }}>🚨</span>
          </div>
          <div>
            <p style={estilos.tituloTarjeta}>Pedidos atrasados (+{DIAS_PARA_ATRASO} días)</p>
            <p style={{ ...estilos.valorTarjeta, color: '#dc2626' }}>{atrasados.length}</p>
          </div>
        </div>
      </div>

      {/* Lista detallada de los pedidos atrasados, solo si hay alguno */}
      {atrasados.length > 0 && (
        <div style={estilos.listaAtrasados}>
          <p style={estilos.tituloLista}>🚨 Pedidos que requieren atención:</p>
          {atrasados.map(function (pedido) {
            return (
              <div key={pedido.id} style={estilos.filaAtrasado}>
                <span style={{ fontWeight: 'bold' }}>{pedido.numero_factura}</span>
                <span style={{ color: '#64748b' }}>{pedido.cliente}</span>
                <span style={{ color: '#dc2626', fontSize: '0.85rem' }}>
                  Cargado el {new Date(pedido.creado_en).toLocaleDateString()}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const estilos = {
  contenedorTarjetas: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
  },
  tarjeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.3rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  iconoContenedor: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tituloTarjeta: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#64748b',
  },
  valorTarjeta: {
    margin: '0.2rem 0 0 0',
    fontSize: '1.6rem',
    fontWeight: 'bold',
  },
  listaAtrasados: {
    marginTop: '1rem',
    background: '#fff',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '1.2rem',
  },
  tituloLista: {
    margin: '0 0 0.8rem 0',
    fontWeight: 'bold',
    color: '#991b1b',
  },
  filaAtrasado: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '0.9rem',
  },
}

export default MetricasTiempos