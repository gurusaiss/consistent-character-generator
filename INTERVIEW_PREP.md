# Interview Prep — Consistent Character Generator (ConsistentAI)

> Generated from an actual read of the codebase. Every claim below is traceable to a real file. Where the project has a genuine weakness, it's called out — don't paper over it in the room, own it.

---

## PART 1 — PROJECT SUMMARY

**Problem statement:** AI image generators (DALL·E, Midjourney, base FLUX) can't keep a character's face/appearance consistent across multiple generated images. That breaks any use case needing a recurring character — storyboards, comics, children's books, marketing series.

**Solution:** A full-stack app where a user uploads one or more reference photos per character, the app extracts a dense text "Visual DNA" from that photo via Gemini vision, then for every scene prompt it races several image models in parallel, has an LLM judge score each for consistency + quality, and returns the best one. Optional face-swap/upscale post-processing and LoRA fine-tuning exist for higher-fidelity paid tiers.

**Target users:** Solo creators/writers who want a consistent-looking cast across a storyboard/comic without hiring an illustrator or manually inpainting faces — a portfolio-grade demo, not a production SaaS with paying customers yet.

**Core features:**
- Auth (Supabase Auth), project/character/scene CRUD
- Visual DNA extraction (Gemini vision → text spec) from a reference photo
- Prompt enhancement (Gemini rewrites the scene prompt for cinematic detail + face clarity)
- Multi-model parallel generation race (Gemini image, Together/FLUX, Cloudflare Workers AI, Pollinations, fal.ai PuLID/LoRA) — HF disabled (dead endpoint)
- LLM-judge scoring: median-of-3 consistency vote + quality vote → weighted score, +5 identity bonus for face-conditioned models
- Auto-retry if winner score < 60
- Optional face-swap + ESRGAN/GFPGAN upscale post-processing (fal.ai)
- Optional LoRA fine-tuning per character (fal.ai, needs 3+ images)
- Credits/usage limiting per user, in-memory rate limiter
- Public share links, PDF/zip export

**Tech stack:** React 19 + Vite + Tailwind (frontend), Express 4 + TypeScript run via `tsx` (backend, no compile step in prod), Supabase (Postgres + Auth + Storage), Google Gemini API (`@google/genai`), Together AI, Cloudflare Workers AI, Pollinations (free, no key), fal.ai REST APIs (PuLID/LoRA/face-swap/ESRGAN) via raw `fetch` (no SDKs). No test suite. No Docker. Single Render web service serves both API and the built SPA.

**High-level architecture:** One Express app, one Postgres DB (4 tables: `profiles`, `projects`, `characters`, `scenes`), two public Supabase Storage buckets. Auth is stateless — server validates the client's Supabase access token per-request via `supabase.auth.getUser(token)`; no custom JWT/session code. Server holds the Supabase **service-role key**, so it bypasses RLS — authorization is enforced by explicit `.eq('user_id', ...)` filters in route handlers, not by RLS (a genuine known gap on the characters/scenes routes — see Part 12).

**Deployment:** Single Render Blueprint (`render.yaml`), free-tier web service, manual env var entry, no CI/CD (`no .github/workflows`), no Docker. `npm start` runs `tsx server/index.ts` directly in production — the TypeScript is never compiled to JS for the server (only the frontend goes through `vite build`).

**AI usage:** This *is* the product — Gemini (vision DNA extraction, prompt rewriting, image generation, LLM-as-judge scoring), plus FLUX (Together/HF/Cloudflare), Pollinations, and fal.ai (PuLID face conditioning, LoRA training, face-swap, ESRGAN upscaling).

**My contribution:** Solo build, iterative over ~30 commits (v1 client-only prototype → v2 full-stack rewrite → v3 Supabase migration/auth → v4-v6 character-consistency engine, multi-model race, Visual DNA, scoring, LoRA, face-swap). Used Claude as a pair-programmer throughout (visible in commit co-author trailers) but owned every architectural decision — the multi-model race + LLM-judge scoring design, the Visual DNA pipeline, and the graceful-degradation strategy for a stack built entirely on free tiers.

---

## PART 2 — 2-MINUTE INTRODUCTION

> "I built a tool that solves a specific problem with AI image generation: character consistency. If you ask any image model to draw the same person across ten different scenes, the face subtly changes every time — different nose, different eyes — because these models have no memory between calls.

> My approach: when a user uploads a reference photo for a character, I don't just store the image — I send it to Gemini's vision model and have it write out a dense text specification: exact face shape, skin tone, eye color, hair, clothing. I call this the character's 'Visual DNA.' That spec gets injected into every single scene prompt, so even though each generation call is stateless, the model is always working from the same detailed description.

> Then, instead of trusting one image model, I race several in parallel for every scene — Gemini's native image model, FLUX through Together AI, Cloudflare's Workers AI, and a couple of others — and I use a second Gemini call as an LLM judge to score each result for consistency against the reference and for general image quality. The highest-scoring image wins, and if nothing scores above a threshold, it automatically retries with a consistency-prioritized prompt.

> I also built optional face-swap and LoRA fine-tuning paths through fal.ai for even tighter identity matching, though those are gated behind paid API balance, so the free path — Visual DNA plus multi-model racing — is what actually runs by default.

> On the engineering side: React and Vite on the frontend, Express and TypeScript on the backend, Supabase for Postgres, auth, and storage. It's deployed as a single service on Render. I made a deliberate choice to keep this on entirely free-tier infrastructure where possible, which meant designing every AI service call to fail gracefully — if fal.ai's balance runs out or Gemini's image quota is hit, the pipeline doesn't crash, it just drops that candidate from the race and keeps going with whatever succeeded.

> It's a solo project, and the most interesting part for me wasn't the AI wrapper — anyone can call an API — it was designing the scoring and fallback architecture so the system degrades gracefully instead of failing outright when a third-party dependency misbehaves, which, working entirely with free-tier APIs, happens constantly."

---

## PART 3 — INTERVIEW FLOW (realistic sequence)

