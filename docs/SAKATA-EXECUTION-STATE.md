# SAKATA OS Execution State

**Updated:** 2026-11-16

## Business OS MVP increment (2026-11-16)

- **Business OS entry point:** `/applications` now exposes Business OS only when it is actively assigned to the selected organization and the current member has `core.tasks.read`. `/business` independently verifies the active deployment and permission; `/business/tasks` reuses the shared task register.
- **Demonstrable workflow:** The organization dashboard reports exact counts for active, overdue, urgent, and completed tasks. The task register supports task creation, assignment to active organization members, priorities, deadlines, status updates, completion timestamps, and audit events through the existing shared task foundation. Task management controls are shown only to members with `core.tasks.manage`.
- **Tenant and permission boundary:** Task queries remain explicitly organization-scoped and use the authenticated Supabase client. A new migration replaces the member-only task-read RLS policy with a tenant-and-`core.tasks.read` policy. It also enforces initial `open` status and permitted task lifecycle transitions in the database, not just in the form.
- **Portfolio accuracy:** Business OS, Commerce OS, and Finance OS remain represented by their distinct catalogue scopes. The Business OS application explicitly labels the task workflow as this MVP's implementation and does not present its remaining catalogue capabilities as completed modules. No approval engine was added; the existing shared workflow implementation was left intact.
- **Migration / live database status:** The migration is source-added but has **not** been applied or verified against a live database in this increment. Permission-backed RLS behavior and lifecycle enforcement therefore remain **UNVERIFIED** until the migration is applied and tested against a non-production database.
- **Catalogue status:** Business OS is now marked **In development** with evidence limited to its organization-scoped task dashboard and workflow. The `Tasks & projects` catalogue destination links only to implemented Tasks; CRM, projects, approvals, and other catalogue capabilities remain unimplemented or unverified.
- **Demonstration prerequisite:** The last recorded live catalogue check found one active organization-product assignment, for School OS; an active Business OS assignment for a demonstration organization has not been verified. Do not bypass the deployment gate or create an assignment without the authorized organization decision.
- **Verification (2026-11-16):** Full suite **208 passed across 32 files**; changed-file ESLint and `git diff --check` passed; the final Next.js production build passed with TypeScript and generated `/business` and `/business/tasks`. Anonymous HTTP requests to both Business routes returned **307 to `/login`**. Authenticated end-to-end task execution and live RLS checks were not run. The full-repository lint has no errors and retains 13 pre-existing warnings in unrelated files.

## Current implementation status

