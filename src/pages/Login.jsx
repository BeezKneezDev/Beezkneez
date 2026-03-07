import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    if (password === import.meta.env.VITE_DASH_PASSWORD) {
      localStorage.setItem('bk_auth', 'true')
      navigate('/dashboard')
    } else {
      setError('Wrong password')
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.topbar}>
        <span style={styles.brand}>Beezkneez Lawns & Property Care</span>
      </div>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.heading}>Dashboard Login</h1>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError('') }}
          style={styles.input}
          autoFocus
        />
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" style={styles.button}>Log In</button>
      </form>
    </div>
  )
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    background: '#f5f7f5',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  topbar: {
    background: 'linear-gradient(135deg, #3a7d34 0%, #2d5f28 100%)',
    height: 52,
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
  },
  brand: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 700,
    letterSpacing: '0.3px',
  },
  card: {
    maxWidth: 360,
    margin: '120px auto 0',
    background: '#fff',
    borderRadius: 12,
    padding: '40px 32px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  heading: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#1a1a1a',
    margin: 0,
    textAlign: 'center',
  },
  input: {
    padding: '12px 14px',
    fontSize: '1rem',
    border: '1px solid #d0d0d0',
    borderRadius: 8,
    outline: 'none',
    fontFamily: 'inherit',
  },
  error: {
    color: '#d32f2f',
    fontSize: '0.9rem',
    margin: 0,
    textAlign: 'center',
  },
  button: {
    padding: '12px',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #3a7d34 0%, #2d5f28 100%)',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
}
