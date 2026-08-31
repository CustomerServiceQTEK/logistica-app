// src/components/SubirEvidencia.jsx
// Permite al chofer tomar foto directa con la cámara o adjuntar archivos (PDF/imagen)
import { useState } from 'react'
import emailjs from '@emailjs/browser'
import { supabase } from '../lib/supabaseClient'

function SubirEvidencia({ pedido, choferId, onCompletado }) {
  const [subiendo, setSubiendo] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [esError, setEsError] = useState(false)

  // Función para notificar por correo al vendedor
  async function notificarVendedor(urlEvidencia) {
    if (!pedido?.vendedor_email) {
      console.log('El pedido no tiene correo de vendedor asignado.')
      return
    }

    try {
      await emailjs.send(
        'service_94plomw',
        'template_tbh0dqq',
        {
          vendedor_email: pedido.vendedor_email,
          numero_factura: pedido.numero_factura || 'N/A',
          cliente: pedido.cliente || 'Cliente',
          direccion: pedido.direccion || 'Dirección registrada',
          link_evidencia: urlEvidencia,
        },
        'lc0yHiWMDUZy1348j'
      )
      console.log('📧 Correo enviado con éxito a:', pedido.vendedor_email)
    } catch (errEmail) {
      console.error('❌ Error al enviar correo:', errEmail)
    }
  }

  async function manejarArchivo(e) {
    const archivo = e.target.files[0]
    if (!archivo) return

    setSubiendo(true)
    setMensaje('')
    setEsError(false)

    try {
      const extension = archivo.name.split('.').pop()
      const nombreArchivo = `${pedido.numero_factura}_${Date.now()}.${extension}`

      // 1. Subir archivo al bucket de evidencias
      const { error: errorSubida } = await supabase.storage
        .from('evidencias')
        .upload(nombreArchivo, archivo)

      if (errorSubida) {
        setEsError(true)
        setMensaje('Error al subir archivo: ' + errorSubida.message)
        setSubiendo(false)
        return
      }

      // 2. Obtener la URL pública de la evidencia
      const { data: urlData } = supabase.storage
        .from('evidencias')
        .getPublicUrl(nombreArchivo)

      const urlEvidenciaCompleta = urlData?.publicUrl || ''
      const tipoArchivo = archivo.type.includes('pdf') ? 'pdf' : 'imagen'

      // 3. Registrar evidencia en la base de datos con tamaño del archivo
      const { error: errorInsert } = await supabase.from('evidencias').insert({
        pedido_id: pedido.id,
        chofer_id: choferId,
        archivo_url: urlEvidenciaCompleta,
        tipo_archivo: tipoArchivo,
        archivo_size: archivo.size,
      })

      if (errorInsert) {
        setEsError(true)
        setMensaje('Error al guardar registro: ' + errorInsert.message)
        setSubiendo(false)
        return
      }

      // 4. Actualizar el estatus del pedido a completada
      const { error: errorUpdate } = await supabase
        .from('pedidos')
        .update({ estatus: 'completada' })
        .eq('id', pedido.id)

      if (errorUpdate) {
        setEsError(true)
        setMensaje('Error al actualizar estatus: ' + errorUpdate.message)
        setSubiendo(false)
        return
      }

      // 5. Enviar notificación por correo al vendedor
      await notificarVendedor(urlEvidenciaCompleta)

      setMensaje('¡Evidencia subida y correo enviado al vendedor!')
      if (onCompletado) onCompletado()

    } catch (err) {
      setEsError(true)
      setMensaje('Error inesperado: ' + err.message)
    }

    setSubiendo(false)
  }

  return (
    <div style={estilos.contenedorBotones}>
      {/* Botón de Cámara Directa */}
      <label style={{ ...estilos.botonCamara, opacity: subiendo ? 0.6 : 1 }}>
        {subiendo ? 'Procesando...' : '📸 Tomar foto'}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={manejarArchivo}
          disabled={subiendo}
          style={{ display: 'none' }}
        />
      </label>

      {/* Botón de Galería / PDF */}
      <label style={{ ...estilos.botonArchivo, opacity: subiendo ? 0.6 : 1 }}>
        📎 Adjuntar
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={manejarArchivo}
          disabled={subiendo}
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
  contenedorBotones: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  botonCamara: {
    display: 'inline-block',
    padding: '0.6rem 1.1rem',
    background: '#16a34a',
    color: '#fff',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  botonArchivo: {
    display: 'inline-block',
    padding: '0.6rem 1.1rem',
    background: '#2563eb',
    color: '#fff',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  mensaje: {
    fontSize: '0.8rem',
    marginTop: '0.4rem',
    width: '100%',
    textAlign: 'right',
    fontWeight: 'bold',
  },
}

export default SubirEvidencia