1. **"Explain your project."** → Part 2 answer, compressed to ~60s if interrupted early.
2. **"Walk me through the architecture."** → client → Express → Supabase (Postgres/Auth/Storage) → external AI APIs; single Render service serves both.
3. **"Show me the database design."** → 4 tables, FKs, RLS-exists-but-bypassed nuance.
4. **"Walk me through what happens when I hit 'Generate'."** → full backend pipeline in `generate.ts`.
5. **"How does the frontend manage state?"** → Context + local state, no Redux, why that was enough here.
6. **"How is a user authenticated on your API?"** → Supabase Auth token → `getUser()` → no custom JWT code.
7. **"What stops User A from accessing User B's data?"** → honest answer including the gap on characters/scenes routes.
8. **"How is this deployed?"** → Render blueprint, no CI/CD, no Docker, why not (yet).
9. **"What happens under load / at scale?"** → Part 11 answers (rate limiter is in-memory single-instance, etc.)
10. **"Tell me about the AI pipeline in detail."** → Visual DNA, prompt enhancement, multi-model race, LLM-judge scoring, retry.
11. **"What happens if two people hit generate at the same time / concurrency?"**
12. **Live coding round** → Part 9.
13. **Behavioral** → Part 14.
14. **HR / culture-fit** → standard, not project-specific.

---

## PART 4 — HIGH PROBABILITY QUESTIONS (index)

**⭐⭐⭐⭐⭐ Almost Certain**
1. Explain your project end to end.
2. Walk me through your database schema.
3. How does authentication work?
4. What happens when a user clicks "Generate"?
5. Why did you race multiple AI models instead of using one?
6. How do you prevent one user from accessing another user's data?
7. What was the hardest bug you hit?

**⭐⭐⭐⭐ Very Likely**
8. Why Supabase over a self-managed Postgres/Auth stack?
9. Why is there no centralized error-handling middleware?
10. How does your rate limiter work, and what are its limits?
11. Why did you disable the Hugging Face and (conditionally) Imagen generators?
12. How do you score "consistency" — isn't that subjective?
13. What happens if all your AI providers fail at once?
14. Why no automated tests?

**⭐⭐⭐ Possible**
15. Why is the server run via `tsx` instead of compiled TypeScript?
16. Explain the LoRA training flow.
17. Why JSONB for `extra_image_urls` instead of a join table?
18. How would you add a "credits" billing system with Stripe?
19. Why does `characters.ts`/`scenes.ts` not check project ownership?

**⭐⭐ Rare**
20. Why did you choose median-of-3 voting instead of a single LLM call for scoring?
21. What's the CORS policy and why?

**⭐ Extreme Depth**
22. Walk through the exact prompt structure sent to each image model and why they differ.
23. Why does the face-swap step run sequentially per character instead of in parallel?

---

## PART 5 — FULL Q&A (⭐⭐⭐⭐⭐ and ⭐⭐⭐⭐ questions in depth)

--------------------------------------------------
### Q1. Explain your project end to end. ⭐⭐⭐⭐⭐

**Best Answer:** Use Part 2 verbatim, compressed if needed.

**Why it's strong:** Leads with the *problem* (consistency), not the tech stack — shows product thinking before engineering thinking.

**Common mistakes:** Starting with "I used React and Express and..." — that's what a junior does. Seniors lead with the problem.

**Follow-ups:** "Who's the user?" / "Why does this matter?" / "What's the alternative to your approach?"
**Follow-up answers:** User = solo creators without illustration skills; alternative = manual inpainting/Photoshop per panel, which doesn't scale past a few images.

**Red flags:** Can't explain *why* consistency is hard for base image models (stateless generation, no memory of prior calls).

--------------------------------------------------
### Q2. Walk me through your database schema. ⭐⭐⭐⭐⭐

**Best Answer:** "Four tables. `profiles` extends Supabase's `auth.users` one-to-one via a trigger — whenever a user signs up, a Postgres trigger function `handle_new_user()` inserts a profile row with a generation limit default of 30. `projects` belongs to a user, has a style preset and a public/private flag. `characters` and `scenes` both belong to a project via cascade-delete foreign keys. Characters carry the reference image, the extracted Visual DNA text, and LoRA training state. Scenes carry the prompt, generation status, the final image URL, and scoring metadata like consistency score and which model won. I added indexes on the foreign keys and a composite index on `(project_id, scene_number)` since scenes are always listed in order."

**Why strong:** Shows understanding of *why* each FK/index exists, not just that they exist.

**Common mistakes:** Reciting column names without explaining the cascade-delete relationships or why RLS exists.

**Follow-ups:**
- "Why cascade delete?" → Deleting a project should clean up its characters/scenes automatically — no orphaned rows.
- "Do you use RLS?" → Yes, policies exist on all four tables, but be honest (see Q6): the server uses the service-role key which bypasses RLS, so RLS is defense-in-depth for any future direct-from-client Supabase queries, not the live enforcement path today.
- "Why JSONB for `extra_image_urls`?" → Small, always-read-together array of strings, no need for a join table's overhead for a field that's never queried independently.
- "What's the duplicate `002_` migration prefix about?" → Own it: two migrations got the same number (`002_credits.sql`, `002_enhanced_prompt.sql`) because they were added in separate sessions without checking the last number; `setup.sql` is the actual authoritative one-shot script used for real deployments, migrations were applied ad hoc during development.

**Red flags:** Claiming RLS is "what stops unauthorized access" without knowing the service-role key bypasses it — an interviewer who reads code will catch this immediately.

--------------------------------------------------
### Q3. How does authentication work? ⭐⭐⭐⭐⭐

**Best Answer:** "I use Supabase Auth entirely rather than rolling my own JWT signing/verification. The client signs in via Supabase (email/password or Google OAuth), gets a session with an access token client-side, and attaches it as a Bearer token on every API call. On the server, my `requireAuth` middleware takes that token and calls `supabase.auth.getUser(token)` — Supabase validates it against their auth server and returns the user or an error. I attach `req.user = {id, email}` and call next(). There's no session store, no cookies, no custom token code on my server at all — I outsourced that entirely to Supabase."

**Why strong:** Clear about what you built vs. what you deliberately didn't build (and why that's the right call, not laziness).

**Common mistakes:** Claiming to have "implemented JWT authentication" — you didn't, Supabase did; overclaiming here is an easy trap that falls apart under one follow-up.

**Follow-ups:**
- "Why not roll your own JWT auth?" → No reason to reinvent session/token refresh/password-reset flows for a portfolio project — that's exactly what a BaaS should own, focus my time on the actual differentiator (the AI pipeline).
- "What if the token is expired?" → `getUser()` returns an error, middleware returns 401, frontend's `api.ts` throws, caught by calling code, user redirected to `/auth` via the `ProtectedRoute` wrapper.
- "Is there role-based access control?" → No — every authenticated user has the same permissions; there's no admin/user distinction anywhere in the code. Own that honestly rather than inventing one.

