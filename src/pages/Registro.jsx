// src/pages/Registro.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function Registro({ irALogin }) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [cargando, setCargando] = useState(false)

  async function manejarRegistro(e) {
    e.preventDefault()
    setError('')
    setCargando(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre_completo: nombre },
      },
    })

    if (error) {
      setError('Error al registrar: ' + error.message)
    } else {
      setExito(true)
    }

    setCargando(false)
  }

  if (exito) {
    return (
      <div style={estilos.contenedor}>
        <div style={estilos.formulario}>
          <div style={estilos.logo}>✅</div>
          <h2 style={estilos.titulo}>¡Cuenta creada!</h2>
          <p style={{ textAlign: 'center', color: '#64748b' }}>
            Ya puedes iniciar sesión con tu correo y contraseña.
          </p>
          <button onClick={irALogin} style={estilos.boton}>
            Ir a Iniciar Sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={estilos.contenedor}>
      <form onSubmit={manejarRegistro} style={estilos.formulario}>
        <div style={estilos.logo}>🚚</div>
        <h2 style={estilos.titulo}>Crea tú cuenta</h2>

        <input
          type="text"
          placeholder="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          style={estilos.input}
        />

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
          placeholder="Contraseña (mínimo 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={estilos.input}
        />

        {error && <p style={estilos.error}>{error}</p>}

        <button type="submit" disabled={cargando} style={estilos.boton}>
          {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.9rem', margin: 0, color: '#64748b' }}>
          ¿Ya tienes cuenta?{' '}
          <span onClick={irALogin} style={estilos.enlace}>
            Inicia sesión
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

export default Registro