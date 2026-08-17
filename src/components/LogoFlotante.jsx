// src/components/LogoFlotante.jsx
// Logo de la empresa, visible en la esquina de todas las pantallas

import qtekLogo from '../assets/qtek-logo.png'

function LogoFlotante() {
  return (
    <img src={qtekLogo} alt="QTEK" style={estilos.logo} />
  )
}

const estilos = {
  logo: {
    position: 'fixed',
    top: '12px',
    left: '16px',
    height: '32px',
    zIndex: 1000,
  },
}

export default LogoFlotante