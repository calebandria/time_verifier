import express from 'express'
import bcrypt from 'bcryptjs'
import Joi from 'joi'
import { User } from '../models/User'

const router = express.Router()

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('RH', 'Manager').required(),
})

router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body)

    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données invalides: ' + error.details[0].message,
        },
      })
    }

    const { email, password, role } = value

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(400).json({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email déjà enregistré',
        },
      })
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role,
    })

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    })
  } catch (err) {
    console.error('Registration error:', err)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur serveur',
      },
    })
  }
})

export default router