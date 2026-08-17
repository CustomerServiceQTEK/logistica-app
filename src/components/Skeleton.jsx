// src/components/Skeleton.jsx
// Bloque animado ("shimmer") que se muestra mientras algo está cargando,
// en vez de un texto plano de "Cargando..."

function Skeleton({ width, height, style }) {
  return (
    <div
      style={{
        width: width || '100%',
        height: height || '20px',
        background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%)',
        backgroundSize: '400px 100%',
        animation: 'shimmer 1.4s ease infinite',
        borderRadius: '6px',
        ...style,
      }}
    />
  )
}

export default Skeleton