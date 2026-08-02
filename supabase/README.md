# Supabase schema

## Fresh install

Run **`setup.sql`** once — Supabase Dashboard → SQL Editor → New query → paste the whole file → Run.

It is the authoritative, self-contained definition of the final schema: tables, columns, indexes,
RLS policies, the signup trigger, and both storage buckets. Every statement is idempotent
(`create ... if not exists`, `create or replace`, `drop policy if exists` before `create policy`,
`on conflict do update` for buckets), so re-running it on an existing database is safe and is also
how you pull a database that was built from older migrations up to the current schema.

## `migrations/`

Historical record only. These are the incremental changes as they were actually applied during
development, numbered in the order they were written:

| File | Adds |
| --- | --- |
| `001_initial.sql` | `profiles`, `projects`, `characters`, `scenes` + indexes, RLS, signup trigger |
| `002_credits.sql` | `profiles.generations_limit` |
| `003_dna_consistency.sql` | `characters.visual_dna`, `scenes.consistency_score` |
| `004_model_used.sql` | `scenes.model_used` |
| `005_lora_fields.sql` | `characters.lora_status` / `lora_url` / `lora_trigger_word` / `lora_job_id` / `extra_image_urls` + `idx_characters_lora_status` |
| `006_enhanced_prompt.sql` | `scenes.enhanced_prompt` |

Applying `001` through `006` in order produces the same schema as `setup.sql`. You do not need to
run them for a new install — `setup.sql` already contains everything.

There is no migration runner wired into the app; migrations were applied by hand in the SQL editor.
If you add a schema change, add it as the next numbered file here **and** fold it into `setup.sql`,
otherwise fresh installs will be missing it.

## RLS is defense in depth, not the live authorization layer

This matters — do not get it wrong.

The API server authenticates to Supabase with the **service-role key**, which **bypasses Row Level
Security completely**. Every policy in `setup.sql` is inert for any query the server issues. A
`select` from `server/` will happily return another user's rows if nothing else stops it.

The real, enforced authorization boundary is **`server/utils/ownership.ts`** —
`userOwnsProject()`, `userOwnsCharacter()`, and `userOwnsScene()`. Routes call these before reading
or mutating a row and return `404` when the check fails. If you add a route that touches a
project, character, or scene by ID, it **must** perform one of these checks itself. The database
will not catch the mistake for you.

The RLS policies are still worth keeping: they constrain direct access with the anon or
authenticated key (the Supabase dashboard, SQL editor sessions, and any future browser-side client
that talks to Supabase without going through our API), and they are the correct fallback if the
service-role key is ever swapped out.

## Storage

Two public-read buckets, both created by `setup.sql`:

- `character-references` — character reference photos, extra training images, and the zipped
  image sets uploaded for fal.ai LoRA training
- `generated-scenes` — generated storyboard panels

Both are public-read so `<img>` tags resolve without signed URLs. There are deliberately **no**
insert/update/delete storage policies: nothing but the server ever writes to these buckets, and the
server's service-role key bypasses storage RLS anyway.
