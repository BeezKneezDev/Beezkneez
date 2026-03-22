import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import useScrollAnimation from '../hooks/useScrollAnimation'
import { Slider } from '../components/BeforeAfter'
import Header from '../components/Header'
import Contact from '../components/Contact'
import Footer from '../components/Footer'
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

const recentWork = [
  {
    beforeSrc: '/photos/before-after/before-backyard-mow-rotorua.jpg',
    afterSrc: '/photos/before-after/after-backyard-mow-rotorua.jpg',
    beforeAlt: 'Backyard lawn before mowing in Rotorua',
    afterAlt: 'Freshly mowed backyard lawn with stripes in Rotorua',
    caption: 'Fortnightly mow — regular backyard tidy-up with a full cut, edge trim and clean-up.',
  },
  {
    beforeSrc: '/photos/before-after/before-hedge-trim-glenholme-rotorua.jpg',
    afterSrc: '/photos/before-after/after-hedge-trim-glenholme-rotorua.jpg',
    beforeAlt: 'Overgrown hedge before trimming in Glenholme, Rotorua',
    afterAlt: 'Neatly trimmed hedge along pathway in Glenholme, Rotorua',
    caption: 'Hedge trim — very overgrown hedge reduced in height significantly, shaped up and ready for regular maintenance.',
  },
  {
    beforeSrc: '/photos/before-after/before-pathway-tidy-pukehangi-rotorua.jpg',
    afterSrc: '/photos/before-after/after-pathway-tidy-pukehangi-rotorua.jpg',
    beforeAlt: 'Overgrown side pathway before tidy-up in Pukehangi, Rotorua',
    afterAlt: 'Clean side pathway after tidy-up in Pukehangi, Rotorua',
    caption: 'Side pathway — overgrown ferns and weeds cleared, pavers cleaned up and garden bed tidied.',
  },
]

export default function ServicesPage() {
  const ref = useScrollAnimation()

  useEffect(() => {
    document.title = 'Services Rotorua | Beezkneez Lawns & Property Care'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute('content', 'Lawn mowing, hedge trimming, garden tidy-ups, gutter cleaning and general property maintenance in Rotorua. Free quotes available.')
    }
    window.scrollTo(0, 0)
  }, [])

  return (
    <div ref={ref}>
      <Header />

      <section className="service-hero">
        <div className="container">
          <div className="service-hero-content animate-in">
            <div className="section-tag">Rotorua</div>
            <h1>Lawn &amp; Property Services</h1>
            <p>From regular mowing to one-off tidy-ups, here's everything I can help with around your property.</p>
            <a href="#contact" className="btn btn-primary" onClick={(e) => {
              e.preventDefault()
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
            }}>Get a Free Quote</a>
          </div>
        </div>
      </section>

      <section className="services-list-section">
        <div className="container">
          <div className="services-list">
            {services.map((service) => (
              <Link to={service.link} className="services-list-item animate-in" key={service.title}>
                <div className="services-list-image">
                  <img src={service.image} alt={service.title + ' in Rotorua'} loading="lazy" />
                </div>
                <div className="services-list-info">
                  <h3>{service.title}</h3>
                  <p>{service.desc}</p>
                  <span className="services-list-link">
                    Learn more <i className="fas fa-arrow-right"></i>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="services-also">
        <div className="container">
          <div className="services-also-content animate-in">
            <h2>Need something else done?</h2>
            <p>I'm always happy to help with other bits around the property. If it needs doing, just ask.</p>
            <div className="services-also-extras">
              <span className="services-also-tag"><i className="fas fa-home"></i> Gutter Cleaning</span>
              <span className="services-also-tag"><i className="fas fa-truck"></i> Green Waste Removal</span>
              <span className="services-also-tag"><i className="fas fa-wrench"></i> General Maintenance</span>
              <span className="services-also-tag"><i className="fas fa-tint"></i> Water Blasting</span>
            </div>
            <a href="#contact" className="btn btn-secondary" onClick={(e) => {
              e.preventDefault()
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
            }}>Get in Touch</a>
          </div>
        </div>
      </section>

      <section className="service-before-after">
        <div className="container">
          <div className="section-header animate-in">
            <div className="section-tag">Recent Work</div>
            <h2 className="section-title">Before &amp; after</h2>
          </div>
          <div className="ba-grid">
            {recentWork.map((pair, i) => (
              <Slider key={i} {...pair} />
            ))}
          </div>
        </div>
      </section>

      <Contact />
      <Footer />
    </div>
  )
}
