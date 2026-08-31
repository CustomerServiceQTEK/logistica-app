// src/components/GraficaAlmacenamiento.jsx
import { useEffect, useState } from 'react'
import { obtenerEstadisticasStorage } from '../utils/obtenerUsoStorage'

function GraficaAlmacenamiento() {
  const [stats, setStats] = useState({ mbUsados: 0, mbDisponible: 1024, mbLimite: 1024, porcentaje: 0, totalArchivos: 0 })
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarMetricas()
  }, [])

  async function cargarMetricas() {
    setCargando(true)
    const datos = await obtenerEstadisticasStorage()
    setStats(datos)
    setCargando(false)
  }

  const colorBarra = stats.porcentaje > 85 ? '#dc2626' : stats.porcentaje > 70 ? '#d97706' : '#2563eb'

  return (
    <div style={estilos.tarjeta}>
      <div style={estilos.headerTarjeta}>
        <h3 style={estilos.titulo}>💾 Almacenamiento de Evidencias (Supabase)</h3>
        <button onClick={cargarMetricas} style={estilos.botonRefrescar} title="Actualizar datos de espacio">
          🔄 Actualizar
        </button>
      </div>

      {cargando ? (
        <p style={{ textAlign: 'center', color: '#64748b', margin: '1rem 0' }}>⏳ Calculando uso de almacenamiento...</p>
      ) : (
        <div style={estilos.cuerpoGrafica}>
          <div style={estilos.contenedorSvg}>
            <svg width="110" height="110" viewBox="0 0 36 36" style={estilos.svg}>
              <path
                style={estilos.circuloFondo}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                style={{ ...estilos.circuloProgreso, stroke: colorBarra }}
                strokeDasharray={`${stats.porcentaje}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div style={estilos.textoCentral}>
              <span style={estilos.porcentajeTexto}>{stats.porcentaje}%</span>
              <span style={estilos.etiquetaSub}>Usado</span>
            </div>
          </div>

          <div style={estilos.leyenda}>
            <p style={estilos.lineaLeyenda}>
              <span style={{ ...estilos.puntoColor, background: colorBarra }}></span>
              <strong>Ocupado:</strong> {stats.mbUsados} MB ({stats.totalArchivos} fotos)
            </p>
            <p style={estilos.lineaLeyenda}>
              <span style={{ ...estilos.puntoColor, background: '#cbd5e1' }}></span>
              <strong>Disponible:</strong> {stats.mbDisponible} MB
            </p>
            <p style={estilos.lineaLeyenda}>
              <strong>Capacidad total:</strong> 1,024 MB (1 GB)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

const estilos = {
  tarjeta: {
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    marginBottom: '1.5rem',
  },
  headerTarjeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  titulo: {
    margin: 0,
    fontSize: '1rem',
    color: '#0f172a',
  },
  botonRefrescar: {
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '0.35rem 0.7rem',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#334155',
  },
  cuerpoGrafica: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  contenedorSvg: {
    position: 'relative',
    width: '110px',
    height: '110px',
  },
  svg: {
    transform: 'rotate(-90deg)',
  },
  circuloFondo: {
    fill: 'none',
    stroke: '#e2e8f0',
    strokeWidth: 3.8,
  },
  circuloProgreso: {
    fill: 'none',
    strokeWidth: 3.8,
    strokeLinecap: 'round',
    transition: 'stroke-dasharray 0.5s ease',
  },
  textoCentral: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  porcentajeTexto: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#0f172a',
  },
  etiquetaSub: {
    fontSize: '0.7rem',
    color: '#64748b',
  },
  leyenda: {
    flex: 1,
    minWidth: '180px',
    fontSize: '0.85rem',
    color: '#334155',
  },
  lineaLeyenda: {
    margin: '0.4rem 0',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  puntoColor: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block',
  },
}

export default GraficaAlmacenamiento