import { Link } from 'react-router-dom'
import '../styles/services.css'

const services = [
  {
    title: 'Lawn Mowing',
    desc: 'Regular mowing for residential sections across Rotorua.',
    image: '/photos/before-after/after-backyard-mow-rotorua.jpg',
    link: '/lawn-mowing',
  },
  {
    title: 'Hedge Trimming',
    desc: 'Hedge shaping, height reduction and regular maintenance.',
    image: '/photos/before-after/after-hedge-trim-glenholme-rotorua.jpg',
    link: '/hedge-trimming',
  },
  {
    title: 'Garden Tidy-Ups',
    desc: 'Weed removal, garden beds and general clean-ups.',
    image: '/photos/mums_job/69d7f704-a0d4-4ac0-a300-3de48d14d381.jpeg',
    link: '/garden-tidy-ups',
  },
]

export default function Services() {
  return (
    <section className="services" id="services">
      <div className="container">
        <div className="section-header animate-in">
          <div className="section-tag">Services</div>
          <h2 className="section-title">What I can help with</h2>
        </div>
        <div className="services-list">
          {services.map((s) => (
            <Link to={s.link} className="services-list-item animate-in" key={s.title}>
              <div className="services-list-image">
                <img src={s.image} alt={s.title + ' in Rotorua'} loading="lazy" />
              </div>
              <div className="services-list-info">
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <span className="services-list-link">
                  Learn more <i className="fas fa-arrow-right"></i>
                </span>
              </div>
            </Link>
          ))}
        </div>
        <div className="services-cta animate-in">
          <Link to="/services" className="btn btn-primary">View All Services</Link>
        </div>
      </div>
    </section>
  )
}
