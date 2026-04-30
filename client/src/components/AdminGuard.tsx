import { ReactNode, useMemo, useState } from 'react'
import './AdminGuard.css'


type AdminGuardProps = {
  children: ReactNode
  onLogout: () => void
}

function AdminGuard({ children, onLogout }: AdminGuardProps) {
  const [storedToken, setStoredToken] = useState(() => localStorage.getItem('adminToken') ?? '')
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  function decodePayload(token: string): Record<string, unknown> | null {
    const parts = token.split('.')
    if (parts.length < 2) {
      return null
    }

    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
      const json = atob(padded)
      return JSON.parse(json) as Record<string, unknown>
    } catch {
      return null
    }
  }

  const isUnlocked = useMemo(() => {
    const token = storedToken.trim()
    if (!token) {
      return false
    }

    const payload = decodePayload(token)
    return payload?.role === 'Admin'
  }, [storedToken])

  async function handleCredentialLogin(): Promise<void> {
    setError('')
    if (!email || !password) {
      setError('Veuillez renseigner email et mot de passe.')
      return
    }

    setIsLoggingIn(true)
    try {
      const res = await fetch('/api/v1/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const payload = await res.json()
      if (!res.ok) {
        setError(payload?.error?.message || 'Connexion échouée')
        return
      }

      localStorage.setItem('adminToken', payload.token)
      setStoredToken(payload.token)
      setEmail('')
      setPassword('')
    } catch (err) {
      setError('Erreur réseau: ' + String(err))
    } finally {
      setIsLoggingIn(false)
    }
  }

  function handleLogout(): void {
    localStorage.removeItem('adminToken')
    setStoredToken('')
    setEmail('')
    setPassword('')
    setError('')
    onLogout()
  }

  if (!isUnlocked) {
    return (
      <section className="admin-guard">
        <div className="admin-guard-card">
          <h1>Admin Login</h1>
          <p>Enter your admin credentials to access the provisioning panel.</p>

          <label htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button type="button" onClick={handleCredentialLogin} disabled={isLoggingIn}>
            {isLoggingIn ? 'Logging in...' : 'Log in'}
          </button>

          {error && <p className="admin-guard-error">{error}</p>}
        </div>
      </section>
    )
  }

  return (
    <section className="admin-guard">
      <div className="admin-guard-actions">
        <span>Admin panel unlocked</span>
        <button type="button" onClick={handleLogout}>
          Déconnexion
        </button>
      </div>
      {children}
    </section>
  )
}

export default AdminGuard
