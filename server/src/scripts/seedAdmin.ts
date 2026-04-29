import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User } from '../models/User'

function getArg(name: string): string | undefined {
  const idx = process.argv.findIndex((arg) => arg === name)
  if (idx >= 0 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1]
  }

  const withEquals = process.argv.find((arg) => arg.startsWith(name + '='))
  return withEquals ? withEquals.split('=').slice(1).join('=') : undefined
}

async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/time_verifier'
  const email = getArg('--email') ?? process.env.ADMIN_EMAIL ?? 'admin@example.com'
  const password = getArg('--password') ?? process.env.ADMIN_PASSWORD ?? 'Admin12345'

  try {
    await mongoose.connect(mongoUri)

    const existingAdmin = await User.findOne({ email: email.toLowerCase() })
    if (existingAdmin) {
      console.log(`Admin already exists: ${existingAdmin.email}`)
      process.exit(0)
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const admin = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role: 'Admin',
    })

    console.log('Seeded Admin user:', {
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    })
    process.exit(0)
  } catch (error) {
    console.error('Failed to seed Admin user:', error)
    process.exit(1)
  }
}

void main()
