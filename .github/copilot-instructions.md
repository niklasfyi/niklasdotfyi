## What this repo is (short)

This is a personal Astro site built from the "Astro Cactus" starter and heavily customised for IndieWeb content collections (articles, notes, checkins, likes, replies, photos, bookmarks, rsvps). It uses Astro v5, Tailwind v4, Zod-backed Content Collections, Satori for OG image generation, and Pagefind for static search.

## Top-level workflow and commands

- Preferred package manager: pnpm. Primary scripts (see `package.json`):
  - `pnpm dev` / `pnpm start` — start local dev server (Astro dev).
  - `pnpm build` — build production site to `./dist`.
  - `pnpm postbuild` — run Pagefind to generate static search index (`pagefind --site dist`). Run this after `pnpm build` to get search working.
  - `pnpm preview` — preview a built site locally.
  - `pnpm lint` — run Biome linting (`biome lint .`).
  - `pnpm format` — formats code (Biome + Prettier + plugin-astro).

If you need to reproduce the public search index locally: `pnpm build && pnpm postbuild`.

## Architecture & important files (what to touch and why)

- `astro.config.ts` — site integrations, markdown plugins, env schema (WEBMENTION_* vars), Satori/sharp/image config and Vite tweaks. Changes here affect builds and OG generation.
- `package.json` — scripts and dependencies; note the `postbuild` step that runs Pagefind.
- `src/content.config.ts` — canonical place for Content Collections and Zod schemas. This file defines the loaders and shape of frontmatter for every content type (articles, notes, checkins, etc.). When adding new content types or fields, update this file.
- `src/site.config.ts` — site metadata and Expressive Code options (themes, styling overrides). Used by `astro.config.ts` and OG generator.
- `src/pages/og-image/[...slug].png.ts` — server-side Satori + resvg pipeline to render OG images. OG generation depends on site config and content frontmatter (see `ogImage` handling in `src/content.config.ts`).
- `src/layouts/Post.astro`, `src/components/note/Note.astro` — these include `data-pagefind-body` and `data-pagefind-filter` attributes used to control Pagefind indexing and tag filtering. If you want to include/exclude pages from the search index, edit these files.
- `src/utils/date.ts` — centralised date formatting tied to `siteConfig.date.locale`.
- `src/components/webmentions/*` and `src/utils/webmentions.ts` — webmention handling and rendering. Env variables for webmentions are declared in `astro.config.ts`.

## Patterns & conventions an AI agent should follow

- Content is managed with local Content Collections. When adding a new post/note, place .md/.mdx files under `src/content/<collection>/...` and follow the Zod schema in `src/content.config.ts`. Example required fields: `title`, `date` (ISO 8601), `description` (optional for some types), `draft` (boolean).
- Draft posts: `draft: true` excludes items from production builds, feeds, og-images and search. Tests/PRs changing content selection should be aware of this.
- OG images: If frontmatter includes `ogImage`, the generator will skip Satori; otherwise it creates one. For visual changes to OG images, edit `src/pages/og-image/[...slug].png.ts` and `src/site.config.ts` (Expressive Code options are used elsewhere).
- Static search: Pagefind indexing is only created after `postbuild`. The codebase uses `data-pagefind-*` attributes to control what gets indexed (see `src/layouts/Post.astro` and `src/components/note/Note.astro`).
- Styling & formatting: Biome + Prettier + Prettier-plugin-Astro + Tailwind plugin. Keep to existing format rules: run `pnpm format` and `pnpm lint` in CI.
- Fonts/raw assets: `astro.config.ts` contains a small Vite transform `rawFonts()` used to bundle `.ttf`/.woff assets as raw buffers — be careful when changing Vite pipeline.

## Environment & build gotchas

- Image/OG pipeline requires native dependencies (sharp). `pnpm` overrides are configured in `package.json` (see `pnpm.overrides`) to pin `sharp`.
- `@resvg/resvg-js` is present and excluded from Vite optimizeDeps — touching image generation code may require running a clean install and rebuild.
- Pagefind needs `dist` produced by `pnpm build`; running `pnpm postbuild` without a current `dist` will be a no-op.

## Webmention flow (expanded)

This project integrates Webmentions via `webmention.io`. The implementation is server-side and cached; below are the concrete steps, files, and how to debug or extend the flow.

- Key files:
  - `src/utils/webmentions.ts` — core logic: fetches from webmention.io, filters/normalises entries, merges with a local cache and exposes `getWebmentionsForUrl(url)` used by components.
  - `src/components/blog/webmentions/index.astro` — page-level wrapper that calls `getWebmentionsForUrl` and renders `Likes` + `Comments` components.
  - `src/components/blog/webmentions/Comments.astro` & `Likes.astro` — presentation components that expect `WebmentionsChildren[]` and render h-card/h-cite markup.

