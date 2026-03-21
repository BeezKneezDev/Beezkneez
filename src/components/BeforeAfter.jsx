import { useRef, useCallback } from 'react'

function Slider({ beforeSrc, afterSrc, beforeAlt, afterAlt, caption, beforeOffset, afterOffset }) {
  const sliderRef = useRef(null)
  const beforeRef = useRef(null)
  const handleRef = useRef(null)
  const isDragging = useRef(false)

  const setPosition = useCallback((clientX) => {
    const slider = sliderRef.current
    if (!slider) return
    const rect = slider.getBoundingClientRect()
    let pos = ((clientX - rect.left) / rect.width) * 100
    pos = Math.max(0, Math.min(100, pos))
    beforeRef.current.style.clipPath = `inset(0 ${100 - pos}% 0 0)`
    handleRef.current.style.left = pos + '%'
  }, [])

  const onMouseDown = (e) => {
    isDragging.current = true
    setPosition(e.clientX)

    const onMouseMove = (e) => {
      if (!isDragging.current) return
      setPosition(e.clientX)
    }
    const onMouseUp = () => {
      isDragging.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const onTouchStart = (e) => {
    isDragging.current = true
    setPosition(e.touches[0].clientX)
  }

  const onTouchMove = (e) => {
    if (!isDragging.current) return
    e.preventDefault()
    setPosition(e.touches[0].clientX)
  }

  const onTouchEnd = () => {
    isDragging.current = false
  }

  return (
    <div className="ba-pair animate-in">
      <div
        className="ba-slider"
        ref={sliderRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img className="ba-after" src={afterSrc} alt={afterAlt} loading="lazy" style={afterOffset ? { objectPosition: `calc(50% + ${afterOffset.x || '0px'}) calc(50% + ${afterOffset.y || '0px'})` } : undefined} />
        <img className="ba-before" src={beforeSrc} alt={beforeAlt} loading="lazy" ref={beforeRef} style={beforeOffset ? { objectPosition: `calc(50% + ${beforeOffset.x || '0px'}) calc(50% + ${beforeOffset.y || '0px'})` } : undefined} />
        <span className="ba-label ba-label-before">Before</span>
        <span className="ba-label ba-label-after">After</span>
        <div className="ba-handle" ref={handleRef}>
          <div className="ba-handle-line"></div>
          <div className="ba-handle-circle"><i className="fas fa-arrows-alt-h"></i></div>
          <div className="ba-handle-line"></div>
        </div>
      </div>
      <p className="ba-caption">{caption}</p>
    </div>
  )
}

export default function BeforeAfter() {
  const sliders = [
    {
      beforeSrc: '/photos/before-after/before-pathway-tidy-pukehangi-rotorua.jpg',
      afterSrc: '/photos/before-after/after-pathway-tidy-pukehangi-rotorua.jpg',
      beforeAlt: 'Overgrown side pathway before tidy-up in Pukehangi, Rotorua',
      afterAlt: 'Clean side pathway after tidy-up in Pukehangi, Rotorua',
      caption: 'Side pathway — overgrown ferns and weeds cleared, pavers cleaned up and garden bed tidied.',
    },
    {
      beforeSrc: '/photos/before-after/before-lawn-mow-hillcrest-rotorua.jpg',
      afterSrc: '/photos/before-after/after-lawn-mow-hillcrest-rotorua.jpg',
      beforeAlt: 'Backyard lawn before mowing in Hillcrest, Rotorua',
      afterAlt: 'Backyard lawn after mowing in Hillcrest, Rotorua',
      beforeOffset: { y: '20px' },
      afterOffset: { y: '-10px' },
      caption: 'Backyard mow — gave this lawn a good tidy up, cleared the debris and got the edges looking sharp.',
    },
    {
      beforeSrc: '/photos/before-after/before-garden-bed-tidy-pukehangi-rotorua.jpg',
      afterSrc: '/photos/before-after/after-garden-bed-tidy-pukehangi-rotorua.jpg',
      beforeAlt: 'Overgrown garden bed before tidy-up in Pukehangi, Rotorua',
      afterAlt: 'Tidy garden bed after tidy-up in Pukehangi, Rotorua',
      caption: 'Garden bed — overgrown retaining wall area cleared, trimmed back and mulched.',
    },
    {
      beforeSrc: '/photos/before-after/before-hedge-trim-lynmore-rotorua.jpg',
      afterSrc: '/photos/before-after/after-hedge-trim-lynmore-rotorua.jpg',
      beforeAlt: 'Overgrown hedge before trimming in Lynmore, Rotorua',
      afterAlt: 'Neatly trimmed hedge after shaping in Lynmore, Rotorua',
      caption: 'Hedge trim — overgrown front hedge shaped and tidied, clippings cleared.',
    },
    {
      beforeSrc: '/photos/before-after/before-backyard-mow-rotorua.jpg',
      afterSrc: '/photos/before-after/after-backyard-mow-rotorua.jpg',
      beforeAlt: 'Backyard lawn before mowing in Rotorua',
      afterAlt: 'Freshly mowed backyard lawn with stripes in Rotorua',
      caption: 'Backyard mow — long grass cut back with clean mow lines throughout.',
    },
    {
      beforeSrc: '/photos/before-after/before-hedge-trim-glenholme-rotorua.jpg',
      afterSrc: '/photos/before-after/after-hedge-trim-glenholme-rotorua.jpg',
      beforeAlt: 'Overgrown hedge before trimming in Glenholme, Rotorua',
      afterAlt: 'Neatly trimmed hedge along pathway in Glenholme, Rotorua',
      caption: 'Hedge trim — overgrown hedge cut back off the pathway and shaped up.',
    },
  ]

  return (
    <section className="before-after" id="results">
      <div className="container">
        <div className="section-header animate-in">
          <div className="section-tag">Results</div>
          <h2 className="section-title">Before &amp; after</h2>
        </div>
        <div className="ba-grid">
          {sliders.map((s, i) => (
            <Slider key={i} {...s} />
          ))}
        </div>
        <div className="ba-cta animate-in">
          <p>Want your property looking this good?</p>
          <a href="#contact" className="btn btn-primary">Get a Free Quote</a>
        </div>
      </div>
    </section>
  )
}
