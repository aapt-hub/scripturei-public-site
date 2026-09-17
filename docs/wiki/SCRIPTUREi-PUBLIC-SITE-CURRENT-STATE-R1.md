# SCRIPTUREi Public Site Current State R1

STATUS: CURRENT DOCUMENTATION / PUBLIC-SAFE / NON-AUTHORIZING
DATE: 2026-09-17

This page documents the public-site boundary only. It does not grant publication rights, canon authority, Bible-text mutation authority, or access to private operational systems.

## Role

`scripturei-public-site` is the presentation and Reader-facing web layer. It is not the canonical Bible catalog, not the source repository, and not the authority for canon, rights, promotion, or publication decisions.

## Reader authentication boundary

The current Reader Worker protects the exact Reader API routes documented in `docs/READER-AUTH-OPERATIONS-R1.md`:

- `/v1/reader/editions`
- `/v1/reader/books`
- `/v1/reader/chapters`
- `/v1/reader/passage`

The Worker injects the server-side Reader credential for those protected routes. Secret values must never be committed, logged, embedded in browser code, or published in generated assets.

The API status endpoint remains outside the Reader-content authentication boundary.

## Public-site responsibility

The public site may:

- render approved Reader content;
- render approved edition/catalog metadata exposed by the Reader API;
- present mission/reach information from governed source data;
- provide navigation and client-side presentation;
- fail closed when Reader authentication or upstream Reader availability is not valid.

It must not:

- infer or alter canon;
- turn held/reference-only material into canonical/public material;
- create publication rights;
- expose private credentials;
- bypass the authenticated Reader boundary;
- treat presentation metadata as catalog authority.

## Repository separation

The main repository roles are intentionally separate:

- `scripturei-platform` — architecture, runners, governance, discovery/indexing/catalog logic and evidence;
- `scripturei-bible-sources` — governed source captures, source identity, hashes, rights/provenance evidence and source-specific records;
- `scripturei-public-site` — public presentation and Reader client/Worker boundary.

## Verification basis

This page is aligned to the current `docs/READER-AUTH-OPERATIONS-R1.md` contract and existing public-site design documents. It does not claim that unverified future reader-dashboard features are deployed.

## Related documents

- `docs/READER-AUTH-OPERATIONS-R1.md`
- `docs/design/scripturei-reader-v2.md`
- `docs/design/scripturei-header-navigation-v2.md`
- `docs/design/scripturei-base66-reach-engine-boundary-v1.md`
- `docs/design/scripturei-reach-metric-control-v1.md`
- `docs/wiki/PUBLIC-SITE-ARCHITECTURE-DIAGRAMS-R1.md`
