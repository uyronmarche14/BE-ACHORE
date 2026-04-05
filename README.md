# Archon Backend

This workspace owns the NestJS backend for Archon. It is the source of truth
for authentication, authorization, projects, workflow statuses, tasks, project
activity, task collaboration data, and reviewer demo seeding.

Canonical docs live in:

- `../README.md`
- `../docs/ARCHITECTURE.md`
- `../docs/BACKEND-PLAN.md`
- `../docs/API.md`
- `../docs/DEPLOYMENT.md`
- `../docs/REVIEWER-PACK.md`

## What This Workspace Owns

Responsibilities include:

- bootstrapping `/api/v1`
- enforcing validation, normalized envelopes, and canonical error codes
- signup, login, refresh rotation, logout, me, verification resend, and
  verification confirm
- invite create, invite preview, and invite acceptance
- project CRUD, project membership enforcement, project status management, and
  project activity retrieval
- task CRUD, task status mutation, checklist/link persistence, comments,
  attachments, and audit-log creation
- deterministic non-production reviewer bootstrap through `POST /seed/init`

## Tech Stack

- NestJS 11
- TypeScript 5
- Prisma 7
- MySQL / MariaDB
- `class-validator` and `class-transformer`
- `joi` for env validation
- JWT access tokens plus refresh token rotation
- `bcrypt`

## Runtime Shape

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

The public modules stay stable, while larger domains are split internally by
responsibility:

- `projects`: queries, mutations, status management, project activity
- `tasks`: queries, commands, status mutation

That split improves explainability without changing the public API.

## Folder Scaffold

```text
src/
|-- common/             bootstrap, filters, interceptors, middleware, utils
|-- config/             env loading and runtime config validation
|-- database/           Prisma service and persistence wiring
`-- modules/
    |-- auth/           auth controllers, DTOs, guards, services, mappers
    |-- health/         health check slice
    |-- mail/           SMTP-backed delivery abstraction
    |-- project-invites/ invite create, preview, accept
    |-- projects/       project CRUD, statuses, activity
    |-- seed/           reviewer/demo bootstrap
    |-- task-logs/      audit retrieval and write helpers
    |-- tasks/          task CRUD, status changes, task detail data
    `-- users/          user-domain support and future expansion
```

## Implemented API Surface

Main endpoint groups:

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/verify-email/resend`
- `POST /auth/verify-email/confirm`
- `POST /projects`
- `GET /projects`
- `GET /projects/:projectId`
- `PUT /projects/:projectId`
- `DELETE /projects/:projectId`
- `POST /projects/:projectId/statuses`
- `PATCH /projects/:projectId/statuses/:statusId`
- `POST /projects/:projectId/statuses/reorder`
- `DELETE /projects/:projectId/statuses/:statusId`
- `GET /projects/:projectId/activity`
- `POST /projects/:projectId/invites`
- `GET /projects/:projectId/tasks`
- `POST /projects/:projectId/tasks`
- `GET /tasks/:taskId`
- `PUT /tasks/:taskId`
- `PATCH /tasks/:taskId/status`
- `DELETE /tasks/:taskId`
- `GET /tasks/:taskId/logs`
- `GET /tasks/:taskId/comments`
- `POST /tasks/:taskId/comments`
- `PATCH /tasks/:taskId/comments/:commentId`
- `DELETE /tasks/:taskId/comments/:commentId`
- `GET /tasks/:taskId/attachments`
- `POST /tasks/:taskId/attachments`
- `DELETE /tasks/:taskId/attachments/:attachmentId`
- `GET /invites/:token`
- `POST /invites/:token/accept`
- `POST /seed/init`

## Data And Ownership Model

- `projects` owns project identity, members, statuses, and project activity
- `tasks` owns task records, task detail, comments, attachments, subtasks, and
  write-side workflow changes
- `task-logs` owns audit-history persistence and retrieval

This is why the frontend project board workspace composes project and task
data, while the backend keeps them as separate modules with stable interfaces.

## Environment

The backend loader checks env files in this order:

```text
.env.<NODE_ENV>.local
.env.<NODE_ENV>
.env.local
.env
```

Typical local setup:

```bash
cp .env.example .env
```

Common local values:

- `PORT=4000`
- `APP_URL=http://localhost:4000`
- `FRONTEND_URL=http://localhost:3000`
- `DATABASE_URL=...`
- `JWT_ACCESS_SECRET=...`
- `JWT_REFRESH_SECRET=...`
- `SMTP_HOST=...`
- `SMTP_PORT=...`
- `SMTP_USER=...`
- `SMTP_PASS=...`
- `SMTP_FROM=...`
- `SEED_ENABLED=true` only when reviewer/demo seeding is needed

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

## Demo Bootstrap

Reviewer path:

1. Start the backend locally.
2. Call `POST /api/v1/seed/init`.
3. Sign in with:
   - `demo.member@example.com` / `DemoPass123!`
   - `demo.admin@example.com` / `DemoPass123!`

The seed creates two users, two projects, default workflow statuses, demo task
data, membership records, and ready-to-review activity history.

## Verification

```bash
npm run lint
npm test
npm run test:e2e
npm run build
```

Manual API checks live in:

- `test/README.md`
- `test/postman/MANUAL-POSTMAN-REST-TESTS.md`

For repo-wide verification:

```bash
bash ../scripts/quality-gate.sh
```
