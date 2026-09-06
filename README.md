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

The Worker-to-Reader credential is a server-only Wrangler secret named
`READER_API_SHARED_SECRET`. Set it with `wrangler secret put
READER_API_SHARED_SECRET`; do not put its value in `worker.js`, `site.js`,
`dist/`, HTML, or committed configuration. The Base66 Reader process must be
configured with the matching server-only environment variable
`SCRIPTUREI_READER_API_SHARED_SECRET`.

The Worker forwards only the four supported Reader routes and returns `503`
when its credential binding is missing. The current repository has no
Cloudflare rate-limit binding or rule to preserve; configure an owner-approved
Cloudflare rate-limit rule at the public Worker boundary if operationally
required.

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

# SCRIPTUREi Reader Worker authentication operations R1

STATUS: GOVERNED OPERATIONS REFERENCE / SECRET VALUES EXCLUDED
DATE: 2026-09-06
SCOPE: Cloudflare Worker to SCRIPTUREi Reader API

## Credential reference

| Boundary | Credential name | Value location |
| --- | --- | --- |
| Public Worker | `READER_API_SHARED_SECRET` | Cloudflare Worker secret store |
| ARC Reader API | `SCRIPTUREI_READER_API_SHARED_SECRET` | ARC Podman/service secret store |
| Approved operator record | `Reader secret` | Approved Bitwarden vault |

The two runtime credentials must contain the same approved value. The value must
never be committed, logged, placed in browser code, included in `dist/`, or
recorded in GitHub comments.

The Bitwarden record `BibleAPI` is an external API.Bible credential and is not
the Worker-to-Reader credential.

## Protected routes

The Worker injects the credential only for:

- `/v1/reader/editions`
- `/v1/reader/books`
- `/v1/reader/chapters`
- `/v1/reader/passage`

Non-Reader paths and assets remain handled by the public-site asset binding.
The API `/v1/status` endpoint remains outside the Reader-content
authentication boundary.

## Rotation and deployment

1. Generate or retrieve the replacement value in the approved secret manager.
2. Update the ARC API secret binding first.
3. Restart and validate the API: missing/invalid `401`, valid `200`, status
   `200`.
4. Update the Cloudflare Worker secret `READER_API_SHARED_SECRET`.
5. Deploy the verified Worker commit.
6. Smoke-test the public site and all four exact Reader paths.
7. Keep the previous validated artifact and secret object for rollback until
   the recovery window closes.

## Fail-closed behavior

- Missing Worker secret: `503`, no-store response.
- Missing or invalid API credential: `401`.
- Never make the Reader origin public to recover from a secret mismatch.

## Rollback

Rollback only to a previously validated authenticated Worker/API pair. Do not
restore an unauthenticated Reader proxy. Preserve the deployment version,
commit SHA, image digest, Quadlet backup, and secret-object names as evidence;
never preserve or publish secret values.

## Validation record

The current implementation was validated with:

- `npm run check`: PASS.
- API: `MISSING=401 INVALID=401 VALID=200 STATUS=200`.
- Public Worker: editions `200`; root `200`; other Reader routes reached
  API validation when required query parameters were absent.
- Public UI rendered a Tagalog Bible passage.
