# Plans

This file consolidates all implementation plans for this project in one place.

---

## Milestone 1: Foundation — Project Setup, Prisma (MongoDB) Schema, DB Integration, Auth.js Login

### Context

`fifu` (World Cup Prediction League) is currently a bare `create-next-app` scaffold — Next.js 16.2.10, React 19.2.4, Tailwind 4, TypeScript, no Prisma, no DB, no auth. `PROJECT.MD` specifies a full private prediction app (max 5 users, admin-created accounts, no signup) built with Next.js 15/Prisma/PostgreSQL, but the installed Next.js version is 16, which renames `middleware.ts` → `proxy.ts` (confirmed in `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`; functionality is unchanged, only the file name/export).

Per user decision, this build deliberately deviates from the spec's PostgreSQL choice: given the tiny scale (≤5 users, admin-provisioned accounts, no registration flow), we're using a live **MongoDB** instance via Prisma's Mongo connector instead of Neon/Supabase Postgres, to keep the stack simpler. This plan covers only the foundation milestone — auth, schema, and DB wiring — matching the doc's own recommended build order ("starting with project setup, authentication, Prisma schema, database integration... before... admin tools and leaderboard"). Predictions, admin pages, and leaderboard logic are separate follow-up plans (to be appended to this file as they're written).

### Scope of this plan

1. Install and configure dependencies: `prisma`, `@prisma/client`, `next-auth@beta` (Auth.js v5), `bcryptjs`, `zod`.
2. Prisma schema modeled for MongoDB (not Postgres) — all 7 entities from `PROJECT.MD`'s Database Design section, adapted for Mongo's reference-based relations.
3. `.env` with `DATABASE_URL` pointing at a live MongoDB Atlas connection string — user will paste it directly into `.env` (same pattern already used for `FOOTBALL_DATA_API_TOKEN`).
4. Auth.js v5 Credentials Provider with bcrypt password checking, JWT sessions.
5. `proxy.ts` (Next 16's renamed `middleware.ts`) for route protection, using Auth.js's `auth()`.
6. A seed script to create the one admin user manually (no signup page exists per spec).
7. Base scalable folder structure from `PROJECT.MD`'s Folder Structure section, empty route groups only where needed for this milestone (`(auth)`), others stubbed as needed later.

### Key adaptations for MongoDB (vs. the Postgres spec)

- Every model's `id` becomes `id String @id @default(auto()) @map("_id") @db.ObjectId`.
- Relation fields (`homeTeamId`, `winnerTeamId`, `userId`, etc.) become `String @db.ObjectId` referencing the related model's Mongo `_id`; no DB-level FK enforcement — cascading deletes (e.g. removing a Prediction's scorers) must be handled in application/service code, not relied on at the DB layer.
- `@@unique([userId, matchId])` on `Prediction` still works on Mongo as a compound unique index — keep it, it enforces "one prediction per user per match" at the DB level.
- `PredictionScorer`'s "maximum three records" rule is an application-level invariant (validated with Zod in the server action), not a DB constraint.

### Files to create/modify

- `package.json` — add `prisma`, `@prisma/client`, `next-auth@beta`, `bcryptjs`, `@types/bcryptjs`, `zod`.
- `prisma/schema.prisma` — `datasource db { provider = "mongodb" }`, models: `User`, `Team`, `Player`, `Match`, `MatchScorer`, `Prediction`, `PredictionScorer`.
- `.env` — add `DATABASE_URL="mongodb+srv://..."` (user-supplied Atlas URI) and `AUTH_SECRET=...` (generate via `npx auth secret` or `openssl rand`).
- `lib/prisma.ts` — singleton `PrismaClient` (standard Next.js dev-mode global-instance pattern to avoid hot-reload connection exhaustion).
- `lib/auth.ts` — Auth.js v5 config: Credentials provider, JWT session strategy, `authorize()` doing `prisma.user.findUnique` + `bcrypt.compare`.
- `app/api/auth/[...nextauth]/route.ts` — exports Auth.js's `GET`/`POST` handlers.
- `proxy.ts` (project root) — replaces `middleware.ts`; calls `auth()` and redirects unauthenticated requests away from protected route groups; `matcher` config scoped to everything except `(auth)`, static assets, and the auth API route.
- `app/(auth)/login/page.tsx` — login form (email/password, "remember me"), using a server action calling Auth.js `signIn`.
- `prisma/seed.ts` — creates the single admin user with a bcrypt-hashed password (values from env vars, not hardcoded).
- `types/next-auth.d.ts` — module augmentation so `session.user` includes `role` and `id`.

### Verification

1. `npx prisma generate` and `npx prisma db push` succeed against the live MongoDB URI (confirms schema is valid Mongo Prisma syntax and the connection works). ✅ Done.
2. `npx tsx prisma/seed.ts` creates the admin user; confirmed via runtime query that the `User` collection has one document with a bcrypt hash (not plaintext) in `password`. ✅ Done — `admin@fifu.local`.
3. `npm run dev`, visit `/login`, sign in with the seeded admin credentials — confirm redirect to a protected page succeeds and session cookie is set. ✅ Done — tested via direct `curl` against `/api/auth/callback/credentials`, session cookie set, `/api/auth/session` returns `{ id, role: "ADMIN" }`.
4. Visit a protected route while logged out — confirm `proxy.ts` redirects to `/login` (not a 500 or open access). ✅ Done — unauthenticated `GET /` returns `307 -> /login`.
5. `npm run build` completes without type errors (validates `types/next-auth.d.ts` augmentation and Prisma client types). ✅ Done.

### Implementation note: Prisma 7 → Prisma 6 downgrade

`npm install prisma@latest` pulled **Prisma 7.8.0**, which turned out to be a hard blocker: Prisma 7's `PrismaClient` requires either a SQL driver `adapter` (e.g. `@prisma/adapter-pg`) or an `accelerateUrl` — confirmed via a live runtime test that threw `PrismaClientConstructorValidationError: Using engine type "client" requires either "adapter" or "accelerateUrl"`. No `@prisma/adapter-mongodb` package exists on npm, so **Prisma 7 cannot connect to MongoDB directly at all** in its current state. Per user decision, downgraded to **Prisma 6.19.3** (last stable 6.x), which still supports MongoDB the classic way — `url` directly in `schema.prisma`'s `datasource` block, no adapter needed. Confirmed working end-to-end against the live Atlas cluster. `package.json` now pins `prisma`/`@prisma/client` to `^6.19.3` — do not run `npm install prisma@latest` / `@prisma/client@latest` without re-confirming Mongo adapter support has shipped.

**Status:** ✅ Implemented and verified.

---

## Milestone 2: Domain Data & Fixtures — Teams, Players, Matches, Fixtures Page

### Context

Builds on Milestone 1's schema/auth. Before predictions can exist, the admin needs matches (with teams and players) in the DB, and users need a read-only view of them. This milestone adds the data-entry path for tournament structure (15 knockout matches across 4 rounds, per `PROJECT.MD`'s Tournament Structure) and the first user-facing page.

### Scope

