# Archon Backend

This workspace owns the NestJS backend for Archon.

It follows the canonical project docs in:

- `../docs/BACKEND-PLAN.md`
- `../docs/API.md`
- `../docs/CONTRACT-RULES.md`
- `../docs/DEPLOYMENT.md`

## Scripts

```bash
pnpm start:dev
pnpm build
pnpm lint
pnpm test
pnpm test:e2e
pnpm prisma:validate
pnpm prisma:generate
pnpm prisma:migrate:dev
pnpm prisma:migrate:deploy
```

## Environment

The backend loader checks env files in this order:

```text
.env.<NODE_ENV>.local
.env.<NODE_ENV>
.env.local
.env
```

Common templates:

- `.env.example` for local development
- `.env.test.example` for test runs and CI
- `.env.production.example` for deployment reference

Typical setup:

```bash
cp .env.example .env
```

Test setup:

```bash
cp .env.test.example .env.test
```

Production reference:

```bash
cp .env.production.example .env.production
```

## Current Scope

This backend currently includes:

- Nest bootstrap and central config loading
- Prisma schema and migrations foundation
- health module
- global validation, request ID, exception, and response envelope infrastructure

Feature modules for auth, users, projects, tasks, and task logs should build on
this structure instead of replacing it.