**Red flags:** Not knowing the difference between authentication (who are you) and authorization (what can you do) — this project has real authentication, but weak/partial authorization (see Q6).

--------------------------------------------------
### Q4. What happens when a user clicks "Generate"? ⭐⭐⭐⭐⭐

**Best Answer:** "Several things, in this order. First I check the user's credit usage against their limit in `profiles` — if exhausted, I return a 403 before doing any expensive work. Then I fetch the project's style preset, and pre-fetch all character reference images as base64 in parallel. I send the raw scene prompt to Gemini once to get an 'enhanced' cinematic-detail version. Then I fire off up to 8 generation calls in parallel via `Promise.allSettled` — Gemini's native image model, FLUX through Together AI, Cloudflare Workers AI, Pollinations, fal.ai PuLID, and a LoRA-conditioned generation if the character has a trained LoRA ready. For every candidate that succeeds, I run two more Gemini calls concurrently — one scores character consistency against the reference photo using a median of 3 votes, one scores general image quality — and combine them into a weighted score, with a small bonus for models that saw the actual reference photo during generation. I pick the highest score; if it's still below 60, I retry once with a consistency-prioritized prompt. Then I upload the winner to Supabase Storage, optionally run face-swap and upscaling through fal.ai if those services are available, re-upload the final version, update the scene row with the image URL and scoring metadata, and increment the user's usage counter."

**Why strong:** Shows the whole request lifecycle including guardrails (credit check first) and graceful degradation (`Promise.allSettled`, optional post-processing).

**Common mistakes:** Forgetting the credit check happens *before* the expensive work, or not mentioning `allSettled` vs `all` (a single provider failing would crash the whole request with `Promise.all`).

**Follow-ups:**
- "Why `allSettled` and not `all`?" → `all` rejects the whole batch if any one promise rejects — I need the other 7 candidates even if one provider is down/rate-limited.
- "Why score with an LLM instead of a fixed embedding-similarity metric (like face embedding cosine distance)?" → Honest answer: an embedding model (e.g., a face-recognition model) would be more rigorous and cheaper, but I didn't have a free, easy-to-integrate face-embedding API on hand; Gemini vision was already integrated for DNA extraction, so reusing it as a judge was the pragmatic choice. This is a real known trade-off — acknowledge it, don't defend it as optimal.
- "What if all 8 fail?" → Throws `'All generation models failed...'`, caught by the outer try/catch, scene status set to `error` with the message, 500 returned.

**Red flags:** Not being able to explain why parallel racing beats picking one "best" model up front (answer: you don't know which model will do best on *this specific* prompt/character combo, and free-tier providers are unreliable individually, so racing several and judging after the fact hedges against any single provider's failure or bad output).

--------------------------------------------------
### Q5. Why did you race multiple AI models instead of using one? ⭐⭐⭐⭐⭐

**Best Answer:** "Two separate reasons. First, reliability — I'm running entirely on free tiers (Pollinations, Cloudflare's free neuron quota, Together's free FLUX-schnell tier, fal.ai's free credit), and free tiers get rate-limited, deprecated, or run out unpredictably — I've already had that happen: Hugging Face's legacy inference endpoint got fully decommissioned mid-project, and fal.ai's balance ran out during testing. If I depended on one provider, the whole product goes down whenever that provider hiccups. Second, quality — no single free model consistently produces the best result for every scene and character combination, so having several compete and letting an LLM judge pick the winner gets a better result than committing to one model's output blind."

**Why strong:** Ties the architectural decision to a concrete, already-experienced failure (HF deprecation, fal.ai balance) rather than a hypothetical.

**Common mistakes:** Saying "for redundancy" without the concrete story — vague redundancy claims sound rehearsed.

**Follow-ups:**
- "Doesn't that multiply your cost/latency by 8x?" → Latency-wise, they run concurrently so wall-clock cost is close to the slowest single call, not the sum; cost-wise, most of these are free (Pollinations no-key, Cloudflare/Together free tiers), so the actual paid surface is small (only fal.ai steps, which are optional/gated).
- "How do you decide who 'wins'?" → Weighted score: consistency (65%) + quality (35%), plus a small identity-conditioning bonus, capped and clamped 0-100.

**Red flags:** Not knowing the actual weight split (0.65/0.35) if pressed — know your own numbers.

--------------------------------------------------
### Q6. What stops User A from accessing User B's data? ⭐⭐⭐⭐⭐

**Best Answer — be fully honest here, this is a real gap:** "There are two layers in theory: RLS policies at the Postgres level, and explicit ownership filters in my route handlers. In practice, only the second one is live — my server connects to Supabase with the service-role key, which bypasses RLS entirely, so RLS policies exist in the schema but aren't the actual enforcement mechanism for anything the server does. The real protection is filtering queries by `user_id` — which I do consistently on the `projects` routes. I'll be straight with you: on the `characters` and `scenes` routes, I only check that the request has *a* valid logged-in user via `requireAuth`, I don't re-verify that user owns the parent project before letting them read/update/delete a character or scene by ID. That's a genuine gap — an authenticated user who obtained another user's character/scene UUID could act on it. The fix is straightforward: add the same ownership-join check I already do in `projects.ts` to those routes, or switch those specific queries to use the client's own token (respecting RLS) instead of the service-role key."

**Why strong:** This is exactly the kind of finding a real reviewer will surface by reading the code — getting there first, unprompted, is the single strongest thing you can do in this interview. Confident ownership of a real flaw reads far better than a rehearsed "security is my top priority" answer that collapses on the first follow-up.

