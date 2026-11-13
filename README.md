# Termin API

Appointment booking backend for German public services (Anmeldung, Aufenthaltstitel). The core guarantee: **a slot can never be booked twice**, even when many requests arrive at the same time.

[![CI](https://github.com/roudihannanIT/termin-api/actions/workflows/ci.yml/badge.svg)](https://github.com/roudihannanIT/termin-api/actions/workflows/ci.yml)

## Stack

Node.js 20.19+, TypeScript (strict), Express 5, PostgreSQL 16, Prisma 7 (pg adapter), Zod, JWT, bcrypt, Vitest, Supertest, Docker Compose.

## Run locally

Requirements: Node.js 20.19+ and Docker Desktop.

```bash
git clone https://github.com/roudihannanIT/termin-api.git
cd termin-api
npm install
docker compose up -d
```

The Docker container creates two databases automatically: `termin` (development) and `termin_test` (tests).

Create your environment file (PowerShell; on macOS/Linux use `cp .env.example .env`):

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set `JWT_SECRET` to a random value of at least 32 characters.

Apply migrations and start the server:

```bash
npx prisma migrate deploy
npm run dev
```

The API listens on `http://localhost:3000`.

## Tests

Tests run only against `termin_test`. `tests/setup.ts` refuses to start if `DATABASE_URL` is missing or points to another database, because the suite deletes rows in `beforeEach`.

```powershell
$env:DATABASE_URL="postgresql://termin:termin@localhost:5432/termin_test?schema=public"
npx prisma migrate deploy
npm test
```

Open a new terminal afterwards, so the variable does not stay set for `npm run dev`.

## Create the first admin

Admins are never created through the API. The seed script creates or promotes one user from environment variables:

```powershell
$env:ADMIN_EMAIL="admin@termin.local"
$env:ADMIN_PASSWORD="<at-least-12-characters>"
npx prisma db seed
```

## API

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | /auth/register | public | Create a USER account |
| POST | /auth/login | public | Get a JWT (valid 15 minutes) |
| GET | /offices | public | List offices |
| POST | /offices | ADMIN | Create an office |
| POST | /offices/:id/services | ADMIN | Add a service to an office |
| POST | /services/:id/slots/generate | ADMIN | Generate slots at a fixed step |
| GET | /services/:id/slots?from&to&limit | public | Free slots in a time range |
| POST | /bookings | USER | Book a slot, body `{ "slotId": "..." }` |
| DELETE | /bookings/:id | owner | Cancel your booking |
| GET | /admin/users | ADMIN | List users |

Protected routes expect the header `Authorization: Bearer <token>`. Errors use one shape: `{ "error": { "code": "...", "message": "..." } }`.

## How the no-double-booking guarantee works

Three layers, from the database outward:

1. **Partial unique index** on `Booking(slotId) WHERE status = 'CONFIRMED'`. The database rejects a second confirmed booking for the same slot, independent of application code.
2. **Row lock.** `createBooking` runs in a transaction and locks the slot row with `SELECT ... FOR UPDATE`, so concurrent requests for the same slot wait for each other.
3. **Error mapping.** A unique violation (`P2002`) from layer 1 becomes `409 SLOT_TAKEN`.

Prisma cannot express partial indexes in `schema.prisma`, so the index is written by hand in migration `20261113121535_add_bookings`.

### Test evidence

`tests/bookings.concurrency.test.ts` sends 50 booking requests for one slot in parallel. It asserts exactly one `201`, 49 `409` responses, and exactly one `CONFIRMED` row in the database.

## Project structure

```
src/
  app.ts                  Express app factory (no port, testable)
  server.ts               Entrypoint with graceful shutdown
  config/env.ts           Environment validation with Zod
  lib/prisma.ts           Shared Prisma client (pg adapter)
  middleware/             requireAuth, requireRole
  modules/                auth, offices, slots, bookings, admin
docker/init-test-db.sql   Creates termin_test on first container start
prisma/
  schema.prisma
  migrations/             includes the hand-written partial index
  seed.ts
tests/                    Vitest + Supertest, run against termin_test
.github/workflows/ci.yml  CI: migrate, typecheck, test on Postgres 16
```

## Decisions and trade-offs

- **Prisma 7 with the pg adapter.** The database URL is read from `prisma.config.ts`, and the runtime client receives an explicit adapter.
- **Admins are never created through the API**, only by the seed script. This prevents self-promotion.
- **Access tokens last 15 minutes, with no refresh tokens yet.** Refresh rotation is the next step if sessions must last longer.
- **The role is read from the JWT.** A role change takes effect at the next login.
- **Slots are generated at a fixed step.** Opening hours and holidays are not modeled yet.
- **Cancelled bookings free the slot**, because the uniqueness rule only applies to `CONFIRMED` rows.
- **Test users are created directly in the database** with one shared bcrypt hash. Fifty HTTP logins with bcrypt cost 12 exceed reasonable test timeouts.

## Not included yet

Wait list, outbox and notifications, Redis caching and rate limiting, refresh tokens, metrics, and deployment.