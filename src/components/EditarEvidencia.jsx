// src/components/EditarEvidencia.jsx
// Permite al chofer reemplazar una evidencia ya subida por un archivo nuevo

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Recibe la evidencia actual ({ id, archivo_url }) y el pedido
function EditarEvidencia({ pedido, evidenciaActual, onActualizado }) {
  const [editando, setEditando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [esError, setEsError] = useState(false)

  async function manejarArchivo(e) {
    const archivo = e.target.files[0]
    if (!archivo) return

    setEditando(true)
    setMensaje('')
    setEsError(false)

    try {
      // 1. Subimos el archivo NUEVO primero (con nombre único)
      const extension = archivo.name.split('.').pop()
      const nombreArchivo = `${pedido.numero_factura}_${Date.now()}.${extension}`

      const { error: errorSubida } = await supabase.storage
        .from('evidencias')
        .upload(nombreArchivo, archivo)

      if (errorSubida) {
        setEsError(true)
        setMensaje('Error al subir archivo nuevo: ' + errorSubida.message)
        setEditando(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('evidencias')
        .getPublicUrl(nombreArchivo)

      const tipoArchivo = archivo.type.includes('pdf') ? 'pdf' : 'imagen'

      // 2. Actualizamos el registro en la tabla "evidencias" con la nueva URL
      const { error: errorUpdate } = await supabase
        .from('evidencias')
        .update({
          archivo_url: urlData.publicUrl,
          tipo_archivo: tipoArchivo,
        })
        .eq('id', evidenciaActual.id)

      if (errorUpdate) {
        setEsError(true)
        setMensaje('Error al actualizar registro: ' + errorUpdate.message)
        setEditando(false)
        return
      }

      // 3. Borramos el archivo VIEJO del Storage (ya no se usa)
      //    Extraemos el nombre del archivo viejo a partir de su URL
      const nombreArchivoViejo = evidenciaActual.archivo_url.split('/evidencias/')[1]
      if (nombreArchivoViejo) {
        await supabase.storage.from('evidencias').remove([nombreArchivoViejo])
      }

      setMensaje('¡Evidencia actualizada!')
      if (onActualizado) onActualizado()

    } catch (err) {
      setEsError(true)
      setMensaje('Error inesperado: ' + err.message)
    }

    setEditando(false)
  }

  return (
    <div style={{ textAlign: 'right' }}>
      <label style={{ ...estilos.botonEditar, opacity: editando ? 0.6 : 1 }}>
        {editando ? 'Actualizando...' : '✏️ Editar evidencia'}
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={manejarArchivo}
          disabled={editando}
          style={{ display: 'none' }}
        />
      </label>
      {mensaje && (
        <p style={{ ...estilos.mensaje, color: esError ? '#dc2626' : '#16a34a' }}>
          {mensaje}
        </p>
      )}
    </div>
  )
}

const estilos = {
  botonEditar: {
    display: 'inline-block',
    padding: '0.5rem 1rem',
    background: '#fff',
    color: '#2563eb',
    border: '1px solid #2563eb',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  mensaje: {
    fontSize: '0.8rem',
    marginTop: '0.4rem',
  },
}

export default EditarEvidencia