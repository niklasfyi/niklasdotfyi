# Astro IndieWeb Blog & Personal Website – Specification

## 1. Vision & Goals

Build a personal website that:
- Acts as the canonical home for all your writing, short notes, photos, bookmarks, interactions (IndieWeb-first).
- Supports low-friction posting from desktop (scripts) and mobile (Micropub clients).
- Publishes mostly static pages for simplicity, performance, resilience; augments with serverless endpoints where required.
- Is future‑proof for ActivityPub without needing a ground-up redesign.

## 2. Core Principles

1. IndieWeb first: Own your content; syndication is secondary.
2. Flat, inspectable storage: Markdown + frontmatter as the source of truth.
3. Deterministic URLs that never change.
4. Automate what is repetitive; keep authoring friction low.
5. Observability & validation from day one (catch schema issues early).
6. Security & privacy: minimal attack surface; least privilege tokens.

## 3. In Scope (Phase 1)

- Content types & unified feed (with exclusions).
- Micropub (create + media) + IndieAuth token validation.
- Webmention ingestion (via webmention.io initially).
- Templating with microformats2.
- Manual / script-based posting workflow.
- Basic POSSE (manual or semi-manual to Mastodon).
- Image optimization via Astro + responsive markup.
- CI validation (schema + build + microformats smoke).

## 4. Deferred (Phase 2+)

- ActivityPub (actor/outbox/inbox).
- Rich admin UI.
- Automated syndication queues (Flickr / Instagram).
- Self-hosted webmention receiver (replacing webmention.io).
- Incremental hydration for live webmention updates.
- Full privacy controls (private / unlisted UI gating).
- Advanced analytics dashboards.

## 5. Content Model

Primary Types (frontmatter `type`):
- article
- note
- photo
- rsvp
- bookmark
- reply
- like
- checkin (excluded from main feed)
- book
- movie
- flight

Shared Base Fields:
- id (string; stable—UUID or derived from slug)
- type (enum above)
- slug (string, no leading slash; final URL computed)
- date_published (ISO 8601)
- updated (ISO optional)
- title (optional; absent for note/photo unless desired)
- summary (optional; for feeds / meta)
- in_main_feed (bool)
- visibility (public | unlisted | private) – future-proof
- tags (array<string>)
- syndication_targets (array<string>)
- references (array<object>) – for reply/like/bookmark targets
- photos (array<{url, alt, width?, height?}>)  # url MAY be absolute to media CDN (recommended)
- location (optional: {name?, lat?, lon?, accuracy?})
- mf2_raw (optional passthrough from Micropub)
- draft (bool; not published if true)

Type-Specific Extensions:
- reply / like / bookmark:
  - references: [{ url, type: reply | like | bookmark, title? }]
- rsvp:
  - rsvp: yes | no | maybe | interested
  - event: { url, name? }
- book:
  - reading: { title, author, isbn?, status? (reading|completed|abandoned), progress? (0-100) }
- movie:
  - watching: { title, year?, imdb_id?, status? (watched|watching|queued) }
- flight:
  - flight: { origin, destination, airline?, flight_number?, departed_at?, arrived_at? }

Body:
- Markdown (articles, notes, photos [optional description], replies etc.)
- Photos: body is optional caption; frontmatter supplies media metadata.

## 6. URL Strategy

Format for time-based posts:
- /YYYY/MM/DD/slugOrCounter

Counter logic (for untitled notes/photos):
- If no title, assign daily integer N (1-based) for that date.
- Implementation must be race-safe via KV (Workers) storing last counter per date key: counter:YYYY-MM-DD.

Non time-based / special sections (optional patterns):
- /books/
- /movies/
- /flights/
(Individual entries may still use /YYYY/MM/DD/... if desired for consistency—decide early and keep uniform.)

Canonical URL = siteOrigin + path; never reuse a URL.

## 7. Slug Generation

If title:
- slugify(lowercase, hyphen) trimmed to ~60 chars, ensure uniqueness by suffix -2, -3...
If untitled:
- Use counter N only (no leading zeros) as per /YYYY/MM/DD/N.

Store final slug in frontmatter once computed; never recompute on rebuild.

## 8. Micropub Implementation (Phase 1 Scope: Create)

Endpoints:
- POST /api/micropub (create)
- GET /api/micropub?q=config (return supported post types, syndication targets)
- Media: POST /api/micropub/media

