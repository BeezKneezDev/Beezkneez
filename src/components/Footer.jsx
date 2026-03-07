import { useState } from 'react'

export default function Footer() {
  const [fbHover, setFbHover] = useState(false)

  return (
    <footer>
      <div className="footer-container">
        <div className="footer-brand">
          <img src="/beezkneez-logo.png" alt="Beezkneez" />
          <span>Beezkneez Lawns &amp; Property Care</span>
        </div>
        <a
          href="https://www.facebook.com/profile.php?id=61584978087247"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: fbHover ? 'white' : 'rgba(255,255,255,0.7)',
            fontSize: '1.25rem',
            transition: 'color 0.3s ease',
          }}
          onMouseEnter={() => setFbHover(true)}
          onMouseLeave={() => setFbHover(false)}
        >
          <i className="fab fa-facebook-f"></i>
        </a>
        <p className="footer-copy">&copy; 2026 Beezkneez. Rotorua, New Zealand.</p>
      </div>
    </footer>
  )
}
