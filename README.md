## One-Click Unsubscribe Manager (MVP A)

Gmail-only dashboard that:

- Scans recent emails and groups likely subscriptions
- Uses `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058) when available
- Falls back to `mailto:` unsubscribe when provided

### Tech

- Next.js (App Router) + Tailwind + shadcn/ui
- Auth: `next-auth` (Google OAuth with Gmail scopes + offline refresh token)
- DB: Prisma + Postgres (Supabase)
- Queue: BullMQ + Redis (Upstash/Redis Cloud)

## Getting Started

### 1) Create a Supabase Postgres database

- Create a project in Supabase
- Copy the Postgres connection string into `DATABASE_URL`

### 2) Create a Redis instance (Upstash recommended)

- Copy the Redis URL into `REDIS_URL`

### 3) Configure Google OAuth

Create credentials in Google Cloud Console:

- OAuth consent screen: add your test users
- OAuth client: **Web application**
- Authorized redirect URI:
	- `http://localhost:3000/api/auth/callback/google`

This app requests Gmail scopes:

- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.send`

### 4) Configure env vars

Create `.env` (or `.env.local`) using [.env.example](.env.example):

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `REDIS_URL`

Generate a secret with:

`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

### 5) Set up the database schema

`npm run prisma:push`

Or, if you want migrations:

`npm run prisma:migrate`

### 6) Run the app + worker

In terminal 1:

`npm run dev`

In terminal 2:

`npm run worker`

Open http://localhost:3000, sign in with Google, then go to `/dashboard` and click **Scan inbox**.

## Notes

- “One-click” is only truly possible when the sender supports RFC 8058. Otherwise we fall back to sending the `mailto:` unsubscribe email.
- This MVP stores OAuth refresh tokens server-side (in Postgres via Prisma). Treat your DB as sensitive.
