import { useState, useEffect, useRef } from 'react'

function renderStars(rating) {
  let stars = ''
  for (let i = 0; i < 5; i++) {
    stars += i < Math.round(rating) ? '\u2605' : '\u2606'
  }
  return stars
}

export default function Reviews() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const sectionRef = useRef(null)
  const fetched = useRef(false)

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
          <div className="reviews-container">
            {data.reviews.map((review, i) => (
              <div className="review-card animate-in visible" key={i}>
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
                    <span className="review-date">{review.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="reviews-cta">
          <a href="https://search.google.com/local/writereview?placeid=ChIJ4cscNwKBnGsRHmXGR4PrJso" target="_blank" rel="noopener noreferrer" className="btn btn-primary">Leave a Review</a>
        </div>
      </div>
    </section>
  )
}
