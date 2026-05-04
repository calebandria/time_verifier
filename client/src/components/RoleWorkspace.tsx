import { useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, FileSpreadsheet, LogOut, Upload } from 'lucide-react'
import './RoleWorkspace.css'

type WorkspaceRole = 'RH' | 'Manager'

type RoleWorkspaceProps = {
  role: WorkspaceRole
  email: string
  team?: string
  onLogout: () => void
}

type WorkspaceCopy = {
  badge: string
  title: string
  subtitle: string
  description: string
  primaryAction: string
  focusItems: string[]
  nextSteps: string[]
}

type VerificationStatus = 'early' | 'on-time' | 'late' | 'absent' | 'no-plan' | 'leave'

type VerificationResult = {
  employeeId: string
  employeeName?: string
  teamName?: string
  plannedTime: string | null
  actualTime: string | null
  status: VerificationStatus
  planningCode?: string
  minutesDifference: number | null
}

type CompareSummary = {
  total: number
  onTime: number
  late: number
  early: number
  absent: number
  leave: number
  noPlan: number
}

type CalendarRow = {
  employeeId: string
  employeeName: string
  teamName: string
  cells: Map<string, VerificationResult>
}

const workspaceCopy: Record<WorkspaceRole, WorkspaceCopy> = {
  RH: {
    badge: 'Espace RH',
    title: 'Comparer pointage vs planning',
    subtitle:
      'Chargez le CSV Hikvision et un ou plusieurs plannings XLSX pour obtenir une vue calendrier employé/jour avec les écarts de présence.',
    description:
      'La RH peut visualiser les retards, avances, absences, congés RM/JL/OFF et journées sans planning dans un calendrier unique.',
    primaryAction: 'Lancer la comparaison',
    focusItems: ['Identifiant unique aligné', 'Dates cohérentes', 'Source entrée/sortie correcte'],
    nextSteps: [
      'Déposer le fichier CSV généré par Hikvision',
      'Ajouter les fichiers planning XLSX des managers',
      'Analyser le calendrier coloré par employé et par jour',
    ],
  },
  Manager: {
    badge: 'Espace Manager',
    title: 'Contrôler la conformité de votre équipe',
    subtitle:
      'Chargez votre planning XLSX (multi-feuilles possibles) et le CSV Hikvision pour voir le respect du planning jour par jour.',
    description:
      'Le filtrage par équipe manager est appliqué automatiquement si votre compte est rattaché à une équipe.',
    primaryAction: 'Vérifier mon équipe',
    focusItems: ['Feuilles par équipe', 'Codes RM/JL/OFF', 'Créneaux d\'entrée valides'],
    nextSteps: [
      'Ajouter le planning manager en XLSX',
      'Ajouter le CSV de pointage Hikvision',
      'Examiner les journées non conformes en rouge',
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

function toDateKey(dateValue: string | null): string | null {
  if (!dateValue) {
    return null
  }

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatCalendarDay(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`)
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function formatTime(dateValue: string | null): string {
  if (!dateValue) {
    return '--:--'
  }

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return '--:--'
  }

  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function statusLabel(status: VerificationStatus): string {
  switch (status) {
    case 'on-time':
      return 'OK'
    case 'late':
      return 'Retard'
    case 'early':
      return 'Avance'
    case 'absent':
      return 'Absence'
    case 'leave':
      return 'Congé'
    case 'no-plan':
      return 'Hors plan'
    default:
      return status
  }
}

function statusClassName(status: VerificationStatus): string {
  return `calendar-cell calendar-cell--${status}`
}

function RoleWorkspace({ role, email, team, onLogout }: RoleWorkspaceProps) {
  const [observedFile, setObservedFile] = useState<File | null>(null)
  const [plannedFiles, setPlannedFiles] = useState<File[]>([])
  const [toleranceMinutes, setToleranceMinutes] = useState<number>(5)
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<VerificationResult[]>([])
  const [summary, setSummary] = useState<CompareSummary | null>(null)

  const copy = workspaceCopy[role]

  const observedSummary = useMemo(() => {
    if (!observedFile) {
      return 'Aucun CSV observé sélectionné'
    }

    return `${observedFile.name} • ${formatFileSize(observedFile.size)}`
  }, [observedFile])

  const planningSummary = useMemo(() => {
    if (plannedFiles.length === 0) {
      return 'Aucun planning XLSX sélectionné'
    }

    const totalSize = plannedFiles.reduce((sum, file) => sum + file.size, 0)
    return `${plannedFiles.length} fichier(s) • ${formatFileSize(totalSize)}`
  }, [plannedFiles])

  const calendarData = useMemo(() => {
    if (results.length === 0) {
      return { dates: [] as string[], rows: [] as CalendarRow[] }
    }

    const datesSet = new Set<string>()
    const rowMap = new Map<string, CalendarRow>()

    for (const result of results) {
      const dateKey = toDateKey(result.plannedTime ?? result.actualTime)
      if (!dateKey) {
        continue
      }

      datesSet.add(dateKey)

      const rowKey = `${result.employeeId}::${result.teamName ?? ''}`
      if (!rowMap.has(rowKey)) {
        rowMap.set(rowKey, {
          employeeId: result.employeeId,
          employeeName: result.employeeName ?? result.employeeId,
          teamName: result.teamName ?? '-',
          cells: new Map<string, VerificationResult>(),
        })
      }

      const row = rowMap.get(rowKey)
      if (!row) {
        continue
      }

      const existing = row.cells.get(dateKey)
      if (!existing) {
        row.cells.set(dateKey, result)
        continue
      }

      const priority: Record<VerificationStatus, number> = {
        absent: 6,
        late: 5,
        early: 4,
        'on-time': 3,
        leave: 2,
        'no-plan': 1,
      }

      if (priority[result.status] > priority[existing.status]) {
        row.cells.set(dateKey, result)
      }
    }

    const dates = Array.from(datesSet).sort((a, b) => a.localeCompare(b))
    const rows = Array.from(rowMap.values()).sort((a, b) => {
      const byTeam = a.teamName.localeCompare(b.teamName)
      if (byTeam !== 0) {
        return byTeam
      }

      const byName = a.employeeName.localeCompare(b.employeeName)
      if (byName !== 0) {
        return byName
      }

      return a.employeeId.localeCompare(b.employeeId)
    })

    return { dates, rows }
  }, [results])

  function handleObservedChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null
    setObservedFile(file)
    setStatusMessage(file ? `CSV sélectionné: ${file.name}` : '')
  }

  function handlePlanningChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.target.files ?? [])
    setPlannedFiles(files)
    setStatusMessage(files.length > 0 ? `${files.length} planning(s) sélectionné(s)` : '')
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (!observedFile) {
      setStatusMessage('Veuillez sélectionner le CSV observé avant de continuer.')
      return
    }

    if (plannedFiles.length === 0) {
      setStatusMessage('Veuillez sélectionner au moins un planning XLSX.')
      return
    }

    void compareFiles()
  }

  async function compareFiles(): Promise<void> {
    if (!observedFile || plannedFiles.length === 0) {
      return
    }

    setIsLoading(true)
    setStatusMessage('Comparaison en cours des fichiers...')
    setResults([])
    setSummary(null)

    try {
      const formData = new FormData()
      formData.append('observed', observedFile)
      for (const file of plannedFiles) {
        formData.append('planned', file)
      }

      if (team) {
        formData.append('managerTeam', team)
      }
      formData.append('toleranceMinutes', String(toleranceMinutes))

      const response = await fetch('/api/v1/verify/compare', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error?.message ?? 'Erreur lors de la comparaison')
      }

      setResults(result.results ?? [])
      setSummary(result.summary ?? null)
      setStatusMessage('Comparaison terminée. Calendrier mis à jour.')
    } catch (error) {
      setStatusMessage(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setIsLoading(false)
    }
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
            {team && role === 'Manager' && (
              <>
                <span className="workspace-user-label">Équipe</span>
                <strong>{team}</strong>
              </>
            )}
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
              <p className="workspace-file-label">Comparaison complète</p>
              <h2>CSV observé + XLSX planning</h2>
            </div>
          </div>

          <p className="workspace-description">{copy.description}</p>

          <form className="workspace-upload-form" onSubmit={handleSubmit}>
            <label className="workspace-dropzone" htmlFor={`${role.toLowerCase()}-observed-upload`}>
              <FileSpreadsheet size={30} />
              <span>CSV observé (Hikvision)</span>
              <small>Format attendu: .csv</small>
            </label>

            <input
              id={`${role.toLowerCase()}-observed-upload`}
              type="file"
              accept=".csv,text/csv"
              onChange={handleObservedChange}
            />

            <div className="workspace-file-summary">
              <span>{observedSummary}</span>
              <small>Ce fichier contient les check-ins terrain.</small>
            </div>

            <label className="workspace-dropzone" htmlFor={`${role.toLowerCase()}-planning-upload`}>
              <CalendarDays size={30} />
              <span>Planning(s) manager</span>
              <small>Formats attendus: .xlsx (plusieurs fichiers acceptés)</small>
            </label>

            <input
              id={`${role.toLowerCase()}-planning-upload`}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              multiple
              onChange={handlePlanningChange}
            />

            <div className="workspace-file-summary">
              <span>{planningSummary}</span>
              <small>Chaque feuille XLSX peut représenter une team différente.</small>
            </div>

            <label className="workspace-tolerance-label" htmlFor={`${role.toLowerCase()}-tolerance`}>
              Tolérance retard/avance (minutes)
            </label>
            <input
              id={`${role.toLowerCase()}-tolerance`}
              className="workspace-tolerance-input"
              type="number"
              min={0}
              max={120}
              value={toleranceMinutes}
              onChange={(event) => setToleranceMinutes(Number(event.target.value || 0))}
            />

            {summary && (
              <div className="workspace-summary-grid">
                <span>Total: {summary.total}</span>
                <span>OK: {summary.onTime}</span>
                <span>Retards: {summary.late}</span>
                <span>Avances: {summary.early}</span>
                <span>Absences: {summary.absent}</span>
                <span>Congés: {summary.leave}</span>
              </div>
            )}

            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Traitement en cours...' : copy.primaryAction}
              {!isLoading && <ArrowRight size={16} />}
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

      {calendarData.rows.length > 0 && (
        <section className="workspace-card workspace-calendar-card">
          <div className="workspace-calendar-header">
            <h2>Calendrier de conformité par employé</h2>
            <div className="workspace-legend">
              <span className="legend legend--on-time">OK</span>
              <span className="legend legend--late">Retard</span>
              <span className="legend legend--early">Avance</span>
              <span className="legend legend--absent">Absence</span>
              <span className="legend legend--leave">Congé</span>
              <span className="legend legend--no-plan">Hors plan</span>
            </div>
          </div>

          <div className="workspace-calendar-scroll">
            <table className="workspace-calendar-table">
              <thead>
                <tr>
                  <th>Employé</th>
                  {calendarData.dates.map((date) => (
                    <th key={date}>{formatCalendarDay(date)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calendarData.rows.map((row) => (
                  <tr key={`${row.employeeId}-${row.teamName}`}>
                    <td className="employee-cell">
                      <strong>{row.employeeName}</strong>
                      <small>#{row.employeeId} • {row.teamName}</small>
                    </td>
                    {calendarData.dates.map((date) => {
                      const cell = row.cells.get(date)
                      if (!cell) {
                        return <td key={`${row.employeeId}-${date}`} className="calendar-cell calendar-cell--empty">-</td>
                      }

                      return (
                        <td key={`${row.employeeId}-${date}`} className={statusClassName(cell.status)}>
                          <strong>{statusLabel(cell.status)}</strong>
                          {cell.planningCode && <small>Plan: {cell.planningCode}</small>}
                          <small>{formatTime(cell.plannedTime)} / {formatTime(cell.actualTime)}</small>
                          {typeof cell.minutesDifference === 'number' && (
                            <small>{cell.minutesDifference > 0 ? '+' : ''}{cell.minutesDifference} min</small>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  )
}

export default RoleWorkspace
