import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../../index'
import { User } from '../../models/User'
import bcrypt from 'bcryptjs'
const jwt = require('jsonwebtoken') as any

const describeIfMongo = process.env.MONGO_URI ? describe : describe.skip

describeIfMongo('Admin POST /api/v1/auth/admin/create-user', () => {
  beforeEach(async () => {
    // Clean up test database
    await User.deleteMany({})
    // Set a known ADMIN_KEY for tests
    process.env.ADMIN_KEY = 'test-admin-key'
  })

  const adminHeader = { 'x-admin-key': 'test-admin-key' }

  it('should create a new user with valid email and password (RH)', async () => {
    const response = await request(app)
      .post('/api/v1/auth/admin/create-user')
      .set(adminHeader)
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
      .post('/api/v1/auth/admin/create-user')
      .set(adminHeader)
      .send({
        email: 'test2@example.com',
        password: 'password123',
        role: 'Manager'
      })

    const user = await User.findOne({ email: 'test2@example.com' })
    expect(user?.passwordHash).toBeDefined()
    expect(user?.passwordHash).not.toBe('password123')
    expect(bcrypt.compareSync('password123', user!.passwordHash)).toBe(true)
  })

  it('should reject duplicate email', async () => {
    await request(app)
      .post('/api/v1/auth/admin/create-user')
      .set(adminHeader)
      .send({
        email: 'test@example.com',
        password: 'password123',
        role: 'RH'
      })

    const response = await request(app)
      .post('/api/v1/auth/admin/create-user')
      .set(adminHeader)
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
      .post('/api/v1/auth/admin/create-user')
      .set(adminHeader)
      .send({
        email: 'invalid-email',
        password: 'password123',
        role: 'RH'
      })

    expect(response.status).toBe(400)
  })

  it('should reject password less than 8 characters', async () => {
    const response = await request(app)
      .post('/api/v1/auth/admin/create-user')
      .set(adminHeader)
      .send({
        email: 'test@example.com',
        password: 'short',
        role: 'RH'
      })

    expect(response.status).toBe(400)
  })
})

describeIfMongo('Admin POST /api/v1/auth/admin/create-user (JWT)', () => {
  beforeEach(async () => {
    await User.deleteMany({})
    process.env.ADMIN_JWT_SECRET = 'test-jwt-secret'
  })

  it('should create a new user when presented with a valid admin JWT', async () => {
    const token = jwt.sign({ role: 'Admin' }, 'test-jwt-secret', { expiresIn: '1h' })

    const response = await request(app)
      .post('/api/v1/auth/admin/create-user')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'jwt-test@example.com',
        password: 'password123',
        role: 'RH',
      })

    expect(response.status).toBe(201)
    expect(response.body.user).toBeDefined()
    expect(response.body.user.email).toBe('jwt-test@example.com')
    expect(response.body.user.role).toBe('RH')
  })

  it('should reject requests with invalid token', async () => {
    const badToken = jwt.sign({ role: 'Admin' }, 'wrong-secret', { expiresIn: '1h' })

    const response = await request(app)
      .post('/api/v1/auth/admin/create-user')
      .set('Authorization', `Bearer ${badToken}`)
      .send({
        email: 'jwt-test2@example.com',
        password: 'password123',
        role: 'Manager',
      })

    expect(response.status).toBe(401)
  })

  it('should create an Admin role user when using a valid admin JWT', async () => {
    const token = jwt.sign({ role: 'Admin' }, 'test-jwt-secret', { expiresIn: '1h' })

    const response = await request(app)
      .post('/api/v1/auth/admin/create-user')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'superadmin@example.com',
        password: 'password123',
        role: 'Admin',
      })

    expect(response.status).toBe(201)
    expect(response.body.user.role).toBe('Admin')
  })

  it('should delete an existing user with a valid admin JWT', async () => {
    const token = jwt.sign({ role: 'Admin' }, 'test-jwt-secret', { expiresIn: '1h' })

    await request(app)
      .post('/api/v1/auth/admin/create-user')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'delete-me@example.com',
        password: 'password123',
        role: 'RH',
      })

    const response = await request(app)
      .post('/api/v1/auth/admin/delete-user')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'delete-me@example.com',
      })

    expect(response.status).toBe(200)
    expect(response.body.deleted).toBe(true)

    const user = await User.findOne({ email: 'delete-me@example.com' })
    expect(user).toBeNull()
  })

  it('should allow Admin user to login and receive a JWT token', async () => {
    const adminToken = jwt.sign({ role: 'Admin' }, 'test-jwt-secret', { expiresIn: '1h' })

    await request(app)
      .post('/api/v1/auth/admin/create-user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'admin-login@example.com',
        password: 'adminpass123',
        role: 'Admin',
      })

    const response = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({
        email: 'admin-login@example.com',
        password: 'adminpass123',
      })

    expect(response.status).toBe(200)
    expect(response.body.token).toBeDefined()
    expect(response.body.user.role).toBe('Admin')

    const payload = jwt.verify(response.body.token, 'test-jwt-secret')
    expect(payload.role).toBe('Admin')
  })

  it('should reject login for non-Admin users', async () => {
    const adminToken = jwt.sign({ role: 'Admin' }, 'test-jwt-secret', { expiresIn: '1h' })

    await request(app)
      .post('/api/v1/auth/admin/create-user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'regular-user@example.com',
        password: 'password123',
        role: 'RH',
      })

    const response = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({
        email: 'regular-user@example.com',
        password: 'password123',
      })

    expect(response.status).toBe(401)
    expect(response.body.error.message).toContain('Admin')
  })
})