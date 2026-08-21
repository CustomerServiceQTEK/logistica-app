// src/pages/Login.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import qtekLogo from '../assets/qtek-logo.png'

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
      setError('Correo o contraseña incorrectos.')
    }

    setCargando(false)
  }

  return (
    <div style={estilos.contenedor}>
      <form onSubmit={manejarLogin} style={estilos.formulario}>
        <div style={estilos.logo}>
          <img 
            src={qtekLogo} 
            alt="Logo QTEK" 
            style={estilos.imagenLogo} 
          />
        </div>
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

        <p style={{ textAlign: 'center', fontSize: '0.85rem', margin: 0, color: '#64748b' }}>
          ¿Eres chofer y no tienes cuenta?{' '}
          <span onClick={irARegistro} style={estilos.enlace}>
            Regístrate aquí
          </span>
        </p>
      </form>
    </div>
  )
}

const urlImagen = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1920&q=80'

const estilos = {
  contenedor: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    maxHeight: '100dvh',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'sans-serif',
    backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.78)), url("${urlImagen}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    padding: '1rem',
    overflow: 'hidden', // Mantiene deshabilitada la barra de scroll
  },
  formulario: {
    background: '#fff',
    padding: '1.8rem 2rem',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
    width: '100%',
    maxWidth: '350px',
    boxSizing: 'border-box',
  },
  logo: {
    textAlign: 'center',
  },
  imagenLogo: {
    maxWidth: '140px',
    height: 'auto',
    maxHeight: '50px',
    objectFit: 'contain',
  },
  titulo: {
    margin: 0,
    textAlign: 'center',
    fontSize: '1.35rem',
  },
  subtitulo: {
    margin: '-0.4rem 0 0.3rem 0',
    textAlign: 'center',
    fontSize: '0.8rem',
    color: '#64748b',
  },
  input: {
    padding: '0.65rem 0.75rem',
    fontSize: '0.95rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    width: '100%',
    boxSizing: 'border-box',
  },
  boton: {
    padding: '0.65rem',
    fontSize: '0.95rem',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  error: {
    color: '#dc2626',
    fontSize: '0.8rem',
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