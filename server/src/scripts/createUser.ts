import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User, userRoles } from '../models/User'

function getArg(name: string): string | undefined {
  const idx = process.argv.findIndex(a => a === name)
  if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1]
  const match = process.argv.find(a => a.startsWith(name + '='))
  if (match) return match.split('=')[1]
  return undefined
}

async function main(): Promise<void> {
  const email = getArg('--email') || process.env.EMAIL
  const password = getArg('--password') || process.env.PASSWORD
  const role = getArg('--role') || process.env.ROLE
  const providedKey = getArg('--admin-key') || process.env.PROVISION_KEY

  const adminKey = process.env.ADMIN_KEY

  if (!adminKey) {
    console.error('ADMIN_KEY not set in environment. Aborting.')
    process.exit(2)
  }

  if (!providedKey || providedKey !== adminKey) {
    console.error('Invalid or missing admin key. Provide --admin-key or set PROVISION_KEY env var.')
    process.exit(3)
  }

  if (!email || !password || !role) {
    console.error('Missing required parameters. Usage: --email <email> --password <password> --role <RH|Manager>')
    process.exit(4)
  }

  if (!userRoles.includes(role as any)) {
    console.error('Invalid role. Supported roles:', userRoles.join(', '))
    process.exit(5)
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/time_verifier'

  try {
    await mongoose.connect(mongoUri)
    console.log('MongoDB connected')

    const exists = await User.findOne({ email: email.toLowerCase() })
    if (exists) {
      console.error('User already exists with that email')
      process.exit(6)
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role,
    })

    console.log('User created:', { id: user._id.toString(), email: user.email, role: user.role })
    process.exit(0)
  } catch (err) {
    console.error('Error creating user:', err)
    process.exit(7)
  }
}

void main()
