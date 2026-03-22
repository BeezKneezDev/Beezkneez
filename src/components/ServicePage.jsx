import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import useScrollAnimation from '../hooks/useScrollAnimation'
import { Slider } from './BeforeAfter'
import Header from './Header'
import Reviews from './Reviews'
import Contact from './Contact'
import Footer from './Footer'
import '../styles/services.css'

const allServices = [
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

export default function ServicePage({ title, metaTitle, metaDescription, description, blurb, contentImage, beforeAfterPairs }) {
  const ref = useScrollAnimation()

  const otherServices = allServices.filter(s => s.title !== title.replace(' Rotorua', ''))

  useEffect(() => {
    document.title = metaTitle
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute('content', metaDescription)
    }
    window.scrollTo(0, 0)
  }, [metaTitle, metaDescription])

  return (
    <div ref={ref}>
      <Header />

      <section className="service-hero">
        <div className="container">
          <div className="service-hero-content animate-in">
            <div className="section-tag">Rotorua</div>
            <h1>{title}</h1>
            <p>{description}</p>
            <a href="#contact" className="btn btn-primary" onClick={(e) => {
              e.preventDefault()
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
            }}>Get a Free Quote</a>
          </div>
        </div>
      </section>

      <section className="service-content">
        <div className="container">
          <div className="service-content-grid animate-in">
            <div className="service-content-text">
              <div className="section-tag">About this service</div>
              <h2 className="section-title">What you get</h2>
              {blurb.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
              <a href="#contact" className="btn btn-primary" onClick={(e) => {
                e.preventDefault()
                document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
              }}>Get a Free Quote</a>
            </div>
            <div className="service-content-image">
              <img src={contentImage} alt={title} loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      <section className="service-before-after">
        <div className="container">
          <div className="section-header animate-in">
            <div className="section-tag">Results</div>
            <h2 className="section-title">Before &amp; after</h2>
          </div>
          <div className="ba-grid">
            {beforeAfterPairs.map((pair, i) => (
              <Slider key={i} {...pair} />
            ))}
          </div>
        </div>
      </section>

      <section className="services-list-section">
        <div className="container">
          <div className="section-header animate-in">
            <div className="section-tag">Services</div>
            <h2 className="section-title">More services</h2>
          </div>
          <div className="services-list services-list-2col">
            {otherServices.map((service) => (
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
            <a href="#contact" className="services-list-item animate-in" onClick={(e) => {
              e.preventDefault()
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
            }}>
              <div className="services-list-image">
                <img src="/photos/before-after/after-lawn-mow-hillcrest-rotorua.jpg" alt="Property maintenance in Rotorua" loading="lazy" />
              </div>
              <div className="services-list-info">
                <h3>Contact Me</h3>
                <p>Need a hand with something else? Just ask, happy to help.</p>
                <span className="services-list-link">
                  Get in touch <i className="fas fa-arrow-right"></i>
                </span>
              </div>
            </a>
          </div>
        </div>
      </section>

      <Reviews />
      <Contact />
      <Footer />
    </div>
  )
}
