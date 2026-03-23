import { useEffect } from 'react'
import useScrollAnimation from '../hooks/useScrollAnimation'
import Header from '../components/Header'
import Hero from '../components/Hero'
import Services from '../components/Services'
import BeforeAfter from '../components/BeforeAfter'
import WhyChoose from '../components/WhyChoose'
import Reviews from '../components/Reviews'
import About from '../components/About'
import ServiceArea from '../components/ServiceArea'
import Contact from '../components/Contact'
import Footer from '../components/Footer'

export default function Home() {
  const ref = useScrollAnimation()

  useEffect(() => {
    document.title = 'Lawn Mowing Rotorua | Beezkneez Lawns & Property Care'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute('content', 'Reliable lawn mowing and garden maintenance in Rotorua. Owner-operated, honest, friendly service. Free quotes available.')
    }
  }, [])

  return (
    <div ref={ref}>
      <Header />
      <Hero />
      <Services />
      <BeforeAfter />
      <WhyChoose />
      <Reviews />
      <About />
      <ServiceArea />
      <Contact />
      <Footer />
    </div>
  )
}
