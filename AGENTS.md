<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SAKATA OS repository guidance

- Preserve the single multi-tenant codebase; do not fork products for individual customers.
- Keep platform identity, product composition, organization assignment, configuration, entitlements, permissions, and runtime state distinct.
- Scope tenant-owned reads and writes to the authorized organization; retain server-side authorization and database RLS.
- Use the canonical product catalogue in `docs/SAKATA-EXECUTION-STATE.md`. Do not present proposed opportunities as approved products or claim implementation status without evidence.
- Prefer the existing shared platform schema and patterns. Explain and test a genuine schema gap before adding migrations.
- Preserve existing worktree changes. Do not commit or push unless explicitly asked.
