import { useRef, useCallback } from 'react'

function Slider({ beforeSrc, afterSrc, beforeAlt, afterAlt, caption }) {
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
        <img className="ba-after" src={afterSrc} alt={afterAlt} loading="lazy" />
        <img className="ba-before" src={beforeSrc} alt={beforeAlt} loading="lazy" ref={beforeRef} />
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
      beforeSrc: '/photos/before-after/pathway-before.jpg',
      afterSrc: '/photos/before-after/pathway-after.jpg',
      beforeAlt: 'Overgrown side pathway before tidy-up',
      afterAlt: 'Clean side pathway after tidy-up',
      caption: 'Side pathway — overgrown ferns and weeds cleared, pavers cleaned up and garden bed tidied.',
    },
    {
      beforeSrc: '/photos/before-after/garden-bed-before.jpg',
      afterSrc: '/photos/before-after/garden-bed-after.jpg',
      beforeAlt: 'Overgrown garden bed before tidy-up',
      afterAlt: 'Tidy garden bed after tidy-up',
      caption: 'Garden bed — overgrown retaining wall area cleared, trimmed back and mulched.',
    },
    {
      beforeSrc: '/photos/before-after/hedge-before.jpg',
      afterSrc: '/photos/before-after/hedge-after.jpg',
      beforeAlt: 'Overgrown hedge before trimming',
      afterAlt: 'Neatly trimmed hedge after shaping',
      caption: 'Hedge trim — overgrown front hedge shaped and tidied, clippings cleared.',
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
      </div>
    </section>
  )
}
