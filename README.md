# Shepherd Desk

Church management for Nigerian churches: members, attendance, first-timer follow-up, giving and finance, WhatsApp messaging, children's check-in, reports, and multi-branch HQ tools — built so a single church can run everything from a phone and grow into a branch network without changing tools.

Built by [Petronix Technology LLC](https://petronixtechnology.com). Working name; the product name is not final.

---

## Two builds, one source

All the application code lives in [`src/`](src). `./build.sh` compiles it into two things:

| Output | What it is |
| --- | --- |
| `shepherd-desk.html` | The single-file prototype. Opens anywhere; records are kept in the browser it is opened in (or in the Claude artifact database when hosted there). |
| `web/` | The real product: a **Next.js** app with **Supabase** for the database, authentication and realtime sync. Deploys to Vercel. |

Run `./build.sh` after changing anything in `src/`. It regenerates `shepherd-desk.html`, `web/lib/app.generated.js` and `web/app/app.css`, and syntax-checks the bundle. Never edit those three generated files by hand.

```
src/core.js      constants, data store, formatting, charts
src/views1.js    shell, setup wizard, dashboard, members, attendance, follow-up
src/views2.js    giving & finance, messages, children's check-in, reports, branches, settings
src/actions.js   all click/form handlers and start-up
src/app.css      the whole stylesheet (light and dark)
web/             Next.js app, Supabase client, store adapter, SQL schema
seed/            script that generates example records for demos
```

---

## Setting it up

### 1. Supabase (database and accounts)

1. Create a free project at [supabase.com](https://supabase.com). Pick a region close to Nigeria (Frankfurt or London are the usual choices).
2. Open **SQL Editor → New query**, paste the whole of [`web/supabase/schema.sql`](web/supabase/schema.sql), and run it. This creates the tables, the row-level security policies and the sign-up functions.
3. Open **Authentication → Providers → Email** and make sure email sign-in is on. While testing, turning *Confirm email* off lets accounts sign in immediately.
4. Copy **Project Settings → API → Project URL** and the **anon public** key.

### 2. Run it locally

```bash
cd web
cp .env.example .env.local     # paste your Supabase URL and anon key
npm install
npm run dev                    # http://localhost:3000
```

### 3. Deploy on Vercel

1. Push this repository to GitHub (already done if you are reading it there).
2. In Vercel, **Add New → Project → Import** this repository.
3. Set **Root Directory** to `web`. Vercel detects Next.js; no other build settings are needed.
4. Add two environment variables, for all environments:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy. Every push to `main` redeploys automatically.
6. Add your own domain in Vercel → Project → Settings → Domains when you're ready.

### First run

The first person to sign up chooses **Start a new church** and becomes its admin. Settings then shows an 8-character **church code**; everyone else on the team creates their own account, chooses **Join with a code**, and enters it.

---

## How the data is stored

Every record — a member, a service, a giving entry — is one JSON document in the `records` table, keyed by `(church_id, col, doc_id)`. Row-level security ties every row to the signed-in user's church, so one church can never read another's data. Supabase realtime pushes changes to every open tab.

This keeps the app simple and fast to change while the product is young. If reporting later needs SQL joins across members and giving, those collections can be promoted to proper tables without touching the UI code — the whole data layer is the ~90 lines in [`web/lib/store.js`](web/lib/store.js).

## Plans

The app carries two plan families, Single Church (Starter, Basic, Standard, Premium) and Multi-Branch (Branch Network, Enterprise). Plan switching is in Settings and gates features in the UI. **No payment provider is connected yet**, and naira prices are placeholders pending pilot interviews.

## Known gaps

These are deliberate for the first version:

- **Roles are enforced in the interface, not in the database.** Any signed-in member of a church can technically write any of that church's records. Per-role database policies are the next security task before real finance data goes in.
- **No offline mode yet.** The PRD calls for attendance and offering counts to work without network and sync later.
- **Online giving and bulk WhatsApp/SMS are not connected.** Paystack/Flutterwave and the WhatsApp Business API are planned; today the app opens each WhatsApp chat with the message prefilled.
- **No QR check-in.** Children's check-in uses printed/typed pickup codes.
- Nigeria's Data Protection Act 2023 duties (consent text, privacy policy, data export and deletion on request) still need to be written in.

## Example data

`python3 gen_seed.py` writes `seed/local.json` and per-document JSON files used to load a demo church (about 130 records: members, 12 Sundays of attendance, giving, expenses, counts, check-ins). Useful for showing the app to pastors before real data exists.

## Licence

© Petronix Technology LLC. All rights reserved.
