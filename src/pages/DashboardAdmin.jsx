// src/pages/DashboardAdmin.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import LogoFlotante from '../components/LogoFlotante'
import Indicadores from '../components/Indicadores'
import CargaPedidos from '../components/CargaPedidos'
import TablaPedidos from '../components/TablaPedidos'
import MetricasTiempos from '../components/MetricasTiempos'
import TablaComparativaChoferes from '../components/TablaComparativaChoferes'

function DashboardAdmin() {
  const { perfil, cerrarSesion } = useAuth()
  const [refrescar, setRefrescar] = useState(0)
  
  // ESTADOS PARA LOS FILTROS DINÁMICOS
  const [choferes, setChoferes] = useState([])
  const [choferSeleccionado, setChoferSeleccionado] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('todos') // 'todos' | 'pendiente' | 'completada'

  useEffect(() => {
    cargarChoferesDesdePedidos()
  }, [refrescar])

  async function cargarChoferesDesdePedidos() {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('chofer_id, perfiles:chofer_id(id, nombre_completo)')
        .not('chofer_id', 'is', null)

      if (!error && data) {
        const mapaChoferes = {}
        data.forEach((p) => {
          if (p.perfiles && p.perfiles.id) {
            mapaChoferes[p.perfiles.id] = p.perfiles.nombre_completo || 'Chofer sin nombre'
          }
        })

        const listaUnica = Object.keys(mapaChoferes).map((id) => ({
          id: id,
          nombre_completo: mapaChoferes[id],
        }))

        setChoferes(listaUnica)
      }
    } catch (e) {
      console.error('Error al obtener choferes desde pedidos:', e)
    }
  }

  // Manejador al hacer clic en las métricas/indicadores
  function manejarSeleccionEstatus(nuevoEstatus) {
    setFiltroEstatus(nuevoEstatus)
    // Desplazamiento suave hacia la tabla de pedidos
    const elementoTabla = document.getElementById('seccion-tabla-pedidos')
    if (elementoTabla) {
      elementoTabla.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div style={estilos.pagina}>
      <header style={estilos.header}>
        <div style={estilos.headerContenido}>
          <div style={estilos.headerIzquierda}>
            <LogoFlotante />
            <h2 style={estilos.titulo}>Panel de Administrador</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={estilos.textoRol}>Rol: {perfil?.rol || 'Administrador'}</span>
            <button onClick={cerrarSesion} style={estilos.botonSalir}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div style={estilos.contenido}>
        {/* BARRA DE FILTRO POR CHOFER */}
        <div style={estilos.contenedorFiltro}>
          <label style={estilos.labelFiltro}>
            <strong>👤 Filtrar métricas por chofer:</strong>
          </label>
          <select
            value={choferSeleccionado}
            onChange={(e) => setChoferSeleccionado(e.target.value)}
            style={estilos.selectFiltro}
          >
            <option value="">Todos los choferes (Vista global)</option>
            {choferes.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.nombre_completo}
              </option>
            ))}
          </select>
        </div>

        {/* COMPONENTES DE MÉTRICAS INTERACTIVAS */}
        <Indicadores 
          key={refrescar + '-' + choferSeleccionado} 
          choferId={choferSeleccionado} 
          onSeleccionarEstatus={manejarSeleccionEstatus}
          estatusActivo={filtroEstatus}
        />
        
        <MetricasTiempos 
          key={'metricas-' + refrescar + '-' + choferSeleccionado} 
          choferId={choferSeleccionado} 
        />
        
        {/* TABLA COMPARATIVA POR CHOFER */}
        <TablaComparativaChoferes refrescar={refrescar} />

        <CargaPedidos onExito={() => setRefrescar((valor) => valor + 1)} />

        {/* TABLA DE PEDIDOS CON ID DE DESPLAZAMIENTO Y FILTRO AUTOMÁTICO */}
        <div id="seccion-tabla-pedidos">
          <TablaPedidos 
            key={'tabla-' + refrescar} 
            filtroEstatusInicial={filtroEstatus}
            filtroChoferInicial={choferSeleccionado}
          />
        </div>
      </div>
    </div>
  )
}

// ESTILOS CON ANCHO AMPLIADO (MAX 1600px)
const estilos = {
  pagina: { minHeight: '100vh', background: '#f8fafc' },
  header: { background: '#1e293b', borderBottom: '1px solid #334155' },
  headerContenido: { maxWidth: '1600px', width: '100%', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', boxSizing: 'border-box' },
  headerIzquierda: { display: 'flex', alignItems: 'center', gap: '12px' },
  titulo: { margin: 0, color: '#fff', fontSize: '1.3rem' },
  textoRol: { color: '#cbd5e1', fontSize: '0.9rem', textTransform: 'capitalize' },
  botonSalir: { padding: '0.5rem 1rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' },
  contenido: { maxWidth: '1600px', width: '100%', margin: '0 auto', padding: '2rem 1.5rem', boxSizing: 'border-box' },
  contenedorFiltro: { background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1rem 1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  labelFiltro: { color: '#1e293b', fontSize: '0.95rem' },
  selectFiltro: { padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '0.9rem', fontWeight: 'bold', color: '#0f172a', outline: 'none', cursor: 'pointer' },
}

export default DashboardAdmin