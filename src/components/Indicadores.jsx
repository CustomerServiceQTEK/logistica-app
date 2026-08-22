// src/components/Indicadores.jsx
// Muestra tarjetas interactivas con el total de pedidos, pendientes y completadas (filtradas por chofer si aplica)

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Skeleton from './Skeleton'

function Indicadores({ choferId, onSeleccionarEstatus, estatusActivo }) {
  const [total, setTotal] = useState(0)
  const [pendientes, setPendientes] = useState(0)
  const [completadas, setCompletadas] = useState(0)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarIndicadores()
  }, [choferId])

  async function cargarIndicadores() {
    setCargando(true)

    // Consulta base para Total
    let queryTotal = supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true })

    // Consulta base para Pendientes
    let queryPendientes = supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true })
      .eq('estatus', 'pendiente')

    // Consulta base para Completadas
    let queryCompletadas = supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true })
      .eq('estatus', 'completada')

    // Si se seleccionó un chofer específico, aplicamos el filtro a las tres consultas
    if (choferId) {
      queryTotal = queryTotal.eq('chofer_id', choferId)
      queryPendientes = queryPendientes.eq('chofer_id', choferId)
      queryCompletadas = queryCompletadas.eq('chofer_id', choferId)
    }

    const { count: totalCount } = await queryTotal
    const { count: pendientesCount } = await queryPendientes
    const { count: completadasCount } = await queryCompletadas

    setTotal(totalCount ?? 0)
    setPendientes(pendientesCount ?? 0)
    setCompletadas(completadasCount ?? 0)
    setCargando(false)
  }

  if (cargando) {
    return (
      <div style={estilos.contenedor}>
        <Skeleton height="86px" style={{ borderRadius: '12px' }} />
        <Skeleton height="86px" style={{ borderRadius: '12px' }} />
        <Skeleton height="86px" style={{ borderRadius: '12px' }} />
      </div>
    )
  }

  return (
    <div style={estilos.contenedor}>
      <Tarjeta 
        icono="📋" 
        titulo="Total de entregas" 
        valor={total} 
        color="#2563eb" 
        fondo="#eff6ff" 
        onClick={() => onSeleccionarEstatus && onSeleccionarEstatus('todos')}
        activo={estatusActivo === 'todos'}
      />
      <Tarjeta 
        icono="⏳" 
        titulo="Pendientes" 
        valor={pendientes} 
        color="#d97706" 
        fondo="#fffbeb" 
        onClick={() => onSeleccionarEstatus && onSeleccionarEstatus('pendiente')}
        activo={estatusActivo === 'pendiente'}
      />
      <Tarjeta 
        icono="✅" 
        titulo="Completadas" 
        valor={completadas} 
        color="#16a34a" 
        fondo="#f0fdf4" 
        onClick={() => onSeleccionarEstatus && onSeleccionarEstatus('completada')}
        activo={estatusActivo === 'completada'}
      />
    </div>
  )
}

function Tarjeta({ icono, titulo, valor, color, fondo, onClick, activo }) {
  return (
    <div 
      onClick={onClick}
      style={{
        ...estilos.tarjeta,
        border: activo ? `2px solid ${color}` : '1px solid #e5e7eb',
        boxShadow: activo ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ ...estilos.iconoContenedor, background: fondo }}>
        <span style={{ fontSize: '1.4rem' }}>{icono}</span>
      </div>
      <div>
        <p style={estilos.tituloTarjeta}>{titulo}</p>
        <p style={{ ...estilos.valorTarjeta, color }}>{valor}</p>
      </div>
    </div>
  )
}

const estilos = {
  contenedor: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  tarjeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    background: '#fff',
    borderRadius: '12px',
    padding: '1.3rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none',
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
    fontSize: '1.8rem',
    fontWeight: 'bold',
  },
}

export default Indicadores