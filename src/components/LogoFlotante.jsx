// src/components/LogoFlotante.jsx
import qtekLogo from '../assets/qtek-logo.png'

function LogoFlotante() {
  return (
    <img src={qtekLogo} alt="QTEK" style={estilos.logo} />
  )
}

const estilos = {
  logo: {
    height: '28px',
    objectFit: 'contain',
    display: 'block',
  },
}

export default LogoFlotante