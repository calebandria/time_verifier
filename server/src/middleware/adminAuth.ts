import { Request, Response, NextFunction } from 'express'

// Avoid importing types for jsonwebtoken to keep this file simple; use runtime require.
const jwt = require('jsonwebtoken') as any

export default function adminAuth(req: Request, res: Response, next: NextFunction): void | Response {
  // Read secrets at runtime so tests and hot-reload pick up env changes.
  const adminJwtSecret = process.env.ADMIN_JWT_SECRET ?? ''
  const adminKey = process.env.ADMIN_KEY ?? ''

  // 1) Try Authorization Bearer token
  const auth = req.header('authorization') || ''
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim()
    if (!adminJwtSecret) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Admin JWT not enabled' } })
    }

    try {
      const payload = jwt.verify(token, adminJwtSecret) as { role?: string }
      if (payload.role !== 'Admin') {
        return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Admin token role invalid' } })
      }
      return next()
    } catch (err) {
      return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Admin token invalid' } })
    }
  }

  // 2) Fallback to legacy x-admin-key header
  const providedKey = (req.header('x-admin-key') ?? '') as string
  if (adminKey && providedKey === adminKey) {
    return next()
  }

  return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: "Clé d'administration manquante ou invalide" } })
}
