import { FormEvent, useState } from 'react'
import './LoginPage.css'

type LoginUser = {
  id: string
  email: string
  role: 'RH' | 'Manager' | 'Admin'
}

type LoginPageProps = {
  onLoginSuccess: (user: LoginUser) => void
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!email || !password) {
      setMessage('Please enter both email and password.')
      return
    }

    setIsSubmitting(true)
    setMessage('')

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'La connexion a échoué.')
      }

      if (payload.user.role === 'Admin') {
        const adminResponse = await fetch('/api/v1/auth/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        })

        const adminPayload = await adminResponse.json()
        if (!adminResponse.ok) {
          throw new Error(adminPayload?.error?.message ?? 'Connexion admin impossible.')
        }

        localStorage.setItem('adminToken', adminPayload.token)
      }

      onLoginSuccess(payload.user)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Une erreur est survenue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="login-page">
      <div className="login-card">
        <p className="login-kicker">Time Verifier</p>
        <h1>Bienvenue</h1>
        <p className="login-subtitle">
          Accédez à l'espace RH, au planning manager ou au panneau administrateur avec le même identifiant.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            placeholder="Entrez votre mot de passe"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="login-footer">
          <a href="#">Mot de passe oublié?</a>
          <span>Flux de vérification planning vs. réalité observée.</span>
        </div>

        {message && <p className="login-message">{message}</p>}
      </div>
    </section>
  )
}

export default LoginPage
