// src/components/EliminarPedido.jsx
// Botón para que el Administrador elimine un pedido (y su evidencia, si tiene)

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Recibe el pedido y una función para avisar al padre que debe refrescar la lista
function EliminarPedido({ pedido, onEliminado }) {
  const [eliminando, setEliminando] = useState(false)

  async function manejarEliminar() {
    // Ventana de confirmación simple, para evitar borrados accidentales
    const confirmado = window.confirm(
      `¿Seguro que quieres eliminar el pedido "${pedido.numero_factura}"? Esta acción no se puede deshacer.`
    )

    if (!confirmado) return

    setEliminando(true)

    try {
      // 1. Buscamos si este pedido tiene una evidencia asociada
      const { data: evidenciasDelPedido } = await supabase
        .from('evidencias')
        .select('id, archivo_url')
        .eq('pedido_id', pedido.id)

      // 2. Si tiene evidencia(s), borramos primero el archivo del Storage
      if (evidenciasDelPedido && evidenciasDelPedido.length > 0) {
        for (const ev of evidenciasDelPedido) {
          const nombreArchivo = ev.archivo_url.split('/evidencias/')[1]
          if (nombreArchivo) {
            await supabase.storage.from('evidencias').remove([nombreArchivo])
          }
        }

        // 3. Borramos los registros de evidencias en la base de datos
        await supabase.from('evidencias').delete().eq('pedido_id', pedido.id)
      }

      // 4. Finalmente, borramos el pedido en sí
      const { error } = await supabase.from('pedidos').delete().eq('id', pedido.id)

      if (error) {
        alert('Error al eliminar: ' + error.message)
        setEliminando(false)
        return
      }

      // Avisamos al componente padre para que refresque la tabla
      if (onEliminado) onEliminado()

    } catch (err) {
      alert('Error inesperado: ' + err.message)
      setEliminando(false)
    }
  }

  return (
    <button onClick={manejarEliminar} disabled={eliminando} style={estilos.boton}>
      {eliminando ? '...' : '🗑️'}
    </button>
  )
}

const estilos = {
  boton: {
    padding: '0.4rem 0.6rem',
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
}

export default EliminarPedido