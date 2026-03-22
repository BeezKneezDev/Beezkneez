import { useState, useEffect, useRef, useCallback } from 'react'

function renderStars(rating) {
  let stars = ''
  for (let i = 0; i < 5; i++) {
    stars += i < Math.round(rating) ? '\u2605' : '\u2606'
  }
  return stars
}

function timeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const days = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return days + ' days ago'
  if (days < 14) return 'a week ago'
  if (days < 30) return Math.floor(days / 7) + ' weeks ago'
  if (days < 60) return 'a month ago'
  if (days < 365) return Math.floor(days / 30) + ' months ago'
  return 'over a year ago'
}

export default function Reviews() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [current, setCurrent] = useState(0)
  const sectionRef = useRef(null)
  const fetched = useRef(false)
  const autoplayRef = useRef(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !fetched.current) {
          fetched.current = true
          observer.disconnect()
          fetchReviews()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  const totalReviews = data?.reviews?.length || 0

  const goTo = useCallback((index) => {
    setCurrent((index + totalReviews) % totalReviews)
  }, [totalReviews])

  // Autoplay
  useEffect(() => {
    if (totalReviews <= 1) return
    autoplayRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % totalReviews)
    }, 6000)
    return () => clearInterval(autoplayRef.current)
  }, [totalReviews])

  const resetAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current)
    if (totalReviews <= 1) return
    autoplayRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % totalReviews)
    }, 6000)
  }, [totalReviews])

  const prev = () => { goTo(current - 1); resetAutoplay() }
  const next = () => { goTo(current + 1); resetAutoplay() }

  async function fetchReviews() {
    try {
      const res = await fetch('/reviews.json')
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setData(json)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="reviews" id="reviews" ref={sectionRef}>
      <div className="container">
        <div className="section-header animate-in">
          <div className="section-tag">Reviews</div>
          <h2 className="section-title">What my customers say</h2>
        </div>

        {data?.rating && (
          <p className="reviews-summary">
            <span className="stars">{renderStars(data.rating)}</span>{' '}
            {data.rating} out of 5
            {data.totalRatings ? ` \u00B7 ${data.totalRatings} review${data.totalRatings !== 1 ? 's' : ''}` : ''}
          </p>
        )}

        {loading && (
          <div className="reviews-loading">
            <div className="spinner"></div>
            <p style={{ marginTop: '0.75rem' }}>Loading reviews...</p>
          </div>
        )}

        {error && (
          <div className="reviews-fallback" style={{ display: 'block' }}>
            <p>Couldn't load reviews right now — check us out on Google instead.</p>
            <a href="https://search.google.com/local/reviews?placeid=ChIJ4cscNwKBnGsRHmXGR4PrJso" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">See Reviews on Google</a>
          </div>
        )}

        {data?.reviews && data.reviews.length > 0 && (
          <div className="reviews-slider">
            {totalReviews > 1 && (
              <button className="reviews-arrow reviews-arrow-left" onClick={prev} aria-label="Previous review">
                <i className="fas fa-chevron-left"></i>
              </button>
            )}
            <div className="reviews-track">
              {data.reviews.map((review, i) => (
                <div
                  className={`review-card${i === current ? ' review-card-active' : ''}`}
                  key={i}
                  style={{ display: i === current ? 'block' : 'none' }}
                >
                  <div className="review-stars">{renderStars(review.rating)}</div>
                  {review.text && <p className="review-text">{review.text}</p>}
                  <div className="review-header">
                    {review.avatar ? (
                      <img className="review-avatar" src={review.avatar} alt={review.author} referrerPolicy="no-referrer" />
                    ) : (
                      <div className="review-avatar-placeholder">{review.author.charAt(0).toUpperCase()}</div>
                    )}
                    <div className="review-meta">
                      <span className="review-author">{review.author}</span>
                      <span className="review-date">{timeAgo(review.date)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalReviews > 1 && (
              <button className="reviews-arrow reviews-arrow-right" onClick={next} aria-label="Next review">
                <i className="fas fa-chevron-right"></i>
              </button>
            )}
            {totalReviews > 1 && (
              <div className="reviews-dots">
                {data.reviews.map((_, i) => (
                  <button
                    key={i}
                    className={`reviews-dot${i === current ? ' reviews-dot-active' : ''}`}
                    onClick={() => { goTo(i); resetAutoplay() }}
                    aria-label={`Go to review ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="reviews-cta">
          <a href="https://search.google.com/local/writereview?placeid=ChIJ4cscNwKBnGsRHmXGR4PrJso" target="_blank" rel="noopener noreferrer" className="btn btn-primary">Leave a Review</a>
        </div>
      </div>
    </section>
  )
}
