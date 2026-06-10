# waraichbani.com — Reports

A private, access-controlled reports system for [waraichbani.com](https://waraichbani.com).
Bani publishes HTML reports/proposals and shares them with specific people via
personal invite links. **Recipients don't need accounts** — they open a report
through a signed token in their link. Bani manages everything from a private
admin dashboard.

## Stack

- **Next.js 14** (App Router) on **Vercel**
- **Postgres** via `@vercel/postgres` (works with Vercel Postgres / Neon)
- **NextAuth.js** with Google OAuth — admin (Bani) only
- **Resend** for invite + view-notification emails
- **Vercel Blob** for stored HTML report files
- **Tailwind CSS**

## URL structure

| Route | Who | Description |
|---|---|---|
| `/reports` | Bani (authenticated) | Admin dashboard |
| `/reports/cms` | Bani (authenticated) | Upload / replace report HTML |
| `/reports/signin` | Public | Google sign-in for the admin |
| `/reports/[slug]` | Token holder | The report itself |
| `/reports/[slug]?token=xxx` | Token holder | Token validated, stored in cookie, then stripped from URL |

## Local setup

```bash
git clone <repo> && cd waraichbani.com
npm install
cp .env.local.example .env.local   # then fill in the values
npm run migrate                    # create tables in the database
npm run dev                        # http://localhost:3000
```

### Environment variables

See `.env.local.example`. Summary:

- `NEXTAUTH_SECRET` — random string (`openssl rand -base64 32`)
- `NEXTAUTH_URL` — base URL (`http://localhost:3000` locally)
- `NEXTAUTH_ALLOWED_EMAIL` — **Bani's** Google email; the only account allowed in
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
  (Authorized redirect URI: `<NEXTAUTH_URL>/api/auth/callback/google`)
- `POSTGRES_URL` — Postgres connection string
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob token
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — Resend API key + verified sender
- `NEXT_PUBLIC_BASE_URL` — public base URL used in emails + copied links

### Migrations

Forward-only SQL files live in `/migrations` (numbered). The runner tracks
applied files in a `_migrations` table, so re-running only applies new ones:

```bash
npm run migrate
```

## Deploy to Vercel

1. Push the repo and **import the project** in Vercel.
2. Add a Postgres store (Vercel Postgres or Neon) and a Blob store; Vercel
   injects `POSTGRES_URL` and `BLOB_READ_WRITE_TOKEN` automatically.
3. Add the remaining env vars (NextAuth, Google, Resend) in
   **Project → Settings → Environment Variables**. Set `NEXTAUTH_URL` and
   `NEXT_PUBLIC_BASE_URL` to `https://waraichbani.com`.
4. Add `https://waraichbani.com/api/auth/callback/google` to the Google OAuth
   client's authorized redirect URIs.
5. Run migrations against the production DB once:
   `POSTGRES_URL="<prod url>" npm run migrate`
6. Deploy.

## How the token system works

- Each invited recipient gets one row in `access_tokens` with a
  `crypto.randomBytes(32).toString("base64url")` token — 256 bits of entropy.
- The invite email links to `/reports/{slug}?token={token}`.
- `middleware.ts` validates the query token (via `/api/validate-token`), and on
  success sets an **httpOnly, secure, sameSite=strict** cookie
  (`report_token_{slug}`, 30 days) scoped to that report's path, then redirects
  to the clean URL so the token never lingers in the address bar.
- The viewer page re-validates the cookie **server-side** on every load, fetches
  the HTML from Blob server-side (the Blob URL is never exposed to the browser),
  and renders it full-page in a chrome-free iframe.
- Revoking a token (`access_tokens.revoked = true`) immediately blocks access on
  the next request.
- A view is recorded once per token per calendar day. If the token has
  `notify_on_view`, Bani gets an email. A small script pings `/api/session-ping`
  every 30s so time-on-page is tracked.

## Adding / updating a report

**New report (with recipient):** Dashboard → **+ New Report**. Provide a title,
slug, the `.html` file, and a recipient. On submit the file is uploaded to Blob,
DB rows are created, and the invite email is sent.

**Replace a report's HTML:** **CMS** → drop the new `.html` file → preview it in
the sandboxed iframe → pick the target report → **Save**. This overwrites the
Blob file and bumps `updated_at`; existing tokens keep working.

**Invite more people to an existing report:** open the report in the dashboard
detail panel → **+ Add recipient**.

**Archive a report:** detail panel → *Archive report & revoke all access*
(soft-delete: all tokens revoked, report hidden; the Blob file remains).
