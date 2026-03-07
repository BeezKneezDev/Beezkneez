export default function WhyChoose() {
  const items = [
    { icon: 'fa-user', title: 'Owner-Operated', desc: 'You deal with me directly — no random workers showing up at your place.' },
    { icon: 'fa-clock', title: 'Reliable', desc: 'I turn up when I say I will. Consistent, dependable, no ghosting.' },
    { icon: 'fa-dollar-sign', title: 'Fair Pricing', desc: 'Honest, upfront quotes with no hidden surprises or sneaky charges.' },
    { icon: 'fa-handshake', title: 'Easy to Deal With', desc: 'Friendly, no pressure, just good honest work from a local.' },
  ]

  return (
    <section className="why-choose">
      <div className="container">
        <div className="section-header animate-in">
          <div className="section-tag">Why Beezkneez</div>
          <h2 className="section-title">Simple, honest service</h2>
        </div>
        <div className="why-grid">
          {items.map((item) => (
            <div className="why-item animate-in" key={item.title}>
              <div className="why-icon"><i className={`fas ${item.icon}`}></i></div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
