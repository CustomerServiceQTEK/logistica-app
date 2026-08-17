// src/components/PiePagina.jsx
// Leyenda fija que aparece en la parte inferior de todas las pantallas

function PiePagina() {
  return (
    <div style={estilos.pie}>
      Powered by: Victor Covarrubias
    </div>
  )
}

const estilos = {
  pie: {
    textAlign: 'center',
    padding: '1rem',
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontFamily: 'sans-serif',
  },
}

export default PiePagina