Auth Flow:
- Receive bearer token (IndieAuth).
- Introspect or trust token endpoint (configurable).
- Scope required: create (future: update, delete).

Create Flow (Simplest Path):
1. Parse request (form-encoded or JSON).
2. Normalize microformats properties to internal schema.
3. If media already uploaded: accept final URLs (absolute CDN URLs preferred).
4. Derive slug + filename path.
5. Compose markdown frontmatter + body.
6. Commit to GitHub repo (content branch or main) via GitHub API → triggers Cloudflare Pages build.
7. Respond 201 with Location (canonical URL).

Media Endpoint:
- Accept multipart/form-data.
- Validate MIME (image/*); size limit.
- Preserve EXIF metadata (camera, lens, copyright, location, copyright owner). Optional future redaction config.
- Generate filename: YYYY/MM/YYYY-MM-DD-HHMMSS-[counter?]-original-name.ext
- Upload binary directly to Bunny Storage API.
- Return JSON with canonical `url` (MEDIA_BASE_URL + path) and width/height.
- Local dev fallback: write file under /public/media mirror path if CDN disabled.
- (Optional Phase 2: generate derivatives now; Phase 1 may use Bunny Optimizer query params for responsive variants.)

Race Safety for Counters (for untitled posts, not media files):
- Cloudflare KV key: counter:YYYY-MM-DD
- get -> increment -> put atomically (Durable Object optional if contention grows—unlikely).

## 9. Webmentions (Phase 1 via webmention.io)

Storage:
- Scheduled Worker every 6h pulls new mentions and writes JSON:
  - /data/webmentions/{postSlug}.json (aggregated)
Format per entry:
```
{
  "source": "...",
  "verified": true,
  "wm_type": "reply|like|repost|mention|bookmark",
  "author": { "name": "...", "photo": "...", "url": "..." },
  "content": { "text": "...", "html": "..." },
  "published": "ISO"
}
```
Rendering:
- Astro loads JSON at build; groups by type.
Future:
- Self-host receiver Worker; store raw + parsed in KV or R2; migrate path unchanged.

## 10. Microformats2 Markup

Pages:
- Root feed: h-feed (children h-entry).
- h-card in site header + /about.
Entries (h-entry):
- p-name (title) or omit if untitled
- e-content (body HTML)
- dt-published
- u-url
- u-photo (for photos)
- u-in-reply-to, u-like-of, u-bookmark-of
- p-category for each tag
Syndication links: rel="syndication" + u-syndication microformats.

## 11. Feeds

Provide:
- /feed.xml (RSS)
- /feed.json (JSON Feed)
- /microformats (HTML root with h-feed—already root index)
- Possibly /feed-full.json (includes notes, photos)
Implement feed generation as build-time scripts reading content directory.

## 12. Syndication (Phase 1 Minimal)

Manual approach:
- After deployment, run a script (or manual Mastodon post) referencing canonical URL.
- Optionally store returned remote URL in an updated frontmatter `syndication:` array or sidecar JSON.

Phase 2:
- Queue + Worker processes.
- Add flickr / instagram modules.

## 13. ActivityPub (Future-Proofing Notes)

Reserve endpoints (no-op Phase 1):
- /.well-known/webfinger
- /@you (actor JSON placeholder)
Data Requirements:
- Stable IDs (URLs)
- Map internal schema → ActivityStreams objects later (store enough fields now).

## 14. Media Handling

Strategy: Offload originals to Bunny CDN for immutable, cache-efficient delivery while keeping deterministic, human-readable paths.

Storage & Paths:
- Canonical media host: MEDIA_BASE_URL (e.g. https://media.example.com)
- Path pattern: /YYYY/MM/YYYY-MM-DD-HHMMSS[-counter?]-original-name.ext
- Absolute URLs stored in frontmatter photos[].url for portability (site HTML can still render them directly).
- Local development fallback writes to /public/media with identical relative paths.

Upload Flow (Micropub/media endpoint):
1. Receive file (multipart/form-data).
2. Validate size & MIME.
3. (Optional future) Redact sensitive EXIF if a privacy toggle is enabled; by default all EXIF kept (camera, lens, copyright, location).
4. Probe dimensions (without altering EXIF); include width/height in response & frontmatter entry.
5. PUT to Bunny Storage: https://REGION.storage.bunnycdn.com/STORAGE_ZONE/YYYY/MM/filename
6. Set Cache-Control: public, max-age=31536000, immutable
7. Return JSON: { url, width, height }

Responsive Images:
Option A (Phase 1): Use Bunny Optimizer / resizing query params.
- Build srcset with widths [480, 760, 1024, 1600, 2048] → append ?width=<w>&format=auto&quality=80
Option B (Phase 2): Pre-generate derivatives via a Worker/script and upload alongside original under e.g. /_derived/<w>/filename.

Astro Integration:
- Custom <MediaImage /> component constructs src, srcset, sizes using MEDIA_BASE_URL.
- If optimizer disabled, fallback to single original src plus width/height attributes (LCP acceptable for modest image sizes after compression).

Caching & Purge:
- Filenames are timestamped; replacements are new URLs, so purge rarely needed.
- If a delete required, remove from Storage and optionally 404 fallback image.

Migration / Future R2:
- Since content stores absolute URLs, migrating to different CDN is path-stable—only MEDIA_BASE_URL env change + optional redirect.

Privacy:
- EXIF fully preserved; user consciously publishes location and camera metadata. Provide future configuration to redact GPS if desired.

Failure Handling:
- On upload failure: return 503; do not reference placeholder in content.
- Optional fallback queue: persist pending upload to KV for retry.

## 15. Build & Deployment

Platform:
- Astro static build → Cloudflare Pages.
- Workers:
  - Micropub endpoint
  - Media endpoint (direct CDN upload; not committing binaries)
  - Webmention poller (Scheduled)
  - (Later: syndication queue, ActivityPub)
- Media files NOT committed (except optional local dev); content references external CDN.
Trigger:
- New commit to main (or content) branch triggers build.
- Micropub commits markdown only (commit message “Micropub: <slug>”).

## 16. Folder Structure (Proposed)

```
/content
  /articles/YYYY/MM/slug.md
  /notes/YYYY/MM/DD/N.md
  /photos/YYYY/MM/DD/slug.md
  /replies/...
  /likes/...
  /bookmarks/...
  /rsvps/...
  /books/
  /movies/
  /flights/
/public
  /media/ (dev-only fallback mirror of CDN paths; optional)
/data
  /webmentions/{slug}.json
/scripts
  new-post.ts
  validate-content.ts
  build-feeds.ts
  slug-counter.test.ts
  media-migrate-to-cdn.ts (one-off / optional)
/workers
  micropub.ts
  media-endpoint.ts
  webmention-poller.ts
  common/auth.ts
/components
  MediaImage.astro (CDN srcset helper)
```

## 17. Validation & CI

Additions:
- Validate photos[].url host matches MEDIA_BASE_URL (or relative) for consistency.
- Ensure width/height present for photo posts (avoid CLS) if available.

## 18. Security

Additions:
- Enforce allowlist of file extensions before CDN upload.
- Document policy that EXIF is retained intentionally (avoid accidental assumptions of stripping).

## 19. Observability

Add counters:
- media_uploads_total
- media_upload_failures_total
- media_bytes_uploaded_total

## 20. Performance

Add note:
- Prefer CDN resizing (optimizer) to reduce build CPU; fallback derivatives script only if quality needs exceed optimizer features.

## 21. Accessibility

Checklist:
- Alt text required.
- Heading order validated (script).
- Color contrast pass (axe in CI for core pages).
- Skip link.
- Focus outline preserved.
- Semantic landmark roles (header, main, footer).

## 22. Development Phases (Refined)

Phase 1 (MVP Launch):
- Schema + content pipeline
- Micropub (create) + media
- Basic theming + microformats
- Webmention fetch integration
- Unified feed (+ exclusion logic)
- Core content types (article, note, photo, reply, like, bookmark, rsvp)
- RSS/JSON feeds
- CI validation
- Manual syndication workflow
- CDN media upload path
- MediaImage component

Phase 2:
- Books, movies, flights UI polish
- Syndication queue automation
- Self-host webmentions
- ActivityPub foundations (actor + outbox)
- Admin UI
- Privacy controls
- Optional derived variants script (if not using Bunny Optimizer)
- Signed URLs / private media (if implementing visibility gating)
- Optional EXIF redaction toggle

Phase 3:
- Full ActivityPub (inbox, signatures)
- Real-time webmention refresh (client)
- Advanced dashboards & analytics
- Progressive search (local index)

## 23. Detailed Phase 1 Checklist (Actionable Steps)

Schema & Repo Setup
[ ] Create repo structure (content/, workers/, scripts/, data/, public/media/ (dev only))
[ ] Add package.json, Astro config
[ ] Define TypeScript interfaces for frontmatter
[ ] Implement Zod schema (schema/content.ts)
[ ] Write validation script (scripts/validate-content.ts)
[ ] Add sample content for each core type (article, note, photo)

Slug & Counter
[ ] Implement slugify utility
[ ] Implement counter KV mock locally
[ ] Write test for race-safety (simulate parallel increments)

Micropub (Create)
[ ] Worker scaffold (micropub.ts)
[ ] IndieAuth token validation helper (common/auth.ts)
[ ] Parser: convert Micropub properties → internal schema
[ ] Slug + filename builder
[ ] GitHub commit helper (POST create file via API)
[ ] Return 201 + Location header test
[ ] Negative tests (missing token, invalid type)

Media Endpoint (CDN)
[ ] Implement direct Bunny upload (media-endpoint.ts)
[ ] Dimension probe (width/height)
[ ] MIME/type + size validation
[ ] Filename generation (timestamp)
[ ] Return JSON (url,width,height)
[ ] Dev fallback write to /public/media when CDN disabled
[ ] Add optional optimizer srcset helper
[ ] Tests: multiple uploads same second (ensure uniqueness via counter if needed)

Webmentions (Fetch Only)
[ ] Scheduled Worker (webmention-poller.ts)
[ ] Config: WEBMENTION_IO_TOKEN
[ ] Fetch new mentions → aggregate per target
[ ] Write /data/webmentions/*.json
[ ] Basic transformation (grouping not required yet)
[ ] Add build step to copy JSON into final /data

Templates & Rendering
[ ] Base layout with h-card
[ ] h-entry template component
[ ] Unified index: filter out excluded types
[ ] Type-specific listing pages
[ ] Single entry page (article/note/photo share layout logic)
[ ] Webmentions section injection (load JSON if present)
[ ] MediaImage component using CDN params
[ ] Tag pages (optional Phase 1?)

Feeds
[ ] Implement build-feeds.ts (RSS + JSON)
[ ] Include main feed only (in_main_feed true)
[ ] Validate output (non-empty, correct count)
[ ] Add link rel=alternate in <head>

Image Handling
[ ] Add MediaImage component (CDN srcset)
[ ] Fallback alt text check (CI fails if missing)

Syndication (Manual)
[ ] Add frontmatter field syndication_targets
[ ] Document manual posting procedure
[ ] Add a script placeholder (scripts/record-syndication.ts)

CI Pipeline
[ ] GitHub Actions workflow: install → build → validate → test → feed build → deploy preview
[ ] Add microformats test (parse one sample built page)
[ ] Link checker integration (lychee or similar)
[ ] Alt text enforcement script
[ ] Validate media URLs host prefix

Configuration & Secrets
[ ] .env.example (tokens, endpoints)
[ ] Bindings for Workers (KV namespace for counters)
[ ] Document secret injection procedure
[ ] Add MEDIA_BASE_URL
[ ] Add BUNNY_STORAGE_ZONE
[ ] Add BUNNY_STORAGE_API_KEY
[ ] Add BUNNY_STORAGE_REGION
[ ] Add BUNNY_USE_OPTIMIZER (bool)
[ ] Add MEDIA_PRIVACY_MODE (future toggle for EXIF redaction)

Observability
[ ] Log format standard (JSON lines)
[ ] Health endpoint (api/health) stub
[ ] Record micropub post success metric (increment KV or log for now)
[ ] Record media upload metrics

Docs
[ ] CONTRIBUTING.md (how to add content)
[ ] ARCHITECTURE.md (diagram + flows including CDN)
[ ] MICROPUB.md (endpoint usage examples)
[ ] SYNDICATION.md (manual process)
[ ] PRIVACY.md (media metadata policy)
[ ] MEDIA.md (CDN strategy & optimizer usage)

Launch Prep
[ ] Content baseline (at least 3 articles, 5 notes, 2 photos)
[ ] Validate lighthouse performance
[ ] Validate microformats with external parser
[ ] Final domain DNS + HTTPS (incl media subdomain)
[ ] Announce canonical domain & add rel=me links

Post-Launch Immediate
[ ] Collect first webmentions
[ ] Manually syndicate a post to Mastodon
[ ] Verify caching behavior at edge
[ ] Spot-check CDN resizing variants

## 24. Example Frontmatter (Note)

```
---
id: 2025-08-14-note-3
type: note
slug: 3
date_published: 2025-08-14T18:20:04Z
in_main_feed: true
visibility: public
tags: [sunset, lake]
syndication_targets: []
photos:
  - url: https://media.example.com/2025/08/14/2025-08-14-182002-sunset.jpg
    alt: Sunset over the lake
    width: 2048
    height: 1365
---
Had to stop and capture this light tonight.
```

## 25. Example Frontmatter (Reply)

```
---
id: 2025-08-14-reply-1
type: reply
slug: responding-to-x
date_published: 2025-08-14T19:05:11Z
in_main_feed: true
references:
  - url: https://example.com/post/123
    type: reply
    title: Original post title
---
Agree with your thoughts—especially on the tooling tradeoffs.
```

## 26. Pseudocode: Daily Counter (Worker)

```js
async function nextDailyCounter(env, dateStr) {
  const key = `counter:${dateStr}`;
  const current = await env.COUNTERS.get(key);
  const n = current ? parseInt(current, 10) + 1 : 1;
  await env.COUNTERS.put(key, n.toString());
  return n;
}
```

## 27. Pseudocode: Micropub Create (Simplified)

```js
// POST /api/micropub
export default async function handle(request, env) {
  const token = extractBearer(request);
  await validateToken(token, env);
  const mf = await parseMicropub(request);
  const now = new Date();
  const dateStr = now.toISOString().slice(0,10); // YYYY-MM-DD
  const hasTitle = !!mf.name;
  const counter = hasTitle ? null : await nextDailyCounter(env, dateStr);
  const { yyyy, mm, dd } = parts(now);
  const slug = hasTitle ? uniqueSlug(slugify(mf.name)) : String(counter);
  const path = contentPathForType(mf.type, yyyy, mm, dd, slug);
  const frontmatter = buildFrontmatter(mf, { slug, date: now.toISOString() });
  const body = mf.content || "";
  const md = serializeMarkdown(frontmatter, body);
  await commitFileToRepo(path, md, env);
  const url = `${env.SITE_ORIGIN}/${yyyy}/${mm}/${dd}/${slug}`;
  return json(201, { url }, { "Location": url });
}
```

## 28. Risk Register (Condensed)

| Risk | Mitigation |
|------|------------|
| Race conditions on untitled post counters | KV atomic style increment; low contention expected |
| Micropub token misuse | Strict scope, short token TTL, rate limiting |
| Build latency after posting | Accept initial delay; consider partial re-render (future) |
| Large media overhead | Direct CDN upload + size limits + optional compression |
| ActivityPub complexity creep | Isolate future code in separate Worker |
| Schema drift | CI validation required for all content |
| CDN outage | Local dev fallback + cached pages still reference immutable URLs; monitoring |
| Unwanted sensitive EXIF later | Future optional redaction toggle; document current policy |

## 29. Open Design Decisions (Resolve Early)

1. Should books/movies/flights use time-based URLs or dedicated slug spaces?
2. Redact any EXIF? (Current: keep all including location; future toggle?)
3. Use UUID for `id` or derive from slug? (If slug stable, slug-as-id acceptable.)
4. Commit on main or use content branch + merge bot? (Simplest: main.)
5. Fallback if GitHub API down? (Return 503 vs queue file locally in KV.)
6. Use Bunny Optimizer vs pre-generated derivatives?
7. Allow relative media URLs in frontmatter or enforce absolute CDN URLs?

## 30. Next Immediate Actions

(From checklist – suggested starting slice)
1. Initialize repo + baseline Astro project.
2. Implement Zod schema & one validation script.
3. Add 2–3 sample markdown entries of different types.
4. Implement slug utilities + tests.
5. Scaffold Micropub Worker (no Git commit yet; just echo parsed).
6. Implement media endpoint with Bunny upload (dev fallback).
7. Integrate GitHub commit functionality.
8. Deploy first build to staging domain.
9. Validate microformats on sample page.
10. Point media subdomain to Bunny & test one upload.
