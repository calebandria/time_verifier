import express from 'express'
import bcrypt from 'bcryptjs'
import Joi from 'joi'
import { User, userRoles } from '../models/User'
import adminAuth from '../middleware/adminAuth'

const router = express.Router()

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid(...userRoles).required(),
  team: Joi.string().trim().when('role', {
    is: 'Manager',
    then: Joi.required().messages({
      'any.required': "Le champ 'team' est obligatoire pour un Manager.",
      'string.empty': "Le champ 'team' est obligatoire pour un Manager.",
    }),
    otherwise: Joi.optional().allow(''),
  }),
})

const deleteUserSchema = Joi.object({
  email: Joi.string().email().required(),
})

const adminLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
})

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
})

// Avoid importing jwt directly; use require at runtime
const jwt = require('jsonwebtoken') as any

// Feature flags / secrets that control account creation
const allowRegistration = process.env.ALLOW_REGISTRATION === 'true'
const adminKey = process.env.ADMIN_KEY ?? ''

// Public registration endpoint: active only when ALLOW_REGISTRATION=true
router.post('/register', async (req, res) => {
  if (!allowRegistration) {
    return res.status(403).json({
      error: {
        code: 'REGISTRATION_DISABLED',
        message:
          "L'inscription publique est désactivée. Utilisez l'API d'administration pour créer des comptes.",
      },
    })
  }

  try {
    const { error, value } = createUserSchema.validate(req.body)

    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données invalides: ' + error.details[0].message,
        },
      })
    }

    const { email, password, role } = value
    const normalizedTeam = role === 'Manager' ? String(value.team).trim() : undefined

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
      team: normalizedTeam,
    })

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        ...(user.team && { team: user.team }),
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

// Admin-only creation endpoint. Requires header 'x-admin-key' === ADMIN_KEY
router.post('/admin/create-user', adminAuth, async (req, res) => {
  try {
    const { error, value } = createUserSchema.validate(req.body)

    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données invalides: ' + error.details[0].message,
        },
      })
    }

    const { email, password, role } = value
    const normalizedTeam = role === 'Manager' ? String(value.team).trim() : undefined

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

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role,
      team: normalizedTeam,
    })

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        ...(user.team && { team: user.team }),
      },
    })
  } catch (err) {
    console.error('Admin create user error:', err)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur serveur',
      },
    })
  }
})

router.post('/admin/delete-user', adminAuth, async (req, res) => {
  try {
    const { error, value } = deleteUserSchema.validate(req.body)

    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données invalides: ' + error.details[0].message,
        },
      })
    }

    const { email } = value
    const result = await User.deleteOne({ email: email.toLowerCase() })

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur introuvable',
        },
      })
    }

    return res.status(200).json({
      deleted: true,
      email: email.toLowerCase(),
    })
  } catch (err) {
    console.error('Admin delete user error:', err)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur serveur',
      },
    })
  }
})

router.post('/admin/login', async (req, res) => {
  try {
    const { error, value } = adminLoginSchema.validate(req.body)

    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données invalides: ' + error.details[0].message,
        },
      })
    }

    const { email, password } = value
    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user || user.role !== 'Admin') {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email ou mot de passe incorrect, ou l\'utilisateur n\'est pas Admin',
        },
      })
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash)

    if (!passwordMatches) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email ou mot de passe incorrect',
        },
      })
    }

    const adminJwtSecret = process.env.ADMIN_JWT_SECRET ?? ''
    if (!adminJwtSecret) {
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Admin JWT secret not configured',
        },
      })
    }

    const token = jwt.sign({ role: 'Admin', email: user.email }, adminJwtSecret, { expiresIn: '7d' })

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        ...(user.team && { team: user.team }),
      },
    })
  } catch (err) {
    console.error('Admin login error:', err)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur serveur',
      },
    })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body)

    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données invalides: ' + error.details[0].message,
        },
      })
    }

    const { email, password } = value
    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email ou mot de passe incorrect',
        },
      })
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash)

    if (!passwordMatches) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email ou mot de passe incorrect',
        },
      })
    }

    return res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        ...(user.team && { team: user.team }),
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur serveur',
      },
    })
  }
})

export default router