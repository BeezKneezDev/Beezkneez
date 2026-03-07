import { useState, useRef, useEffect, useCallback } from 'react'

export default function AddressAutocomplete({ value, onChange, ...rest }) {
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (
        inputRef.current && !inputRef.current.contains(e.target) &&
        suggestionsRef.current && !suggestionsRef.current.contains(e.target)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

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

  function handleInput(e) {
    const val = e.target.value
    onChange(val)
    clearTimeout(debounceRef.current)
    if (val.trim().length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(val.trim()), 400)
  }

  function selectSuggestion(address) {
    onChange(address)
    setShowSuggestions(false)
    setSuggestions([])
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInput}
        autoComplete="off"
        style={{ width: '100%' }}
        {...rest}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '0 0 8px 8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1000,
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((addr, i) => (
            <div
              key={i}
              onClick={() => selectSuggestion(addr)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                borderBottom: i < suggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
            >
              <i className="fa-solid fa-location-dot" style={{ marginRight: 8, color: '#888' }}></i>
              {addr}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
