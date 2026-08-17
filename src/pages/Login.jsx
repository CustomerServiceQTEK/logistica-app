// src/pages/Login.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function Login({ irARegistro }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function manejarLogin(e) {
  e.preventDefault()
  setError('')
  setCargando(true)

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Esto nos dirá el motivo exacto (ej. "Invalid login credentials" o "Email not confirmed")
    console.log("Error de Supabase:", error.message) 
    setError(error.message) 
  }

  setCargando(false)
}

  return (
    <div style={estilos.contenedor}>
      <form onSubmit={manejarLogin} style={estilos.formulario}>
        <div style={estilos.logo}>📦</div>
        <h2 style={estilos.titulo}>Iniciar Sesión</h2>
        <p style={estilos.subtitulo}>Sistema de gestión de entregas</p>

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={estilos.input}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={estilos.input}
        />

        {error && <p style={estilos.error}>{error}</p>}

        <button type="submit" disabled={cargando} style={estilos.boton}>
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.9rem', margin: 0, color: '#64748b' }}>
          ¿Eres chofer y no tienes cuenta?{' '}
          <span onClick={irARegistro} style={estilos.enlace}>
            Regístrate aquí
          </span>
        </p>
      </form>
    </div>
  )
}

const estilos = {
  contenedor: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: 'sans-serif',
    background: 'linear-gradient(135deg, #1e293b, #334155)',
  },
  formulario: {
    background: '#fff',
    padding: '2.5rem',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    width: '320px',
  },
  logo: {
    fontSize: '2.5rem',
    textAlign: 'center',
  },
  titulo: {
    margin: 0,
    textAlign: 'center',
  },
  subtitulo: {
    margin: '-0.5rem 0 0.5rem 0',
    textAlign: 'center',
    fontSize: '0.85rem',
    color: '#64748b',
  },
  input: {
    padding: '0.7rem',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
  },
  boton: {
    padding: '0.7rem',
    fontSize: '1rem',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  error: {
    color: '#dc2626',
    fontSize: '0.85rem',
    margin: 0,
    textAlign: 'center',
  },
  enlace: {
    color: '#2563eb',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
}

export default Login