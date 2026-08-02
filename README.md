# Consistent Character Generator (ConsistentAI)

An AI storyboard generator that keeps a character's appearance consistent across scenes. Reference photos are distilled into a text "Visual DNA" spec by Gemini vision, then every scene races several image models in parallel and an LLM judge picks the best result.

![Stack](https://img.shields.io/badge/Stack-React_19_+_Express_+_Supabase-7c3aed?style=flat-square)
![AI](https://img.shields.io/badge/AI-Gemini_+_FLUX_+_fal.ai-06b6d4?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square)

## Features

- **Auth** — Supabase Auth (email/password + Google OAuth)
- **Multi-project dashboard** — create/manage storyboard projects, public share links
- **Character library** — reference photo → Gemini-extracted "Visual DNA" text spec, optional multi-image LoRA fine-tuning
- **Multi-model generation race** — Gemini image, FLUX (Together AI), Cloudflare Workers AI, Pollinations, and fal.ai (PuLID/LoRA) generate in parallel per scene
- **LLM-judge scoring** — median-of-3 consistency vote + quality vote, weighted 65/35, +5 identity bonus for face-conditioned models, auto-retry below score 60
- **Optional post-processing** — fal.ai face-swap + ESRGAN/GFPGAN upscale (requires fal.ai balance)
- **Prompt enhancement** — Gemini rewrites raw scene prompts for cinematic detail before generation
- **Credits/usage limiting** — per-user generation cap, in-memory rate limiter
- **PDF/zip export** of a finished storyboard

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router v6 |
| Backend | Express 4, TypeScript (run directly via `tsx`, no compile step) |
| Database | Postgres via Supabase, Row Level Security policies (server uses the service-role key — RLS is defense-in-depth, not the live enforcement path; see `server/utils/ownership.ts`) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (two public buckets: `character-references`, `generated-scenes`) |
| AI — image | Gemini image (`@google/genai`), Imagen 3, Together AI FLUX, Cloudflare Workers AI, Pollinations, fal.ai PuLID/LoRA |
| AI — text/vision | Gemini 2.0 Flash (Visual DNA extraction, prompt enhancement, LLM-judge scoring) |
| Dev | concurrently, react-hot-toast, compression |

Several free-tier AI dependencies are inherently unreliable (rate limits, deprecations, balance exhaustion) — every generator service returns `null` on failure instead of throwing, so the race degrades gracefully rather than failing the whole request.

## Setup

### Prerequisites
- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/apikey)
- A [Supabase](https://supabase.com) project (run `supabase/setup.sql` once in the SQL editor)
- Optional: [Together AI](https://api.together.xyz), [Cloudflare Workers AI](https://dash.cloudflare.com), [fal.ai](https://fal.ai/dashboard/keys) keys — the app runs without them, with a smaller generator pool

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env
# Edit .env — fill in GEMINI_API_KEY and Supabase vars at minimum

# 3. Start dev server (client on :3000, API on :3001)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build    # Vite builds frontend to dist/
npm start        # Express serves dist/ + API on the same process
```

Deployed as a single Render Blueprint service (`render.yaml`). CI runs on GitHub Actions (`.github/workflows/ci.yml`): typecheck → test → build on every push.

## Project Structure

```
├── server/
│   ├── index.ts              # Express app: CORS, compression, routes, SPA fallback, error handler
│   ├── supabase.ts           # Service-role Supabase client
│   ├── middleware/
│   │   ├── auth.ts           # requireAuth — validates Supabase Bearer token
│   │   └── rateLimiter.ts    # In-memory sliding-window limiter (5 req/60s)
│   ├── utils/ownership.ts    # userOwnsProject/Character/Scene — real authz layer (RLS is bypassed server-side)
│   ├── routes/
│   │   ├── projects.ts       # CRUD for projects
│   │   ├── characters.ts     # CRUD + Visual DNA extraction + LoRA training
│   │   ├── scenes.ts         # CRUD for scenes (bulk replace on save)
│   │   ├── generate.ts       # The core pipeline — race, score, retry, post-process
│   │   ├── profile.ts        # Usage/credits
│   │   └── share.ts          # Public read-only share links
│   └── services/              # One file per AI provider (fal, HF, Together, Cloudflare, Pollinations, Gemini image, upscale, face-swap, LoRA, prompt enhance)
└── src/
    ├── pages/                 # Home, Auth, Dashboard, Editor, Gallery, ShareView
    ├── components/            # CharacterPanel, SceneList, FilmStrip, ResultsGrid, etc.
    ├── services/api.ts        # Typed API client — attaches Supabase Bearer token per call
    └── types/index.ts         # Shared TypeScript interfaces
```

## How It Works

1. **Create a project** on the Dashboard
2. **Add a character** — name, description, reference photo; Gemini extracts a Visual DNA text spec from it
3. **Write scenes** — describe what happens in each scene
4. **Generate** — the prompt is enhanced, raced across several image models, scored by an LLM judge, and the winner (optionally face-swapped/upscaled) is saved
5. **Export** as a PDF/zip or share a public read-only link

## Environment Variables

See `.env.example` for the full list. `GEMINI_API_KEY` and the Supabase vars are required; `TOGETHER_API_KEY`, `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`, and `FAL_KEY` are optional — each missing key simply removes that provider from the generation race rather than breaking the app.

## Known Gaps

- Rate limiter is in-memory — resets on restart, not shared across multiple instances
- No embedding-based face-similarity metric — consistency scoring is LLM-judge-only
- fal.ai generators (face-swap, LoRA, upscale) require a paid balance; they degrade gracefully to null when balance is zero
