// src/components/MetricasChofer.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function MetricasChofer({ pedidos, evidencias }) {
  const [eficiencia, setEficiencia] = useState(0)
  const [completadas, setCompletadas] = useState(0)
  const [pendientes, setPendientes] = useState(0)
  const [promedioHoras, setPromedioHoras] = useState('—')

  useEffect(() => {
    if (pedidos && pedidos.length > 0) {
      calcularMetricas()
    } else {
      setEficiencia(0)
      setCompletadas(0)
      setPendientes(0)
      setPromedioHoras('—')
    }
  }, [pedidos, evidencias])

  function calcularMetricas() {
    const total = pedidos.length
    const comp = pedidos.filter((p) => p.estatus === 'completada').length
    const pend = total - comp

    // Porcentaje de Eficiencia
    const ef = total > 0 ? Math.round((comp / total) * 100) : 0
    setCompletadas(comp)
    setPendientes(pend)
    setEficiencia(ef)

    // Cálculo de Tiempo Promedio
    const tiempos = []
    pedidos.forEach((p) => {
      if (p.estatus === 'completada') {
        const listaEv = evidencias[p.id] || []
        if (listaEv.length > 0) {
          // Tomamos la evidencia más antigua subida
          const fechaEvidencia = listaEv[listaEv.length - 1].subido_en
          if (fechaEvidencia && p.creado_en) {
            const difHoras =
              (new Date(fechaEvidencia) - new Date(p.creado_en)) / (1000 * 60 * 60)
            if (difHoras >= 0) tiempos.push(difHoras)
          }
        }
      }
    })

    if (tiempos.length > 0) {
      const suma = tiempos.reduce((a, b) => a + b, 0)
      const prom = suma / tiempos.length
      if (prom >= 24) {
        setPromedioHoras((prom / 24).toFixed(1) + ' días')
      } else {
        setPromedioHoras(prom.toFixed(1) + ' hrs')
      }
    } else {
      setPromedioHoras('—')
    }
  }

  if (!pedidos || pedidos.length === 0) return null

  return (
    <div style={estilos.contenedor}>
      <h3 style={estilos.tituloSeccion}>🚀 Mi Rendimiento Personal</h3>
      <div style={estilos.gridMetricas}>
        {/* EFICIENCIA */}
        <div style={estilos.tarjeta}>
          <span style={estilos.label}>Eficiencia</span>
          <span
            style={{
              ...estilos.valor,
              color: eficiencia >= 80 ? '#16a34a' : '#d97706',
            }}
          >
            {eficiencia}%
          </span>
        </div>

        {/* TIEMPO PROMEDIO */}
        <div style={estilos.tarjeta}>
          <span style={estilos.label}>T. Promedio</span>
          <span style={{ ...estilos.valor, color: '#2563eb' }}>
            {promedioHoras}
          </span>
        </div>

        {/* ENTREGADAS */}
        <div style={estilos.tarjeta}>
          <span style={estilos.label}>Entregadas</span>
          <span style={{ ...estilos.valor, color: '#059669' }}>
            {completadas} / {pedidos.length}
          </span>
        </div>

        {/* PENDIENTES */}
        <div style={estilos.tarjeta}>
          <span style={estilos.label}>Por Entregar</span>
          <span style={{ ...estilos.valor, color: '#dc2626' }}>
            {pendientes}
          </span>
        </div>
      </div>
    </div>
  )
}

const estilos = {
  contenedor: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '0.85rem 1rem',
    marginBottom: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  tituloSeccion: {
    margin: '0 0 0.6rem 0',
    fontSize: '0.9rem',
    color: '#334155',
    fontWeight: 'bold',
  },
  gridMetricas: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)', // 2 columnas fijas ideales para celular
    gap: '0.5rem',
  },
  tarjeta: {
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '0.5rem 0.6rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: '0.72rem',
    color: '#64748b',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  valor: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    marginTop: '0.1rem',
  },
}

export default MetricasChofer