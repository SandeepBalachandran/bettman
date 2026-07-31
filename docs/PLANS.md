# Plans — Comprehensive Reference (Milestones 16+)

This file consolidates implementation milestones for the Bettman prediction league application. **Milestones 1–15** (Foundation through Push Notifications) are documented in detail in the original `PLANS.md` at the project root. This document covers **Milestones 16 onward**, discovered during the comprehensive application audit (2026-07-13).

---

## Milestone 16: Coins & Daily Rewards System

### Context

The app calculates prediction points and money dynamically (Milestones 4 & 12), but introduces a third currency: **coins**. Unlike points/money (read-only calculations), coins are earned daily and spendable on power-ups (booster, premium scorer slots). Coins require transaction audit trail and persistent DB storage.

### Scope

1. **Prisma Schema additions** (`schema.prisma`):
   - `CoinBalance` — `userId` (unique), `balance`, `updatedAt` — tracks current coin balance per user.
   - `DailyReward` — `userId`, `day` (unique pair), `coins`, `claimedAt` — one claim per user per day.
   - `RewardConfig` — singleton `id`, `dailyCoins`, `boosterCost`, `thirdScorerCost`, `fourthScorerCost`, admin-editable amounts.
   - `CoinTransaction` — audit log: `userId`, `type` ("EARN"/"SPEND"), `amount`, `balanceBefore`/`balanceAfter`, `reason`, `relatedId` (optional, e.g., prediction id, booster use), `createdAt`.
   - `Prediction.usedPointsBooster: Boolean @default(false)` — track whether this prediction activated a booster.

2. **`lib/coin-rewards.ts`** — Core coin operations:
   - `getUserCoinBalance(userId)` — fetch existing or create new (0 balance) `CoinBalance`.
   - `awardCoins(userId, amount, reason, relatedId?)` — add coins, create `CoinTransaction` record, return `{ balanceBefore, balanceAfter }`.
   - `spendCoins(userId, amount, reason, relatedId?)` — deduct coins (throw if insufficient), create transaction, return `{ balanceBefore, balanceAfter }`.
   - `claimDailyReward(userId)` — check if claimed today; if not, create `DailyReward` + `awardCoins()`; throw if already claimed.
   - All methods are idempotent and wrapped in Prisma transactions.

