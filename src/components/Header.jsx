import { useState, useEffect } from 'react'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={scrolled ? 'scrolled' : ''}>
      <div className="header-container">
        <a href="#" className="logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          <img src="/beezkneez-logo.png" alt="Beezkneez Logo" />
        </a>
        <div className="header-buttons">
          <a href="tel:+64221924346" className="btn btn-secondary">Call Now</a>
          <a href="#contact" className="btn btn-primary" onClick={(e) => {
            e.preventDefault()
            document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
          }}>Free Quote</a>
        </div>
      </div>
    </header>
  )
}
