// src/pages/DashboardAdmin.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Indicadores from '../components/Indicadores'
import CargaPedidos from '../components/CargaPedidos'
import TablaPedidos from '../components/TablaPedidos'
import MetricasTiempos from '../components/MetricasTiempos'

function DashboardAdmin() {
  const { perfil, cerrarSesion } = useAuth()
  const [refrescar, setRefrescar] = useState(0)

  return (
    <div style={estilos.pagina}>
      <header style={estilos.header}>
        <div style={estilos.headerContenido}>
          <h2 style={estilos.titulo}>📦 Panel de Administrador</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={estilos.textoRol}>Rol: {perfil?.rol}</span>
            <button onClick={cerrarSesion} style={estilos.botonSalir}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div style={estilos.contenido}>
        <Indicadores key={refrescar} />
        <MetricasTiempos key={'metricas-' + refrescar} />
        <CargaPedidos onExito={() => setRefrescar((valor) => valor + 1)} />
        <TablaPedidos key={'tabla-' + refrescar} />
      </div>
    </div>
  )
}

const estilos = {
  pagina: {
    minHeight: '100vh',
  },
  header: {
    background: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  headerContenido: {
    maxWidth: '1100px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
  },
  titulo: {
    margin: 0,
    color: '#fff',
    fontSize: '1.3rem',
  },
  textoRol: {
    color: '#cbd5e1',
    fontSize: '0.9rem',
    textTransform: 'capitalize',
  },
  botonSalir: {
    padding: '0.5rem 1rem',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  contenido: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
}

export default DashboardAdmin