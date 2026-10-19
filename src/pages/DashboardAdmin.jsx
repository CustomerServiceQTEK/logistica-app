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
import GraficaAlmacenamiento from '../components/GraficaAlmacenamiento'
import LimpiezaPedidosAntiguos from '../components/LimpiezaPedidosAntiguos'

const PESTANAS_ADMIN = [
  { id: 'carga', etiqueta: 'Carga de pedidos' },
  { id: 'choferes', etiqueta: 'Dashboard de choferes' },
  { id: 'pedidos', etiqueta: 'Lista de pedidos' },
  { id: 'almacenamiento', etiqueta: 'Almacenamiento' },
]

function obtenerPestanaGuardada() {
  try {
    const pestañaGuardada = localStorage.getItem('adminPestanaActiva')
    return PESTANAS_ADMIN.some((pestana) => pestana.id === pestañaGuardada)
      ? pestañaGuardada
      : 'pedidos'
  } catch (error) {
    console.error('No se pudo recuperar la pestaña activa:', error)
    return 'pedidos'
  }
}

function DashboardAdmin() {
  const { perfil, cerrarSesion } = useAuth()
  const [refrescar, setRefrescar] = useState(0)
  const [pestanaActiva, setPestanaActiva] = useState(obtenerPestanaGuardada)
  const [choferes, setChoferes] = useState([])
  const [choferSeleccionado, setChoferSeleccionado] = useState('')
  const [cargandoChoferes, setCargandoChoferes] = useState(true)
  const [errorChoferes, setErrorChoferes] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('todos')
  const [filtroEstatusChofer, setFiltroEstatusChofer] = useState('todos')

  useEffect(() => {
    cargarChoferesDesdePedidos()
  }, [refrescar])

  useEffect(() => {
    try {
      localStorage.setItem('adminPestanaActiva', pestanaActiva)
    } catch (error) {
      console.error('No se pudo guardar la pestaña activa:', error)
    }
  }, [pestanaActiva])

  async function cargarChoferesDesdePedidos() {
    setCargandoChoferes(true)
    setErrorChoferes('')
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre_completo')
        .eq('rol', 'chofer')
        .order('nombre_completo', { ascending: true })

      if (error) throw error
      setChoferes(data || [])
    } catch (e) {
      console.error('Error al obtener perfiles de chofer:', e)
      setErrorChoferes('No se pudieron cargar los choferes. Intenta actualizar la página.')
    } finally {
      setCargandoChoferes(false)
    }
  }

  function manejarSeleccionEstatus(nuevoEstatus, vista) {
    const esVistaChofer = vista === 'chofer'
    if (esVistaChofer) {
      setFiltroEstatusChofer(nuevoEstatus)
    } else {
      setFiltroEstatus(nuevoEstatus)
    }

    const elementoTabla = document.getElementById(
      esVistaChofer ? 'seccion-pedidos-chofer' : 'seccion-tabla-pedidos'
    )
    if (elementoTabla) {
      elementoTabla.scrollIntoView({ behavior: 'smooth' })
    }
  }

  function manejarTecladoPestanas(event, indiceActual) {
    let siguienteIndice
    if (event.key === 'ArrowRight') siguienteIndice = (indiceActual + 1) % PESTANAS_ADMIN.length
    else if (event.key === 'ArrowLeft') siguienteIndice = (indiceActual - 1 + PESTANAS_ADMIN.length) % PESTANAS_ADMIN.length
    else if (event.key === 'Home') siguienteIndice = 0
    else if (event.key === 'End') siguienteIndice = PESTANAS_ADMIN.length - 1
    else return

    event.preventDefault()
    const siguientePestana = PESTANAS_ADMIN[siguienteIndice]
    setPestanaActiva(siguientePestana.id)
    document.getElementById(`tab-${siguientePestana.id}`)?.focus()
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
        <div role="tablist" aria-label="Secciones del panel de administrador" style={estilos.pestanas}>
          {PESTANAS_ADMIN.map((pestana, indice) => (
            <button
              key={pestana.id}
              id={`tab-${pestana.id}`}
              type="button"
              role="tab"
              aria-selected={pestanaActiva === pestana.id}
              aria-controls="panel-admin"
              tabIndex={pestanaActiva === pestana.id ? 0 : -1}
              onClick={() => setPestanaActiva(pestana.id)}
              onMouseDown={(event) => {
                event.currentTarget.ownerDocument.activeElement?.blur()
                event.preventDefault()
              }}
              onKeyDown={(event) => manejarTecladoPestanas(event, indice)}
              style={{
                ...estilos.botonPestana,
                ...(pestanaActiva === pestana.id ? estilos.botonPestanaActiva : {}),
              }}
            >
              {pestana.etiqueta}
            </button>
          ))}
        </div>

        <section
          id="panel-admin"
          role="tabpanel"
          aria-labelledby={`tab-${pestanaActiva}`}
          tabIndex={0}
        >
          {pestanaActiva === 'carga' && (
            <CargaPedidos onExito={() => setRefrescar((valor) => valor + 1)} />
          )}

          {pestanaActiva === 'choferes' && (
            <>
              <div style={estilos.contenedorFiltro}>
                <label htmlFor="selector-chofer" style={estilos.labelFiltro}>
                  <strong>👤 Seleccionar chofer:</strong>
                </label>
                <select
                  id="selector-chofer"
                  value={choferSeleccionado}
                  onChange={(e) => {
                    setChoferSeleccionado(e.target.value)
                    setFiltroEstatusChofer('todos')
                  }}
                  style={estilos.selectFiltro}
                  disabled={cargandoChoferes || Boolean(errorChoferes)}
                >
                  <option value="">
                    {cargandoChoferes ? 'Cargando choferes...' : 'Selecciona un chofer'}
                  </option>
                  {choferes.map((chofer) => (
                    <option key={chofer.id} value={chofer.id}>
                      {chofer.nombre_completo || 'Chofer sin nombre'}
                    </option>
                  ))}
                </select>
              </div>

              {errorChoferes && <p role="alert" style={estilos.error}>{errorChoferes}</p>}
              {!cargandoChoferes && !errorChoferes && choferes.length === 0 && (
                <p style={estilos.mensajeVacio}>No hay perfiles con rol de chofer.</p>
              )}
              {!choferSeleccionado && !cargandoChoferes && choferes.length > 0 && (
                <p style={estilos.mensajeVacio}>Selecciona un chofer para ver su dashboard individual.</p>
              )}
              {choferSeleccionado && (
                <>
                  <Indicadores
                    key={`indicadores-chofer-${refrescar}-${choferSeleccionado}`}
                    choferId={choferSeleccionado}
                    onSeleccionarEstatus={(estatus) => manejarSeleccionEstatus(estatus, 'chofer')}
                    estatusActivo={filtroEstatusChofer}
                  />
                  <MetricasTiempos
                    key={`metricas-chofer-${refrescar}-${choferSeleccionado}`}
                    choferId={choferSeleccionado}
                  />
                  <div id="seccion-pedidos-chofer">
                    <TablaPedidos
                      key={`tabla-chofer-${refrescar}-${choferSeleccionado}`}
                      filtroEstatusInicial={filtroEstatusChofer}
                      filtroChoferInicial={choferSeleccionado}
                      choferFijo={choferSeleccionado}
                      modoDashboardChofer
                    />
                  </div>
                </>
              )}
            </>
          )}

          {pestanaActiva === 'pedidos' && (
            <>
              <Indicadores
                key={`indicadores-globales-${refrescar}`}
                onSeleccionarEstatus={(estatus) => manejarSeleccionEstatus(estatus, 'pedidos')}
                estatusActivo={filtroEstatus}
              />
              <MetricasTiempos key={`metricas-globales-${refrescar}`} />
              <TablaComparativaChoferes refrescar={refrescar} />
              <div id="seccion-tabla-pedidos">
                <TablaPedidos
                  key={`tabla-global-${refrescar}`}
                  filtroEstatusInicial={filtroEstatus}
                  filtroChoferInicial=""
                />
              </div>
            </>
          )}

          {pestanaActiva === 'almacenamiento' && (
            <>
              <GraficaAlmacenamiento key={`storage-${refrescar}`} />
              <LimpiezaPedidosAntiguos onCompletado={() => setRefrescar((valor) => valor + 1)} />
            </>
          )}
        </section>
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
  pestanas: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' },
  botonPestana: { flex: '0 0 auto', padding: '0.75rem 1rem', border: 'none', borderRadius: '8px', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600' },
  botonPestanaActiva: { background: '#ecfeff', boxShadow: '0 0 0 2px rgba(8, 145, 178, 0.35), 0 4px 14px rgba(8, 145, 178, 0.18)' },
  contenedorFiltro: { background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1rem 1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  labelFiltro: { color: '#1e293b', fontSize: '0.95rem' },
  selectFiltro: { padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '0.9rem', fontWeight: 'bold', color: '#0f172a', outline: 'none', cursor: 'pointer' },
  mensajeVacio: { padding: '1.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#64748b' },
  error: { padding: '1rem', background: '#fef2f2', borderRadius: '8px', color: '#b91c1c' },
}

export default DashboardAdmin