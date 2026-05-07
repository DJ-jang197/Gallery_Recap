# Auth (OIDC-style Identity Provider)

Auth is a security-focused identity service built with Node.js, TypeScript, Fastify, PostgreSQL, Redis, and RSA JWT signing.

This repository contains:
- authentication APIs (register, login, refresh, logout)
- refresh-token rotation and revocation controls
- JWKS publishing for JWT verification
- a basic hosted login page at `/login`

## Run Locally

From the project root:

1) Install dependencies

```bash
npm install --include=dev
```

2) Generate RSA keys (local only)

```bash
npx tsx scripts/gen-keys.ts
```

3) Run DB migrations

```bash
npx tsx scripts/migrate.ts
```

4) Start the app

```bash
npm run dev
```

5) Open login page

```bash
start http://localhost:3000/login
```

## Core Routes

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/jwks.json`

## UI Notes

- Login page is served from `public/login.html`.
- Narwhal animation is client-side behavior only and does not affect backend auth logic.

