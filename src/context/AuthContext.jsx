// src/context/AuthContext.jsx
// Este archivo comparte la información del usuario logueado
// (y su rol) con TODA la aplicación, sin repetir código.

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// 1. Creamos el "contenedor" de datos compartidos
const AuthContext = createContext()

// 2. Este componente envuelve toda la app y provee los datos
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)   // datos de login (email, id)
  const [perfil, setPerfil] = useState(null)     // datos extra (nombre, rol)
  const [cargando, setCargando] = useState(true) // true mientras verificamos la sesión

  useEffect(() => {
    // Al cargar la app, revisamos si ya hay una sesión activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsuario(session?.user ?? null)
      if (session?.user) {
        cargarPerfil(session.user.id)
      } else {
        setCargando(false)
      }
    })

    // Escuchamos cambios de sesión (login, logout) en tiempo real
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuario(session?.user ?? null)
      if (session?.user) {
        cargarPerfil(session.user.id)
      } else {
        setPerfil(null)
        setCargando(false)
      }
    })

    // Limpieza al desmontar el componente
    return () => listener.subscription.unsubscribe()
  }, [])

  // Busca el rol y nombre del usuario en la tabla "perfiles"
async function cargarPerfil(userId) {
    const { data } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', userId)
      .single()

    setPerfil(data)
    setCargando(false)
  }

  // Función para cerrar sesión, disponible en toda la app
  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ usuario, perfil, cargando, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  )
}

// 3. Hook para usar fácilmente estos datos en cualquier página:
// const { usuario, perfil } = useAuth()
export function useAuth() {
  return useContext(AuthContext)
}