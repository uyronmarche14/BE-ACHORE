# DOWINN Backend

This package contains the NestJS backend for DOWINN. It is the source of truth
for authentication, project membership, workflow statuses, tasks, project
activity, and reviewer demo seeding.

## Project Overview

The backend owns:

- signup, login, refresh rotation, logout, and current-user session APIs
- direct-link invite flows and optional email-delivery support when explicitly enabled
- project CRUD, membership checks, project statuses, and project activity
- task CRUD, task status changes, comments, attachments, and audit logs
- non-production reviewer/demo seeding through a gated seed endpoint

The API is exposed under `/api/v1` and includes Swagger documentation when
`SWAGGER_ENABLED=true`.

## Stack

- NestJS 11
- TypeScript
- Prisma 7
- MySQL / MariaDB
- `class-validator` and `class-transformer`
- `joi` environment validation
- JWT access tokens and refresh-token rotation
- optional dormant mail support via Resend or SMTP when email flows are explicitly re-enabled

## Local Defaults

The checked-in `.env.example` uses these local defaults:

- backend port: `4000`
- app URL: `http://localhost:4000`
- frontend URL: `http://localhost:3000`
- Swagger UI: `http://localhost:4000/api/v1/docs`
- health check: `http://localhost:4000/api/v1/health`
- database: `mysql://dowinn:dowinn@127.0.0.1:3308/dowinn`

Important environment variables:

- `PORT`
- `APP_URL`
- `FRONTEND_URL` — the main frontend base URL used for invite links and any optional email callbacks
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `SEED_ENABLED`
- `EMAIL_VERIFICATION_MODE`
- `INVITE_DELIVERY_MODE`
- optional `MAIL_PROVIDER`
- optional `MAIL_FROM`
- optional `RESEND_API_KEY` if you later re-enable email delivery
- optional SMTP variables if you later re-enable email delivery

Hosted staging recommendation:

- `EMAIL_VERIFICATION_MODE=bypass`
- `INVITE_DELIVERY_MODE=link`

That combination keeps signup and invites working on Render/Vercel staging even
when real email delivery is unavailable. The checked-in runtime defaults now
match that no-email flow. If you want to re-enable email later, explicitly set
`EMAIL_VERIFICATION_MODE=required` and `INVITE_DELIVERY_MODE=email`.
No-email deployments can omit all `MAIL_*`, `RESEND_*`, and `SMTP_*` variables.

## Run Locally

From `backend/`:

1. Copy the env file:

```bash
cp .env.example .env
```

2. Start a MySQL database and point `DATABASE_URL` to it.
   If you are using the full DOWINN workspace, the default local database can
   be started from the repo root with:

```bash
docker compose --env-file ../infra/.env -f ../infra/docker/docker-compose.yml up -d
```

3. Install dependencies:

```bash
pnpm install
```

4. Apply migrations and generate the Prisma client:

```bash
pnpm prisma:migrate:deploy
pnpm prisma:generate
```

5. Start the backend:

```bash
pnpm start:dev
```

## Local Endpoints

- API base: `http://localhost:4000/api/v1`
- Swagger UI: `http://localhost:4000/api/v1/docs`
- health: `GET http://localhost:4000/api/v1/health`
- seed: `POST http://localhost:4000/api/v1/seed/init`

## Scripts

```bash
pnpm start:dev
pnpm build
pnpm start:prod
pnpm lint
pnpm test
pnpm test:e2e
pnpm prisma:validate
pnpm prisma:generate
pnpm prisma:migrate:dev
pnpm prisma:migrate:deploy
```

## Demo Bootstrap

To enable the local reviewer flow:

1. Set `SEED_ENABLED=true` in `.env`
2. Start the backend
3. Call:

```bash
curl -X POST http://localhost:4000/api/v1/seed/init
```

Seeded demo accounts:

- `demo.member@example.com` / `DemoPass123!`
- `demo.admin@example.com` / `DemoPass123!`

## Verification

```bash
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

## Known Issues / Incomplete Functionality

- On Render free tier, outbound SMTP ports are blocked. If you ever re-enable
  email delivery, prefer Resend over HTTPS instead of Gmail SMTP.
- Dormant verification and invite email endpoints remain implemented for
  compatibility, but the default product flow does not use them.
- This package does not currently expose a dedicated standalone `typecheck`
  script. Lint, tests, and build are the main verification steps.

## Related Notes

- [prisma/README.md](./prisma/README.md)
- [src/README.md](./src/README.md)
- [test/README.md](./test/README.md)
- [../README.md](../README.md)
