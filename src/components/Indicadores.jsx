// src/components/Indicadores.jsx
// Muestra tarjetas con el total de pedidos, pendientes y completadas

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Skeleton from './Skeleton'

function Indicadores() {
  const [total, setTotal] = useState(0)
  const [pendientes, setPendientes] = useState(0)
  const [completadas, setCompletadas] = useState(0)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarIndicadores()
  }, [])

  async function cargarIndicadores() {
    setCargando(true)

    const { count: totalCount } = await supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true })

    const { count: pendientesCount } = await supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true })
      .eq('estatus', 'pendiente')

    const { count: completadasCount } = await supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true })
      .eq('estatus', 'completada')

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
      <Tarjeta icono="📋" titulo="Total de entregas" valor={total} color="#2563eb" fondo="#eff6ff" />
      <Tarjeta icono="⏳" titulo="Pendientes" valor={pendientes} color="#d97706" fondo="#fffbeb" />
      <Tarjeta icono="✅" titulo="Completadas" valor={completadas} color="#16a34a" fondo="#f0fdf4" />
    </div>
  )
}

function Tarjeta({ icono, titulo, valor, color, fondo }) {
  return (
    <div style={estilos.tarjeta}>
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
    fontSize: '1.8rem',
    fontWeight: 'bold',
  },
}

export default Indicadores