export function obtenerTipoDocumento(numero) {
  const cantidadDigitos = String(numero ?? '').replace(/\D/g, '').length
  return cantidadDigitos === 8 ? 'Remisión' : 'Factura'
}

export function formatearDocumento(numero) {
  return `${obtenerTipoDocumento(numero)} #${numero || 'N/A'}`
}
