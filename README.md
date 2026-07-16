# PricePulse Manage

Standalone Next.js admin app for PricePulse content and merchants.

## Features (V1)

- Login via PricePulseSL (`/api/Auth/Login`) — any authenticated account
- Header navigation + sub-navigation CRUD
- Page sections CRUD (filter by page name)
- Section items: assign products / merchants; story + ads images load/replace via S3 (`pagesection/{sectionId}/…`)
- Merchants CRUD with S3 logo upload / replace / delete

Does **not** modify `PricePulseSL` or `price_pulse_SL`. Writes go directly to the shared Postgres database; the public site keeps reading through existing APIs.

## Setup

```bash
npm install
cp .env.local.example .env.local
# fill DATABASE_URL, JWT_*, API_BASE_URL, S3_*
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Purpose |
|----------|---------|
| `API_BASE_URL` | PricePulseSL base URL for auth proxy |
| `JWT_SECRET` / `JWT_ISSUER` / `JWT_AUDIENCE` | Same as PricePulseSL — verify Admin JWT |
| `DATABASE_URL` | Same Postgres as PricePulseSL |
| `S3_*` | Same bucket conventions as PricePulseSLImage |

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — start production server