- High-level runtime flow:
  1. A page that includes webmentions (e.g. a post) imports `getWebmentionsForUrl` and calls it with the full URL (constructed from `Astro.url` and `Astro.site`). See `src/components/blog/webmentions/index.astro`.
  2. `getWebmentionsForUrl` ensures a cached copy is loaded (backed by `.data/webmentions.json`). If no cache is present, it triggers a fetch from webmention.io and writes the cache.
  3. The fetch path (`fetchWebmentions`) calls `https://webmention.io/api/mentions.jf2?domain=...&token=...` and returns the JSON feed.
  4. Results are filtered by property type (`like-of`, `mention-of`, `in-reply-to`) and comment-like mentions must have `content.text`.
  5. The code normalises target URLs (removes trailing slashes and an older slug segment pattern), and `getWebmentionsForUrl` will match both current and legacy URL shapes (old `/posts/YYYY-MM-DD-slug/` style) so mentions are preserved after slug migrations.
  6. Presentation: `Likes.astro` renders `like-of` entries (author photos, count), `Comments.astro` renders mention/in-reply-to entries with author, avatar, and text.

- Cache & deduplication:
  - Cache file: `.data/webmentions.json` (object with `lastFetched` and `children` array). The util merges new fetch results with the existing cache deduplicating by `wm-id`.
  - The cache is written to disk via `writeToCache` and created if `.data` doesn't exist.

- Environment & required configuration:
  - `SITE` (Astro site) must be set in `astro.config.ts` (siteConfig.url). `src/utils/webmentions.ts` uses `import.meta.env.SITE` to build the webmention query.
  - `WEBMENTION_API_KEY` must be set (server secret). It is validated in `src/utils/webmentions.ts` (logged warning if missing). The env schema for these vars is declared in `astro.config.ts`.

- Debugging and manual checks:
  - Check the runtime logs: `src/utils/webmentions.ts` logs when webmentions are fetched ("Fetching webmentions for URL: ...") and when cache is saved ("Webmentions saved to .data/webmentions.json").
  - Inspect the cache file directly: open `.data/webmentions.json` to see `lastFetched` and `children`.
  - To trigger a fresh fetch locally: run the dev server (`pnpm dev`) and load a page that includes webmentions; the server will fetch and write the cache on first request.
  - If you need to re-run a fetch quickly, delete `.data/webmentions.json` and reload the page to force a refetch.
  - To validate the token manually, call the webmention.io API with your token from a shell or Postman: `https://webmention.io/api/mentions.jf2?domain=YOUR_HOSTNAME&token=YOUR_TOKEN` and confirm a valid feed is returned.

- Implementation notes & caution:
  - The code filters webmention types using `validWebmentionTypes = ["like-of","mention-of","in-reply-to"]` and requires text for mention-like properties.
  - Normalisation: URLs are normalised (strip trailing slash and some path segments) so migrated slugs still match webmentions.
  - Potential bug discovered while reading the code: `fetchWebmentions` appends the since parameter as `&since${timeFrom}` (missing `=`). If you rely on incremental fetches using `since`, review and fix to `&since=${timeFrom}` — don't change this in production without testing.

If you want I can:
- add a small script to explicitly fetch and refresh the cache (e.g., `scripts/fetch-webmentions.js`) and wire it to `package.json` (safe, idempotent), or
- create a tiny health-check page that prints cached stats (counts per property) to help debugging in CI.

## Examples (concrete edits an agent might make)

- Add a new optional frontmatter field to notes: update `src/content.config.ts` schema for `note`, then update any rendering in `src/layouts/Post.astro` or the relevant `components/*` that consume it.
- Change the OG image background color: edit `src/pages/og-image/[...slug].png.ts` (Satori markup) and re-run `pnpm build` to validate outputs.
- Include more pages in Pagefind: move or add the `data-pagefind-body` attribute to the top-level article element in `src/layouts/Post.astro` or other templates.

## Where to look for tests, CI, and deployment

- There are no unit tests in this repo. CI relies on the build scripts and lint/format checks. Deploy settings live in `netlify.toml` (Netlify) — review it if changing deploy behavior.

## Quick checklist for PRs the agent creates

1. Run `pnpm format` then `pnpm lint` locally.
2. If touching content/collections, run `pnpm build && pnpm postbuild` to validate search/og artifacts.
3. Mention any required env vars (WEBMENTION_API_KEY / WEBMENTION_URL / WEBMENTION_PINGBACK) in the PR description if you changed webmention behaviour.