- **Brand identity:** SAKATA TECHNOLOGIES is the company; SAKATA OPERATING SYSTEMS is its multi-tenant product platform.
- **Control Plane portfolio:** A read-only live database query verified the 16 curated product identities against existing canonical code/name pairs. No aliases or duplicate product definitions were added.
- **Status distinction:** Registry lifecycle (`active`, `suspended`, `archived`) is separate from portfolio lifecycle, implementation readiness, prioritization, and organization assignment. School OS and Business OS are marked in development from repository implementation evidence; the remaining registry products are not assessed. No product is marked verified or production-ready by this portfolio view.
- **Opportunity evidence:** Candidate workflows are discovery hypotheses. Demand, problem severity/frequency, willingness to pay, estimates, capability reuse, and operational/regulatory risks are not scored because evidence is insufficient. All portfolio entries remain unranked.
- **Portfolio persistence decision:** Proposed opportunities remain code-governed portfolio hypotheses, separate from the database product registry. No portfolio-editor permission or evidence-review workflow exists; adding an editable database source now would introduce an ungoverned second source of truth. No numeric market scores or evidence claims were added.
- **Shared Documents capability:** Added `/documents` as a tenant-scoped metadata register with create, read/detail, and archive operations. The route is outside the platform-admin-only `/control` layout and is linked from the School OS navigation when the user has `core.documents.read`.
- **Document schema:** Added `organization_documents`, permission seeds, RLS, immutable organization/creator/identity fields, updated-at behavior, and immutable audit events in `20261016010000_create_organization_documents.sql`. No migration was applied during this task; the state of any database is **UNKNOWN**. No workflow link was added because the existing workflow model has no document relation and no concrete workflow requires one.
- **File storage boundary:** Repository/config inspection found no configured private document-storage provider or object authorization path. The register stores metadata only; it has no upload control, file path, public URL, or claim that a file is stored.
- **Authorization evidence:** Server actions require document management permission and derive tenant and creator from authenticated organization context; archive updates filter by both document and active organization. RLS separately requires tenant permission. Unit tests cover spoofed organization input and tenant-filtered archive operations, but **live cross-organization RLS behavior has not been tested**.
- **Document release status:** Source-implemented: **YES**. Database-verified: **NO**. Safe for tenant use: **NO — do not release before migration and real RLS verification**.
- **Catalogue authorization:** The Control Plane layout checks platform access; the catalogue page checks `organization.read`, and deployment queries constrain the current organization. An unauthenticated request to `/documents` returned HTTP 307 to `/login`. Previous authorized catalogue browser observations remain from the portfolio increment.
- **Visible School OS surfaces:** Routes and migrations provide source implementations for academic periods/structure, classes, admissions/conversion, students, enrollments, attendance, staff provisioning, fee/payment workflows and shared tasks. Assessment results/reports were not found beyond catalogue/configuration mentions; they are **NOT IMPLEMENTED** as an operational workflow. No School Blackbox specification was found in the repository.
- **School task integration:** Added the tenant-facing `/school/tasks` route reusing the existing task register and server actions. School navigation/dashboard now link to it instead of the platform-gated `/control/tasks`. Task mutations refresh both task surfaces and the School command center.
- **School command center integrity:** Open/approved admissions, active tasks and fee accounts with positive balances use exact count queries; capped queue previews are identified as previews. Student lifecycle findings scan paginated student/enrollment records. Query and workflow lookup errors now surface explicitly. Dates, task timestamps and account currencies use organization settings (schema defaults apply when no settings row exists). These changes are source-reviewed and unit-tested where pure formatting permits; database-backed values remain **UNVERIFIED**.
- **School access/navigation:** Shell links and module cards now respect read permissions; the shell no longer requires academic-period read access for every School route, allowing a task-permitted user to reach `/school/tasks` while each page/action keeps its own permission checks. The home page no longer exposes platform-only Control Plane links to ordinary tenant users.
- **Authentication experience:** Login now has an accessible show/hide password control, sign-in/sign-up labels, a recovery request mode, and a recovery completion page. Callback destinations are restricted to `/auth/recover` or `/auth/continue`. Reset email delivery, Supabase redirect allowlisting, and a real recovery session remain **UNKNOWN** because no auth-service flow was exercised.
- **Attendance integrity:** Attendance updates now perform the same active-enrollment and organization-scoped lookup used by attendance creation. Focused mocked action tests cover active, inactive and missing/out-of-organization enrollment paths. This verifies application action behavior, not database RLS.
- **School OS evidence inventory:** [school-os-capability-inventory.md](./school-os-capability-inventory.md) records routes, persisted data, authorization boundaries, tests, caveats and next verification steps.

## Next priority

Continue verifying module destinations and the authenticated catalogue experience. Do not apply unrelated pending migrations.

## Current blocker

The linked Supabase Management API supports SQL reads and writes. The direct PostgreSQL temporary CLI role still rejects password authentication with `SQLSTATE 28P01`; `SUPABASE_DB_PASSWORD` is not set. The service-key PostgREST path remains restricted, so application reads continue through the authenticated user client and RLS. No unrelated pending migration was applied.

## Curated catalogue implementation (2026-10-25)