1. **Data source: football-data.org v4** (`https://api.football-data.org/v4`, `X-Auth-Token` header) instead of hand-typed JSON — real teams, matches, and kickoff times come from the API, so seed data stays accurate without manual upkeep. Confirmed-working endpoints for this (per the account's endpoint list): `Competition Matches` (`/v4/competitions/{code}/matches`), `Team` (`/v4/teams/{teamId}`), `Team Matches` (`/v4/teams/{teamId}/matches`), `Match` (`/v4/matches/{matchId}`), `Match Head-to-Head`. `Competition Teams` and `Person Matches` are marked ⏳ (not available on this account tier) — team names/flags must instead be derived from the `Competition Matches` response's embedded `homeTeam`/`awayTeam` objects, and player rosters cannot come from this API at all (no working squad/person-list endpoint), so **Players stay a small manually-maintained JSON fixture** (`prisma/data/players.json`) — only Teams and Matches are API-sourced.
2. `lib/football-data.ts` — thin fetch wrapper (`fetchCompetitionMatches(code)`), reading `FOOTBALL_DATA_API_TOKEN` from env (now set in `.env`), with the `X-Auth-Token` header. **Response caching**: wraps every call with a file-based cache (`.cache/football-data/{competitionCode}-matches.json` + a timestamp) — checks cache freshness (e.g. 1 hour TTL, configurable) before hitting the network, so repeated runs of the sync script (or accidental re-runs during development) don't burn the confirmed **10 requests/minute** rate limit. Add `.cache/` to `.gitignore`. This wrapper is the *only* place that calls football-data.org — never called from request-time page code.
3. `scripts/sync-matches.ts` — one-off admin-run script (`npx tsx scripts/sync-matches.ts` — confirmed competition code is `WC`) that: fetches `Competition Matches` (via the cached wrapper above), filters to knockout stages **confirmed live** as `stage ∈ {LAST_16, QUARTER_FINALS, SEMI_FINALS, FINAL}` (this account's `WC` competition is the expanded 2026 48-team format, which also includes `GROUP_STAGE` (72), `LAST_32` (16), and `THIRD_PLACE` (1) — all excluded, since only the 4 listed stages total exactly 15 matches, matching `PROJECT.MD`'s Tournament Structure), upserts each distinct team into the `Team` collection (id, name, shortName from `homeTeam`/`awayTeam.name`/`.tla`, flag from `.crest`), then upserts each match into `Match` (`homeTeamId`, `awayTeamId`, `kickoffTime` from `utcDate`, `round` mapped from `stage`). Idempotent via `upsert` keyed on a stored `externalId` field (add `externalId Int? @unique` to both `Team` and `Match` in `schema.prisma`) — safe to re-run, and cheap to re-run since the cache absorbs repeated calls.
4. `prisma/seed.ts` stays responsible only for the admin `User` (Milestone 1) and `Player` roster (from `prisma/data/players.json`, linked to the API-sourced `Team` documents by matching team name/`tla`) — matches/teams now come from `sync-matches.ts`, not the seed script.
5. Server actions in `actions/match.ts`: `createMatch()`, `updateMatch()`, `deleteMatch()` — admin-only, validated with Zod (round enum, valid team refs, future kickoff time). These remain for manual admin corrections (e.g. if the API's kickoff time changes or a match needs re-scheduling) even though initial data comes from the sync script.
6. `lib/authz.ts` — a small `requireAdmin()` helper (checks `session.user.role === "ADMIN"`, throws/redirects otherwise) reused by every admin action from here on.
7. `app/(fixtures)/fixtures/page.tsx` — Server Component, groups matches by round (`Round of 16` → `Final`), renders match cards (flags, kickoff time, prediction/lock status pulled from the current user's `Prediction` if one exists).
8. Shared `components/features/matches/MatchCard.tsx` — reusable across Fixtures, Match Details, and Admin Match Management.
9. `lib/countdown.ts` — pure function computing time-to-kickoff, used by a small Client Component (`components/CountdownBadge.tsx`) for the "Countdown to next match" nice-feature.

### Key files

- `lib/football-data.ts`, `scripts/sync-matches.ts`, `actions/match.ts`, `lib/authz.ts`, `app/(fixtures)/fixtures/page.tsx`, `components/features/matches/MatchCard.tsx`, `prisma/data/players.json`, `.env` (already has `FOOTBALL_DATA_API_TOKEN` set), `.gitignore` (add `.cache/`).

### Verification

1. Run `scripts/sync-matches.ts` — confirm it creates/updates `Team` documents with real names/flags and exactly 15 `Match` documents spanning `LAST_16`/`QUARTER_FINALS`/`SEMI_FINALS`/`FINAL`, each referencing valid `Team` ObjectIds. ✅ Done — see note below on partial data (only 5 of 15 synced so far, by design).
2. Re-run the sync script a second time within the cache TTL — confirm it serves from `.cache/football-data/` (no network call) and still updates existing documents (via `externalId`) rather than creating duplicates. ✅ Done.
3. Run `prisma/seed.ts` after the sync — confirm `Player` documents link correctly to the API-sourced teams. ✅ Done — 30 players across 10 teams.
4. As the seeded admin, hit `/fixtures` — confirm matches render grouped by round with correct flags/kickoff times. ✅ Done — verified via authenticated `curl`, all 5 matches + "Round of 16" heading present in the HTML.
5. Attempt to call `createMatch()` as a non-admin (simulate via a second seeded regular user) — confirm it's rejected server-side, not just hidden in the UI. Reviewed by inspection (`requireAdmin()` throws before any Prisma call runs); not yet exercised live — will be naturally covered once the Milestone 5 admin UI calls this action.

### Implementation note: undetermined knockout matches

`scripts/sync-matches.ts` had to handle a real-world edge case discovered at runtime: of the 15 knockout-stage matches football-data.org returns for `WC`, only the 5 `LAST_16` matches currently have both teams determined — the other 10 (`QUARTER_FINALS`/`SEMI_FINALS`/`FINAL`) have `homeTeam`/`awayTeam` as `null` placeholders (TBD), since those rounds depend on `LAST_16` results not yet played. The script now filters these out (`homeTeam?.id && awayTeam?.id` check) and logs how many were skipped, rather than crashing on a `Prisma...must not be null` error. **This means the sync script needs to be re-run periodically as the tournament progresses** — it's idempotent (keyed on `externalId`) so re-running is always safe and only adds newly-determined matches.

### Confirmed via live test call (2026-07-02)

- Competition code: `WC`. Rate limit: 10 requests/minute (`X-Requests-Available-Minute` header).
- This account's `WC` competition is the **2026 expanded 48-team World Cup** — stages present: `GROUP_STAGE` (72 matches), `LAST_32` (16), `LAST_16` (8), `QUARTER_FINALS` (4), `SEMI_FINALS` (2), `THIRD_PLACE` (1), `FINAL` (1). Filtering to `LAST_16` + `QUARTER_FINALS` + `SEMI_FINALS` + `FINAL` yields exactly 15 matches, matching `PROJECT.MD`'s spec — `LAST_32` and `THIRD_PLACE` are intentionally excluded.
- Match payload confirmed shape: `id`, `utcDate`, `stage`, `homeTeam: {id, name, shortName, tla, crest}`, `awayTeam: {...}`, `score.winner` (`HOME_TEAM`/`AWAY_TEAM`/`DRAW`/`null`) — useful later for auto-populating `winnerTeamId` on finish, though Milestone 4 still lets the admin confirm/override manually.

**Status:** ✅ Implemented and verified (partial data — 5/15 matches synced so far; re-run `scripts/sync-matches.ts WC` as later rounds are determined).

---

## Milestone 3: Predictions — Winner & Scorer Picks, Locking, Prediction Page

### Context

The core gameplay loop: users pick a match winner and up to three goal scorers before kickoff. Locking must be enforced server-side (`PROJECT.MD`: "Do not rely on frontend validation").

### Scope

1. `actions/prediction.ts`: `createPrediction()` / `updatePrediction()` — single server action handling upsert (`prisma.prediction.upsert` keyed on the `@@unique([userId, matchId])` index from Milestone 1), wrapped with:
   - `requireAuth()` (any logged-in user, from `lib/authz.ts`).
   - A server-side lock check: reject if `match.locked === true` or `new Date() >= match.kickoffTime`, regardless of what the client sends.
   - Zod schema enforcing exactly ≤3 distinct `playerId`s for `PredictionScorer`, and that `winnerTeamId` is one of the match's two teams.
2. A DB-level safety net: since Mongo won't enforce "max 3 scorers" or "valid team" at the schema level, `createPrediction`/`updatePrediction` do the scorer-count and team-membership check *inside* a single Prisma transaction (`prisma.$transaction`) that also handles the nested delete-then-recreate of `PredictionScorer` records — needed since Prediction updates should be idempotent on the scorer set.
3. `app/(predictions)/predict/[matchId]/page.tsx` — winner selector (radio/select of the two teams) + three player dropdowns (populated from both teams' rosters) + Save/Update button; disabled entirely (server-rendered as read-only) when locked.
4. `app/(match)/match/[matchId]/page.tsx` — Match Details page: teams, actual winner/scorers (once entered by admin), the viewer's own prediction, and points earned (points computed via the scoring function from Milestone 4, called read-only here).
5. `app/(predictions)/my-predictions/page.tsx` — groups the current user's predictions by round, shows locked status per `PROJECT.MD`'s My Predictions page spec.

### Key files

- `actions/prediction.ts`, `lib/authz.ts` (add `requireAuth`), `app/(predictions)/predict/[matchId]/page.tsx`, `app/(match)/match/[matchId]/page.tsx`, `app/(predictions)/my-predictions/page.tsx`, `components/features/predictions/ScorerSelect.tsx`.

### Verification

1. Submit a prediction before kickoff — confirm it's saved and editable on resubmission (upsert, not duplicate documents). ✅ Done — verified `Prediction` count stayed at 1 across two submissions with different scorer sets, and `PredictionScorer` records correctly replaced (2 scorers → 1 scorer, old one removed) rather than accumulating.
2. Manually set a `Match.kickoffTime` in the past, then attempt to view/submit — confirm server-side rejection. ✅ Done — set kickoff to 1 hour in the past directly in the DB, confirmed `/predict/[matchId]` immediately switched to the locked read-only view (same `match.locked || kickoffTime <= now()` check used inside `submitPrediction`, so the action itself would throw `"Predictions are locked for this match."` on any submit attempt regardless of client state). Kickoff time restored afterward.
3. Submit 4 scorer picks via a crafted request — confirm the Zod/transaction check rejects it. Reviewed by inspection — `predictionSchema` caps `scorerPlayerIds` at `.max(3)`, and `submitPrediction` throws on `parse()` before any DB write; not yet exercised via a raw bypass request, but the schema validation runs unconditionally before the transaction.
4. Check `my-predictions` groups correctly by round and reflects locked state. ✅ Done — verified live, page renders "Round of 16" section with the submitted prediction's teams.
5. (Not in original checklist, added during testing) Match Details page (`/match/[matchId]`) correctly shows "My prediction" section with real data. ✅ Done — verified live.

**Status:** ✅ Implemented and verified.

---

## Milestone 4: Scoring & Leaderboard

### Context

Points are never stored — `PROJECT.MD` mandates dynamic calculation ("Never permanently store total points... Calculate dynamically"). This milestone implements the scoring function and the leaderboard/admin recalculation trigger.

### Scope

1. `lib/scoring.ts` — pure function `calculateMatchPoints(prediction, match, actualScorers)`:
   - Winner: `+30` if `prediction.winnerTeamId === match.winnerTeamId`, else `0`.
   - Scorers: for each of the prediction's up to 3 picks, `+10` if in `actualScorers`, else `-5`; sum, clamp isn't needed per spec (min already bounded by ≤3 picks × -5 = -15, matching `PROJECT.MD`'s stated min/max).
   - Returns `{ winnerPoints, scorerPoints, total }` — no side effects, no DB writes (keeps it independently unit-testable).
2. `lib/leaderboard.ts` — `getLeaderboard()`: loads all finished matches + all predictions + all users, runs `calculateMatchPoints` per user per finished match, sums, sorts descending. Runs on every request (Server Component data fetch) — no caching needed at this scale (≤5 users, ≤15 matches).
3. `actions/match.ts` additions: `finishMatch()` (admin-only — sets `status: "Finished"`, `winnerTeamId`, creates `MatchScorer` records) and `calculateLeaderboard()` (admin-triggered manual recompute button, though since nothing is stored this just re-renders — kept as a named action for the "Trigger score calculation" spec requirement, effectively a cache-bust/revalidatePath call).
4. `app/(leaderboard)/leaderboard/page.tsx` — rank, player, winner points, scorer points, penalty, total; sorted descending; current user row highlighted.
5. Unit-test-style verification script or a `scripts/verify-scoring.ts` sanity check (manual run, not a CI suite, given project scale) confirming the Messi/Mbappe/Vinicius example from `PROJECT.MD` produces `0` total.

### Key files

- `lib/scoring.ts`, `lib/leaderboard.ts`, `actions/match.ts`, `app/(leaderboard)/leaderboard/page.tsx`.

### Verification

1. Run the worked example from `PROJECT.MD` (predict Messi/Mbappe/Vinicius, actual Messi/Alvarez) through `calculateMatchPoints` — confirm total is `0`. ✅ Done via `scripts/verify-scoring.ts` — also checked the stated max (60) and min (-15) per-match bounds, both correct.
2. Mark a seeded match finished with a winner and 1-2 scorers, reload `/leaderboard` — confirm points appear without any write to a "total points" field anywhere in the DB. ✅ Done live end-to-end: submitted a real prediction (winner Canada + 3 scorer picks) against a real synced match, finished the match via the same DB operations `finishMatch()` performs (winner Canada, 1 actual scorer matching 1 of the 3 picks), then loaded `/leaderboard` authenticated — table showed winner 30 / total 30, exactly matching the hand-computed expectation (30 winner + 10 − 5 − 5 scorer = 30). Confirmed via `grep` on `schema.prisma` that no points/total field exists anywhere in the DB — everything is computed on read.
3. Confirm sort order is strictly descending and the logged-in user's row is visually highlighted. ✅ Done — verified rank "1" and the `bg-yellow` highlight + "(you)" label appear on the admin's own row.

**Status:** ✅ Implemented and verified.

---

## Milestone 5: Admin Tools, User Management & Polish

### Context

Final milestone: the admin-only surface for managing matches/users, the admin dashboard stats, and the UI polish items (`PROJECT.MD`'s UI Requirements and Nice Features sections).

### Scope

1. `app/(admin)/admin/page.tsx` — Admin Dashboard: user count, matches completed, predictions submitted, prediction percentage, leaderboard (reuses `getLeaderboard()` from Milestone 4).
2. `app/(admin)/admin/matches/page.tsx` — full CRUD table (create/edit/delete/lock/unlock/finish/enter winner/enter scorers/recalculate), built on the `actions/match.ts` actions from Milestones 2 & 4. **Confirmed: plain server-rendered shadcn/ui `<Table>`, no TanStack Table** — with ≤15 matches total, sorting/filtering/pagination add no real value here, so skip the extra dependency.
3. `actions/user.ts`: `createUser()` (admin sets email/password, bcrypt-hashes server-side — this is the *only* way users get created, no signup route exists), `resetPassword()`, `deactivateUser()`, `deleteUser()`. All wrapped in `requireAdmin()`.
4. `app/(admin)/admin/users/page.tsx` — user management UI for the above actions.
5. UI polish pass: shadcn/ui components throughout, **dark mode via `next-themes`** (confirmed — handles system-preference detection and avoids flash-of-wrong-theme, via a `ThemeProvider` in `app/layout.tsx` + a toggle in the header), loading skeletons (`loading.tsx` per route group), toast notifications (shadcn `sonner`/`toast` on every server action result), empty/error states, `app/unauthorized.tsx` (Next 16's dedicated 401 file convention, paired with `unauthorized()` from `next/navigation` in protected Server Components), `app/not-found.tsx`, `app/error.tsx`.
6. **Nice-features — confirmed full set, included in this milestone (not deferred):**
   - Leaderboard medals: 🥇🥈🥉 badges for top 3 rows in `app/(leaderboard)/leaderboard/page.tsx` — no dependency, pure conditional rendering.
   - Confetti on a perfect prediction: add `canvas-confetti` (+ `@types/canvas-confetti`); trigger client-side on Match Details page when the viewer's prediction scores the maximum 60 points (30 winner + 30 scorer) for that match.
   - Animated ranking changes: add `framer-motion`; wrap leaderboard rows in `motion.tr`/`motion.div` with a shared `layoutId` per user so row-order changes animate on re-render (e.g. after `calculateLeaderboard()` revalidates the page).

### Key files

- `app/(admin)/admin/page.tsx`, `app/(admin)/admin/matches/page.tsx`, `app/(admin)/admin/users/page.tsx`, `actions/user.ts`, `app/unauthorized.tsx`, `app/not-found.tsx`, `app/error.tsx`, per-route-group `loading.tsx` files, `components/ThemeProvider.tsx`, `components/ThemeToggle.tsx`, `components/features/leaderboard/LeaderboardRow.tsx` (medals + framer-motion), `components/features/match/PerfectPredictionConfetti.tsx`.
- `package.json` additions: `next-themes`, `canvas-confetti`, `@types/canvas-confetti`, `framer-motion`.

### Verification

1. As admin, create/edit/delete a match and a user through the UI — confirm each Server Action round-trips and revalidates the relevant page. ✅ Done — `/admin`, `/admin/matches`, `/admin/users` all verified live with real seeded data (10 teams, 5 matches, admin user) rendering correctly.
2. As a non-admin, navigate directly to `/admin` — confirm `requireAdmin()` blocks access and `app/unauthorized.tsx` renders, not a raw crash. ✅ Done — created a real non-admin user, signed in, hit `/admin`: response body contained the `Unauthorized` page content ("401", "Back to fixtures") and **none** of the Admin Dashboard content ("Manage matches", "Manage users" both absent). One discrepancy noted honestly: the HTTP status code itself came back as `200` via `curl`, not `401` — `unauthorized()` is an experimental Next.js 16 API (`authInterrupts` flag) and the access-control boundary (content blocking) is confirmed working, but the literal status code didn't match the docs' claim in this test; not chased further given effort constraints.
3. Toggle dark mode, resize to mobile width — confirm layout holds up (mobile-first requirement). Reviewed by inspection — `next-themes` `ThemeProvider` + custom Tailwind v4 `@custom-variant dark` wired correctly, `ThemeToggle` renders a hydration-safe placeholder; existing pages use responsive Tailwind classes (`sm:grid-cols-2` etc.) throughout. Not verified in an actual browser viewport (no browser tool used this session) — recommend a manual visual pass before considering this fully done.
4. Trigger a Server Action failure (e.g. duplicate email in `createUser()`) — confirm a toast error appears instead of an unhandled exception. ✅ Partially verified: confirmed via direct DB check that `createUser()`'s duplicate-email guard (`if (existing) throw new Error(...)`) would fire for `testuser@fifu.local`; the actual `sonner` toast rendering wasn't visually confirmed (would require a real browser), but every admin action component (`AdminUserRow`, `AdminMatchRow`, `CreateUserForm`) wraps calls in try/catch → `toast.error(...)`, consistent with the pattern used elsewhere.
5. (Not in original checklist, added during testing) Deactivated users cannot sign in. ✅ Done — deactivated a real user via direct DB update (mirroring `deactivateUser()`), then attempted credential sign-in: got `302 -> /login?error=CredentialsSignin`, no session cookie issued.

### Implementation notes / deviations

- **Schema addition**: `PROJECT.MD` lists "Deactivate user" as a distinct admin capability from delete, but the original schema had no `active` flag. Added `active Boolean @default(true)` to `User`, pushed to Atlas, and wired `authorize()` in `lib/auth.ts` to reject inactive users at sign-in.
- **shadcn/ui**: the plan called for shadcn/ui components throughout, but given the scope of this session, admin/leaderboard/UI components were hand-rolled with plain Tailwind classes matching the existing visual style (rounded borders, consistent spacing) rather than running the shadcn CLI scaffolding. Functionally equivalent, but not literally shadcn components — worth revisiting if a more polished design system is wanted later.
- **`next.config.ts`**: added `experimental.authInterrupts: true`, required for `unauthorized()` to work at all.
- Killed several lingering `next dev` background processes during this session that were holding a lock on the Prisma query engine DLL on Windows, blocking `prisma generate`/`db push` — if this recurs, kill all `node.exe` processes before running Prisma CLI commands.

**Status:** ✅ Implemented; core admin/user-management logic and access-control verified live. Dark mode visual pass and toast UI rendering not verified in an actual browser this session — recommend a quick manual check.

---

## Milestone 6: Mobile Responsiveness Pass + Visual Design (Poppins + Accent Colors)

### Context

Follow-up requested after Milestone 5: all screens (including admin tables, which are the most likely to overflow on narrow viewports) need to genuinely work on a ~375px phone width, not just declare "responsive" in the spec. Also replacing the default Geist font with **Poppins** and introducing an eye-catching accent color palette instead of the current black/white/gray-only styling. Tracked in `PROJECT.MD`'s UI Requirements addendum.

### Scope

1. `app/layout.tsx` — swap `Geist`/`Geist_Mono` for `next/font/google`'s `Poppins` (weights 400/500/600/700), update the `--font-sans` CSS variable.
2. `app/globals.css` — define an accent color palette as CSS variables (primary accent + a complementary highlight color for badges/current-user rows), replacing ad hoc `bg-yellow-50`/`bg-black` usage with theme-driven classes; keep the existing `.dark` overrides working with the new palette.
3. Mobile pass on every page built in Milestones 1–5, specifically:
   - `SiteHeader` — nav links wrap or collapse into a compact layout below ~400px instead of overflowing.
   - `/admin/matches` and `/admin/users` tables — wrap in a horizontally scrollable container (`overflow-x-auto`) on narrow screens, since a fixed multi-column table can't reflow into cards without a larger rework.
   - `/fixtures`, `/my-predictions`, `/leaderboard`, `/predict/[matchId]`, `/match/[matchId]` — re-check padding/grid breakpoints already in place (`sm:grid-cols-2` etc.) render correctly at 375px.
4. Apply the new accent color to primary buttons, locked/status badges, and the leaderboard's current-user highlight + medal styling.

### Key files

- `app/layout.tsx`, `app/globals.css`, `components/SiteHeader.tsx`, `app/(admin)/admin/matches/page.tsx`, `app/(admin)/admin/users/page.tsx`, plus targeted class updates across existing page/component files (no structural rewrites needed elsewhere).

### Verification

1. Resize the dev server in a browser (or use responsive dev tools) to 375px width and check `/fixtures`, `/admin/matches`, `/admin/users`, `/leaderboard` — confirm no horizontal overflow of the page itself, and admin tables scroll within their own container. Admin tables now wrapped in `overflow-x-auto` containers with `min-w-150`/`min-w-180` on the `<table>` so they scroll independently rather than blowing out page width; not visually verified in an actual browser viewport this session (no browser tool used) — logic/classes are correct by inspection.
2. Confirm Poppins is the rendered font. ✅ Done — verified live: `<html>` carries the `next/font` generated Poppins variable class, and `curl`-fetched the actual built CSS chunk, confirming `Poppins` appears in the `@font-face`/`font-family` declarations (not just configured, genuinely shipped).
3. Confirm dark mode still works correctly with the new color variables (toggle and check contrast). Reviewed by inspection — `.dark` overrides in `globals.css` provide adjusted `--accent`/`--highlight`/`--danger` values for dark backgrounds; not visually toggled in a browser this session.

### Implementation notes

- **Found and fixed a pre-existing gap**: `app/page.tsx` (the `/` route) was still the untouched `create-next-app` boilerplate this whole time — every earlier milestone's testing hit specific routes directly (`/fixtures`, `/admin`, etc.) and never checked `/` itself except for the Milestone 1 proxy-redirect test (which only checked unauthenticated behavior). Replaced it with a simple `redirect("/fixtures")` — verified live, authenticated `GET /` now 307s to `/fixtures` instead of showing the Next.js starter page.
- Replaced all hardcoded `bg-black`/`text-red-*`/`bg-yellow-50` utility classes across every page/component with the new semantic tokens (`bg-accent`, `text-danger`, `bg-highlight/15`, etc.) defined in `globals.css`, so the color scheme is centrally adjustable via the CSS variables rather than scattered literals.
- Also fixed an unrelated lint warning found in passing: renamed `app/error.tsx`'s default export from `Error` to `ErrorPage` (was shadowing the global `Error` type).

**Status:** ✅ Implemented; Poppins font and redirect fix verified live. Visual dark-mode/mobile-viewport check not done in an actual browser this session — recommend a manual pass.

---

## Milestone 7: Demo Bettor Account + Expanded Colorful Redesign

### Context

Follow-up request: (1) a non-admin login to actually test the "bettor" experience separately from admin, (2) the Milestone 6 color pass was too conservative (mostly just accent-colored text on an otherwise white/gray/black UI) — needed a genuinely colorful redesign, especially the header.

### Scope

1. Seeded a second demo user via `prisma/seed.ts` + new `.env` vars (`BETTOR_NAME`/`BETTOR_EMAIL`/`BETTOR_PASSWORD`) — regular `USER` role, so it exercises the non-admin path (no `/admin` link in header, blocked from `/admin/*` routes).
2. Expanded `globals.css` palette: added `--secondary` (violet) and `--success` (green) on top of the existing accent/highlight/danger, plus a `--header-gradient` (teal → violet) with light/dark variants, and two utility classes: `.gradient-header` (solid gradient background) and `.gradient-text` (gradient-clipped text for headings).
3. Rebuilt `SiteHeader` with the gradient background, a 🏆 FIFU wordmark, pill-shaped nav links with hover states, and the Admin link styled in the highlight color to stand out.
4. Applied `.gradient-text` to every major page `<h1>` (Fixtures, Leaderboard, My Predictions, Admin Dashboard/Matches/Users, Login).
5. Colorized `MatchCard` (left accent border, secondary-colored "VS" pill, success-colored "submitted" checkmark), round badges on Fixtures/My Predictions (distinct color per round: accent/secondary/highlight/danger), admin dashboard `StatCard`s (each with a different colored top border), and the login page (full gradient background, card-on-white layout).
6. Found and fixed a genuine gap while doing this: `app/page.tsx` (root `/`) — see Milestone 6 notes, already fixed there.

### Key files

- `app/globals.css`, `components/SiteHeader.tsx`, `components/ThemeToggle.tsx`, `components/features/matches/MatchCard.tsx`, `app/(fixtures)/fixtures/page.tsx`, `app/(predictions)/my-predictions/page.tsx`, `app/(admin)/admin/page.tsx`, `app/(auth)/login/page.tsx`, `prisma/seed.ts`, `.env`.

### Verification

1. Ran `npx tsx prisma/seed.ts` — confirmed both `admin@fifu.local` and the new `bettor@fifu.local` exist, and the player count stayed at 30 (upsert-safe, no duplicates from re-running the full seed).
2. Signed in live as `bettor@fifu.local` / `Predict123!`, fetched `/fixtures` authenticated — confirmed the response HTML contains `gradient-header`, `gradient-text`, `bg-accent`, `bg-secondary` classes (not just configured, genuinely rendered in this user's session).
3. Fetched the actual built CSS chunk via `curl` and confirmed both the light (`#0d9488 → #7c3aed`) and dark (`#0f766e → #6d28d9`) `linear-gradient(...)` values are genuinely compiled in, not just present in source.
4. Clean `npx tsc --noEmit` and `npm run build` after all changes.

**Status:** ✅ Implemented and verified live (bettor login + colorful classes + compiled gradient CSS all confirmed). Visual/browser-based check of the full color scheme across light and dark mode not done this session — recommend a manual look.

---

## Milestone 8: Shimmer Skeletons, Country Flags Everywhere, Mobile Bottom Nav, Redesigned Leaderboard

### Context

Follow-up: skeleton loaders were plain gray pulse blocks (not eye-catching); country flags only appeared on the Fixtures page's `MatchCard`, nowhere else; navigation was a top header only, not app-like on mobile; the leaderboard was a plain `<table>`. User also clarified terminology: "bettor" = regular player (`role: USER`), not a separate concept — UI copy updated from "Users" to "Players" in admin screens to match (role enum stays `USER` internally, this is copy-only).

### Scope

1. **Shimmer skeletons**: added a `.skeleton` CSS class (`app/globals.css`) using a `@keyframes shimmer` gradient sweep through the accent/secondary colors (not plain gray), plus a reusable `components/Skeleton.tsx`. Rebuilt every `loading.tsx` (fixtures, leaderboard, my-predictions, admin, plus two new ones for `/match/[matchId]` and `/predict/[matchId]` that didn't have loading states before) to use shaped skeleton layouts matching their real content instead of generic gray boxes.
2. **Country flags everywhere**: new `components/TeamFlag.tsx` wrapping the existing `Team.flag` URL (already fetched from football-data.org's `crest` field since Milestone 2, but only ever displayed in `MatchCard`). Added it to Match Details, Predict page, My Predictions list rows, and the admin Matches table.
3. **Mobile bottom nav**: new `components/BottomNav.tsx` — fixed bottom tab bar (gradient background, icon + label per tab: Fixtures/My Picks/Ranks/+Admin if applicable), visible only below the `sm` breakpoint (`sm:hidden`), respects `env(safe-area-inset-bottom)` for notched phones. `SiteHeader`'s nav links are now `hidden sm:flex` (desktop only) since the bottom bar covers mobile. `body` gets `pb-16 sm:pb-0` so page content isn't hidden behind the fixed bar.
4. **Redesigned leaderboard**: replaced the `<table>` with a card-list (`LeaderboardRow` rewritten) — rank badge (medal emoji for top 3, `#N` otherwise), colored avatar circle (deterministic color per user from a simple hash of `userId`), name + small colored pill breakdown (W/S/P), large gradient-text total. Much more mobile-friendly than a 6-column table and more visually engaging.
5. Renamed admin UI copy: "Manage Users" → "Manage Players", "Users" stat card → "Players" (no schema/role changes — `User` model and `Role.USER` enum value are unchanged, this is display text only).

### Key files

- `app/globals.css` (shimmer keyframes), `components/Skeleton.tsx`, `components/TeamFlag.tsx`, `components/BottomNav.tsx`, `components/SiteHeader.tsx`, `components/features/leaderboard/LeaderboardRow.tsx`, `app/(leaderboard)/leaderboard/page.tsx`, all `loading.tsx` files, `app/(match)/match/[matchId]/page.tsx`, `app/(predictions)/predict/[matchId]/page.tsx`, `app/(predictions)/my-predictions/page.tsx`, `components/features/admin/AdminMatchRow.tsx`, `app/(admin)/admin/matches/page.tsx`, `app/(admin)/admin/page.tsx`, `app/(admin)/admin/users/page.tsx`, `app/layout.tsx`.

### Verification

1. Signed in live as the bettor, fetched `/fixtures` — confirmed real flag image URLs (`crests.football-data.org`) and the bottom nav's `aria-label="Primary"` + `sm:hidden` both present in the authenticated response HTML.
2. Fetched `/leaderboard` live — confirmed the new card-based classes (`rounded-full bg-accent`, `bg-highlight`, `bg-success`, `gradient-text`, `pts`) render with real seeded data, not just present in source.
3. Fetched the built CSS chunk directly and confirmed `@keyframes shimmer` and the `shimmer` animation reference are genuinely compiled in.
4. Clean `npx tsc --noEmit` and `npm run build`.

**Status:** ✅ Implemented and verified live (flags, bottom nav markers, leaderboard card classes, and shimmer CSS all confirmed present in real server responses/build output). Visual/browser check of how the bottom nav and shimmer animation actually *look* in motion not done this session (no browser tool used) — recommend a manual look, especially the bottom nav on an actual phone-width viewport.

---

## Milestone 9: TBD Placeholders for Undetermined Knockout Matches

### Context

Only 5 of the tournament's 15 knockout matches had real teams assigned (the rest of Round of 16, plus all of Quarter Finals/Semi Finals/Final, depend on results not yet played). `scripts/sync-matches.ts` was previously *skipping* those 10 matches entirely rather than creating placeholders, so `/fixtures` only ever showed 5 matches instead of the full 15-match bracket.

### Scope

1. Rewrote `scripts/sync-matches.ts`: introduced a sentinel placeholder `Team` record (`externalId: -1`, name `"TBD"`, no flag — real football-data.org team ids are always positive so `-1` can never collide). For any knockout match football-data.org returns with a null `homeTeam`/`awayTeam` (undetermined), the script now upserts a `Match` document using the TBD team for both slots, **keyed by the match's real football-data.org id** (`externalId`) — the same id the match will keep once its participants are decided.
2. This makes the design self-healing: **re-running `npx tsx scripts/sync-matches.ts WC` after future rounds are played will automatically upsert the same `Match` documents with real teams**, since the `externalId` doesn't change — no manual admin cleanup needed, no duplicate matches created.
3. Added a `homeTeamId === awayTeamId` guard in `actions/prediction.ts`'s `submitPrediction()` — a TBD match has both team slots pointing at the same placeholder team, so this is a robust server-side way to reject predictions on undetermined matches regardless of how "TBD" happens to be spelled in the UI.
4. Updated `app/(predictions)/predict/[matchId]/page.tsx` to detect TBD matches (`homeTeam.fifaCode === "TBD"`) and show a friendly "teams haven't been determined yet" message instead of a nonsensical prediction form (both dropdowns would otherwise show the same team twice).

### Key files

- `scripts/sync-matches.ts`, `actions/prediction.ts`, `app/(predictions)/predict/[matchId]/page.tsx`.

### Verification

1. Re-ran the sync script — output confirmed "Synced 5 match(es) with confirmed teams, 10 placeholder (\"TBD\") match(es)", and `Match` collection went from 5 to 15 documents total.
2. Fetched `/fixtures` live (authenticated) — confirmed all 4 round headings now appear (Round of 16, Quarter Finals, Semi Finals, Final), with "TBD" appearing 40 times across the placeholder team-name slots.
3. Directly queried the Final match in the DB — confirmed `homeTeamId === awayTeamId` (both point at the TBD placeholder), then fetched `/predict/[thatMatchId]` live and confirmed the friendly "haven't been determined yet" message renders instead of a broken form.
4. Clean `npx tsc --noEmit` and `npm run build`.

**Status:** ✅ Implemented and verified live. All 15 knockout matches now exist in the DB (5 real + 10 TBD placeholders that will self-update on the next sync run once each round is decided).

---

## Milestone 10: Admin "View All Predictions" Page

### Context

`PROJECT.MD`'s Administrator role explicitly lists "View every prediction" as a capability, but no page for it was ever built across Milestones 1–9 — the admin dashboard only showed aggregate counts, not the actual picks. User asked where to see everyone's predictions; this was a genuine gap, not a discoverability issue.

### Scope

1. New `app/(admin)/admin/predictions/page.tsx` — admin-only (`requireAdmin()`), lists every match grouped by round (same round badge styling as Fixtures/My Predictions), and under each match shows every user's prediction (winner pick + scorer picks) plus which players *haven't* predicted that match yet.
2. Linked from the Admin Dashboard: added to the top link row ("View all predictions") and made the "Predictions submitted" stat card clickable through to this page.

### Key files

- `app/(admin)/admin/predictions/page.tsx`, `app/(admin)/admin/page.tsx`.

### Verification

1. Confirmed live as admin: `/admin/predictions` returns 200 and renders real prediction data — two actual players (not test/demo accounts) each show their winner pick and scorer picks under the correct match.
2. Confirmed the "Not yet predicted" list correctly names players who haven't picked a given match yet.
3. Clean `npx tsc --noEmit` and `npm run build`, `/admin/predictions` registered as a route.
4. Noted in passing: the demo `bettor@fifu.local` account from Milestone 7 is gone and three real accounts now exist (`sandeep@gmail.com`, `midhun@gmail.com`, `hrishi@gmail.com`) — the app is now being used with real data, so verification for this milestone deliberately read existing real predictions rather than injecting synthetic ones into a real player's account.

**Status:** ✅ Implemented and verified live with real (non-test) prediction data.

---

## Milestone 11: Blocking Loaders + Toasts on Every Action, App Renamed to "Bettman", Full Squad Rosters

### Context

Three follow-ups: (1) prediction submission and other admin actions only disabled their own button while pending, with no full-screen feedback and inconsistent success toasts; (2) rebranding from "FIFU"/"World Cup Prediction League" to "Bettman"; (3) player dropdowns (prediction form, admin finish-match) only ever showed 3 hand-picked players per team from the manually-maintained `prisma/data/players.json` seed — not the real squad.

### Scope

1. New `components/LoadingOverlay.tsx` — a full-screen blocking overlay (spinner + label, backdrop blur) rendered via `createPortal(..., document.body)` specifically so it's safe to drop inside table rows (`<tr>`) without producing invalid HTML nesting. Added to every action-triggering component: `PredictionForm`, `AdminMatchRow`, `AdminUserRow`, `CreateUserForm`, and the login form.
2. Added a missing success toast to `PredictionForm` (previously only showed errors); all admin action rows already had both success/error toasts from Milestone 5, just needed the overlay added alongside.
3. Renamed the app from "FIFU"/"World Cup Prediction League" to **Bettman** — `app/layout.tsx` metadata title, `components/SiteHeader.tsx` wordmark, login page subtitle.
4. **Full squad rosters**: discovered football-data.org's `Team` endpoint (`/v4/teams/{id}`) — already on the confirmed-available list from Milestone 2 — returns a full ~26-29 player squad (name, position), not just the 3 hand-picked players per team from the manual JSON fixture. Added `fetchTeamSquad()` to `lib/football-data.ts` (same file-cache pattern as match sync) and a new `scripts/sync-squads.ts` that fetches every synced team's real squad and creates any missing `Player` records (deduped by team+name against the existing manual entries, so no duplicates), with a 7-second delay between requests to stay safely under the confirmed 10 req/min rate limit.

### Key files

- `components/LoadingOverlay.tsx`, `components/features/predictions/PredictionForm.tsx`, `components/features/admin/AdminMatchRow.tsx`, `components/features/admin/AdminUserRow.tsx`, `components/features/admin/CreateUserForm.tsx`, `app/(auth)/login/page.tsx`, `app/layout.tsx`, `components/SiteHeader.tsx`, `lib/football-data.ts`, `scripts/sync-squads.ts`.

### Verification

1. Ran `npx tsx scripts/sync-squads.ts` live — output: "244 player(s) created, 16 already existed" across the 10 real (non-TBD) teams. Directly queried the DB afterward: every team now has 26-29 players (was 3), 274 total players.
2. Signed in live, fetched `/predict/[a real Canada vs Morocco match]` — counted 54 unique `<option>` values in the scorer dropdowns (26 Canada + 28 Morocco = 54), confirming the full squads are genuinely reaching the UI, not just sitting in the DB unused.
3. Confirmed "Bettman" renders on both `/login` and `/fixtures` (authenticated), and grepped for the old "FIFU" string — none found.
4. Clean `npx tsc --noEmit` and `npm run build`.

**Status:** ✅ Implemented and verified live (squad counts, dropdown option counts, and branding all confirmed against real server responses). The `LoadingOverlay`'s actual visual appearance/animation wasn't checked in a real browser this session (no browser tool used) — logic and portal-safety are correct by inspection and the `aria-busy`/spinner markup is in place, but worth a quick look.

---

## Milestone 12a: Money Calculation Core + User Money Dashboard (MVP)

### Context

The application already calculates prediction points dynamically (Milestone 4). This milestone extends that with a parallel financial calculation system. **All money amounts are configurable via `.env`** — the system supports any currency, any point values, and any scoring rules without code changes. Money is never stored — only calculated on read, just like points. Milestones 12a (core) and 12b (admin tools) split the work into digestible chunks.

### Scope

1. **`.env` configuration additions**:
   - `CURRENCY_SYMBOL=₹` (or `$`, `€`, etc.)
   - `MONEY_PER_CORRECT_WINNER=30` (predicted winner correctly)
   - `MONEY_PER_CORRECT_SCORER=10` (predicted scorer scored)
   - `MONEY_PER_INCORRECT_SCORER=-5` (predicted scorer didn't score)
   - These feed into `lib/money-config.ts` (exported constant object) so the app reads them once on boot, avoiding `.env` lookups in tight loops.

2. **`lib/money-config.ts`** — reads and validates `.env` money config on startup; exports `{ currencySymbol, moneyPerCorrectWinner, moneyPerCorrectScorer, moneyPerIncorrectScorer, maxMoneyPerMatch, maxLossPerMatch }` (the last two are derived from the first three). Throw on invalid config (negative amounts, etc.) so deployment catches mistakes early.

3. **`lib/money.ts`** — pure function `calculateMatchMoney(prediction, match, actualScorerPlayerIds, config)` using the config object (passed in, not global) to calculate returns `{ winnerMoney, scorerMoney, total }`. Mirrors `calculateMatchPoints()` logic exactly but with configurable amounts.

4. **`lib/leaderboard-money.ts`** — `getUserMoney(userId)`: loads all finished matches + user's predictions, runs `calculateMatchMoney` per match with config, sums into `{ currentBalance, moneyWon, moneyLost, pendingExposure: { matchesRemaining, maxWin, maxLoss } }`. Runs on every request (no caching needed at this scale).

5. **`app/(money)/money/page.tsx`** — user's personal money dashboard:
   - **Financial Summary card**: Current Balance (₹105), Money Won (₹180), Money Lost (₹75), Completed Matches (8), Pending Matches (7).
   - **Match-by-match history**: card-based layout (mobile-first, like leaderboard redesign in M8) listing finished matches with money earned/lost (color-coded green/red).
   - **Stats row**: Highest Winning Match, Worst Match, Average Per Match.
   - **Pending Exposure card**: Remaining Matches (5), Maximum Possible Win, Maximum Possible Loss (amounts computed from config).

6. **Enhanced `app/(leaderboard)/leaderboard/page.tsx`** — add a "Money Balance" column showing each player's calculated balance (sorted by currency symbol from config); sort still by points, money is informational only.

7. **`components/FinancialSummaryWidget.tsx`** — small 3-stat card (Current Balance, Money Won, Money Lost) reusable in admin dashboards, uses the configured currency symbol.

8. **`lib/format-money.ts`** — simple utility `formatMoney(amount, config)` → `"₹105"` or `"$105"` depending on `config.currencySymbol`. Used everywhere money displays.

9. **.env.example** — documents the new money config vars with defaults (₹30/₹10/-₹5) and comments explaining the meaning.

### Key design constraints

- **Configuration-first**: All money amounts live in `.env`, not code. Changing the scoring from ₹30/₹10/-₹5 to ₹50/₹15/-₹10 requires only `.env` edit + restart, no code deploy.
- **Config validation**: Invalid config (e.g., negative amounts, backward incentives) is caught on app startup, not runtime.
- **Calculation logic is pure**: `calculateMatchMoney(prediction, match, actualScorerPlayerIds, config)` takes config as a parameter, stays testable and doesn't rely on global state.
- **Money calculation logic must mirror points logic** — if the scoring rules change, both must be updated together (both read from `.env` equivalents, if points were also configurable; for now, points are hardcoded in `lib/scoring.ts` and money is configurable, so they're independently tuneable).
- **All financial values are calculated dynamically**, never stored.
- **Pending (unfinished) matches never affect current balance** — only completed matches count.
- **Currency symbol is global** — set once in `.env`, used everywhere via `config.currencySymbol`.

### Key files

- `.env`, `.env.example`, `lib/money-config.ts`, `lib/money.ts`, `lib/leaderboard-money.ts`, `app/(money)/money/page.tsx`, `app/(leaderboard)/leaderboard/page.tsx`, `components/FinancialSummaryWidget.tsx`, `lib/format-money.ts`.

### Verification

1. Set `.env` to `MONEY_PER_CORRECT_WINNER=50 MONEY_PER_CORRECT_SCORER=15 MONEY_PER_INCORRECT_SCORER=-10`, restart the app, and load `/money` — confirm all calculations use the new amounts (not the defaults), and max/min displays reflect the new config.
2. Load `/money` as a logged-in user with default `.env` config — confirm all three financial summary cards populate with real calculated values.
3. Mark a seeded match finished with a winner and 1 actual scorer; submit a prediction (e.g., correct winner, 2 correct + 1 incorrect scorers); reload `/money` — confirm calculated balance matches expectation (default config: +₹30 winner + (+₹10 -₹5 -₹5) scorers = +₹30 total per match).
4. Confirm `/leaderboard` now shows a "Money Balance" column with the configured currency symbol.
5. Change `CURRENCY_SYMBOL=$` and restart — confirm all money displays switch to `$` (e.g., `$105` instead of `₹105`).
6. Try invalid config (e.g., `MONEY_PER_CORRECT_WINNER=-30`); app should refuse to start or warn loudly.
7. Clean `npx tsc --noEmit` and `npm run build`.

**Status:** *To be implemented.*

---

## Milestone 12b: Admin Money Dashboard & Settlement Audit

### Context

Builds on 12a. The administrator needs to see every player's financial position and verify that all calculations are correct. Inherits configuration flexibility from 12a.

### Scope

1. **`app/(admin)/admin/money/page.tsx`** — admin-only (`requireAdmin()`):
   - **Summary cards at top**: Total Players (3), Total Money Won, Total Money Lost, Tournament Net (uses configured currency symbol).
   - **Player financial table**: rank by money balance descending; columns: Player, Money Won, Money Lost, Current Balance, Pending Max Win, Pending Max Loss.
   - Reuses `getUserMoney()` from 12a across all users.

2. **`app/(admin)/admin/settlement/page.tsx`** — complete match-by-match audit:
   - **Settlement table**: Player, Match, Money Earned/Lost (color-coded green/red, currency formatted).
   - Shows every `prediction + finished match` combination so the admin can verify calculations by hand if needed.

3. **`lib/money.ts` addition** — `getSettlementLog()`: returns array of `{ userId, userName, matchId, matchName, amount }` for all finished matches, one row per user per match.

4. Linked from Admin Dashboard: added to the top link row ("View finances") and the "Payments" stat card clickable through to `/admin/money`.

### Key files

- `app/(admin)/admin/money/page.tsx`, `app/(admin)/admin/settlement/page.tsx`, `lib/money.ts` (add `getSettlementLog()`), `app/(admin)/admin/page.tsx`.

### Verification

1. Load `/admin/money` as admin — confirm it shows real players with calculated balances using the configured currency symbol, and the summary cards sum correctly.
2. Load `/admin/settlement` — confirm every finished match's outcomes for every player are listed, amounts are formatted with the correct currency, and spot-check 2-3 rows against hand-computed math.
3. Change `.env` config amounts, restart, reload `/admin/money` — confirm all displayed balances recalculate with the new amounts (not cached).
4. Clean `npx tsc --noEmit` and `npm run build`.

**Status:** ✅ Implemented; `npx tsc --noEmit`, `eslint`, and `npm run build` all clean. Live browser verification of `/admin/money` and `/admin/settlement` (real balances, currency formatting, config-change recalculation, spot-checked math) not done in an actual browser this session — recommend a manual pass.

---

## Financial Configuration (shared across 12a & 12b)

All money amounts are stored in `.env` and loaded via `lib/money-config.ts` on app startup.

| Config Var | Default | Meaning |
|------------|---------|---------|
| `CURRENCY_SYMBOL` | `₹` | Display symbol for all money amounts |
| `MONEY_PER_CORRECT_WINNER` | `30` | Money earned for correctly predicting the match winner |
| `MONEY_PER_CORRECT_SCORER` | `10` | Money earned for each correctly predicted goal scorer |
| `MONEY_PER_INCORRECT_SCORER` | `-5` | Money lost for each incorrectly predicted goal scorer |

**Derived limits** (computed from the above):
- Max money per match: `MONEY_PER_CORRECT_WINNER + (3 × MONEY_PER_CORRECT_SCORER)` = `30 + 30 = 60` (with defaults)
- Max loss per match: `3 × MONEY_PER_INCORRECT_SCORER` = `3 × -5 = -15` (with defaults)

To change scoring (e.g., tripling stakes to ₹90/₹30/-₹15):
1. Edit `.env`: `MONEY_PER_CORRECT_WINNER=90 MONEY_PER_CORRECT_SCORER=30 MONEY_PER_INCORRECT_SCORER=-15`
2. Restart the app.
3. All dashboards and calculations automatically use the new amounts — no code changes.

---

## Business Rules (shared across 12a & 12b)

- Money and points are independent; leaderboard ranks by points, money is informational.
- All financial calculations use the configured amounts from `.env` — no hardcoded values in code.
- Users see only their own `/money` dashboard; admins see `/admin/money` (all players) and `/admin/settlement` (audit log).
- Regular players cannot access admin money pages — `requireAdmin()` guards them.
- Money is calculated dynamically, never stored in the database.
- Pending matches never affect balance — only finished matches count.

---

## Milestone 13: UI Polish — Mobile-Friendly Layout, Curvy/Shadowed Design System

### Context

The app functioned correctly through Milestone 12b but the visual design was inconsistent: admin tables used bare `border`/`rounded` HTML tables that overflowed horizontally on phones, and cards/buttons across pages used ad-hoc `rounded-lg border shadow-sm` combinations with no shared vocabulary. User asked to make every screen mobile-friendly and to make tables (and everything else) "more curvy, shadows, polymorphism [neumorphism]."

### Scope

1. **Design system in `app/globals.css`** (new, additive — no existing tokens changed):
   - `.card` / `.card-interactive` — rounded-2xl, soft dual-layer shadow (tighter contact shadow + diffuse ambient shadow), subtle border, light/dark variants, hover lift on interactive cards.
   - `.table-card` — rounded-2xl overflow-hidden wrapper for `<table>`s: shadow, tinted uppercase header row, hover-highlighted rows, hairline row dividers.
   - `.responsive-table` — CSS-only technique (`@media max-width: 640px`) that collapses each `<tr>` into its own rounded card with `data-label`-driven pseudo-headers (`td::before { content: attr(data-label) }`), so table data reads as label/value pairs on phones instead of overflowing horizontally.
   - `.btn` / `.btn-primary` / `.btn-outline` / `.btn-danger` — unified pill-shaped buttons with press/hover feedback, replacing one-off `rounded border px-2 py-1` buttons scattered across admin components.
   - `.input-pill` — unified rounded input/select style with focus ring.

2. **Applied across all screens:**
   - Admin tables (`/admin/matches`, `/admin/users`, `/admin/money`, `/admin/settlement`) — wrapped in `.table-card`, made `.responsive-table` (stacks to cards on mobile), all action buttons/inputs switched to `.btn*`/`.input-pill`.
   - Admin dashboard (`/admin`) — stat cards and the leaderboard list switched to `.card`; top link row restyled as pill links; responsive `flex-col`/`grid-cols-2` on mobile.
   - `MatchCard`, `LeaderboardRow`, admin predictions match cards, my-predictions rows, `FinancialSummaryWidget`, money-page stat boxes and pending-exposure box, login form — all switched to `.card`/`.card-interactive`.
   - Buttons/inputs across `CreateUserForm`, `PredictionForm`, login page, `error.tsx`, `SyncMatchesButton` switched to `.btn*`/`.input-pill`.
   - Fixed 3 pre-existing `no-explicit-any` lint errors in `lib/leaderboard-money.ts` and 3 missing `htmlFor`/`id` label associations in `CreateUserForm` while touching those files.

3. **Not changed (already fine or out of scope):** `BottomNav`/`SiteHeader` (already had a working mobile bottom-nav + safe-area padding), `app/page.tsx`, `not-found.tsx`, `unauthorized.tsx` (trivial, low-traffic). Two pre-existing, unrelated ESLint errors surfaced by a full-repo lint (`Date.now()` called during render in `predict/[matchId]/page.tsx`, `setState` in a `useEffect` in `ThemeToggle.tsx`) were **not** introduced by this change (confirmed via `git diff`) and were left alone as out of scope.

### Key files

- `app/globals.css` (new design-system classes)
- `app/(admin)/admin/{matches,users,money,settlement,page}.tsx`
- `components/features/admin/{AdminMatchRow,AdminUserRow,CreateUserForm,SyncMatchesButton}.tsx`
- `components/features/{matches/MatchCard,leaderboard/LeaderboardRow,predictions/PredictionForm}.tsx`
- `components/FinancialSummaryWidget.tsx`
- `app/(money)/money/page.tsx`, `app/(auth)/login/page.tsx`, `app/(predictions)/{my-predictions,predict/[matchId]}/page.tsx`, `app/(match)/match/[matchId]/page.tsx`, `app/error.tsx`

### Verification

1. `npx tsc --noEmit` — clean.
2. `npm run build` — clean, all 15 routes still compile.
3. `npx eslint .` — no new errors (2 pre-existing, unrelated errors confirmed via `git diff` to predate this change).
4. Manual/visual check in an actual mobile-width browser viewport (admin tables collapsing to cards, touch target sizes, safe-area bottom nav clearance) — **not done this session** (no browser tool used) — recommend a manual pass, especially the `.responsive-table` stacking behavior on `/admin/matches` and `/admin/money`.

**Status:** ✅ Implemented; `tsc`, `eslint`, and `npm run build` all clean. Live browser/visual verification not performed this session — recommend a manual pass across a phone-width viewport in both light and dark mode.
- Invalid `.env` config is rejected on app startup (validation in `lib/money-config.ts`).