3. **User-facing pages**:
   - `app/(rewards)/rewards/page.tsx` — Daily reward claim card (button, today's date, coin amount from `RewardConfig`), current balance, explanation of how to earn coins, transaction history (last 20 entries).
   - `components/CoinBalance.tsx` — small header/card showing `₹X coins` (formatted with the coin icon).

4. **Admin pages** (Milestone 19 covers full admin UI, this just stores the config):
   - `RewardConfig` singleton ensures consistent amounts across the app — no hardcoded values in code.

### Key files

- `prisma/schema.prisma`, `lib/coin-rewards.ts`, `app/(rewards)/rewards/page.tsx`, `components/CoinBalance.tsx`, `actions/rewards.ts`.

### Verification

1. Seed a user, call `awardCoins(userId, 50, "test")` directly — confirm `CoinBalance` created/updated and `CoinTransaction` record exists with `balanceBefore: 0`, `balanceAfter: 50`.
2. Load `/rewards` authenticated — confirm current balance displays and daily claim button appears (disabled if already claimed today).
3. Click claim — confirm balance updates and transaction appears in history.
4. `npx tsc --noEmit` and `npm run build` — clean.

**Status:** ✅ Implemented in codebase (discovered during audit; models and lib functions present).

---

## Milestone 17: Points Booster Power-Up (Spend Coins to 2× Winner Points)

### Context

Coins earned daily are spent on **boosters**: a one-time power-up that doubles the winner-prediction points (not scorers) for a single match. Example: normally +30 for a correct winner, +60 with booster. Encourages strategic spending and engagement.

### Scope

1. **Prediction form enhancements** (`components/features/predictions/PredictionForm.tsx`):
   - New checkbox: "🚀 Boost this match? (costs 25 coins)" — only appears if user has sufficient balance (checked server-side too).
   - If checked, prediction is submitted with `usedPointsBooster: true`.

2. **`lib/points-booster.ts`** — Booster logic:
   - `getBoosterCost()` — read from `RewardConfig.boosterCost`.
   - `calculateMatchPointsWithBooster(prediction, match, actualScorers, boosted)` — wrapper around Milestone 4's `calculateMatchPoints()` that doubles `winnerPoints` if `boosted === true`.

3. **`actions/prediction.ts` modifications**:
   - On prediction upsert, if `usedPointsBooster`, call `spendCoins(userId, cost, "booster", predictionId)` first; only save prediction if spend succeeds.
   - Wrapped in transaction so booster spend + prediction save are atomic.

4. **User-facing**:
   - `/money` and `/leaderboard` — points display now shows "(boosted)" label when a prediction used booster.
   - Leaderboard money column updates since points = money multiplier (if a prediction was boosted, the money earned is also double the winner amount).

### Key files

- `lib/points-booster.ts`, `actions/prediction.ts`, `components/features/predictions/PredictionForm.tsx`, `app/(leaderboard)/leaderboard/page.tsx`, `app/(money)/money/page.tsx`.

### Verification

1. User with 0 coins — booster checkbox disabled.
2. User with 30 coins — checkbox enabled, spend 25 on booster, balance drops to 5, `CoinTransaction` record created with reason "booster".
3. Match finishes with correct winner — confirm points are 60 (not 30) on `/leaderboard`.
4. `npx tsc --noEmit` and `npm run build` — clean.

**Status:** ✅ Implemented in codebase.

---

## Milestone 18: Premium Scorer Slots (3rd & 4th Slots, Coin-Purchasable)

### Context

Base prediction allows 2-3 scorer picks (Milestone 15). Premium scorers add optional 4th and 5th slots (total up to 5 scorers per prediction) for a configurable coin cost. Each extra slot is purchasable independently.

### Scope

1. **Prediction form**: 
   - Three mandatory scorer slots (2 minimum, up to 3 base).
   - Two additional slots: "🎯 Add 4th scorer slot (15 coins)" and "🎯 Add 5th scorer slot (15 coins)" buttons.
   - Buttons only appear if user has sufficient coin balance; disabled if all 5 slots are filled.

2. **`lib/coin-rewards.ts`** modifications:
   - `getPremiumScorerCost()` — read from `RewardConfig.thirdScorerCost` / `fourthScorerCost` (or derive as same amount).

3. **`actions/prediction.ts` modifications**:
   - Accept up to 5 scorer player IDs (updated Zod schema).
   - On upsert, accumulate coin spend: (3rd slot cost if needed) + (4th slot cost if needed) + (booster cost if used), spend all atomically.
   - If any spend fails, entire submission fails (user sees error, retries, balances not modified).

4. **Money impact**:
   - Points/money still calculated per scorer (each of up to 5), but cost per extra slot is one-time (e.g., 15 coins per 4th/5th slot, whether that slot scores or not).

### Key files

- `prisma/schema.prisma`, `lib/coin-rewards.ts`, `actions/prediction.ts`, `components/features/predictions/PredictionForm.tsx`.

### Verification

1. Create prediction with 5 scorers, costing 15+15 = 30 coins — confirm `CoinTransaction` records created for both slots.
2. Finish match with 3 actual scorers — confirm points = winner + (3 × scorer points), not penalized for the 4th/5th missing slots.
3. `npx tsc --noEmit` and `npm run build` — clean.

**Status:** ✅ Implemented in codebase.

---

## Milestone 19: Admin Coins & Rewards Management

### Context

Admins need to configure daily reward amounts and power-up costs, and to manually adjust player balances (for testing, disputes, or promotions).

### Scope

1. **`app/(admin)/admin/coins/page.tsx`** — Coin circulation dashboard:
   - **Settings card**: current `RewardConfig` values (daily coins, booster cost, slot costs), edit button opens a modal with Zod-validated inputs.
   - **Coin distribution**: pie chart or table showing total coins in circulation vs. spent, number of active players.
   - **Recent transactions**: scrollable table of the last 50 `CoinTransaction` records (user, type, amount, reason, timestamp).
   - **Manual override**: text input for userId + amount to award/deduct coins (admin-only, logs reason as "admin override").

2. **`app/(admin)/admin/rewards/page.tsx`** — Reward configuration:
   - Simple form: daily coins, booster cost, 4th slot cost, 5th slot cost (all read from and write to the singleton `RewardConfig`).
   - Save button calls `updateRewardConfig()` server action.

3. **`actions/admin-coins.ts`** (new):
   - `updateRewardConfig(values)` — `requireAdmin()`, Zod-validate, upsert `RewardConfig`.
   - `awardCoinsManual(userId, amount, reason)` — `requireAdmin()`, call `awardCoins()`.
   - `deductCoinsManual(userId, amount, reason)` — `requireAdmin()`, call `spendCoins()`.

4. **Linked from admin dashboard** — new stat card "Coins in circulation" and a "Manage coins" link to `/admin/coins`.

### Key files

- `app/(admin)/admin/coins/page.tsx`, `app/(admin)/admin/rewards/page.tsx`, `actions/admin-coins.ts`, `app/(admin)/admin/page.tsx`.

### Verification

1. Load `/admin/coins` as admin — confirm `RewardConfig` values display (or default if not yet set).
2. Edit config to 20 coins/day, save — confirm value persists and reflects on `/rewards`.
3. Manually award 100 coins to a user, confirm `CoinTransaction` record exists with reason "admin override".
4. `npx tsc --noEmit` and `npm run build` — clean.

**Status:** ✅ Implemented in codebase.

---

## Milestone 20: User Profiles & Prediction History

### Context

Predictions are semi-social — after locking, players see each other's picks (Milestone 14), but there's no persistent profile to browse past activity. This milestone adds shareable user profile pages and detailed prediction history.

### Scope

1. **`app/(user)/user/[userId]/predictions/page.tsx`** — User profile page:
   - Header: user's name, avatar, total points/money/coins.
   - Filters: dropdown to group by round or view all matches.
   - Prediction history: card-based list of all this user's predictions (locked or not), showing winner pick + scorers per match.
   - Each match card includes the actual result (if finished) + points earned (if finished).
   - **Shareable**: profile is public-readable (no auth check), so players can share their profile URL.

2. **Database queries**:
   - `lib/leaderboard.ts` — add `getUserPredictionHistory(userId)` — loads all matches + this user's predictions, calculates points for each.
   - Reuses `calculateMatchPoints()` from Milestone 4.

3. **Linked from leaderboard** — each `LeaderboardRow` name is now clickable, linking to `/user/[userId]/predictions`.

### Key files

- `app/(user)/user/[userId]/predictions/page.tsx`, `lib/leaderboard.ts`.

### Verification

1. Load `/user/[someUserId]/predictions` unauthenticated — page loads without error, shows that user's history.
2. Compare points shown on profile against `/leaderboard` — values match.
3. `npx tsc --noEmit` and `npm run build` — clean.

**Status:** ✅ Implemented in codebase.

---

## Milestone 21: API Endpoints (Matches, Admin Sync, Rewards, Booster)

### Context

Direct API endpoints enable third-party clients (mobile app, external dashboards) to read tournament data and trigger actions. Endpoints follow REST conventions and require authentication/admin checks server-side.

### Scope

1. **Match endpoints** (`app/api/matches/`):
   - `GET /api/matches/live` — returns all matches with live status (if available), winner/scorers (if finished), current user's prediction (if exists). Reuses football-data.org live-status API with caching.

2. **Admin endpoints** (`app/api/admin/`):
   - `POST /api/admin/sync-results` — admin-only, triggers live match-result sync (Milestone 15's auto-population). Returns `{ updatedMatches, errors }`.
   - `POST /api/admin/sync-squads` — admin-only, syncs player rosters.

3. **User endpoints** (`app/api/user/`):
   - `GET /api/user/coins` — returns `{ balance, dailyClaimable, recentTransactions }`.
   - `GET /api/user/leaderboard` — returns sorted leaderboard (points, money, rank).

4. **Reward endpoints** (`app/api/rewards/`):
   - `POST /api/rewards/claim-daily` — claim daily coins, returns `{ success, newBalance }`.

5. **Booster endpoints** (`app/api/booster/`):
   - `POST /api/booster/activate` — activate booster for a match (old API, now handled server-side within prediction submission; kept for backwards-compat).

6. **Standard response format**:
   - Success: `{ success: true, data: {...} }`.
   - Error: `{ success: false, error: "reason" }`.
   - All endpoints return `405 Method Not Allowed` for unsupported methods, `401` if not authenticated (where required), `403` if not admin (where required).

### Key files

- `app/api/matches/live/route.ts`, `app/api/admin/sync-results/route.ts`, `app/api/admin/sync-squads/route.ts`, `app/api/user/coins/route.ts`, `app/api/user/leaderboard/route.ts`, `app/api/rewards/claim-daily/route.ts`, `app/api/booster/activate/route.ts`.

### Verification

1. `GET /api/matches/live` unauthenticated — returns 401.
2. `GET /api/matches/live` authenticated — returns 200 with matches array.
3. `POST /api/admin/sync-results` as non-admin — returns 403.
4. `POST /api/admin/sync-results` as admin — returns 200 with sync results.
5. `npx tsc --noEmit` and `npm run build` — clean.

**Status:** ✅ Implemented in codebase.

---

## Milestone 22: Live Match Updates During Play (LIVE Status Score Syncing)

### Context

Matches have three statuses: `UPCOMING`, `LIVE`, `FINISHED` (Milestone 2's `Match.status` field). While a match is `LIVE`, the app can periodically sync in-progress scores from football-data.org, providing real-time leaderboard updates.

### Scope

1. **Match status enum** — three values already in schema: `UPCOMING`, `LIVE`, `FINISHED`.

2. **`lib/sync-match-results.ts`** — existing function `syncFinishedMatchResultsWithScorers()` (from Milestone 15, player-photo feature) already updates `Match.status` when a match is `FINISHED`.

3. **Live score polling** (optional enhancement):
   - `/fixtures` could periodically re-fetch live statuses from football-data.org during the tournament.
   - Reuses `fetchLiveCompetitionMatches()` from Milestone 8 (live-status caching).
   - Polls only during `LIVE` windows, not all day.

4. **Live score display**:
   - `MatchCard` (Milestone 2) already shows `liveStatus` when available.
   - On `/predict/[matchId]`, display live score if `match.status === "LIVE"` (informational, no edit allowed since it's locked anyway).

5. **Real-time update path** (optional, not full WebSocket):
   - If client re-fetches `/matches/live` API repeatedly, sees score updates.
   - No server push needed for this milestone.

### Key files

- `lib/sync-match-results.ts`, `lib/football-data.ts`, `components/features/matches/MatchCard.tsx`, `app/(fixtures)/fixtures/page.tsx`, `app/(predictions)/predict/[matchId]/page.tsx`.

### Verification

1. Manually set a `Match.status` to `"LIVE"` with partial scorers in the DB; refresh `/fixtures` — confirm live status badge appears.
2. Re-sync match results with `lib/sync-match-results.ts` — confirm status updates to `FINISHED` and scorers are populated.
3. `npx tsc --noEmit` and `npm run build` — clean.

**Status:** ✅ Implemented in codebase (partial; live-status display works, full polling/refresh would be a follow-up).

---

## Milestone 23: Most-Picked Players & Trending Data

### Context

Engage users with social proof — show which players other users have picked most often, encouraging meta-game discussion.

### Scope

1. **`lib/most-picked-players.ts`** — `getMostPickedPlayers(matchId, limit)`:
   - Queries `PredictionScorer` records for the given match.
   - Groups by `playerId`, counts predictions.
   - Returns top N players by pick count, including their name, position, current pick count.

2. **UI displays**:
   - On `/predict/[matchId]` — show "Most picked scorers this match: Player X (15 picks), Player Y (12 picks)" card above the scorer form (purely informational, no impact on gameplay).
   - Optional: `/admin/predictions` could also show trending players per match for admin insight.

3. **Caching** — compute fresh on every page load (no DB caching needed for ≤5 users).

### Key files

- `lib/most-picked-players.ts`, `app/(predictions)/predict/[matchId]/page.tsx`.

### Verification

1. Seed 3 users, each picks 2-3 scorers for the same match — call `getMostPickedPlayers(matchId, 5)` — confirm returned array is sorted descending by count.
2. Load `/predict/[matchId]` authenticated — confirm "Most picked" card appears with real data.
3. `npx tsc --noEmit` and `npm run build` — clean.

**Status:** ✅ Implemented in codebase.

---

## Milestone 24: Notification Eligibility & User Preferences

### Context

Push notifications (Milestone 15) are sent to all subscribed users by default. This milestone adds user controls: opt-in/opt-out toggles per notification type (match finish, reminder, admin broadcast).

### Scope

1. **Prisma schema additions** (`schema.prisma`):
   - `User.notificationPreferences: Json @default("{\"matchFinish\": true, \"reminder\": true, \"broadcast\": true}")` — JSON object with three boolean flags.

2. **`lib/notification-eligibility.ts`** — check functions:
   - `shouldSendMatchFinish(userId)` — check `notificationPreferences.matchFinish`.
   - `shouldSendReminder(userId)` — check `notificationPreferences.reminder`.
   - `shouldSendBroadcast(userId)` — check `notificationPreferences.broadcast`.

3. **User preferences page** — new section on `/rewards` or a dedicated `/settings`:
   - Three toggles: "Notify when matches finish", "Remind me to predict", "Allow admin broadcasts".
   - Save calls `updateNotificationPreferences()` server action.

4. **Push sending** — all push-send functions (`sendPushToAll()`, `finishMatch()`, `remindMissingPredictions()`, etc.) check eligibility before sending.

### Key files

- `prisma/schema.prisma`, `lib/notification-eligibility.ts`, `actions/user-settings.ts`, app page with notification preferences (e.g., `/settings` or section on `/rewards`).

### Verification

1. Disable "match finish" notifications, admin finishes a match — confirm no push sent to that user.
2. Toggle preferences on/off, confirm each setting persists and is checked on next push trigger.
3. `npx tsc --noEmit` and `npm run build` — clean.

**Status:** ✅ Implemented in codebase.

---

## Milestone 25: Self-Signup with Email Verification

### Context

The original spec (Milestone 1) specified admin-provisioned accounts only ("no signup"). However, the codebase now supports email verification infrastructure (via Resend), and allowing users to self-register with email verification improves UX and removes admin overhead. This milestone adds a full signup flow: user registers email/password, receives verification email, verifies link, then logs in.

### Scope

1. **Prisma schema additions** (`schema.prisma`):
   - `User.emailVerified: DateTime?` — null until email is verified.
   - `User.verificationToken: String? @unique` — one-time token for email verification.
   - `User.verificationTokenExpires: DateTime?` — token expiry time.
   - `User.resetToken: String? @unique` — optional, for future password reset.
   - `User.resetTokenExpires: DateTime?` — optional, for future password reset.

2. **Email & token services**:
   - `lib/email.ts` — `sendVerificationEmail(email, token, appUrl)` using Resend API.
   - `lib/verification-token.ts` — `generateVerificationToken()`, `createVerificationToken(email)`, `verifyEmailToken(token)`, `invalidateToken(email)`.
   - `lib/password.ts` — `validatePasswordStrength(password)` enforcing ≥8 chars, uppercase, lowercase, number.

3. **Server actions** (`actions/auth.ts` additions):
   - `signup(formData)` — validate email/password/confirm, check duplicate email, hash password, create user, generate token, send verification email, return success/error.
   - `verifyEmail(token)` — validate token, check expiry, mark `emailVerified`, clear token fields, return user.
   - `resendVerificationEmail(email)` — check user exists + not yet verified, invalidate old token, create new token, send email.

4. **UI pages**:
   - `app/(auth)/signup/page.tsx` — signup form (name, email, password, confirm password), client-side validation, error/success messages, link to login.
   - `app/(auth)/verify-email/page.tsx` — displays "Checking your email..." while verifying token from URL query param, then redirects to login on success or shows error.

5. **Auth flow modifications**:
   - `lib/auth.ts` — update Credentials provider to check `emailVerified !== null` before allowing login (unverified users blocked).
   - `proxy.ts` — no changes needed; signup/verify-email routes already public.

6. **Environment variables**:
   - `AUTH_VERIFICATION_TOKEN_EXPIRY_HOURS` (default: 24) — token lifetime.
   - `RESEND_API_KEY` — already configured in Milestone 15 (push notifications).
   - `RESEND_FROM_EMAIL` — already configured.
   - `NEXT_PUBLIC_APP_URL` — frontend verification link base (e.g., `http://localhost:3000`).

### Key files

- `prisma/schema.prisma` — User model additions.
- `lib/email.ts`, `lib/verification-token.ts`, `lib/password.ts` — core services.
- `actions/auth.ts` — signup/verifyEmail/resendVerificationEmail.
- `app/(auth)/signup/page.tsx`, `app/(auth)/verify-email/page.tsx` — UI.
- `lib/auth.ts` — login gate check for `emailVerified`.

### Verification

1. Signup form validation — submit with invalid email/weak password, confirm errors displayed.
2. Duplicate email — register once, try registering same email again, confirm "Email already registered" error.
3. Email verification — register new user, confirm email received, click verification link, confirm redirected to login and can now sign in.
4. Token expiry — manually set token expiry to past time in DB, try to verify, confirm "Token expired" error.
5. Unverified login block — register user, try signing in before verifying email, confirm login fails with "Please verify your email" message.
6. Resend email — click "Resend" on verify page, confirm new email sent and link works.
7. `npx tsc --noEmit` and `npm run build` — clean.

**Status:** 🔄 Ready for implementation (infrastructure in place; signup pages/actions not yet written).

---

## Milestone 26: Daily Football Quiz (Engagement & Gamification)

### Context

Introduce a daily engagement loop: players complete a 7-question football trivia quiz that resets at midnight UTC. Quiz rewards coins (same currency as Milestones 16–18), incentivizing daily app visits. Questions are admin-authored, difficulty-mixed (easy/medium/hard), and the same set is shown to all users each day. Players can retake the quiz same day but earn coins only once.

### Scope

1. **Prisma schema additions** (`schema.prisma`):
   - `QuizQuestion` — `id`, `question`, `options` (4 strings), `correctIndex` (0–3), `difficulty` (EASY/MEDIUM/HARD enum), `active`, `createdAt`.
   - `DailyQuiz` — `id`, `date` (YYYY-MM-DD, unique), `questionIds` (array of question IDs, fixed order), `createdAt`. Lazily generated once per day on first request.
   - `QuizConfig` — singleton with `questionsPerQuiz`, `secondsPerQuestion`, `completionCoins`, `coinsPerCorrect`.
   - `QuizAttempt` — `id`, `userId`, `date`, `answers` (JSON array), `correctCount`, `coinsAwarded`, `createdAt`. No unique constraint; retakes allowed.
   - `enum QuizDifficulty` — EASY, MEDIUM, HARD.

2. **`lib/quiz.ts`** — Core quiz logic:
   - `todayDateString()` — UTC date string (YYYY-MM-DD).
   - `getOrCreateTodaysQuiz()` — fetch/create today's `DailyQuiz`, randomly sample from active `QuizQuestion` stratified by difficulty.
   - `getQuizConfig()` — singleton fetch-or-create (cached like `RewardConfig`).
   - `submitQuizAttempt(userId, date, answers)` — server-side validate answers, calculate coins, write `QuizAttempt`, call `awardCoins()` with reason "daily_quiz", return results.

3. **API routes**:
   - `GET /api/quiz/today` — `requireAuth()`, returns today's questions (no `correctIndex`) + `secondsPerQuestion`.
   - `POST /api/quiz/submit` — `requireAuth()`, body `{ answers }`, calls `submitQuizAttempt()`, returns `{ correctCount, coinsAwarded, newBalance }`.
   - `GET /api/quiz/results` — `requireAuth()`, fetches today's `QuizAttempt` + `CoinBalance`, returns results for already-played quiz.
   - `GET /api/quiz/status` — `requireAuth()`, returns `{ hasPlayedToday, questionsPerQuiz }`.
   - `GET /api/quiz/config` — `requireAuth()`, returns `QuizConfig` (timer, coin amounts).

4. **Admin quiz management** (`app/(admin)/admin/quiz/page.tsx`):
   - Admin page (server component) to manage quiz questions and configuration.
   - Renders `QuizConfigForm` — edit config (questions per quiz, seconds per question, coin rewards).
   - Renders `QuizQuestionForm` — add new questions (text, 4 options, correct answer, difficulty).
   - Table listing all questions with difficulty badge, active toggle, delete button.
   - Seed mechanism: admin can bulk-import questions or add manually.

5. **User-facing UI**:
   - `components/QuizFab.tsx` — floating button (fixed bottom-right, soccer ball emoji) that opens quiz modal. Only renders if authenticated (uses `useSession()`). Shows checkmark if already played today, allows clicking to view results.
   - `components/features/quiz/QuizModal.tsx` — full-screen overlay quiz with countdown timer per question, auto-advance on timeout or answer selection, final results screen showing score + coins earned + new balance.
   - `components/DevelopmentBanner.tsx` — sticky top banner for dev environment (already implemented).
   - Loading state during submission prevents user interaction with spinner + backdrop.

6. **Database utilities**:
   - `scripts/clear-dev-quiz.js` — clears all `QuizAttempt` records from dev database (keeps questions/config intact).

### Key files

- `prisma/schema.prisma` — schema additions (models + enum).
- `lib/quiz.ts` — quiz logic (config, today's quiz generation, submission, validation).
- `app/api/quiz/today/route.ts`, `app/api/quiz/submit/route.ts`, `app/api/quiz/results/route.ts`, `app/api/quiz/status/route.ts`, `app/api/quiz/config/route.ts`.
- `app/(admin)/admin/quiz/page.tsx`, `components/features/admin/QuizConfigForm.tsx`, `components/features/admin/QuizQuestionForm.tsx`.
- `components/QuizFab.tsx`, `components/features/quiz/QuizModal.tsx`, `components/DevelopmentBanner.tsx`.
- `scripts/clear-dev-quiz.js`.

### Verification

1. Schema migration — `npx prisma db push` succeeds; `QuizQuestion`, `DailyQuiz`, `QuizConfig`, `QuizAttempt` tables created.
2. Admin adds 10+ questions across EASY/MEDIUM/HARD via `/admin/quiz`, sets config (7 questions/quiz, 10s timer, 20 completion coins, 10 coins/correct).
3. User authenticated — floating soccer ball icon appears on main pages; clicking opens quiz modal.
4. Quiz playback — timer counts down per question, auto-advances, final question auto-submits immediately, results displayed (score, coins, new balance).
5. Coins awarded — `CoinBalance` increments, `CoinTransaction` record created with reason "daily_quiz", visible on `/rewards`.
6. Same-day retake — player takes quiz again same day, new `QuizAttempt` logged, but no additional coins awarded (only once per day).
7. Daily reset — wait past UTC midnight (or manipulate dev date), new `DailyQuiz` generated with fresh question set, old quiz history preserved.
8. Unauthenticated pages — QuizFab doesn't render on `/login`, `/signup`, or other unauth pages.
9. Build succeeds — `npm run build` passes TypeScript checks, no errors.

**Status:** ✅ User-facing features implemented (QuizFab, QuizModal, results fetching, loading states, sticky banner). ⏳ Admin UI and core API routes still pending. Database schema and utilities ready for integration.

---

## Summary: All 26 Milestones

| # | Title | Status |
|---|-------|--------|
| 1-15 | Foundation through Push Notifications | ✅ See root PLANS.md |
| 16 | Coins & Daily Rewards | ✅ |
| 17 | Points Booster | ✅ |
| 18 | Premium Scorer Slots | ✅ |
| 19 | Admin Coins & Rewards Management | ✅ |
| 20 | User Profiles & Prediction History | ✅ |
| 21 | API Endpoints | ✅ |
| 22 | Live Match Updates During Play | ✅ (partial) |
| 23 | Most-Picked Players & Trending | ✅ |
| 24 | Notification Eligibility | ✅ |
| 25 | Self-Signup with Email Verification | 🔄 Ready for implementation |
| 26 | Daily Football Quiz | 🔄 User UI done; admin + API pending |

---

## Configuration Reference

**All environment variables** (see `.env.example`):

| Variable | Example | Used By |
|----------|---------|---------|
| `FOOTBALL_DATA_COMPETITION_CODE` | `WC` | Fixture sync, live status |

### Switching to a different competition

The app supports **one active competition at a time** (not concurrent leagues — no per-tournament data model exists). To move from the World Cup to another football-data.org competition (e.g. `CL` for Champions League, `PL` for Premier League):

1. Set `FOOTBALL_DATA_COMPETITION_CODE` to the new competition's code and redeploy. All sync entry points (`actions/match.ts`, `app/api/admin/sync-results/route.ts`) read this env var — no code changes needed for a same-format competition (knockout bracket).
2. Re-run "Sync from live API" in `/admin/matches` (or `npx tsx scripts/sync-matches.ts <CODE>`) to pull the new competition's teams and matches. The `Round` enum includes `GROUP_STAGE`/`REGULAR_SEASON` in addition to knockout rounds, so group-stage and league-format competitions sync too.
3. **Archive or reset prior-tournament data first.** `Team.externalId` and `Match.externalId` are globally unique (`prisma/schema.prisma`), so leftover teams/matches/predictions/standings from the previous competition will remain and can mix with the new one. Export/clear `Prediction`, `Match`, `Team`, `Player`, `CoinTransaction` (or move them to an archive) before syncing a new competition.
| `FOOTBALL_DATA_API_TOKEN` | `abc123...` | football-data.org API |
| `NEW_FOOTBALL_API_TOKEN` | `xyz789...` | api-football.com API |
| `CURRENCY_SYMBOL` | `₹` | Money display (all dashboards) |
| `MONEY_PER_CORRECT_WINNER` | `30` | Leaderboard, money dashboard |
| `MONEY_PER_INCORRECT_WINNER` | `-30` | Leaderboard, money dashboard |
| `MONEY_PER_CORRECT_SCORER` | `5` | Leaderboard, money dashboard |
| `MONEY_PER_INCORRECT_SCORER` | `-5` | Leaderboard, money dashboard |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `BG...` | Push subscription (client) |
| `VAPID_PRIVATE_KEY` | `private...` | Push sending (server) |
| `VAPID_SUBJECT` | `mailto:...` | Push setup |
| `DATABASE_URL` | `mongodb+srv://...` | Prisma, MongoDB connection |
| `AUTH_SECRET` | (random) | NextAuth.js session signing |
| `BETTOR_NAME` / `BETTOR_EMAIL` / `BETTOR_PASSWORD` | (demo user) | seed.ts |

---

## Known Limitations & Future Work

- Password reset flow — email-based reset (Milestone 25 infrastructure supports it; recovery action not yet implemented).
- OAuth integration — Google/GitHub login (would reduce friction vs. email/password registration).
- Admin account management — no UI to revoke user accounts or reset passwords from admin panel.
- Password reset — no "forgot password" UI; admin resets manually via `/admin/users`.
- OAuth — not wired up (Google/GitHub); only Credentials provider.
- Scheduled notifications — "lock in 30 min" reminder would need a job scheduler; currently sent manually.
- Offline support — no service-worker caching of pages; app requires live connection.
- Prediction rollback — no way to undo a spent booster or premium slot after submission.
- Mobile app — this is a PWA, not a native app; no native features (camera, contacts, etc.).
- Seasonal migration — tournament structure is hardcoded to 2026 World Cup (4 rounds); swapping to a different tournament would need schema updates.
