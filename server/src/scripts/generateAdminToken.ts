// Generates an admin JWT token. Requires ADMIN_JWT_SECRET in the environment.
const jwt = require('jsonwebtoken') as any

function getArg(name: string): string | undefined {
  const idx = process.argv.findIndex(a => a === name)
  if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1]
  const match = process.argv.find(a => a.startsWith(name + '='))
  if (match) return match.split('=')[1]
  return undefined
}

async function main(): Promise<void> {
  const secret = process.env.ADMIN_JWT_SECRET || getArg('--secret')
  const expiresIn = getArg('--expires') || '7d'

  if (!secret) {
    console.error('ADMIN_JWT_SECRET not set. Provide via env ADMIN_JWT_SECRET or --secret')
    process.exit(2)
  }

  const payload = { role: 'Admin' }
  const token = jwt.sign(payload, secret, { expiresIn })
  console.log(token)
}

void main()
