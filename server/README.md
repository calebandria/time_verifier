# Server: Authentication and Admin User Provisioning

This document explains the environment variables and the admin-only user creation flow.

Environment variables

- `ADMIN_KEY` (required for admin creation endpoint): a secret string used to protect the admin create-user API. When set, clients must include the header `x-admin-key: <ADMIN_KEY>` to call the admin endpoint.

- `ALLOW_REGISTRATION` (optional): set to `true` to re-enable public registration at `POST /api/v1/auth/register`. Default is disabled.

Admin create-user endpoint

- URL: `POST /api/v1/auth/admin/create-user`
- Authentication: header `x-admin-key: <ADMIN_KEY>` must match the `ADMIN_KEY` environment variable.
- Body: JSON `{ "email": "user@example.com", "password": "securePass123", "role": "RH" }` where `role` must be one of the supported roles (`RH`, `Manager`).

Example curl (admin creating a Manager):

```bash
curl -X POST http://localhost:5000/api/v1/auth/admin/create-user \
  -H "Content-Type: application/json" \
  -H "x-admin-key: my-super-secret-key" \
  -d '{"email":"manager@example.com","password":"password123","role":"Manager"}'
```

Public registration

- `POST /api/v1/auth/register` remains but returns 403 unless `ALLOW_REGISTRATION=true`.

Notes and recommendations

- The admin key is a simple, straightforward protection but not a long-term replacement for proper admin authentication (JWT sessions or scoped API keys). Consider replacing with admin JWTs or an OAuth2 flow for production.
- Ensure `ADMIN_KEY` is stored securely in your deployment environment (secrets manager, environment injection, etc.).

Admin CLI helper

You can provision users from the server codebase with the included TypeScript helper `createUser.ts`.

Usage (examples):

```bash
# environment approach
ADMIN_KEY=my-super-secret-key MONGO_URI='mongodb://localhost:27017/time_verifier' \
  yarn --cwd server create-user -- --email=manager@example.com --password=password123 --role=Manager --admin-key=my-super-secret-key

# or passing via args (PROVISION_KEY env or --admin-key required)
PROVISION_KEY=my-super-secret-key yarn --cwd server create-user -- --email=hr@example.com --password=secret123 --role=RH --admin-key=my-super-secret-key
```

This script connects directly to MongoDB using `MONGO_URI` and creates a user after validating the provided admin key against `ADMIN_KEY` in the environment.

Admin JWT option

You can enable JWT-based admin authentication by setting `ADMIN_JWT_SECRET` in your environment. When present, the API will accept a Bearer token signed with this secret for admin endpoints. The server keeps the legacy `x-admin-key` header as a fallback for backwards compatibility.

Generate an admin token locally using the helper script:

```bash
# Set secret and generate a token that expires in 7 days (default)
ADMIN_JWT_SECRET=my-secret yarn --cwd server generate-admin-token

# Or pass the secret directly (not recommended for production)
yarn --cwd server generate-admin-token -- --secret=my-secret --expires=1h
```

Use the token with the Authorization header:

```bash
curl -X POST http://localhost:5000/api/v1/auth/admin/create-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{"email":"manager@example.com","password":"password123","role":"Manager"}'
```

First Admin seed script

If you need to create the very first Admin directly in MongoDB, use the seed helper:

```bash
# defaults: admin@example.com / Admin12345
yarn --cwd server seed-admin

# with custom values
MONGO_URI='mongodb://localhost:27017/time_verifier' \
  yarn --cwd server seed-admin -- --email=admin@example.com --password=StrongPass123
```

The script writes a user with `role: 'Admin'` directly into MongoDB and will skip creation if that email already exists.
