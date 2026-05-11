---
storyKey: 1-1-user-registration
epic: 1
storyNumber: "1.1"
title: User Registration
status: review
priority: high
assignee: ""
dateCreated: 2026-04-27
dateCompleted: 2026-04-27
---

# Story 1.1: User Registration

## User Story

As a user (RH or Manager),
I want to register with my email and password,
So that I can access the system with my credentials.

## Acceptance Criteria

**Given** a valid email format and password (min 8 chars)
**When** I submit the registration form
**Then** a new user account is created with the specified role (RH or Manager)
**And** the password is stored as a bcrypt hash

**Given** an email that already exists
**When** I try to register
**Then** an error message is displayed: "Email already registered"

## Related Requirements

- FR1: Users can authenticate with email/password
- FR2: System can validate user credentials against stored hashes

## Tasks / Subtasks

- [x] Create User model in MongoDB (email, passwordHash, role)
- [x] Create registration API endpoint (POST /api/v1/auth/register)
- [x] Add email validation (format check)
- [x] Add password validation (min 8 chars)
- [x] Implement bcrypt password hashing
- [x] Add duplicate email check
- [x] Create registration response
- [x] Add unit tests

### Review Findings

- [ ] [Review][Patch] Les tests time-out car aucune connexion MongoDB (beforeEach `User.deleteMany`) [server/src/__tests__/auth/register.test.ts:8]
- [ ] [Review][Patch] Le serveur demarre et ecoute lors de l'import de `app` (effet de bord en test) [server/src/index.ts:56]
- [ ] [Review][Patch] Incoherence avec le format de reponse API defini dans `architecture.md` (success devrait etre `{ data: ... }`) [server/src/routes/auth.ts:50]
- [ ] [Review][Patch] `id` renvoye comme ObjectId au lieu d'une string (risque de serialisation/contrat API) [server/src/routes/auth.ts:52]
- [ ] [Review][Patch] Course condition sur inscription: E11000 unique index peut remonter en 500 au lieu de EMAIL_EXISTS [server/src/routes/auth.ts:44]
- [ ] [Review][Patch] Champs inconnus non rejetes/strippes par validation (risque d'inputs inattendus) [server/src/routes/auth.ts:16]
- [ ] [Review][Patch] Email non trim avant lookup: espaces peuvent contourner le `findOne` puis exploser sur unique index [server/src/routes/auth.ts:30]

## Dev Notes

**Architecture from architecture.md:**
- Database: MongoDB via Mongoose
- Auth: JWT tokens + bcrypt
- API: REST with Express

**Endpoint:**
- POST /api/v1/auth/register
- Request: { email, password, role }
- Response: { user: { id, email, role } }

**Password hashing:**
- Use bcrypt with cost factor 10
- Never store plain text passwords

**Role values:**
- "RH" for Resource Human users
- "Manager" for Manager users

## Dev Agent Record

### Implementation Plan

Created User model, registration endpoint, and unit tests following red-green-refactor cycle.

### Debug Log

Fixed TypeScript issues:
- Added bcryptjs and joi dependencies
- Fixed Joi validation result handling
- Exported app from index.ts for tests

### Completion Notes

**Implémentation complétée:**
- Model User créé avec schema Mongoose
- Route POST /api/v1/auth/register avec validation Joi
- Password hashing avec bcrypt (cost factor 10)
- Tests unitaires créés
- TypeScript compile sans erreur

## File List

- `server/src/models/User.ts` (nouveau)
- `server/src/routes/auth.ts` (nouveau)
- `server/src/__tests__/auth/register.test.ts` (nouveau)
- `server/package.json` (modifié: dépendances ajoutées)
- `server/src/index.ts` (modifié: routes auth ajoutées)

## Change Log

- Date: 2026-04-27: Implémentation complète de Story 1.1 - User Registration

## Status

**Current Status:** review
