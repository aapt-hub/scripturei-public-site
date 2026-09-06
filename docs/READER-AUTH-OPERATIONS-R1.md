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
- Public Worker: homepage, editions, books, chapters, and passage each returned
  `200`.
- Public Worker deployment version: `e862784a-d4ba-4cfc-9ea1-096e77f03c74`.
- Public UI rendered Assamese `asm-asmfb`, 1 Samuel chapter 10.
- Merged Worker commit: `38c3cec9fe304354d74308b6cecd71da8e07f4b4`.
