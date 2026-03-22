import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  function handleLogoClick(e) {
    if (isHome) {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function handleQuoteClick(e) {
    e.preventDefault()
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className={scrolled ? 'scrolled' : ''}>
      <div className="header-container">
        <Link to="/" className="logo" onClick={handleLogoClick}>
          <img src="/beezkneez-logo.png" alt="Beezkneez Logo" />
        </Link>
        <div className="header-buttons">
          <a href="tel:+64221924346" className="btn btn-secondary">Call Now</a>
          <a href="#contact" className="btn btn-primary" onClick={handleQuoteClick}>Free Quote</a>
        </div>
      </div>
    </header>
  )
}
