import { useEffect, useState } from 'react'
import AdminCreateUser from './pages/AdminCreateUser'
import AdminGuard from './components/AdminGuard'
import LoginPage from './pages/LoginPage'
import RoleWorkspace from './components/RoleWorkspace'
import './App.css'

type AppRole = 'RH' | 'Manager' | 'Admin'

type AppSession = {
  id: string
  email: string
  role: AppRole
}

const SESSION_STORAGE_KEY = 'time-verifier-session'

function readStoredSession(): AppSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) {
      return null
    }

    return JSON.parse(raw) as AppSession
  } catch {
    return null
  }
}

function App() {
  const [session, setSession] = useState<AppSession | null>(readStoredSession)

  useEffect(() => {
    if (session) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
      return
    }

    sessionStorage.removeItem(SESSION_STORAGE_KEY)
  }, [session])

  function handleLoginSuccess(nextSession: AppSession): void {
    if (nextSession.role !== 'Admin') {
      localStorage.removeItem('adminToken')
    }

    setSession(nextSession)
  }

  function handleLogout(): void {
    localStorage.removeItem('adminToken')
    setSession(null)
  }

  if (!session) {
    return (
      <main className="app-root app-auth-root">
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </main>
    )
  }

  return (
    <main className="app-root app-workspace-root">
      {session.role === 'RH' && <RoleWorkspace role="RH" email={session.email} onLogout={handleLogout} />}

      {session.role === 'Manager' && (
        <RoleWorkspace role="Manager" email={session.email} onLogout={handleLogout} />
      )}

      {session.role === 'Admin' && (
        <AdminGuard onLogout={handleLogout}>
          <AdminCreateUser />
        </AdminGuard>
      )}
    </main>
  )
}

export default App
