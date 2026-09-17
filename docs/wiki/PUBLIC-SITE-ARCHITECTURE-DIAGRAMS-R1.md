# SCRIPTUREi Public Site Architecture Diagrams R1

STATUS: CURRENT DOCUMENTATION / PUBLIC-SAFE / NON-AUTHORIZING
DATE: 2026-09-17

## 1. Reader request path

```mermaid
flowchart LR
    U[Browser]
    W[Cloudflare Worker]
    A[Authenticated Reader API]
    B[Governed Base66 / Reader data]

    U -->|HTTPS| W
    W -->|protected Reader routes| A
    A -->|read-only governed content| B
```

The Worker is a presentation/authentication boundary. It does not create Bible authority or rights.

## 2. Protected route boundary

```mermaid
flowchart TD
    R{Request path}
    E[/v1/reader/editions]
    B[/v1/reader/books]
    C[/v1/reader/chapters]
    P[/v1/reader/passage]
    S[/v1/status]
    X[Public assets / site content]
    AUTH[Inject server-side Reader credential]

    R --> E --> AUTH
    R --> B --> AUTH
    R --> C --> AUTH
    R --> P --> AUTH
    R --> S
    R --> X
```

Credential values remain server-side and must not appear in browser code, committed files, logs, or generated public assets.

## 3. Repository responsibility separation

```mermaid
flowchart LR
    BS[scripturei-bible-sources\nsource captures / provenance / rights]
    PL[scripturei-platform\ngovernance / runners / catalog logic / evidence]
    PS[scripturei-public-site\npresentation / Reader Worker]

    BS -->|governed source evidence| PL
    PL -->|approved Reader-facing data| PS
```

The public-site repository is not the system of record for Bible catalog authority or source rights.

## 4. Reach metric boundary

```mermaid
flowchart LR
    ED[Approved Scripture edition]
    LC[Language coverage record]
    PM[Population coverage mapping]
    EV[Evidence validation]
    RM[Reach metric]
    UI[Public display]

    ED --> LC --> PM --> EV --> RM --> UI
```

A reach metric is presentation data derived from governed evidence. It must not be treated as a canon, rights, or publication decision.

## 5. Fail-closed Reader behavior

```mermaid
stateDiagram-v2
    [*] --> Request
    Request --> Authorized: protected route + valid server credential
    Request --> ServiceUnavailable: missing Worker secret
    Request --> Unauthorized: invalid/missing origin credential
    Authorized --> ReaderResponse
    ServiceUnavailable --> [*]
    Unauthorized --> [*]
    ReaderResponse --> [*]
```

The recovery path is to restore a valid authenticated Worker/API pair, not to make the Reader origin public.