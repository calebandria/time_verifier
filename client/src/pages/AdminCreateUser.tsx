import { FormEvent, useState } from 'react'
import './AdminCreateUser.css'

function AdminCreateUser() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'RH' | 'Manager' | 'Admin'>('RH')
  const [team, setTeam] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const adminToken = localStorage.getItem('adminToken') ?? ''
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deleteMessage, setDeleteMessage] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')

    if (!email || !password) {
      setMessage('Veuillez renseigner email et mot de passe.')
      return
    }

    if (role === 'Manager' && !team.trim()) {
      setMessage("Veuillez renseigner l'équipe du manager.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/v1/auth/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({
          email,
          password,
          role,
          ...(role === 'Manager' ? { team: team.trim() } : {}),
        }),
      })

      const payload = await res.json()
      if (!res.ok) {
        setMessage(payload?.error?.message || 'Erreur lors de la création')
      } else {
        setMessage(`Utilisateur créé: ${payload.user.email} (${payload.user.role})`)
        setEmail('')
        setPassword('')
        setTeam('')
      }
    } catch (err) {
      setMessage('Erreur réseau: ' + String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setDeleteMessage('')

    if (!deleteEmail) {
      setDeleteMessage('Veuillez renseigner un email à supprimer.')
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch('/api/v1/auth/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({ email: deleteEmail }),
      })

      const payload = await res.json()
      if (!res.ok) {
        setDeleteMessage(payload?.error?.message || 'Erreur lors de la suppression')
      } else {
        setDeleteMessage(`Utilisateur supprimé: ${payload.email}`)
        setDeleteEmail('')
      }
    } catch (err) {
      setDeleteMessage('Erreur réseau: ' + String(err))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="admin-page">
      <div className="admin-card">
        <h1>Admin — Créer un utilisateur</h1>
        <p className="admin-note">Entrez un token admin JWT dans le champ ci-dessous, ou configurez `ADMIN_KEY` et utilisez l'ancienne méthode côté serveur.</p>

        <form className="admin-form" onSubmit={handleSubmit}>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />

          <label>Mot de passe</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />

          <label>Rôle</label>
          <select value={role} onChange={(e) => setRole(e.target.value as 'RH' | 'Manager' | 'Admin')}>
            <option value="RH">RH</option>
            <option value="Manager">Manager</option>
            <option value="Admin">Admin</option>
          </select>

          {role === 'Manager' && (
            <>
              <label>Équipe</label>
              <input
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="Ex: SEEDEXT"
                type="text"
              />
            </>
          )}

          <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Création...' : 'Créer utilisateur'}</button>
        </form>

        {message && <p className="admin-message">{message}</p>}

        <form className="admin-form admin-delete" onSubmit={handleDelete}>
          <h2>Supprimer un utilisateur</h2>
          <label>Email à supprimer</label>
          <input value={deleteEmail} onChange={(e) => setDeleteEmail(e.target.value)} type="email" />
          <button type="submit" disabled={isDeleting}>{isDeleting ? 'Suppression...' : 'Supprimer utilisateur'}</button>
        </form>

        {deleteMessage && <p className="admin-message">{deleteMessage}</p>}
      </div>
    </section>
  )
}

export default AdminCreateUser
