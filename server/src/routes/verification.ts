import express from 'express'
import multer from 'multer'
import { parse } from 'csv-parse/sync'
import XLSX from 'xlsx'
import { Request, Response } from 'express'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

/**
 * Type for parsed CSV data (observed attendance from Hikvision)
 */
interface ObservedRecord {
  employeeId: string
  timestamp: Date
  name?: string
  sourceLabel?: string
}

/**
 * Type for parsed XLSX data (planned schedule from Manager)
 */
interface PlannedRecord {
  employeeId: string
  employeeName?: string
  scheduledTime: Date
  teamName: string
  expectedCheck: boolean
  planningCode: string
}

/**
 * Type for verification result
 */
interface VerificationResult {
  employeeId: string
  employeeName?: string
  teamName?: string
  plannedTime: Date | null
  actualTime: Date | null
  status: 'early' | 'on-time' | 'late' | 'absent' | 'no-plan' | 'leave'
  planningCode?: string
  minutesDifference: number | null
}

type ParsedPlanning = {
  records: PlannedRecord[]
  teams: string[]
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function valueFromCandidates(record: Record<string, unknown>, candidates: string[]): string {
  const normalizedCandidates = new Set(candidates.map((candidate) => normalizeHeader(candidate)))

  for (const [key, rawValue] of Object.entries(record)) {
    if (!normalizedCandidates.has(normalizeHeader(key))) {
      continue
    }

    if (rawValue == null) {
      return ''
    }

    return String(rawValue).trim()
  }

  return ''
}

function parseDateTime(input: string): Date | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T')
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseShiftStart(value: unknown): { hour: number; minute: number } | null {
  const text = String(value ?? '').trim()
  if (!text || /^off$/i.test(text) || /^repos?$/i.test(text)) {
    return null
  }

  const match = text.match(/(\d{1,2})\s*(?:h|:)?\s*(\d{0,2})/i)
  if (!match) {
    return null
  }

  const hour = Number(match[1])
  const minute = match[2] ? Number(match[2]) : 0

  if (Number.isNaN(hour) || Number.isNaN(minute) || hour > 23 || minute > 59) {
    return null
  }

  return { hour, minute }
}

function classifyPlanningCell(rawValue: unknown): {
  expectedCheck: boolean
  planningCode: string
  schedule: { hour: number; minute: number }
} {
  const text = String(rawValue ?? '').trim()
  const normalized = text.toLowerCase()

  if (!text) {
    return {
      expectedCheck: false,
      planningCode: 'EMPTY',
      schedule: { hour: 0, minute: 0 },
    }
  }

  if (/^(off|repos?)$/i.test(text)) {
    return {
      expectedCheck: false,
      planningCode: 'OFF',
      schedule: { hour: 0, minute: 0 },
    }
  }

  if (/^(rm|jl)$/i.test(text) || /\brm\b/.test(normalized) || /\bjl\b/.test(normalized)) {
    return {
      expectedCheck: false,
      planningCode: text.toUpperCase(),
      schedule: { hour: 0, minute: 0 },
    }
  }

  const parsedShift = parseShiftStart(text)
  if (parsedShift) {
    return {
      expectedCheck: true,
      planningCode: text,
      schedule: parsedShift,
    }
  }

  return {
    expectedCheck: true,
    planningCode: text,
    schedule: { hour: 8, minute: 0 },
  }
}

/**
 * Parse CSV file from Hikvision (observed attendance)
 * Expected columns: employeeId, timestamp, name
 */
function parseCSV(buffer: Buffer): ObservedRecord[] {
  const csvString = buffer.toString('utf-8')
  const rows = parse(csvString, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as Array<Record<string, unknown>>

  const results: ObservedRecord[] = []

  for (const row of rows) {
    const employeeId =
      valueFromCandidates(row, ['Identifiant de la personne', 'employeeId', 'id', 'matricule']) || ''
    const name = valueFromCandidates(row, ['Nom', 'name', 'employeeName']) || undefined
    const dateTimeRaw = valueFromCandidates(row, ['Heure', 'timestamp', 'time'])
    const sourceLabel = valueFromCandidates(row, [
      'Point de verification de presence',
      'Point de vérification de présence',
      'Source de donnees',
      'Source de données',
    ])

    const timestamp = parseDateTime(dateTimeRaw)
    if (!employeeId || !timestamp) {
      continue
    }

    results.push({ employeeId, timestamp, name, sourceLabel })
  }

  return results
}

/**
 * Parse XLSX file from Manager (planned schedule)
 * Expected columns: employeeId, scheduledTime, teamName, role
 */
function parseXLSX(buffer: Buffer, teamFilter?: string): ParsedPlanning {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const selectedSheets = workbook.SheetNames.filter((sheetName) => {
    if (!teamFilter) {
      return true
    }

    return sheetName.trim().toLowerCase() === teamFilter.trim().toLowerCase()
  })

  const plannedRecords: PlannedRecord[] = []

  for (const sheetName of selectedSheets) {
    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    }) as Array<Array<string | number>>

    let currentDatesByColumn = new Map<number, Date>()

    for (const row of rows) {
      const serialColumns = row
        .map((cell, index) => ({ cell, index }))
        .filter((entry) => typeof entry.cell === 'number' && entry.index >= 3)

      if (serialColumns.length >= 3) {
        currentDatesByColumn = new Map<number, Date>()
        for (const { cell, index } of serialColumns) {
          const parsedDate = XLSX.SSF.parse_date_code(cell as number)
          if (!parsedDate) {
            continue
          }

          currentDatesByColumn.set(index, new Date(parsedDate.y, parsedDate.m - 1, parsedDate.d))
        }
        continue
      }

      if (currentDatesByColumn.size === 0) {
        continue
      }

      const firstCell = String(row[0] ?? '').trim()
      const secondCell = String(row[1] ?? '').trim()
      const thirdCell = String(row[2] ?? '').trim()
      const hasShiftValue = Array.from(currentDatesByColumn.keys()).some((col) => {
        const value = String(row[col] ?? '').trim()
        return value.length > 0
      })

      const isLikelyDataRow = hasShiftValue && !/^agent$/i.test(secondCell) && !/^matricule$/i.test(thirdCell)
      if (!isLikelyDataRow) {
        continue
      }

      const employeeId = thirdCell || firstCell || secondCell
      const employeeName = secondCell || undefined

      if (!employeeId) {
        continue
      }

      for (const [columnIndex, dateValue] of currentDatesByColumn.entries()) {
        const cell = row[columnIndex]
        const classification = classifyPlanningCell(cell)
        if (classification.planningCode === 'EMPTY') {
          continue
        }

        plannedRecords.push({
          employeeId: String(employeeId).trim(),
          employeeName,
          scheduledTime: new Date(
            dateValue.getFullYear(),
            dateValue.getMonth(),
            dateValue.getDate(),
            classification.schedule.hour,
            classification.schedule.minute,
            0,
            0,
          ),
          teamName: sheetName,
          expectedCheck: classification.expectedCheck,
          planningCode: classification.planningCode,
        })
      }
    }
  }

  return { records: plannedRecords, teams: selectedSheets }
}

