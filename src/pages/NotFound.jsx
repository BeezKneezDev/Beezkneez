import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function NotFound() {
  const canvasRef = useRef(null)

  useEffect(() => {
    document.title = 'Lost in the Garden | Beezkneez Lawns & Property Care'
    window.scrollTo(0, 0)

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function resize() {
      canvas.width = canvas.parentElement.offsetWidth
      canvas.height = canvas.parentElement.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const bees = Array.from({ length: 6 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.7 + canvas.height * 0.1,
      angle: Math.random() * Math.PI * 2,
      speed: Math.random() * 1.5 + 0.8,
      turnSpeed: (Math.random() - 0.5) * 0.04,
      turnTimer: Math.random() * 120,
      size: Math.random() * 8 + 14,
      wingPhase: Math.random() * Math.PI * 2,
    }))

    let animFrame
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      bees.forEach(bee => {
        // Update turn
        bee.turnTimer--
        if (bee.turnTimer <= 0) {
          bee.turnSpeed = (Math.random() - 0.5) * 0.06
          bee.turnTimer = Math.random() * 150 + 60
        }
        bee.angle += bee.turnSpeed

        // Move
        bee.x += Math.cos(bee.angle) * bee.speed
        bee.y += Math.sin(bee.angle) * bee.speed

        // Wrap around edges
        if (bee.x < -30) bee.x = canvas.width + 30
        if (bee.x > canvas.width + 30) bee.x = -30
        if (bee.y < -30) bee.y = canvas.height + 30
        if (bee.y > canvas.height + 30) bee.y = -30

        // Wing animation
        bee.wingPhase += 0.4

        // Draw bee
        ctx.save()
        ctx.translate(bee.x, bee.y)
        ctx.rotate(bee.angle)

        // Body
        ctx.fillStyle = '#f5c518'
        ctx.beginPath()
        ctx.ellipse(0, 0, bee.size, bee.size * 0.6, 0, 0, Math.PI * 2)
        ctx.fill()

        // Stripes
        ctx.fillStyle = '#1a1a1a'
        for (let s = -1; s <= 1; s++) {
          ctx.fillRect(s * bee.size * 0.4 - bee.size * 0.08, -bee.size * 0.6, bee.size * 0.16, bee.size * 1.2)
        }

        // Head
        ctx.fillStyle = '#1a1a1a'
        ctx.beginPath()
        ctx.arc(bee.size * 0.9, 0, bee.size * 0.35, 0, Math.PI * 2)
        ctx.fill()

        // Wings
        const wingFlap = Math.sin(bee.wingPhase) * 0.5
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.beginPath()
        ctx.ellipse(-bee.size * 0.2, -bee.size * (0.6 + wingFlap * 0.4), bee.size * 0.5, bee.size * 0.25, -0.3 + wingFlap, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(-bee.size * 0.2, bee.size * (0.6 + wingFlap * 0.4), bee.size * 0.5, bee.size * 0.25, 0.3 - wingFlap, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
      })

      animFrame = requestAnimationFrame(draw)
    }
    animFrame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <div style={{
        flex: 1,
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(220, 252, 231, 0.92) 0%, rgba(254, 243, 199, 0.88) 50%, rgba(255, 255, 255, 0.9) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />

        <div style={{
          textAlign: 'center',
          padding: '2rem',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{
            fontSize: 'clamp(5rem, 15vw, 10rem)',
            fontWeight: 800,
            color: 'var(--green-dark)',
            lineHeight: 1,
            opacity: 0.1,
            marginBottom: '-1.5rem',
          }}>
            404
          </div>
          <h1 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 700,
            color: 'var(--green-dark)',
            marginBottom: '0.75rem',
          }}>
            Bzz... wrong turn!
          </h1>
          <p style={{
            fontSize: '1.15rem',
            color: 'var(--gray)',
            maxWidth: '420px',
            margin: '0 auto 2rem',
            lineHeight: 1.6,
          }}>
            Looks like this page has buzzed off. Even the bees can't find it. Let's get you back to the hive.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="btn btn-primary">Back to Home</Link>
            <Link to="/services" className="btn btn-secondary">View Services</Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
