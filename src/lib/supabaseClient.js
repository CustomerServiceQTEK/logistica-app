// src/lib/supabaseClient.js
// Este archivo crea UNA sola conexión a Supabase
// que vamos a reutilizar en toda la aplicación.

import { createClient } from '@supabase/supabase-js'

// Leemos las variables de entorno que pusimos en el archivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Creamos y exportamos el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)