/**
 * Compare observed and planned records to identify delays
 */
function verifyAttendance(
  observed: ObservedRecord[],
  planned: PlannedRecord[],
  toleranceMinutes = 5,
): VerificationResult[] {
  const plannedByEmployeeDate = new Map<string, PlannedRecord>()
  for (const plannedRecord of planned) {
    const key = `${plannedRecord.employeeId}::${toDateKey(plannedRecord.scheduledTime)}`
    const existing = plannedByEmployeeDate.get(key)
    if (!existing) {
      plannedByEmployeeDate.set(key, plannedRecord)
      continue
    }

    if (!existing.expectedCheck && plannedRecord.expectedCheck) {
      plannedByEmployeeDate.set(key, plannedRecord)
      continue
    }

    if (existing.expectedCheck === plannedRecord.expectedCheck && plannedRecord.scheduledTime < existing.scheduledTime) {
      plannedByEmployeeDate.set(key, plannedRecord)
    }
  }

  const observedByEmployeeDate = new Map<string, ObservedRecord>()
  for (const observedRecord of observed) {
    const isEntry = /entree|entrée|entry/i.test(observedRecord.sourceLabel ?? '')
    const key = `${observedRecord.employeeId}::${toDateKey(observedRecord.timestamp)}`
    const existing = observedByEmployeeDate.get(key)

    if (!existing) {
      observedByEmployeeDate.set(key, observedRecord)
      continue
    }

    const existingIsEntry = /entree|entrée|entry/i.test(existing.sourceLabel ?? '')
    if (isEntry && !existingIsEntry) {
      observedByEmployeeDate.set(key, observedRecord)
      continue
    }

    if (observedRecord.timestamp < existing.timestamp) {
      observedByEmployeeDate.set(key, observedRecord)
    }
  }

  const results: VerificationResult[] = []
  const processedObservedKeys = new Set<string>()

  for (const [plannedKey, plannedRecord] of plannedByEmployeeDate.entries()) {
    const observedRecord = observedByEmployeeDate.get(plannedKey)

    if (!plannedRecord.expectedCheck) {
      processedObservedKeys.add(plannedKey)
      results.push({
        employeeId: plannedRecord.employeeId,
        employeeName: observedRecord?.name || plannedRecord.employeeName,
        teamName: plannedRecord.teamName,
        plannedTime: plannedRecord.scheduledTime,
        actualTime: observedRecord?.timestamp ?? null,
        status: 'leave',
        planningCode: plannedRecord.planningCode,
        minutesDifference: null,
      })
      continue
    }

    if (!observedRecord) {
      results.push({
        employeeId: plannedRecord.employeeId,
        employeeName: plannedRecord.employeeName,
        teamName: plannedRecord.teamName,
        plannedTime: plannedRecord.scheduledTime,
        actualTime: null,
        status: 'absent',
        planningCode: plannedRecord.planningCode,
        minutesDifference: null,
      })
      continue
    }

    processedObservedKeys.add(plannedKey)
    const diffMinutes = Math.round(
      (observedRecord.timestamp.getTime() - plannedRecord.scheduledTime.getTime()) / (1000 * 60),
    )

    let status: VerificationResult['status'] = 'on-time'
    if (diffMinutes > toleranceMinutes) {
      status = 'late'
    } else if (diffMinutes < -toleranceMinutes) {
      status = 'early'
    }

    results.push({
      employeeId: plannedRecord.employeeId,
      employeeName: observedRecord.name || plannedRecord.employeeName,
      teamName: plannedRecord.teamName,
      plannedTime: plannedRecord.scheduledTime,
      actualTime: observedRecord.timestamp,
      status,
      planningCode: plannedRecord.planningCode,
      minutesDifference: diffMinutes,
    })
  }

  for (const [observedKey, observedRecord] of observedByEmployeeDate.entries()) {
    if (processedObservedKeys.has(observedKey)) {
      continue
    }

    results.push({
      employeeId: observedRecord.employeeId,
      employeeName: observedRecord.name,
      plannedTime: null,
      actualTime: observedRecord.timestamp,
      status: 'no-plan',
      minutesDifference: null,
    })
  }

  return results.sort((a, b) => {
    if (!a.plannedTime && !b.plannedTime) {
      return a.employeeId.localeCompare(b.employeeId)
    }
    if (!a.plannedTime) {
      return 1
    }
    if (!b.plannedTime) {
      return -1
    }

    const dayDiff = startOfDay(a.plannedTime).getTime() - startOfDay(b.plannedTime).getTime()
    if (dayDiff !== 0) {
      return dayDiff
    }
    return a.employeeId.localeCompare(b.employeeId)
  })
}

