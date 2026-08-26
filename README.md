# SCRIPTUREi — Bibles for the World

Public presentation repository for `aapt-hub/scripturei-public-site`.

## Current state

- GitHub repository: active.
- Default production branch: `main`.
- Review branch for the current web/deployment update: `web-update-reader-integration-20260824`.
- Cloudflare runtime target: static assets from `./dist` through Wrangler.
- Production deployment remains gated until the review branch passes validation and is explicitly promoted.
- Runtime Bible connections on `main`: none.

The current page is intentionally static. The Bible reader remains an inactive placeholder until Bible sources, publication rights, provenance, privacy, security, API, and runtime controls pass their own gates.

## Target application architecture

The governed target architecture is:

```text
Vue reader/client
  → HTTPS
  → Cloudflare ingress/tunnel where operationally appropriate
  → Go REST API
  → read-only Base66 runtime indexes
  → immutable governed Base66 release
```

The public presentation layer does not own Scripture authority and must not access canonical source files directly or expose a Base66 mutation path.

Search capabilities will be added only through governed read-only API contracts, including lexical, contextual, concordance/cross-reference, semantic/vector, and hybrid search as they pass their implementation and publication gates.

## Authority boundaries

Project governance remains:

```text
Bible → Pentecostal Theology → OWNER → EEOS / TDs / AI / automation / operational technology
```

Technology, UI, search, analytics, LLMs, and deployment systems do not create Biblical authority.

## Ownership, Licensing, and Third-Party Materials

Original public-site materials are not released under a blanket repository-wide open-source or open-content license unless an explicit written license states otherwise.

Third-party Bible text, manuscripts, reference works, fonts, images, media, libraries, and other external resources retain their own rights and provenance requirements.

See:

- `LICENSE-STATUS.md`
- `COPYRIGHT-NOTICE.md`
- `THIRD-PARTY-NOTICES.md`

## Local commands

```text
npm install
npm run materialize:background
npm run validate
npm run build
npm run check
npm run deploy
```

`npm run check` is the pre-deployment gate and runs validation before rebuilding the deployable output.

The approved background remains fixed to the viewport while the foreground content scrolls over it. The build produces a platform-neutral `dist/` directory and a single-file local review page.

## Cloudflare build/deploy configuration

Use these repository settings for a Git-connected Cloudflare deployment:

```text
Repository: aapt-hub/scripturei-public-site
Production branch: main
Install command: npm install
Build command: npm run check
Deploy command: npm run deploy
Build output directory: dist
Wrangler configuration: wrangler.jsonc
```

The Wrangler configuration already binds static assets to `./dist`.

## Promotion gate

Do not deploy a review branch directly to production. The intended sequence is:

```text
review branch
  → npm run check
  → inspect generated output
  → owner approval
  → merge to main
  → production deployment
```

If validation fails, promotion stops and production remains unchanged.
