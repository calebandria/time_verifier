# Time Verifier - MERN + TypeScript Starter

Minimal MERN starter with:
- React + Vite frontend (TypeScript)
- Express backend (TypeScript)
- MongoDB (via Mongoose)

## Prerequisites
- Node.js 18+
- Yarn 1.22+
- MongoDB (local or remote)

## Install dependencies
From the project root:

```bash
yarn install
yarn --cwd server install
yarn --cwd client install
```

Or run the helper command:

```bash
yarn install:all
```

## Environment variables
Create a `.env` file in `server/` using `server/.env.example` as a template:

```bash
cp server/.env.example server/.env
```

Then edit values if needed.

## Run in development
From the project root:

```bash
yarn dev
```

This starts:
- Backend on `http://localhost:5000`
- Frontend on `http://localhost:5173`

## Useful scripts
- `yarn dev` -> run backend + frontend
- `yarn dev:server` -> run backend only
- `yarn dev:client` -> run frontend only
- `yarn start` -> run backend in production mode
- `yarn typecheck` -> run TypeScript checks in backend + frontend

## API endpoints
- `GET /api/health`
- `GET /api/time`
