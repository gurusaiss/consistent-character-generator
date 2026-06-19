# Deploying ConsistentAI — free tier, end to end

You already have the GitHub repo. This gets you a **live URL** using only
forever-free services. Total time: ~25 minutes.

| Service | Role | Cost |
|---|---|---|
| **Supabase** | Database + Auth + image storage | Free forever* |
| **Google AI Studio** | Gemini API key (image gen + scoring) | Free forever (rate-limited) |
| **Render** | Hosts the Node app (API + frontend, one service) | Free forever** |
| **Together AI** | *Optional* second model (FLUX) | Skip for now |

\* Supabase free projects **pause after 7 days of no activity** — just open the
dashboard to wake it. \*\* Render free services **sleep after 15 min idle**;
the first request then takes ~50s to wake. Fine for a portfolio/demo.

---

## Step 1 — Supabase (database + storage + auth)

1. Go to <https://supabase.com> → sign in with GitHub → **New project**.
   Pick a name, a strong DB password, the region closest to you. Wait ~2 min.
2. Left sidebar → **SQL Editor** → **New query**. Open `supabase/setup.sql`
   from this repo, paste the **entire** file, click **Run**. You should see
   "Success". This creates all tables, security rules, the signup trigger, and
   the two public storage buckets.
3. Left sidebar → **Authentication** → **Providers** → make sure **Email** is
   enabled. For an easy demo, go to **Authentication → Sign In / Providers →
   Email** and turn **OFF** "Confirm email" (so you can log in instantly
   without a confirmation mail). You can re-enable it later.
4. Left sidebar → **Project Settings → API**. Copy these four values — you'll
   paste them into Render in Step 3:
   - **Project URL** → used for both `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - **anon / public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key (click reveal) → `SUPABASE_SERVICE_ROLE_KEY`
     ⚠️ Secret — server only, never in the browser.

---

## Step 2 — Gemini API key

1. Go to <https://aistudio.google.com/apikey> → sign in with Google.
2. **Create API key** → copy it. This is your `GEMINI_API_KEY`.
   The free tier is enough to demo; it's rate-limited, not time-limited.

---

## Step 3 — Render (the live link)

1. Go to <https://render.com> → sign in with GitHub.
2. **New → Blueprint** → select your `consistent-character-generator` repo.
   Render reads `render.yaml` and proposes one free web service. Click
   **Apply**.
3. It will ask for the environment variables marked secret. Fill in:

   | Key | Value |
   |---|---|
   | `GEMINI_API_KEY` | from Step 2 |
   | `SUPABASE_URL` | Supabase Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
   | `VITE_SUPABASE_URL` | Supabase Project URL (same as above) |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
   | `NODE_ENV` | `production` (already set by the blueprint) |

   (`TOGETHER_API_KEY` — leave blank.)
4. Click **Create / Deploy**. First build takes ~3–5 min. When it finishes
   you get a URL like `https://consistentai.onrender.com` — **that's your
   live link.**

> If you didn't use the Blueprint: New → **Web Service** → pick the repo →
> Build Command `npm install --include=dev && npm run build` →
> Start Command `npm start` → add the same env vars → Create.

---

## Step 4 — Verify it works

1. Open your Render URL. You should see the ConsistentAI home page (not the
   "Configuration Required" screen — if you see that, an env var is missing or
   misspelled; fix it in Render → Environment and redeploy).
2. **Sign Up** with an email + password → you land on the dashboard.
3. New Project → add a character **with a reference image** (this triggers
   Visual DNA extraction) → write a scene → **Generate**. First generation may
   be slow if the service was asleep.
4. Confirm the generated image shows a **consistency % badge**. Toggle the
   project **Public** and open the copied `/share/...` link in a private window.

---

## Common gotchas

- **Blank page / "Configuration Required":** a `VITE_*` var is missing. These
  are baked in at build time, so after fixing them you must **redeploy** (Render
  → Manual Deploy → Clear build cache & deploy).
- **Images upload but don't display:** the storage buckets aren't public. Re-run
  `supabase/setup.sql` (it forces both buckets public).
- **"Generation limit reached":** each user gets 30 free generations. Bump it in
  Supabase → Table Editor → `profiles` → `generations_limit`.
- **First request very slow:** Render free service was asleep (~50s cold start).
  Normal. To keep it warm you can ping `/api/health` every 10 min with a free
  uptime monitor (e.g. UptimeRobot), but that's optional.
