# Technical Architecture — How Everything Actually Connects

> Straight technical reference, no interview framing. Every claim here is from the real code, not assumed.

---

## 1. How Frontend and Backend Are Connected

They are **two separate processes talking over plain HTTP/REST** — there is no GraphQL, no WebSocket, no tRPC, nothing fancy.

**Local development:**
```
Browser → http://localhost:3000 (Vite dev server, serves React)
              │
              │  fetch('/api/...')
              ▼
        Vite proxy (vite.config.ts) forwards /api/* → http://localhost:3001
              ▼
        Express server (server/index.ts) on port 3001
```
`vite.config.ts` proxies any request starting with `/api` straight to the Express server, so the browser only ever talks to one origin (`:3000`) in dev — no CORS issue locally.

**Production (Render):**
```
Browser → https://your-app.onrender.com
              │
              ▼
        ONE Express process serves BOTH:
          - /api/*        → real API routes
          - everything else → dist/index.html (built React SPA) + static assets
```
There's no separate frontend host — Express does double duty: API server and static file server. `server/index.ts` checks `NODE_ENV === 'production'`, and if true, adds `express.static('dist')` plus a catch-all route that returns `dist/index.html` for any path that isn't `/api/*` (this is what makes client-side routing like `/editor/abc123` work on a hard refresh — Express doesn't know that route, so it just hands back the SPA shell and React Router takes over client-side).

So in prod, frontend↔backend "connection" is same-origin — no CORS needed for the real traffic, though CORS is still configured (see §7) because the app also has to be usable from `localhost` during dev against a deployed backend, and any future separate frontend deploy.

---

## 2. How an API Call Actually Works, End to End

Every single API call from the frontend goes through one file: `src/services/api.ts`. It's not scattered `fetch()` calls all over components — it's centralized.

```
Component (e.g. Editor.tsx)
   → calls api.generate({...})
        → api.ts's post() helper
             1. await supabase.auth.getSession()   ← get the CURRENT token, fresh, every call
             2. attach Authorization: Bearer <token> header
             3. fetch(`/api/generate`, { method: 'POST', headers, body: JSON.stringify(...) })
             4. handleResponse(res)
                  - if !res.ok → throw new Error(serverJson.error)
                  - else → return serverJson
        ← resolved data or thrown Error
   ← component catches error (if any) → toast.error(err.message)
```

**Why fetch the token fresh on every call instead of storing it once:** Supabase access tokens expire and get silently refreshed by the Supabase client SDK in the background; pulling `getSession()` right before each request guarantees you always attach the current valid token instead of a stale cached one.

**On the server side**, every protected route goes through the same middleware chain:
```
Express receives request
   → cors() checks Origin header
   → express.json() parses body (50mb limit — because images travel as base64)
   → requireAuth middleware:
        - reads Authorization header
        - calls supabase.auth.getUser(token)   ← validates against Supabase's own auth server
        - attaches req.user = { id, email }
        - or returns 401 immediately
   → (for /api/generate only) generateRateLimiter middleware:
        - checks in-memory Map for this user's recent request timestamps
        - 429 if ≥5 requests in the last 60 seconds
   → route handler runs, using req.user.id for all DB scoping
   → res.json(...) or res.status(xxx).json({ error })
```

There is **no API gateway, no GraphQL layer, no BFF** — it's a flat Express app with route-level middleware.

---

## 3. How Data Is Fetched From the Database

**Database:** Postgres, hosted and managed by Supabase.

**Client used:** `@supabase/supabase-js` — the official Supabase JS SDK, used in **two separate places** with two different keys and two different trust levels:

| Location | Key used | Trust level |
|---|---|---|
| `server/supabase.ts` (backend) | `SUPABASE_SERVICE_ROLE_KEY` | Full admin access — **bypasses Row Level Security entirely** |
| `src/lib/supabase.ts` (frontend) | `VITE_SUPABASE_ANON_KEY` | Public, safe-to-expose key — normally RLS-restricted, but the frontend doesn't actually query Postgres directly at all — it only uses this client for **auth** (sign in/up/session), not data |

**This is the important part to understand:** the frontend's Supabase client is used *only* for authentication (login, signup, session, token refresh). All actual data (projects, characters, scenes) flows through the Express API, not directly from React to Supabase's Postgres. So the "client-side anon key" never touches your business data tables at all in this app's current design — every read/write of `projects`/`characters`/`scenes` goes: React → Express (service-role key) → Postgres.

**A typical DB read**, e.g. `GET /api/projects/:id`:
```ts
const [{ data: project }, { data: characters }, { data: scenes }] = await Promise.all([
  supabase.from('projects').select('*').eq('id', id).eq('user_id', userId).single(),
  supabase.from('characters').select('*').eq('project_id', id),
  supabase.from('scenes').select('*').eq('project_id', id).order('scene_number'),
]);
```
Three queries fired in parallel via `Promise.all` (not sequential round-trips), all scoped by explicit `.eq('user_id', ...)` / `.eq('project_id', ...)` filters — **this filtering, not Postgres RLS, is what actually enforces "you only see your own data,"** because the service-role key bypasses RLS. RLS policies do exist in the schema (`supabase/setup.sql`) but are dormant/unused given the service-role key — they'd only activate if a client ever queried Postgres directly with the anon key, which currently doesn't happen.

**Query builder, not raw SQL:** Every DB call uses Supabase's fluent query builder (`.select()`, `.eq()`, `.insert()`, `.update()`, `.delete()`, `.single()`) — there is no raw SQL string interpolation anywhere in the route handlers, which is also why SQL injection isn't a realistic risk here (see security doc / interview prep Part 12).

---

## 4. Every Key Used, What Each One Does, and Who's Allowed to See It

| Env var | Used by | Purpose | Exposed to browser? |
|---|---|---|---|
| `GEMINI_API_KEY` | Server only | Google Gemini API — vision (Visual DNA extraction), text (prompt enhancement + LLM-judge scoring), image (`gemini-2.5-flash-image`, `imagen-3.0-generate-002`) | No |
| `SUPABASE_URL` | Server only | Supabase project URL for the service-role client | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Full-access Supabase key — bypasses RLS, used for all DB/storage ops | **Never** — this is the most sensitive key in the app |
| `VITE_SUPABASE_URL` | Frontend (build-time, baked into the JS bundle) | Supabase project URL for the client-side auth SDK | Yes (safe — it's just a URL) |
| `VITE_SUPABASE_ANON_KEY` | Frontend (build-time) | Public anon key — restricted by RLS if ever used for direct queries; here used only for auth flows | Yes (designed to be public) |
| `TOGETHER_API_KEY` | Server only | Together AI — FLUX.1-dev / FLUX.1-schnell-Free image generation | No |
| `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` | Server only | Cloudflare Workers AI — SDXL/dreamshaper/flux-schnell image generation | No |
| `FAL_KEY` | Server only | fal.ai — PuLID face-conditioned generation, LoRA training, face-swap, ESRGAN upscale | No |
| `HF_API_KEY` | Server only (currently dead — service disabled) | Was for Hugging Face's legacy inference endpoint (now permanently decommissioned, 410 Gone) | No |
| *(no key needed)* | Pollinations | Free, unauthenticated image generation endpoint | N/A |

**Rule of thumb baked into this app's design:** any key prefixed `VITE_` gets compiled into the frontend JavaScript bundle and is publicly visible to anyone who opens dev tools — so only ever put keys there that are *meant* to be public (the Supabase anon key is explicitly designed for this; RLS is what would protect it if it were ever used for direct queries). Every other key lives only in server env vars (Render dashboard in prod, `.env` locally) and never crosses into a `VITE_`-prefixed variable.

---

## 5. "Which Agents Are Used" — Important Correction

**This project does not use an AI agent framework.** There's no LangChain, no LangGraph, no CrewAI, no AutoGPT-style autonomous loop, no function-calling/tool-use agent, no vector DB, no RAG. Worth being precise about this in an interview — claiming "agents" when there's none would be an easy thing for an interviewer to puncture.

**What it actually is:** a **fan-out / race + LLM-as-judge pipeline**, hand-rolled with plain `Promise.allSettled` and direct REST/SDK calls. Here's the honest inventory of every model actually called, and what each one does:

| Model / Provider | SDK or raw REST? | Role in the pipeline |
|---|---|---|
| `gemini-2.0-flash` (Google GenAI) | Official `@google/genai` SDK | (a) Visual DNA extraction — vision input, text output. (b) Prompt enhancement — text-to-text rewrite. (c) LLM-judge scoring — vision input (reference + generated image), text output (a 0-100 integer) |
| `gemini-2.5-flash-image` ("Nano Banana") | Official `@google/genai` SDK | One of the image-generation candidates — the only free-tier one that natively *sees* the reference photo while generating (currently quota-gated to 0 on the free tier) |
| `imagen-3.0-generate-002` | Official `@google/genai` SDK | Image-generation candidate, text-only (no reference photo conditioning support on the public API) — 404s without billing enabled |
| FLUX.1-dev / FLUX.1-schnell-Free (Together AI) | Raw `fetch` to `api.together.xyz` | Image-generation candidate, text-only |
| SDXL / dreamshaper-8-lcm / flux-1-schnell (Cloudflare Workers AI) | Raw `fetch` to Cloudflare's REST API | Image-generation candidate, text-only, tries 3 models in sequence until one succeeds |
| Pollinations (`flux-realism`) | Raw `fetch` to `image.pollinations.ai` | Image-generation candidate, text-only, no API key at all |
| fal-ai/flux-pulid | Raw `fetch` to `fal.run` | Image-generation candidate — face-conditioned (sees the reference photo via PuLID identity conditioning) |
| fal-ai/flux-lora | Raw `fetch` to `fal.run` | Image-generation candidate using a per-character fine-tuned LoRA (only if training completed) |
| fal-ai/flux-lora-fast-training | Raw `fetch` to `queue.fal.run` | Async training job — not a generation call, trains a LoRA adapter from 3+ uploaded images |
| fal-ai/face-swap | Raw `fetch` to `fal.run` | Post-processing — replaces a face region in the winning image with the exact reference photo |
| fal-ai/esrgan | Raw `fetch` to `fal.run` | Post-processing — 2x upscale + GFPGAN face restoration |
| HF FLUX.1-dev/schnell (Hugging Face) | Raw `fetch` — **disabled/dead** | Was a text-only image candidate; endpoint permanently decommissioned |

None of these call each other, none of them use tools/function-calling, none maintain conversation memory across calls — each is a single stateless request/response. The only thing that resembles "agent-like" behavior is Gemini being called with a **judge role** (score this image against this reference) rather than a **generator role** — but that's just a different prompt against the same stateless text/vision model, not an agent.

**If asked "what agent framework did you use" in an interview, the accurate answer is:** *"None — I didn't use an agent framework like LangChain because this doesn't need multi-step autonomous reasoning or tool use. It's a fixed, hand-coded pipeline: enhance → race N models in parallel → score with an LLM judge → pick winner → retry-if-low → post-process. Each step is a single deterministic API call, so a framework would have added abstraction without solving a problem I actually had."* That's a stronger answer than pretending to use one.

---

## 6. Techniques / Algorithms Actually Implemented

1. **Fan-out / race pattern** — `Promise.allSettled([...8 generator calls])`. Not `Promise.all` (which would reject the whole batch if any single call throws) and not a sequential loop (which would be 8x slower). This is the core reliability mechanism given the app runs on unreliable free-tier APIs.

2. **Visual DNA extraction (vision-to-text distillation)** — a one-time (per character upload/edit) call: reference photo → Gemini vision → dense text paragraph covering face shape, skin tone, eyes, hair, clothing, distinguishing marks. That text spec is then reused verbatim in every future scene prompt for that character. This is the core trick that lets *text-only* image models (which never see the photo) still produce a recognizably similar character — the "identity" is carried as a detailed text description, not as pixels.

3. **Prompt enhancement (LLM rewriting)** — the user's raw scene prompt is rewritten once per scene by Gemini into a more detailed, cinematically-specific version (lighting, composition, face visibility instructions) before being sent to the 8 generators. This is a single text-to-text transformation, not iterative refinement.

4. **Median-of-3 voting for consistency scoring** — instead of trusting one LLM call's subjective 0-100 score, the same scoring prompt is sent 3 times in parallel, and the **median** (not mean) of the 3 results is used. Median is chosen specifically because it's robust to a single outlier vote — an LLM occasionally gives a wildly different score on one of three otherwise-similar attempts, and median discards that noise, whereas an average would let it skew the result.

5. **Weighted composite scoring** — `score = round(consistency * 0.65 + quality * 0.35) + identityBonus`. Consistency (face/appearance match) is weighted higher than general image quality (sharpness/anatomy/artifacts) because the entire point of the app is character consistency, but quality still matters enough to prevent a blurry-but-technically-consistent image from winning. `identityBonus = +5` is added only for models that saw the actual reference photo during generation (`gemini-image`, `fal-pulid`, `fal-lora`) and only when a reference photo actually exists for that character — a deliberate tiebreak favoring models that had real photo grounding over ones that only had text.

6. **Auto-retry-below-threshold** — if the winning candidate's score is still under 60, one extra generation attempt is made with a `[CONSISTENCY PRIORITY]`-prefixed prompt, and only replaces the original winner if it actually scores higher. This is a single bounded retry, not a retry loop — avoids infinite loops or runaway cost if a character/prompt combination is just inherently hard for every model.

7. **Sequential dependent post-processing chain** — face-swap for multiple characters is applied one at a time, not in parallel, because each swap's *output* becomes the *input* base image for the next character's swap (compositing faces onto an already-partially-edited image) — a genuine data dependency, not a missed parallelization opportunity.

8. **Graceful-degradation-by-null** — every external service function follows the same contract: return the real result on success, return `null` on any failure (missing key, network error, bad response), never throw past its own boundary except where the caller explicitly wants to catch a hard failure (e.g., `applyFaceSwaps` catches per-character and continues to the next one rather than aborting the whole swap chain).

9. **In-memory sliding-window rate limiting** — a `Map<string, number[]>` storing recent request timestamps per user, filtered against a 60-second window on every check. Simple counting algorithm, not a token-bucket or leaky-bucket — appropriate given the low limit (5/min) and single-process deployment.

---

## 7. Frameworks / Libraries — What's Actually a "Framework" Here

**Frontend framework:** React 19 + Vite (build tool/dev server) + Tailwind CSS (utility-first styling) + React Router v6 (client-side routing) + `react-hot-toast` (toast notifications). No state-management framework (no Redux/Zustand/Recoil) — just React Context for auth/session and local `useState` per page.

**Backend framework:** Express 4 (minimal, unopinionated Node HTTP framework) + TypeScript, executed directly via `tsx` (a TS-executing runtime) rather than compiled with `tsc` ahead of time.

**Database/BaaS framework:** Supabase — Postgres + Auth + Storage as one managed product, accessed via the official `@supabase/supabase-js` client.

**AI SDK:** only one official SDK is used — `@google/genai` (Google's official Gemini/Imagen JS SDK) — for every Gemini/Imagen call. Every other AI provider (Together, Cloudflare, Pollinations, fal.ai, HF) is integrated via **raw `fetch()` calls to their REST APIs directly** — no SDK dependency for any of them. This was a deliberate choice: these providers' REST APIs are simple enough that adding an SDK dependency per provider wasn't worth the extra `node_modules` weight for what's a handful of `fetch` calls each.

**No AI agent framework, no ORM (Supabase's query builder replaces the need for one), no test framework, no logging framework, no queue/worker framework.**

---

## 8. One-Diagram Summary

```
┌─────────────┐     Bearer token      ┌──────────────────┐
│   Browser   │ ─────────────────────▶│  Express (:3001)  │
│  React SPA  │◀───────────────────── │  requireAuth      │
└──────┬──────┘      JSON response     │  rateLimiter      │
       │                               └─────────┬─────────┘
       │ auth only                                │
       ▼                                          ▼
┌─────────────┐                         ┌───────────────────┐
│  Supabase   │◀────────────────────────│  Supabase (service │
│  Auth (anon │      service-role key   │  role) — Postgres  │
│  key, client)│                        │  + Storage         │
└─────────────┘                         └─────────┬──────────┘
                                                   │
                          route: /api/generate     ▼
                          ┌───────────────────────────────────────┐
                          │  1. enhance prompt (Gemini text)       │
                          │  2. race 8 image generators in parallel│
                          │     (Gemini image, Imagen, Together,   │
                          │      Cloudflare, Pollinations,         │
                          │      fal PuLID, fal LoRA, [HF: dead])  │
                          │  3. score each: median-of-3 consistency│
                          │     + quality (Gemini text/vision)     │
                          │  4. pick winner, retry if score < 60   │
                          │  5. optional: fal face-swap + upscale  │
                          │  6. upload final image to Storage      │
                          │  7. persist scene row, increment usage │
                          └───────────────────────────────────────┘
```
