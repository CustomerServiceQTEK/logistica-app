// src/App.jsx
// Aquí definimos las rutas principales y la lógica de redirección según el rol

import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import PiePagina from './components/PiePagina'
import LogoFlotante from './components/LogoFlotante'
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

  // Si no hay usuario logueado, mostramos Login o Registro según corresponda
  if (!usuario) {
    if (pantalla === 'registro') {
      return <Registro irALogin={() => setPantalla('login')} />
    }
    return <Login irARegistro={() => setPantalla('registro')} />
  }

  // Si está logueado, lo mandamos según su rol
  if (perfil?.rol === 'administrador') {
    return <DashboardAdmin />
  }

  return <DashboardChofer />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <LogoFlotante />
        <Routes>
          <Route path="*" element={<RutaPrincipal />} />
        </Routes>
        <PiePagina />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App