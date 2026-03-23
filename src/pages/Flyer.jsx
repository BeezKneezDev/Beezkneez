import '../styles/flyer.css'

export default function Flyer() {
  const services = [
    { icon: 'fa-leaf', title: 'Lawn Mowing' },
    { icon: 'fa-seedling', title: 'Garden Tidy-Ups' },
    { icon: 'fa-cut', title: 'Hedge Trimming' },
    { icon: 'fa-trash', title: 'Green Waste Removal' },
    { icon: 'fa-wrench', title: 'General Maintenance' },
  ]

  return (
    <div className="flyer-page">
      <div className="flyer">
        {/* Top banner */}
        <div className="flyer-banner">
          <img src="/beezkneez-logo.png" alt="Beezkneez" className="flyer-logo" />
        </div>

        {/* Headline */}
        <div className="flyer-headline">
          <h1>Keeping your property looking sweet!</h1>
          <p className="flyer-subtitle">Friendly, reliable local lawn care</p>
        </div>

        {/* Services */}
        <div className="flyer-services">
          {services.map((s) => (
            <div className="flyer-service" key={s.title}>
              <i className={`fas ${s.icon}`}></i>
              <span>{s.title}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flyer-cta">
          <div className="flyer-cta-text">Get a FREE quote today!</div>
          <p className="flyer-offer">Mention this flyer for $10 off your first mow</p>
        </div>

        {/* Contact strip */}
        <div className="flyer-contact">
          <div className="flyer-contact-item">
            <i className="fas fa-phone"></i>
            <span>022 192 4346</span>
          </div>
          <div className="flyer-contact-item">
            <i className="fas fa-envelope"></i>
            <span>byron@beezkneez.nz</span>
          </div>
          <div className="flyer-contact-item">
            <i className="fas fa-globe"></i>
            <span>beezkneez.nz</span>
          </div>
        </div>

        {/* Footer accent */}
        <div className="flyer-footer">
          <div className="flyer-areas">
            Servicing Rotorua, Lynmore, Owhata, Springfield, Pukehangi & surrounds
          </div>
        </div>
      </div>

      {/* Screen-only controls */}
      <div className="flyer-controls">
        <button onClick={() => window.print()} className="flyer-print-btn">
          <i className="fas fa-print"></i> Print Flyer
        </button>
        <p className="flyer-hint">A5 size (148 x 210mm) — prints best on A5 or scaled to fit A4</p>
      </div>
    </div>
  )
}
