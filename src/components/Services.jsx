export default function Services() {
  const services = [
    { icon: 'fa-leaf', title: 'Lawn Mowing', desc: 'Regular mowing for small to medium residential sections. Consistent, reliable service you can count on.' },
    { icon: 'fa-seedling', title: 'Garden Tidy-Ups', desc: 'Weed removal, garden bed maintenance, and general clean-ups to keep your property looking fresh.' },
    { icon: 'fa-cut', title: 'Hedge Trimming', desc: 'Keep your hedges neat and tidy with regular trimming and shaping throughout the year.' },
    { icon: 'fa-home', title: 'Gutter Cleaning', desc: 'Clear out leaves and debris to keep your gutters flowing properly and protect your home.' },
    { icon: 'fa-wrench', title: 'General Maintenance', desc: 'Outdoor odd jobs and property maintenance — just ask what you need, happy to help.' },
    { icon: 'fa-plus', title: 'More Coming Soon', desc: "As the business grows, so will the services. Got something specific you need? Just ask — I might already be able to help." },
  ]

  return (
    <section className="services" id="services">
      <div className="container">
        <div className="section-header animate-in">
          <div className="section-tag">Services</div>
          <h2 className="section-title">What I can help with</h2>
        </div>
        <div className="services-grid">
          {services.map((s) => (
            <div className="service-card animate-in" key={s.title}>
              <div className="service-icon"><i className={`fas ${s.icon}`}></i></div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
