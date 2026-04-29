import { useState } from 'react'
import LoginPage from './pages/LoginPage';
import AdminCreateUser from './pages/AdminCreateUser';
import AdminGuard from './components/AdminGuard'
import './App.css';

function App() {
  const [view, setView] = useState<'login' | 'admin'>('login')

  return (
    <main className="app-root">
      <div className="app-nav">
        <button onClick={() => setView('login')} className={view === 'login' ? 'active' : ''}>Login</button>
        <button onClick={() => setView('admin')} className={view === 'admin' ? 'active' : ''}>Admin</button>
      </div>
      {view === 'login' ? <LoginPage /> : (
        <AdminGuard>
          <AdminCreateUser />
        </AdminGuard>
      )}
    </main>
  )
}

export default App;
