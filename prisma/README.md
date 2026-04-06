# Prisma Workspace

This directory owns the MySQL Prisma schema and migrations.

Current scope:

- canonical v1 enums and models
- initial SQL migration
- datasource configuration lives in `backend/prisma.config.ts` for Prisma 7

Useful commands from `backend/`:

- `pnpm prisma:validate`
- `pnpm prisma:generate`
- `pnpm prisma:migrate:dev`
- `pnpm prisma:migrate:deploy`
