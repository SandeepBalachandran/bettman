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

1. `npx prisma generate` and `npx prisma db push` succeed against the live MongoDB URI (confirms schema is valid Mongo Prisma syntax and the connection works).
2. `npx tsx prisma/seed.ts` (or `node --loader ts-node/esm`) creates the admin user; confirm via `npx prisma studio` that the `User` collection has one document with a bcrypt hash (not plaintext) in `password`.
3. `npm run dev`, visit `/login`, sign in with the seeded admin credentials — confirm redirect to a protected page succeeds and session cookie is set.
4. Visit a protected route while logged out — confirm `proxy.ts` redirects to `/login` (not a 500 or open access).
5. `npm run build` completes without type errors (validates `types/next-auth.d.ts` augmentation and Prisma client types).

**Status:** Approved, not yet implemented.

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

1. Run `scripts/sync-matches.ts` — confirm it creates/updates `Team` documents with real names/flags and exactly 15 `Match` documents spanning `LAST_16`/`QUARTER_FINALS`/`SEMI_FINALS`/`FINAL`, each referencing valid `Team` ObjectIds.
2. Re-run the sync script a second time within the cache TTL — confirm it serves from `.cache/football-data/` (no network call) and still updates existing documents (via `externalId`) rather than creating duplicates.
3. Run `prisma/seed.ts` after the sync — confirm `Player` documents link correctly to the API-sourced teams.
4. As the seeded admin, hit `/fixtures` — confirm matches render grouped by round with correct flags/kickoff times.
5. Attempt to call `createMatch()` as a non-admin (simulate via a second seeded regular user) — confirm it's rejected server-side, not just hidden in the UI.

### Confirmed via live test call (2026-07-02)

- Competition code: `WC`. Rate limit: 10 requests/minute (`X-Requests-Available-Minute` header).
- This account's `WC` competition is the **2026 expanded 48-team World Cup** — stages present: `GROUP_STAGE` (72 matches), `LAST_32` (16), `LAST_16` (8), `QUARTER_FINALS` (4), `SEMI_FINALS` (2), `THIRD_PLACE` (1), `FINAL` (1). Filtering to `LAST_16` + `QUARTER_FINALS` + `SEMI_FINALS` + `FINAL` yields exactly 15 matches, matching `PROJECT.MD`'s spec — `LAST_32` and `THIRD_PLACE` are intentionally excluded.
- Match payload confirmed shape: `id`, `utcDate`, `stage`, `homeTeam: {id, name, shortName, tla, crest}`, `awayTeam: {...}`, `score.winner` (`HOME_TEAM`/`AWAY_TEAM`/`DRAW`/`null`) — useful later for auto-populating `winnerTeamId` on finish, though Milestone 4 still lets the admin confirm/override manually.

**Status:** Planned, not yet implemented.

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

1. Submit a prediction before kickoff — confirm it's saved and editable on resubmission (upsert, not duplicate documents).
2. Manually set a `Match.kickoffTime` in the past (or `locked: true`) via Prisma Studio, then attempt `updatePrediction()` — confirm server-side rejection even if the UI were bypassed (e.g. via a raw `fetch` to the action).
3. Submit 4 scorer picks via a crafted request — confirm the Zod/transaction check rejects it.
4. Check `my-predictions` groups correctly by round and reflects locked state.

**Status:** Planned, not yet implemented.

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

1. Run the worked example from `PROJECT.MD` (predict Messi/Mbappe/Vinicius, actual Messi/Alvarez) through `calculateMatchPoints` — confirm total is `0`.
2. Mark a seeded match finished with a winner and 1-2 scorers, reload `/leaderboard` — confirm points appear without any write to a "total points" field anywhere in the DB.
3. Confirm sort order is strictly descending and the logged-in user's row is visually highlighted.

**Status:** Planned, not yet implemented.

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

1. As admin, create/edit/delete a match and a user through the UI — confirm each Server Action round-trips and revalidates the relevant page.
2. As a non-admin, navigate directly to `/admin` — confirm `proxy.ts` + `requireAdmin()` block access and `app/unauthorized.tsx` renders (401), not a raw crash.
3. Toggle dark mode, resize to mobile width — confirm layout holds up (mobile-first requirement).
4. Trigger a Server Action failure (e.g. duplicate email in `createUser()`) — confirm a toast error appears instead of an unhandled exception.

**Status:** Planned, not yet implemented.
