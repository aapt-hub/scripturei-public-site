# SCRIPTUREi — Bibles for the World

Public presentation repository for `aapt-hub/scripturei-public-site`.

## Current state

- GitHub repository: active.
- Default production branch: `main`.
- Review branch for the current web/deployment update: `web-update-reader-integration-20260824`.
- Cloudflare runtime target: static assets from `./dist` through Wrangler.
- Production deployment remains gated until the review branch passes validation and is explicitly promoted.
- Runtime Bible connections: none.

The page is intentionally static. The Bible reader remains an inactive placeholder until Bible sources, publication rights, provenance, privacy, and security controls pass their own gates.

## Authority boundaries

Project governance remains:

```text
Bible → Pentecostal Theology → OWNER → EEOS Middleware, AI, automation, and operational technology
```

The public production stewardship statement is:

```text
Bible → Kindom Principles → PROMiXi → EEOS, AI, automation, and technology
```

PROMiXi is the named production operator and steward. This does not supersede the OWNER's project governance authority.

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
