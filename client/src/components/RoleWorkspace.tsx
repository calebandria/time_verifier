import { useMemo, useState } from 'react'
import { ArrowRight, FileSpreadsheet, LogOut, Upload } from 'lucide-react'
import './RoleWorkspace.css'

type WorkspaceRole = 'RH' | 'Manager'

type RoleWorkspaceProps = {
  role: WorkspaceRole
  email: string
  onLogout: () => void
}

type WorkspaceCopy = {
  badge: string
  title: string
  subtitle: string
  fileLabel: string
  accept: string
  fileHint: string
  description: string
  primaryAction: string
  focusItems: string[]
  nextSteps: string[]
}

const workspaceCopy: Record<WorkspaceRole, WorkspaceCopy> = {
  RH: {
    badge: 'Espace RH',
    title: 'Importer le CSV observé',
    subtitle:
      'Le premier écran RH est centré sur le dépôt du CSV généré par les portails Hikvision. Il sert de base à la comparaison entre planning théorique et réalité observée.',
    fileLabel: 'Fichier CSV',
    accept: '.csv,text/csv',
    fileHint: 'Format attendu: CSV exporté depuis Hikvision Portals',
    description:
      'La RH maîtrise l\'import des constats observés avant transmission au manager pour rapprochement.',
    primaryAction: 'Préparer l\'analyse',
    focusItems: ['Période complète', 'Colonnes lisibles', 'Horodatage cohérent'],
    nextSteps: [
      'Déposer le fichier CSV généré par Hikvision',
      'Contrôler les colonnes et le format date/heure',
      'Envoyer les données vers la phase de rapprochement',
    ],
  },
  Manager: {
    badge: 'Espace Manager',
    title: 'Importer le planning XLSX',
    subtitle:
      'Le premier écran manager commence par l\'upload du planning Excel. Ce fichier représente le planning attendu pour comparer ensuite avec le terrain.',
    fileLabel: 'Fichier XLSX',
    accept: '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileHint: 'Format attendu: fichier Excel du planning des équipes',
    description:
      'Le manager pose le planning de référence pour suivre les écarts entre prévu et observé.',
    primaryAction: 'Charger le planning',
    focusItems: ['Feuille unique ou multiple', 'Créneaux propres', 'Noms d\'équipes alignés'],
    nextSteps: [
      'Choisir le fichier Excel du planning',
      'Vérifier la structure des feuilles',
      'Préparer la comparaison avec les CSV RH',
    ],
  },
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const kilobytes = bytes / 1024
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`
}

function RoleWorkspace({ role, email, onLogout }: RoleWorkspaceProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [statusMessage, setStatusMessage] = useState('')

  const copy = workspaceCopy[role]

  const fileSummary = useMemo(() => {
    if (!selectedFile) {
      return 'Aucun fichier sélectionné'
    }

    return `${selectedFile.name} • ${formatFileSize(selectedFile.size)}`
  }, [selectedFile])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    setStatusMessage(file ? `Fichier prêt: ${file.name}` : '')
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (!selectedFile) {
      setStatusMessage('Veuillez sélectionner un fichier avant de continuer.')
      return
    }

    setStatusMessage(
      `Fichier ${selectedFile.name} prêt pour l'étape de vérification. Le traitement backend sera branché ensuite.`,
    )
  }

  return (
    <section className={`workspace-page workspace-page--${role.toLowerCase()}`}>
      <header className="workspace-header">
        <div>
          <p className="workspace-badge">{copy.badge}</p>
          <h1>{copy.title}</h1>
          <p className="workspace-subtitle">{copy.subtitle}</p>
        </div>

        <div className="workspace-userbar">
          <div>
            <span className="workspace-user-label">Connecté en tant que</span>
            <strong>{email}</strong>
          </div>
          <button type="button" onClick={onLogout}>
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </header>

      <div className="workspace-grid">
        <section className="workspace-card workspace-upload-card">
          <div className="workspace-upload-top">
            <div className="workspace-icon">
              <Upload size={22} />
            </div>
            <div>
              <p className="workspace-file-label">{copy.fileLabel}</p>
              <h2>{copy.fileHint}</h2>
            </div>
          </div>

          <p className="workspace-description">{copy.description}</p>

          <form className="workspace-upload-form" onSubmit={handleSubmit}>
            <label className="workspace-dropzone" htmlFor={`${role.toLowerCase()}-upload`}>
              <FileSpreadsheet size={30} />
              <span>Glisser-déposer ou choisir un fichier</span>
              <small>{role === 'RH' ? 'CSV attendu' : 'XLSX attendu'}</small>
            </label>

            <input
              id={`${role.toLowerCase()}-upload`}
              type="file"
              accept={copy.accept}
              onChange={handleFileChange}
            />

            <div className="workspace-file-summary">
              <span>{fileSummary}</span>
              <small>Cette première vue prépare la vérification du planning des employés.</small>
            </div>

            <button type="submit">
              {copy.primaryAction}
              <ArrowRight size={16} />
            </button>
          </form>

          {statusMessage && <p className="workspace-status">{statusMessage}</p>}
        </section>

        <aside className="workspace-card workspace-side-card">
          <div>
            <p className="workspace-side-label">Ce que la vue vérifie</p>
            <ul className="workspace-focus-list">
              {copy.focusItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="workspace-side-label">Étapes suivantes</p>
            <ol className="workspace-next-list">
              {copy.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="workspace-note">
            <strong>Contexte métier</strong>
            <p>
              Outil de contrôle du planning des employés, avec la réalité observée issue des exports Hikvision sous la main de la RH.
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}

export default RoleWorkspace
