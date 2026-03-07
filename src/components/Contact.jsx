import { useState, useEffect, useRef, useCallback } from 'react'

export default function Contact() {
  const [selectOpen, setSelectOpen] = useState(false)
  const [selectedService, setSelectedService] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const emailMethodRef = useRef(null)
  const emailLabelRef = useRef(null)
  const formRef = useRef(null)
  const addressRef = useRef(null)
  const selectRef = useRef(null)
  const suggestionsRef = useRef(null)
  const debounceRef = useRef(null)

  // Email obfuscation
  useEffect(() => {
    const u = 'byron'
    const d = 'beezkneez.nz'
    if (emailMethodRef.current) {
      emailMethodRef.current.href = 'mai' + 'lto:' + u + '@' + d + '?subject=Quote%20enquiry%20from%20beezkneez.nz'
    }
    if (emailLabelRef.current) {
      emailLabelRef.current.textContent = u + '@' + d
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (selectRef.current && !selectRef.current.contains(e.target)) {
        setSelectOpen(false)
      }
      if (addressRef.current && !addressRef.current.contains(e.target) &&
          suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Toast auto-hide
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const serviceOptions = [
    { value: 'Lawn Mowing', icon: 'fa-leaf' },
    { value: 'Garden Tidy-Up', icon: 'fa-seedling' },
    { value: 'Hedge Trimming', icon: 'fa-cut' },
    { value: 'Gutter Cleaning', icon: 'fa-home' },
    { value: 'General Maintenance', icon: 'fa-wrench' },
    { value: 'Other', icon: 'fa-ellipsis-h' },
  ]

  const fetchSuggestions = useCallback(async (query) => {
    const bbox = '176.15,-38.22,176.35,-38.08'
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Rotorua')}&format=json&addressdetails=1&limit=5&viewbox=${bbox}&bounded=1&countrycodes=nz`
    try {
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      const data = await res.json()
      if (data.length === 0) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }
      setSuggestions(data.map((item) => item.display_name))
      setShowSuggestions(true)
    } catch {
      setShowSuggestions(false)
    }
  }, [])

  function handleAddressInput(e) {
    const query = e.target.value.trim()
    clearTimeout(debounceRef.current)
    if (query.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 400)
  }

  function selectSuggestion(address) {
    addressRef.current.value = address
    setShowSuggestions(false)
    setSuggestions([])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: new FormData(formRef.current),
      })
      const data = await res.json()
      if (data.success) {
        setToast("Message sent! I'll get back to you soon.")
        formRef.current.reset()
        setSelectedService('')
      } else {
        setToast('Something went wrong. Please try again.')
      }
    } catch {
      setToast('Something went wrong. Please try again.')
    }
    setSubmitting(false)
  }

  return (
    <section className="contact" id="contact">
      <div className="container">
        <div className="contact-wrapper">
          <div className="contact-info animate-in">
            <h2>Let's chat</h2>
            <p>Get in touch for a free, no-obligation quote. I'll get back to you as soon as I can.</p>

            <div className="contact-methods">
              <a className="contact-method" href="tel:+64221924346">
                <div className="contact-method-icon"><i className="fas fa-phone"></i></div>
                <div>
                  <strong>022 192 4346</strong>
                  <span>Give me a call or text</span>
                </div>
              </a>
              <a className="contact-method" href="https://wa.me/64221924346" target="_blank" rel="noopener noreferrer">
                <div className="contact-method-icon"><i className="fab fa-whatsapp"></i></div>
                <div>
                  <strong>WhatsApp</strong>
                  <span>Message me anytime</span>
                </div>
              </a>
              <a className="contact-method" ref={emailMethodRef} href="#">
                <div className="contact-method-icon"><i className="fas fa-envelope"></i></div>
                <div>
                  <strong ref={emailLabelRef}></strong>
                  <span>Email anytime</span>
                </div>
              </a>
              <a className="contact-method" href="https://www.facebook.com/profile.php?id=61584978087247" target="_blank" rel="noopener noreferrer">
                <div className="contact-method-icon"><i className="fab fa-facebook-f"></i></div>
                <div>
                  <strong>Beezkneez on Facebook</strong>
                  <span>Follow for updates</span>
                </div>
              </a>
            </div>
          </div>

          <div className="contact-form-container animate-in">
            <h3>Send a message</h3>
            <p>Free quotes, no obligation</p>
            <form ref={formRef} onSubmit={handleSubmit}>
              <input type="hidden" name="access_key" value="52043fba-b3fc-41a1-a07e-6e0edf31b14d" />
              <input type="hidden" name="subject" value="New enquiry from beezkneez.nz" />
              <input type="checkbox" name="botcheck" style={{ display: 'none' }} />
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input type="text" id="name" name="name" placeholder="Your name" required />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input type="email" id="email" name="email" placeholder="Your email" required />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input type="tel" id="phone" name="phone" placeholder="021 xxx xxxx" />
              </div>
              <div className="form-group">
                <label>Service</label>
                <input type="hidden" name="service" value={selectedService} required />
                <div className={`custom-select${selectOpen ? ' open' : ''}`} ref={selectRef}>
                  <div
                    className={`custom-select-trigger${selectedService ? ' has-value' : ''}`}
                    onClick={() => setSelectOpen(!selectOpen)}
                  >
                    <span>{selectedService || 'What do you need help with?'}</span>
                    <i className="fas fa-chevron-down"></i>
                  </div>
                  <div className="custom-select-options">
                    {serviceOptions.map((opt) => (
                      <div
                        className={`custom-select-option${selectedService === opt.value ? ' selected' : ''}`}
                        key={opt.value}
                        onClick={() => {
                          setSelectedService(opt.value)
                          setSelectOpen(false)
                        }}
                      >
                        <i className={`fas ${opt.icon}`}></i> {opt.value}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="address">Address / Suburb</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  placeholder="Start typing your address..."
                  autoComplete="off"
                  ref={addressRef}
                  onChange={handleAddressInput}
                />
                <div
                  className={`address-suggestions${showSuggestions ? ' active' : ''}`}
                  ref={suggestionsRef}
                >
                  {suggestions.map((addr, i) => (
                    <div
                      className="address-suggestion"
                      key={i}
                      onClick={() => selectSuggestion(addr)}
                    >
                      <i className="fas fa-map-marker-alt"></i>{addr}
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea id="message" name="message" placeholder="Tell me a bit about what you need help with..." required></textarea>
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast show`}>{toast}</div>
      )}
    </section>
  )
}
