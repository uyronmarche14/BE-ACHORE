# Prisma Workspace

This directory owns the MySQL Prisma schema, migrations, and seed entrypoint.

Current scope:

- canonical v1 enums and models
- initial SQL migration
- seed entrypoint placeholder for later stories
- datasource configuration lives in `backend/prisma.config.ts` for Prisma 7

Useful commands from `backend/`:

- `pnpm prisma:validate`
- `pnpm prisma:generate`
- `pnpm prisma:migrate:dev`
- `pnpm prisma:migrate:deploy`