- **Inventory and identities:** The authored catalogue remains 16 unique products in order, with 12 intended modules, seven capabilities, and four workflows each. Live code/name evidence confirms these canonical records: `school_os`, `business_os`, `retail_os`, `finance_os`, `fleet_mobility_os`, `real_estate_os`, `hotel_os`, `garage_os`, `parking_access_os`, `factory_os`, `microfinance_os`, `wholesale_os`, `hospital_os`, `construction_os`, `agriculture_os`, and `workforce_os`. Existing product IDs are retained.
- **Seed:** `supabase/migrations/20261025010000_connect_curated_os_portfolio.sql` is transactional and idempotent. It inserts only missing canonical product definitions and product-module links, reuses verified module definitions, rejects identity/status conflicts, preserves existing IDs and assignments, and does not create organization assignments or change RLS. It executed successfully against the linked database and was recorded as applied; the verified records already existed, so no catalogue rows were added or changed.
- **Runtime:** `/api/control/catalog` requires `organization.read`, reads global catalogue rows through the authenticated client, scopes organization-product reads to the authorized active organization, and returns no-store responses. The catalogue displays actual registered product/module links and organization assignment state separately from curated scope. Application functionality is explicitly “Not verified” rather than inferred from definition records.
- **Theme:** A shared one-click Light/Dark toggle is available on the public landing page, login, catalogue, applications, Control Plane, and School OS shell. Explicit choices use the existing `sakata-theme` persistence and root pre-hydration initialization.
- **Implementation evidence:** Automated tests cover the 16 identities, migration safety, API authorization/error/empty states, registry validation, module destination mapping, and theme preference behavior. Product-specific functionality remains distinct from database registration.
- **Live database evidence:** The post-run read-only verification reports 22 product definitions, 245 module definitions, 226 product-module rows (192 active, 34 suspended), 16 matching curated identities, and 12 active module assignments per curated product. Duplicate product names and orphan links: zero. One active organization-product assignment exists for `school_os`.
- **Post-migration evidence query:** `supabase/verify_curated_os_catalogue.sql` reports global counts, all curated canonical identities and link counts, identity conflicts, duplicate product names, orphan links, and organization assignment statuses without writing data.

## Verification

- Focused School OS tests: **8 passed** across 3 files (command-center formatters, task actions, attendance actions); the task action mock verifies permission denial, active organization payload and route revalidation, not database RLS.
- Full test suite before the latest catalogue corrections: **201 passed across 31 files**. Focused catalogue suite after canonical identity and module-destination changes: **32 passed across 5 files**. Full-suite rerun is pending.
- Targeted ESLint for changed School routes, shared task actions/forms, attendance action and focused tests: **passed**.
- Production build: **passed** before the latest canonical identity and module-destination changes; rerun is pending.
- Scoped ESLint and `git diff --check` over task-owned source, tests and execution documents: **passed**. Git emitted only expected LF-to-CRLF working-copy warnings.
- Catalogue browser review before the latest identity remapping confirmed 16 unique cards, search/filter/list/detail/Escape interactions, and one shared theme toggle. Repeat authenticated browser verification after remapping to confirm all 16 live records and destination links.
- Database environment for the document migration: **NOT VERIFIED**. Current catalogue checks found linked metadata access but no working DB password and no established non-production target.
- Catalogue SQL was executed successfully through the linked Supabase Management API; the migration version was recorded as applied. The direct PostgreSQL password path remains unavailable, but this did not block the authorized linked query workflow.
- Required RLS scenarios (permitted read, manager create/archive, permission denial, cross-organization read/update denial, spoofed organization, and ownership/creator immutability): **not run against a database**. Mocked action tests are not evidence of RLS behavior.

## Deferred

- Keep Fleet & Mobility OS and Short-Stay Rental Operations OS visible as proposed candidates; do not treat them as approved or assignable products without an approved architecture and registry decision.
- Do not infer implementation maturity, commercial entitlement, or production deployment from a product-definition status.
- Do not add portfolio persistence until a platform portfolio-management authority and evidence-review workflow are defined.
- Do not enable file uploads until a private storage provider, tenant-bound object policies, and authorized download path are configured and tested.

## Last verified build

Production build passed on 2026-10-17 for the current implementation, including `/auth/recover`, `/documents`, `/school/tasks`, and the attendance update guard. Database verification remains a release gate.