**Common mistakes:** Claiming RLS "protects everything" (false — it's bypassed server-side) or pretending this gap doesn't exist.

**Follow-ups:**
- "How would you fix it today?" → Add `.eq('project_id', ownedProjectIds)` filtering (join against the user's projects) before any character/scene mutation, mirroring `projects.ts`'s pattern; or move those specific reads to a client-scoped Supabase client so RLS actually applies.
- "Is this exploitable in practice?" → Requires guessing/leaking a UUID (not enumerable, not sequential), so it's low-likelihood but non-zero — not something to dismiss just because IDs are random.

**Red flags:** Getting defensive or claiming this was "intentional" — it wasn't; own it as a known gap, not a design choice.

--------------------------------------------------
### Q7. What was the hardest bug you hit? ⭐⭐⭐⭐⭐

**Best Answer:** "Chasing a silent Imagen failure. I had Imagen 3 in the generation race with a `referenceImages` config meant to condition it on the character's photo — except that config is Vertex-AI-only, not supported on the public Gemini API endpoint I was actually calling. It didn't throw a clear error; it just silently produced worse, unconditioned results, and because it was one of eight candidates in a `Promise.allSettled` race, a bad-but-not-crashing result just quietly lost the scoring and never surfaced as an obvious bug — I only caught it by reading the actual response shapes closely, not from an error log. That taught me that 'graceful degradation' can hide real bugs behind an illusion of a working system unless you also actively verify what each provider path is *actually* returning, not just that it didn't crash."

**Why strong:** Names a real, specific, technically precise bug (not "I had a CORS issue") and draws a genuine lesson from it about the risk of graceful-degradation patterns hiding failures.

**Common mistakes:** Giving a generic answer like "async bugs are always hard" with no specifics.

**Follow-ups:** "How did you eventually catch it?" → Manual inspection of the actual API responses per model, comparing what config options are valid per endpoint version against Google's docs. "How would you prevent this class of bug in the future?" → Log/track per-model score distributions over time — a model consistently scoring far below its peers is a signal something's silently broken, not just "underperforming."

--------------------------------------------------
### Q8. Why Supabase over self-managed Postgres/Auth? ⭐⭐⭐⭐

**Best Answer:** "For a solo project, I wanted managed Postgres, managed auth (including OAuth), and managed object storage as one product with a generous free tier, so I don't spend my limited time operating infrastructure instead of building the actual feature — the AI pipeline. Supabase gave me all three without needing to stand up and secure a separate auth service or S3-compatible storage myself."

**Follow-ups:** "What would you do differently at scale?" → Possibly split auth/storage to dedicated services if Supabase's free/pro tier limits became a bottleneck, and definitely stop using the service-role key for routes that don't need to bypass RLS.

--------------------------------------------------
### Q9. Why is there no centralized error-handling middleware? ⭐⭐⭐⭐

**Best Answer — honest:** "There isn't one, and that's a real gap I'd fix in a production version. Right now every route handler has its own try/catch and manually shapes its own error response — it works because I was disciplined about wrapping every handler, but there's no safety net for an uncaught exception in a route that forgot to catch something; Express would just hang or crash that request without a consistent error shape. I'd add a single `app.use((err, req, res, next) => ...)` catch-all as insurance, plus something like a `asyncHandler` wrapper so I stop repeating try/catch boilerplate in every route."

**Follow-ups:** "What's the risk today?" → An unhandled exception in a route not wrapped in try/catch would surface as a generic Express error page or hang, not a clean JSON error — inconsistent client experience, not a security hole.

--------------------------------------------------
### Q10. How does your rate limiter work, and what are its limits? ⭐⭐⭐⭐

**Best Answer:** "It's a small hand-rolled in-memory sliding window — a `Map` keyed by user ID (or IP if unauthenticated), storing recent request timestamps, capped at 5 generate requests per 60-second window. It's intentionally simple because it only guards the one expensive route. The real limitation is it's per-process memory — it resets on restart and wouldn't be consistent across multiple server instances. Since I'm on a single free Render instance, that's a non-issue today, but it wouldn't survive horizontal scaling without moving to something shared, like Redis."

**Follow-ups:** "How would you make it scale?" → Redis with `INCR`+`EXPIRE` or a sorted set per key, shared across instances; or a library like `rate-limiter-flexible` backed by Redis.

--------------------------------------------------
### Q11. Why did you disable Hugging Face (and conditionally Imagen)? ⭐⭐⭐⭐

**Best Answer:** "Two different situations, and I treated them differently on purpose. Hugging Face's `hf-inference` legacy endpoint was fully decommissioned — it returns a permanent 410 Gone for the FLUX models I was calling, and that's not coming back without switching to their new paid Inference Providers system, which I already get for free directly through Together AI. So I hard-disabled that generator — no retry logic will ever fix a 410. Imagen is different: it 404s on my current free-tier key because Imagen specifically requires a billing-enabled project, not because of a quota limit. I left that one *active* rather than hardcoding it off, because my existing `Promise.allSettled` error handling already swallows that failure gracefully — so the moment I ever enable billing on that Gemini key, Imagen starts working automatically with zero code changes. I only hard-disable something when the failure is permanent and unrelated to configuration I might change later."

**Why strong:** Distinguishes "permanently dead, no config fixes it" from "config-gated, will self-heal" — shows judgment about *when* to hardcode something off vs. leave it as a soft failure.

**Follow-ups:** "How did you confirm HF was permanently dead vs transient?" → Checked HF's own deprecation notices/forums for the legacy endpoint status, and the 410 status code itself (Gone, a stronger signal than a transient 5xx or 429).

--------------------------------------------------
### Q12. How do you score "consistency" — isn't that subjective? ⭐⭐⭐⭐

**Best Answer:** "It is subjective, which is exactly why I didn't trust a single LLM call for it. I send the reference photo(s) plus the generated image to Gemini three separate times with the same rubric — face shape, skin tone, hair, distinctive clothing — asking for a 0-100 integer, and take the median of the three votes rather than the mean, specifically because median is robust to one outlier vote (an LLM occasionally gives a wildly different score than its other two attempts on the same input — median discards that noise better than averaging it in). I combine that with a separate quality score (sharpness, anatomy, absence of artifacts) at a 65/35 weight, because a blurry-but-technically-consistent image shouldn't beat a sharp, well-composed one just on a raw consistency number."

**Follow-ups:** "Why not a proper face-embedding similarity metric instead of an LLM judge?" → Answer honestly (see Q4 follow-up) — that would be more rigorous/cheaper per call, but wasn't already integrated; a real production version should use one (e.g., a face-recognition embedding + cosine similarity) as a harder, more deterministic signal alongside or instead of the LLM vote.

--------------------------------------------------
### Q13. What happens if all your AI providers fail at once? ⭐⭐⭐⭐

**Best Answer:** "The `candidates` array ends up empty after the `Promise.allSettled` batch, and I explicitly check for that — I throw a clear error naming which env vars to check (`HF_API_KEY`/Cloudflare credentials), the outer try/catch catches it, sets the scene's status to `error` with that message persisted, and returns a 500 to the client. The frontend's retry button lets the user re-trigger that specific scene without redoing the whole batch."

**Follow-ups:** "Why message the user with env var names?" → That error message is really aimed at me/the operator during development and demos, not an end user in production — a real product would show a generic user-facing message and log the specifics server-side only.

--------------------------------------------------
### Q14. Why no automated tests? ⭐⭐⭐⭐

**Best Answer — honest, don't dodge:** "There are none, and that's the most significant engineering gap in this project as it stands — I prioritized shipping the AI pipeline and getting a working demo in front of people over test coverage, which was the right call for a solo portfolio project on a deadline, but it's not how I'd build production software. If I had another week, the first thing I'd add is unit tests around the scoring/winner-selection logic in `generate.ts` — that's pure, easily testable logic (given a set of candidate scores, does it pick the right winner, does it retry correctly below threshold) — and integration tests around the auth middleware and ownership-filtering logic, since that's exactly where the real bug (Q6) lives."

**Follow-ups:** "What would you test first?" → Winner-selection/scoring math (pure function, no I/O, highest ROI for unit tests) and the auth/ownership gap.

**Red flags:** Claiming tests exist, or being unable to say what you'd test first if pushed.

---

## PART 6 — PROJECT DEEP DIVE (Why-this-not-that)

| Decision | Why | Alternative considered | Trade-off honestly stated |
|---|---|---|---|
| Supabase over custom Postgres+Auth | Managed, fast to ship solo | Self-hosted Postgres + Passport.js | Less control, vendor lock-in, but correct call for scope |
| Service-role key server-side | Simplicity — server always has full access | Per-user scoped client respecting RLS | Real gap: bypasses RLS, requires manual ownership checks (Q6) |
| Raw `fetch` to fal.ai/HF/Together instead of SDKs | No official/needed SDK for these REST endpoints, avoid dependency bloat | Use each provider's SDK where one exists | More boilerplate per service, no type safety on responses (`any` casts throughout) |
| `tsx` in production instead of compiling | One less build step, faster iteration | `tsc` build + `node dist/` | Slightly slower cold start, TS type errors not caught at build-time in prod (only at dev-time) |
| In-memory rate limiter, not Redis | Single Render instance, no need for shared state yet | Redis-backed limiter | Won't survive horizontal scaling or restarts — acceptable now, not later |
| LLM-as-judge scoring instead of embedding similarity | Already had Gemini integrated, fast to build | Face-embedding cosine similarity (e.g. `face-api.js`, dedicated face-recognition API) | Less deterministic/cheaper than embeddings, more "vibes"-based |
| No centralized error middleware | Simpler mental model per-route during fast iteration | Global Express error handler + `asyncHandler` wrapper | No safety net for an uncaught exception in a handler that forgot try/catch |
| JSONB `extra_image_urls` instead of join table | Small always-together array, never queried independently | Separate `character_images` table | Fine at this scale; would need a real table if images needed independent metadata/ordering queries |
| Single Render service for API + static frontend | One deployable, free tier, simplest ops | Separate frontend (Vercel/Netlify) + backend (Render) | Couples scaling of static assets to the API server; fine for a demo |

---

## PART 7 — ARCHITECTURE QUESTIONS

- **Frontend:** "Why Context instead of Redux/Zustand?" → App-level state is small (auth/session/usage); per-page state (`projects`, `scenes`, `characters`) is fetched and owned locally with `useState`/`useEffect` — no cross-page shared mutable state that would justify a global store.
- **Backend:** "Why is `/api` shared by 5 routers with no clean prefix separation?" → `characters`, `scenes`, `generate`, `profile`, `share` all mount at `/api` and disambiguate via their own internal paths (`/projects/:id/characters`, `/scenes/:id`, etc.) rather than `/api/characters`, `/api/scenes` — a minor organizational inconsistency (only `projects` gets its own `/api/projects` prefix); would clean this up with consistent per-resource prefixes in a v2.
- **Database:** covered in Q2/Q6.
- **Auth/Authz:** covered in Q3/Q6.
- **API Flow:** covered in Q4.
- **State management:** Context (`AuthContext`) + local component state; `api.ts` centralizes all HTTP calls and token attachment.
- **AI Flow:** Visual DNA extraction (once, on character create/update) → prompt enhancement (per scene) → multi-model race → LLM-judge scoring → optional face-swap/upscale → persist.
- **Caching:** None implemented anywhere — no HTTP caching headers, no query caching, no CDN in front of Supabase Storage beyond whatever Supabase itself provides for public buckets. Honest gap to name if asked.
- **Deployment:** Single Render Blueprint, manual env vars, no CI/CD.
- **Scaling:** See Part 11.
- **Monitoring:** None — no Sentry/logging service, `console.error`/`console.warn` only, visible in Render's log tail.
- **Error Handling:** Per-route try/catch, no global handler (Q9); frontend toasts + one ErrorBoundary.
- **Logging:** `console.warn`/`console.error` scattered per service, no structured logging, no log levels, no correlation IDs.

---

## PART 8 — CODE REVIEW QUESTIONS (self-directed, real files)

**`server/routes/generate.ts`**
- Q: "This function is ~230 lines and does auth, credit-check, prompt enhancement, 8-way generation, scoring, face-swap, upscaling, and persistence all in one route handler. Would you split it?" A: Yes — in a real refactor I'd extract a `pipeline/` module (`enhance → generate → score → postprocess → persist`) as pure, independently testable functions, and keep the route handler as thin orchestration + HTTP concerns only. I kept it inline because this was iterated on rapidly across many sessions and splitting it prematurely would have slowed down experimentation; it's the clearest candidate for refactoring today.
- Q: "Time complexity of `checkConsistency`'s median-of-3?" A: O(1) fixed — always exactly 3 parallel calls regardless of input size; the array involved never exceeds length 3, so sorting it is negligible.
- Q: "Null/undefined handling on `settled.value`?" A: `if (settled.status === 'fulfilled' && settled.value)` — explicitly guards against a fulfilled promise resolving to `null` (which every generator does on graceful failure) before destructuring, avoids a crash if a provider "succeeds" with no data.
- Q: "Concurrency concerns?" A: All 8 generator calls and the two scoring calls per candidate run via `Promise.allSettled`/`Promise.all` — no shared mutable state between them, so no race conditions there; the one true shared mutable state is the in-memory rate limiter `Map`, which isn't safe across multiple Node processes (single-instance today, so moot).

**`server/middleware/rateLimiter.ts`**
- Q: "This uses a plain `Map` with no cleanup — memory leak?" A: Fair concern — old keys (inactive users) never get evicted, only their timestamp arrays get filtered on next access. For a small user base this is negligible, but a long-running production instance with many one-time visitors would accumulate stale Map entries indefinitely. Fix: a periodic sweep or an LRU-capped map, or just move to Redis with TTL keys.

**`server/services/faceSwapService.ts`**
- Q: "Why sequential face-swap per character instead of parallel?" A: Each swap's output becomes the *input* base image for the next character's swap (multi-face scenes are swapped one face at a time onto the same evolving image) — that's an inherently sequential dependency chain, not parallelizable without changing the underlying API's capabilities (it swaps one face per call).

**`server/services/hfGenerate.ts`**
- Q: "Now that it's disabled and just returns `null`, why keep the file at all instead of deleting it?" A: Fair challenge — could genuinely argue either way; I kept it as a documented placeholder (with a comment explaining exactly why) rather than deleting, so the "8 model race" framing in commit history/docs still maps to real files, and re-enabling later (behind HF's new Inference Providers) is a smaller diff than resurrecting a deleted file. A stricter reviewer would say: delete it, git history already preserves it, dead code should not live in the working tree — that's a legitimate counter-argument I'd accept.

**Design patterns / SOLID:**
- Q: "Any design patterns you'd name here?" A: The generator services all implement an implicit common interface (`(prompt, style, chars) => Promise<Result | null>`) — that's a Strategy-pattern shape even though it's not formalized via a TS `interface`; formalizing it explicitly would make adding a 9th provider mechanical (implement the interface, add one line to the `Promise.allSettled` array and the `results` mapping array).

---

## PART 9 — CODING QUESTIONS (project-grounded only)

1. **"Implement the ownership check that's missing on `PUT /characters/:id`."**
   Expected shape: join `characters → projects` and verify `projects.user_id === req.user.id` before allowing the update, mirroring the pattern already used in `projects.ts`'s `.eq('user_id', userId)` filters. Bonus: extract this into a small reusable `assertOwnsCharacter(characterId, userId)` helper.

2. **"Implement a Redis-backed version of `generateRateLimiter`."**
   Expected shape: replace the `Map` with `INCR key` + `EXPIRE key 60` (or a sorted set for a true sliding window), same interface (`(req, res, next)`), same 5-per-60s default.

3. **"Write the missing global Express error-handling middleware."**
   Expected shape: a final `app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); })`, mounted after all routers, plus (bonus) an `asyncHandler(fn)` wrapper to stop repeating try/catch in every route.

4. **"Add a simple in-memory cache in front of `GET /projects/:id` to avoid refetching characters/scenes on every editor keystroke."**
   Expected shape: short-TTL cache keyed by `projectId`, invalidated on any mutating route for that project.

5. **"Implement pagination for `GET /api/projects` (currently returns all of a user's projects unbounded)."**
   Expected shape: `?limit=&cursor=` or `?page=&pageSize=`, add `.range()` to the Supabase query, return a `hasMore`/`nextCursor` field.

6. **"Write a retry-with-backoff wrapper generic enough to wrap any of the 8 generator functions."**
   Expected shape: `withRetry(fn, {retries, baseDelayMs})` using exponential backoff, applied optionally around a flaky provider without changing that provider's own internals.

7. **"Formalize the generator Strategy interface mentioned in Part 8."**
   Expected shape: a shared TS `interface ImageGenerator { (prompt: string, style: string, chars: CharSpec[]): Promise<GenResult | null> }`, refactor each service to satisfy it explicitly, then the `results` array in `generate.ts` becomes `GENERATORS.map(g => ({ settled: ..., model: g.name }))` instead of hand-listing each one.

*(Deliberately no generic/unrelated DSA — every prompt above is a real, addressable gap in this actual codebase.)*

---

## PART 10 — DEBUGGING ROUND (realistic scenarios from this project)

**Scenario: "`POST /api/generate` returns 500 for every request, but it worked yesterday."**
- Causes: `GEMINI_API_KEY` missing/rotated (server explicitly checks and 500s with a clear message); Supabase Storage bucket policy changed; all 8 providers simultaneously rate-limited (rare but possible if a shared IP got flagged); an unhandled exception in a spot not wrapped in try/catch (Q9 gap).
- Debug approach: check Render logs first (`console.error('Generate error:', err)` is already logged with the real error object), check which of the explicit env var guards fired, check Supabase dashboard for storage/auth outages.
- Fix: whichever guard fired; add the missing global error handler so future unhandled cases still return a clean 500 with a logged stack trace instead of an ambiguous failure.

**Scenario: "Authentication randomly fails for some users but not others."**
- Causes: expired Supabase session not refreshed client-side before the API call; `Authorization` header missing due to a race between `supabase.auth.getSession()` resolving and the fetch firing.
- Debug approach: check whether `api.ts`'s `authHeaders()` awaits the session properly on every call (it does, per the research — pulls a fresh token per call) vs. caching a stale token.
- Fix: ensure `getSession()` is awaited fresh per call (already the case) rather than cached at module load.

**Scenario: "Scenes stay stuck on 'loading' forever."**
- Causes: the frontend sets status to `loading` optimistically before the API call, then a network failure or unhandled exception in `generateScene()` never reaches the `finally`/catch branch that would reset it to `error`.
- Debug approach: check `Editor.tsx`'s `generateScene()` for a missing `catch` or missing `finally` that would leave local React state stuck even if the backend already errored.
- Fix: ensure every await inside `generateScene()` is wrapped so any thrown error still transitions status away from `loading`.

**Scenario: "One user's LoRA training shows 'training' forever, never completes."**
- Causes: `getTrainingStatus` polling on the frontend stopped (component unmounted, `useEffect` cleanup, or the poll interval was tied to a component that unmounted when the user navigated away); or `FAL_KEY` balance ran out mid-training so fal.ai never returns `COMPLETED`.
- Debug approach: check fal.ai dashboard for the actual job status directly; check whether the frontend's poll `useEffect` in `CharacterPanel.tsx` re-establishes on remount.
- Fix: could add a server-side webhook/poll-once-and-persist approach instead of relying purely on the frontend staying mounted and polling.

**Scenario: "Deployment succeeds on Render but the site 404s on every route except `/`."**
- Causes: SPA catch-all (`app.get('*', ...) → dist/index.html`) not correctly ordered *after* API routes and static file serving, or `NODE_ENV` not actually set to `production` so the static-serving branch never executes.
- Debug approach: check Render's env var dashboard for `NODE_ENV=production`, check middleware order in `server/index.ts`.

---

## PART 11 — SYSTEM DESIGN: "What if this had 10 million users?"

- **Rate limiter:** Move off in-memory `Map` to Redis (shared, TTL-based) immediately — the current one breaks the moment you run more than one instance.
- **Database:** Supabase's Postgres would need read replicas / connection pooling (PgBouncer, which Supabase offers) well before 10M users; add proper composite indexes for any new hot query paths.
- **AI provider costs:** Free tiers (Pollinations, Cloudflare, Together free FLUX) are absolutely not viable at that scale — would need paid, SLA-backed providers, likely with a queue (SQS/BullMQ) instead of a synchronous request racing 8 providers per generate call — generation would become async: enqueue a job, return a job ID, poll or push (websocket/SSE) the result.
- **Caching/CDN:** Generated images are already static once created — put a real CDN (CloudFront/Cloudflare) in front of Supabase Storage or migrate to S3+CloudFront; cache project/character reads (Redis) since Visual DNA rarely changes once extracted.
- **Workers/Queues:** The entire generate pipeline (8-way race, scoring, face-swap, upscale) is a perfect candidate for a background worker queue rather than holding an HTTP request open for the full ~30-90s pipeline duration — return immediately with a job ID, process async, notify via websocket or polling.
- **Microservices:** At that scale, split the "generation pipeline" out of the CRUD API into its own service — different scaling profile (CPU/network-bound waiting on external APIs vs. simple DB CRUD), different deploy cadence.
- **Monitoring:** Add real APM/error tracking (Sentry, Datadog) — today there's `console.error` only, which doesn't scale past a handful of users watching logs manually.
- **Load balancer:** Render's single free-tier instance → multiple instances behind a load balancer, with the rate limiter and any session state moved to shared storage (Redis) since sticky sessions aren't a real solution at this scale.
- **Cost optimization:** Per-generation cost would dominate at scale (multiple paid AI API calls per scene) — would likely reduce the "race 8 models" pattern to 2-3 curated best-performing providers based on real usage data, rather than racing everything on every call.

---

## PART 12 — SECURITY

- **Authentication:** Supabase Auth, Bearer token validated server-side via `getUser()` — no custom JWT signing/verification code (see Q3).
- **Authorization/RBAC:** No roles exist; every authenticated user is equal. Real gap: `characters`/`scenes` routes lack project-ownership verification (Q6) — this is the single most important security finding in the project, know it cold.
- **RLS bypass:** Server uses the service-role key, so Postgres RLS policies exist but are not the live enforcement mechanism for server-issued queries (Q2/Q6).
- **JWT:** Not custom-implemented — delegated entirely to Supabase's own token issuance/validation.
- **OAuth:** Google OAuth available via Supabase Auth's built-in provider config (not custom-coded).
- **Prompt Injection:** User-supplied scene prompts flow directly into image-generation prompts sent to multiple third-party AI APIs — there's no sanitization/injection-guard on user input beyond it being plain text concatenated into a larger structured prompt. A malicious prompt could try to manipulate the LLM-judge scoring call too, since the same free-text scene content isn't isolated from instruction-bearing text in the scoring prompt. Worth naming as an unaddressed risk if asked directly, rather than claiming protection that doesn't exist.
- **SQL Injection:** Not applicable in the traditional sense — all DB access goes through the Supabase JS client's parameterized query builder (`.eq()`, `.insert()`, etc.), never raw string-interpolated SQL.
- **XSS:** React escapes rendered text by default; no `dangerouslySetInnerHTML` usage found in the researched components — standard React protection applies, nothing custom added or needed.
- **CSRF:** Not directly applicable — there's no cookie-based session to forge; auth is a Bearer token the frontend explicitly attaches per request, not an ambient cookie a malicious site could ride on.
- **Secrets:** `.env` for local dev (gitignored), Render dashboard env vars for production (`sync: false` in `render.yaml`, filled in manually) — service-role key and API keys never reach the client bundle (only `VITE_`-prefixed vars do, which are the safe anon key/URL).
- **Encryption:** TLS in transit via Supabase/Render defaults; no additional at-rest encryption beyond what Supabase's managed Postgres/Storage provides by default.
- **Validation:** Minimal — routes check for required fields' presence (e.g., `prompt` required) but there's no schema-validation library (no Zod/Joi) — a missing/malformed field beyond the checked ones could produce a less-clean error than a proper validation layer would.

---

## PART 13 — PERFORMANCE

- **Database:** Indexes exist on the hot paths (`user_id`, `project_id`, `(project_id, scene_number)`) — no N+1 patterns found; `GET /projects/:id` fetches characters+scenes via `Promise.all` in parallel rather than sequentially.
- **API:** The generate endpoint is the obvious bottleneck (~30-90s per call, 8 parallel external API calls + up to 3x2 scoring calls per candidate) — biggest lever would be moving it off the synchronous request/response cycle entirely (see Part 11).
- **Frontend:** No code-splitting/lazy-loading observed beyond React Router's default page-level bundles; Vite's default build already tree-shakes and minifies. No explicit `React.lazy()` usage found — a real optimization opportunity for a bigger app, less critical at this size (few pages).
- **Backend:** `express.json({limit: '50mb'})` is generous because reference images travel as base64 in JSON bodies — a real optimization would be direct-to-Supabase-Storage client uploads (signed URLs) instead of round-tripping large base64 payloads through the Express server at all.
- **Rendering:** Standard React re-render patterns, no obvious over-rendering issues found in the researched components (state is scoped per-page, not global).
- **Caching:** None (Part 7) — biggest available win with least effort: cache the Visual DNA extraction result (already persisted in DB, so it's not re-computed per scene — that part is already correctly cached at the data-model level, just not at an additional HTTP/CDN layer).
- **Compression:** No explicit gzip/br compression middleware found (`compression` package not in dependencies) — Render/Express doesn't compress responses by default without it; easy low-effort win.
- **Indexes:** Covered above — appropriately placed for current query patterns.
- **Bundle optimization:** Vite defaults only; no bundle analysis tooling configured.
- **Lazy Loading:** Images in the gallery/results grid — not confirmed whether `loading="lazy"` is set on `<img>` tags; worth checking/adding if not.

---

## PART 14 — BEHAVIORAL QUESTIONS

- **"Why did you build this?"** → Wanted a portfolio piece that goes beyond a CRUD app — something that required real architectural judgment (multi-provider orchestration, graceful degradation, LLM-as-judge design) rather than just wiring up one API.
- **"Biggest challenge?"** → The silent Imagen `referenceImages` bug (Q7) — a failure that didn't crash anything, just quietly produced worse results, which is a harder class of bug to catch than an exception.
- **"Biggest bug?"** → Same as above, or the cascading effect of both fal.ai and Gemini image quota dying simultaneously mid-project, which exposed that the entire face-consistency story depended on paid services with no free fallback for true photo-conditioning — a real architectural ceiling, not just a bug.
- **"Most difficult feature?"** → The scoring/winner-selection logic — deciding how to weight consistency vs. quality, how many judge votes to average, and how to handle the case where every candidate scores low (auto-retry threshold).
- **"What would you improve?"** → In order: fix the characters/scenes ownership gap (Q6), add a global error handler + basic test suite for the scoring logic, move the generate pipeline to an async job queue instead of a long-held HTTP request.
- **"What are you most proud of?"** → The graceful-degradation design — the system keeps producing a usable result even when several of its 8 AI dependencies are down simultaneously, which is exactly what happened in real testing (HF dead, fal.ai out of balance, Gemini image quota exhausted — all at once) and it still returned something.
- **"If you rebuilt it today?"** → Start with the Strategy-pattern interface for generators from day one (Part 8), add tests around scoring logic first, and design the ownership/authorization layer before writing the first CRUD route instead of after.

---

## PART 15 — CROSS-QUESTION DRILLING (pattern to expect)

For nearly every answer above, expect the interviewer to drill with some subset of:
1. "Why that, specifically, and not the obvious alternative?"
2. "What's the actual failure mode if that assumption breaks?"
3. "Show me the exact line/file."
4. "What would you change if you had one more week?"
5. "Is that still true at 10x scale? 100x?"
6. "What's the weakest part of that design?"
7. "Did you build that, or did a library/BaaS build it for you?"
8. "What would a code reviewer flag here?"

The strongest possible posture across all of these: know precisely which parts you built vs. which you got "for free" from Supabase/Gemini, and volunteer the real weaknesses (Q6, Q9, Q14 gaps) before being asked — that's what separates "sounds like they read their own README" from "genuinely built and understands this."

---

## PART 16 — MOCK INTERVIEW

Reply "start mock interview" in a follow-up message and I'll run this live, one question at a time, evaluating and scoring your actual spoken/typed answer before increasing difficulty — that format doesn't work as a static document, it needs your real answers in the loop.

---

## PART 17 — LAST-MINUTE REVISION SHEET (read in 10 minutes)

**Top things to say confidently, unprompted, in the first 2 minutes:**
- Problem: base image models can't keep a character's face consistent across generations (stateless, no memory).
- Solution: Visual DNA (Gemini vision → text spec) + multi-model race (up to 8 providers) + LLM-judge scoring (median-of-3 consistency + quality, 65/35 weight) + auto-retry below 60.
- Stack: React 19/Vite/Tailwind, Express+TS via `tsx` (no compile step), Supabase (Postgres/Auth/Storage), Gemini + Together + Cloudflare + Pollinations + fal.ai.
- Deployment: single Render Blueprint service, no CI/CD, no Docker.

**Database summary:** 4 tables — `profiles` (1:1 with `auth.users` via trigger), `projects` (owns characters/scenes, cascade delete), `characters` (visual_dna, LoRA fields), `scenes` (status, consistency_score, model_used, enhanced_prompt). Indexes on all FKs + `(project_id, scene_number)`.

**API flow:** client → Bearer token (Supabase session) → Express `requireAuth` → route handler → Supabase (service-role key, bypasses RLS) → response. Generate route additionally: credit check → prompt enhance → 8-way `Promise.allSettled` race → score → pick winner → retry-if-low → upload → optional face-swap/upscale → persist.

**Auth flow:** Supabase Auth (client) issues access token → attached as Bearer header on every API call → server validates via `supabase.auth.getUser(token)` → no custom JWT code.

**Deployment flow:** `git push` → manual Render blueprint deploy (no CI/CD) → `npm install --include=dev && npm run build` → `npm start` runs `tsx server/index.ts` directly, serves built `dist/` as static SPA fallback.

**Scaling points:** in-memory rate limiter is single-instance only; generate pipeline should become an async job queue at real scale; no CDN/cache layer today; service-role key bypass means authorization must move to per-route checks or client-scoped RLS-respecting queries.

**Security points (know these cold):**
1. RLS exists but is bypassed by the service-role key server-side.
2. `characters`/`scenes` routes don't verify project ownership beyond "is logged in" — real, known gap.
3. No RBAC — every user has equal permissions.
4. No schema-validation library (no Zod/Joi) — minimal manual field checks only.

**Performance points:** no compression middleware, no CDN, base64-over-JSON image uploads (50mb body limit) instead of direct-to-storage signed uploads, generate pipeline is long-held synchronous HTTP (30-90s).

**Common mistakes to avoid saying:**
- "I implemented JWT authentication" — you didn't, Supabase did.
- "RLS protects all my data" — false, bypassed server-side.
- "I have full test coverage" — there are zero tests.
- Any claim that a bug was "intentional" when it was a gap — own gaps honestly instead.

**Keywords interviewers like to hear:** "graceful degradation," "Promise.allSettled vs Promise.all," "median vs mean for outlier robustness," "service-role key bypasses RLS," "Strategy pattern," "async job queue at scale," "known gap, here's the fix."

**Best words to use:** "I made a deliberate trade-off," "here's a real gap I'd fix," "the failure mode is," "at scale I'd move this to..."

**Things to NEVER say:**
- "It just works, I didn't think about edge cases."
- "I copy-pasted that part, not sure why it's there."
- "There's no way this could break."
- Overclaiming ownership of something Supabase/Gemini actually provides.
