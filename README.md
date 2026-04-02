# Archon Backend

This workspace owns the NestJS backend for Archon.

It is the authoritative system for authentication, authorization, project and
task persistence, status mutation, audit logging, and reviewer demo seeding.

It follows the canonical project docs in:

- `../README.md`
- `../docs/BACKEND-PLAN.md`
- `../docs/API.md`
- `../docs/CONTRACT-RULES.md`
- `../docs/DEPLOYMENT.md`
- `../docs/REVIEWER-PACK.md`

## What This Workspace Does

The backend is responsible for:

- bootstrapping the `/api/v1` REST API
- enforcing validation, normalized envelopes, and canonical error codes
- handling signup, login, refresh rotation, logout, and `GET /auth/me`
- enforcing project-scoped and task-scoped access rules
- storing projects, tasks, memberships, refresh tokens, and task logs
- serving grouped board data for the frontend Kanban view
- handling task create, edit, delete, and status patch flows
- writing transactional audit logs for create, field updates, and status changes
- exposing reviewer-ready seed data through an env-gated bootstrap endpoint

The frontend depends on this workspace as the single source of truth for
business rules and persisted state.

## Tech Stack

Core application stack:

- NestJS 11
- TypeScript 5
- Prisma 7
- MariaDB/MySQL through `@prisma/adapter-mariadb`

Validation and security:

- `class-validator`
- `class-transformer`
- `joi` for config validation
- JWT access tokens
- refresh token rotation
- `bcrypt` for password hashing

Testing and verification:

- Jest
- Supertest
- ESLint
- Prisma CLI for schema validation and migrations

## Runtime Shape

The backend follows the existing feature-slice and transport flow:

```text
Request
-> Controller
-> DTO validation
-> Guards / decorators / authorization checks
-> Service
-> Prisma
-> Mapper / response type
-> normalized API envelope
```

A typical task mutation path looks like this:

```text
tasks controller
-> DTO + JwtAuthGuard + ResourceAccessGuard
-> tasks service
-> Prisma transaction
-> task update + task-log write
-> mapper
-> response interceptor / envelope
```

## Folder Scaffold

Top-level workspace folders:

- `prisma/`: schema and migrations
- `src/`: NestJS application source
- `test/`: e2e specs and manual API assets
- `dist/`: production build output

Important source folders:

```text
src/
|-- common/             bootstrap, filters, interceptors, middleware, utils
|-- config/             env loading and runtime config validation
|-- database/           Prisma service and persistence wiring
`-- modules/
    |-- auth/           auth controllers, DTOs, guards, services, mappers
    |-- health/         simple health check slice
    |-- projects/       project CRUD and grouped project detail responses
    |-- tasks/          task CRUD, grouped task loading, status patch
    |-- task-logs/      log retrieval and transactional log helpers
    |-- seed/           reviewer/demo bootstrap endpoint and data seed logic
    `-- users/          user-domain support types and future expansion point
```

Common infrastructure is intentionally separated from modules:

- `src/common/bootstrap/`: app bootstrap and pipe/filter/interceptor wiring
- `src/common/filters/`: exception normalization
- `src/common/interceptors/`: success-envelope behavior
- `src/common/middleware/`: request metadata such as request IDs
- `src/common/utils/`: reusable helpers like canonical exception builders

## Implemented API Surface

The backend is implemented for the core assessment flow. Current features include:

- normalized `/api/v1` bootstrap with validation, exception handling, response envelopes, and request IDs
- auth endpoints for signup, login, refresh, logout, and `GET /auth/me`
- route-level auth throttling
- project create, list, detail, update, and delete
- task create, get, update, delete, grouped project task loading, and `PATCH /tasks/:taskId/status`
- transactional task-log creation for task create, task edit, and status change
- newest-first `GET /tasks/:taskId/logs`
- env-gated `POST /seed/init` for reviewer-ready demo data

Main endpoint groups:

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /projects`
- `GET /projects`
- `GET /projects/:projectId`
- `PUT /projects/:projectId`
- `DELETE /projects/:projectId`
- `GET /projects/:projectId/tasks`
- `POST /projects/:projectId/tasks`
- `GET /tasks/:taskId`
- `PUT /tasks/:taskId`
- `PATCH /tasks/:taskId/status`
- `DELETE /tasks/:taskId`
- `GET /tasks/:taskId/logs`
- `POST /seed/init`

## Scripts

```bash
npm run start:dev
npm run build
npm run start:prod
npm run lint
npm test
npm run test:e2e
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
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

Useful local values:

- `PORT=4000`
- `APP_URL=http://localhost:4000`
- `FRONTEND_URL=http://localhost:3000`
- `DATABASE_URL=...`
- `JWT_ACCESS_SECRET=...`
- `JWT_REFRESH_SECRET=...`
- `SEED_ENABLED=true` only when you want reviewer/demo bootstrap enabled locally

`SEED_ENABLED` is intentionally operational and should stay off unless you are
explicitly preparing a local or reviewer demo environment.

## Demo Bootstrap

For the reviewer flow:

1. Start the backend locally.
2. Call `POST /api/v1/seed/init`.
3. Sign in with:
   - `demo.member@example.com` / `DemoPass123!`
   - `demo.admin@example.com` / `DemoPass123!`
4. Use the seeded member account to verify dashboard, board, drag-and-drop, and
   task log flows from the frontend.

The deterministic seed currently creates:

- 2 users
- 2 projects
- 6 tasks
- memberships, assignments, due dates, and sample audit history

The seed endpoint is intentionally blocked when `SEED_ENABLED` is not `true`
and in production environments.

## Verification

Use these before handoff:

```bash
npm run lint
npm test
npm run test:e2e
npm run build
```

Manual API checks live in:

- `test/README.md`
- `test/postman/MANUAL-POSTMAN-REST-TESTS.md`

Recommended backend handoff routine:

1. run Prisma validation if the schema changed
2. run unit tests
3. run e2e tests
4. build the Nest app
5. verify the seed/init reviewer path if auth, tasks, or logs changed

For repo-wide verification, run:

```bash
bash ../scripts/quality-gate.sh
```
