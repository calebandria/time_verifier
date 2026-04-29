import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../../index'
import { User } from '../../models/User'
import bcrypt from 'bcryptjs'

describe('POST /api/v1/auth/register', () => {
  beforeEach(async () => {
    // Clean up test database
    await User.deleteMany({})
  })

  it('should register a new user with valid email and password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        role: 'RH'
      })

    expect(response.status).toBe(201)
    expect(response.body.user).toBeDefined()
    expect(response.body.user.email).toBe('test@example.com')
    expect(response.body.user.role).toBe('RH')
  })

  it('should hash password with bcrypt', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        role: 'Manager'
      })

    const user = await User.findOne({ email: 'test@example.com' })
    expect(user?.passwordHash).toBeDefined()
    expect(user?.passwordHash).not.toBe('password123')
    expect(bcrypt.compareSync('password123', user!.passwordHash)).toBe(true)
  })

  it('should reject duplicate email', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        role: 'RH'
      })

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password456',
        role: 'RH'
      })

    expect(response.status).toBe(400)
    expect(response.body.error.message).toContain('déjà enregistré')
  })

  it('should reject invalid email format', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid-email',
        password: 'password123',
        role: 'RH'
      })

    expect(response.status).toBe(400)
  })

  it('should reject password less than 8 characters', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'short',
        role: 'RH'
      })

    expect(response.status).toBe(400)
  })
})