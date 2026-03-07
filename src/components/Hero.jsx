export default function Hero() {
  function scrollToContact(e) {
    e.preventDefault()
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-badge">Rotorua's Local Lawn Care</div>
        <h1>Keeping your property<br /><span>looking sweet!</span></h1>
        <p className="hero-tagline">Your lawn deserves the bee's knees</p>
        <p className="hero-intro">
          Hey, I'm Byron — a local Rotorua dad running a small, owner-operated lawn and property care service. I turn up when I say I will and do a solid, honest job.
        </p>
        <div className="hero-buttons">
          <a href="tel:+64221924346" className="btn btn-secondary">Call 022 192 4346</a>
          <a href="#contact" className="btn btn-primary" onClick={scrollToContact}>Get a Free Quote</a>
        </div>
      </div>
      <div className="scroll-indicator">
        <span></span>
      </div>
    </section>
  )
}
