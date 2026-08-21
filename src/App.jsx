// src/App.jsx
// Aquí definimos las rutas principales y la lógica de redirección según el rol

import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import PiePagina from './components/PiePagina'
import Registro from './pages/Registro'
import DashboardAdmin from './pages/DashboardAdmin'
import DashboardChofer from './pages/DashboardChofer'

// Este componente decide a dónde mandar al usuario según su estado
function RutaPrincipal() {
  const { usuario, perfil, cargando } = useAuth()

  // Controla si mostramos Login o Registro cuando NO hay sesión
  const [pantalla, setPantalla] = useState('login') // 'login' | 'registro'

  if (cargando) {
    return <p style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Cargando...</p>
  }

  // Si no hay usuario logueado, mostramos Login o Registro
  if (!usuario) {
    if (pantalla === 'registro') {
      return (
        <div style={{ position: 'relative', minHeight: '100vh' }}>
          <Registro irALogin={() => setPantalla('login')} />
          <PiePagina />
        </div>
      )
    }
    return (
      <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
        <Login irARegistro={() => setPantalla('registro')} />
        <div style={{ position: 'absolute', bottom: 0, width: '100%', zIndex: 10 }}>
          <PiePagina />
        </div>
      </div>
    )
  }

  // Si está logueado, lo mandamos según su rol con el pie de página normal
  return (
    <div>
      {perfil?.rol === 'administrador' ? <DashboardAdmin /> : <DashboardChofer />}
      <PiePagina />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<RutaPrincipal />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App