/**
 * POST /verify/upload-observed - Upload CSV file with observed attendance
 */
router.post('/verify/upload-observed', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded',
        },
      })
    }

    const observed = parseCSV(req.file.buffer)

    const employees = new Set(observed.map((item) => item.employeeId))

    res.status(200).json({
      success: true,
      recordCount: observed.length,
      employeeCount: employees.size,
      records: observed.slice(0, 10), // Return first 10 for preview
      totalRecords: observed.length,
    })
  } catch (err) {
    console.error('CSV upload error:', err)
    res.status(400).json({
      error: {
        code: 'CSV_PARSE_ERROR',
        message: err instanceof Error ? err.message : 'Failed to parse CSV file',
      },
    })
  }
})

/**
 * POST /verify/upload-planned - Upload XLSX file with planned schedule
 */
router.post('/verify/upload-planned', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded',
        },
      })
    }

    const managerTeam = typeof req.body?.managerTeam === 'string' ? req.body.managerTeam : undefined
    const parsed = parseXLSX(req.file.buffer, managerTeam)

    res.status(200).json({
      success: true,
      teams: parsed.teams,
      recordCount: parsed.records.length,
      records: parsed.records.slice(0, 10), // Return first 10 for preview
      totalRecords: parsed.records.length,
    })
  } catch (err) {
    console.error('XLSX upload error:', err)
    res.status(400).json({
      error: {
        code: 'XLSX_PARSE_ERROR',
        message: err instanceof Error ? err.message : 'Failed to parse XLSX file',
      },
    })
  }
})

/**
 * POST /verify/compare - Compare observed vs planned attendance
 * Expects JSON body with file buffers (base64 encoded or multipart with two files)
 */
router.post(
  '/verify/compare',
  upload.fields([
    { name: 'observed', maxCount: 1 },
    { name: 'planned', maxCount: 10 },
  ]),
  (req: Request, res: Response) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]>

      if (!files.observed || !files.planned) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FILES',
            message: 'Both observed and planned files are required',
          },
        })
      }

      const managerTeam = typeof req.body?.managerTeam === 'string' ? req.body.managerTeam : undefined
      const toleranceMinutes = Number(req.body?.toleranceMinutes ?? 5)

      const observed = parseCSV(files.observed[0].buffer)
      const planned = files.planned.flatMap((plannedFile) =>
        parseXLSX(plannedFile.buffer, managerTeam).records,
      )
      const results = verifyAttendance(observed, planned, Number.isFinite(toleranceMinutes) ? toleranceMinutes : 5)

      const summary = {
        total: results.length,
        onTime: results.filter((r) => r.status === 'on-time').length,
        late: results.filter((r) => r.status === 'late').length,
        early: results.filter((r) => r.status === 'early').length,
        absent: results.filter((r) => r.status === 'absent').length,
        leave: results.filter((r) => r.status === 'leave').length,
        noPlan: results.filter((r) => r.status === 'no-plan').length,
      }

      res.status(200).json({
        success: true,
        managerTeam: managerTeam ?? null,
        toleranceMinutes: Number.isFinite(toleranceMinutes) ? toleranceMinutes : 5,
        summary,
        results,
      })
    } catch (err) {
      console.error('Verification comparison error:', err)
      res.status(400).json({
        error: {
          code: 'VERIFICATION_ERROR',
          message: err instanceof Error ? err.message : 'Failed to compare files',
        },
      })
    }
  },
)

export default router
