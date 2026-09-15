# Architecture — Kimiyaye Vahsh Playable Game

## Overview

The repository is a **monorepo** layered on top of the existing card-data and asset tree (`data/`, `assets/`, `docs/`, `tools/`). No legacy content was removed.

```
site/
├── apps/web/              # Vite + React game client (standalone-capable)
├── packages/
│   ├── contracts/         # Shared Zod schemas, env, protocol constants
│   ├── game-core/         # Deterministic rules engine (no I/O)
│   └── game-server/       # Authoritative Socket.IO server + rooms
├── data/                  # Canonical cards, rules, specials (existing)
├── assets/                # Card art (existing)
└── docs/                  # Design + architecture (existing + new)
```

## Separation of concerns

| Layer | Responsibility | Trust |
|-------|----------------|-------|
| **game-core** | State machine, legality, trick resolution, scoring | Pure; unit-tested |
| **game-server** | Rooms, matchmaking, command validation, projections | Authoritative |
| **web client** | UX, animations, local input | Untrusted |
| **contracts** | Wire formats, env parsing | Shared |

Clients **never** compute winners, legal moves, superior suit, or scores.

## Data flow

1. Client sends validated `ClientCommand` over Socket.IO.
2. Server dedupes by `commandId`, checks `clientSeq`, applies via `game-core`.
3. Server emits **per-seat projections** (`projectForSeat`) — no opponent hands.

## Realtime

Socket.IO with room channels `{roomId}:{seat}`. See `docs/realtime-protocol.md`.

## Persistence

MVP uses **in-memory** rooms. Optional PostgreSQL schema documented in `docs/database-model.md` for match history and reward idempotency.

## Main website

The game runs without the main site. Integration is adapter-based — see `docs/main-site-integration.md`.

## Local development

```bash
pnpm install
pnpm run dev:server   # :4010
pnpm run dev:web      # :5173
pnpm test
pnpm run build
```

Copy `.env.example` → `.env` for local overrides.

## Technology choices

- **TypeScript** throughout
- **Vitest** + **fast-check** for core tests
- **Zod** for command/env validation
- **Socket.IO** for rooms + reconnect-friendly transport
- **Vite + React** for a modular client (embeddable in Next.js later via static build or iframe)

Redis and PostgreSQL are optional; not required for MVP.
