# FIFU Live Match Updates Flow

## Current Flow (Right Now)

```
User visits /fixtures page
    ↓
syncLiveMatchResults() runs on server
    ↓
Fetches data from Football Data API:
  - Gets all FINISHED and LIVE matches
    ↓
For each match:
  - If status = UPCOMING → skip
  - If status = LIVE → Just update database status to LIVE (that's it!)
  - If status = FINISHED → Update database with winner + scorers
    ↓
Page displays:
  - Match info from DATABASE (status, teams, time)
  - Live scores from API OVERLAY (as a visual layer on top)
  - Scorers only show after match finishes
```

### The Problem

- While match is LIVE, you see the score from the API (5-minute cache)
- But **scorers are NOT in the database** until match finishes
- So admin has to manually add goalscorers at the end
- And if API fails, you only see outdated database info

---

## Option 1: Store Live Scores in Database

### Step 1: Migration (Schema Changes)

Add these fields to the Match table:

```
Match table changes:
├─ homeScore: Int (current goal count, e.g., 2)
├─ awayScore: Int (current goal count, e.g., 1)
├─ halfTimeHome: Int (optional, score at halftime)
├─ halfTimeAway: Int (optional, score at halftime)
└─ lastScoreSyncedAt: DateTime (to track when we last updated from API)
```

**Why?** So the database stores the live score, not just the final result.

---

### Step 2: Database Sync Flow

```
User visits /fixtures page
    ↓
syncLiveMatchResults() runs
    ↓
API Call #1: Fetch LIVE + FINISHED matches
  URL: https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED,LIVE
  Response includes: status, score (fullTime, halfTime), scorers array
    ↓
For each match:
  
  ├─ If UPCOMING: Skip (nothing to update)
  │
  ├─ If LIVE:
  │  ├─ Update Match record:
  │  │  ├─ status = "LIVE"
  │  │  ├─ homeScore = API.score.fullTime.home
  │  │  ├─ awayScore = API.score.fullTime.away
  │  │  ├─ halfTimeHome = API.score.halfTime.home
  │  │  └─ halfTimeAway = API.score.halfTime.away
  │  │
  │  └─ Update scorers (NEW!):
  │     ├─ Query API for scorers data (same API call, included in response)
  │     ├─ Find player by name + team in database
  │     ├─ Create MatchScorer records for each goal
  │     └─ Note: Might be incomplete, but better than nothing
  │
  └─ If FINISHED:
     ├─ Update Match record:
     │  ├─ status = "FINISHED"
     │  ├─ homeScore = API.score.fullTime.home (final score)
     │  ├─ awayScore = API.score.fullTime.away (final score)
     │  ├─ winnerTeamId = winner (set winner)
     │  └─ wonOnPenalties = check API-Football for penalty info
     │
     └─ Clear old scorers + add final scorers:
        ├─ Delete all MatchScorer records for this match
        ├─ Fetch complete scorers list from API
        └─ Create new MatchScorer records (one per goal)
```

---

### Step 3: Display Flow

**Before (current):**
```
Match status from DB + Score from API overlay
  → If API down: you see "LIVE" but no score
```

**After (Option 1):**
```
Match status from DB + Score from DB (fast, always available)
  → API becomes backup/validation layer
  → If API down: you still see the last synced score
```

---

### Step 4: API Calls Timeline

| When | API Call | Purpose | Cache |
|------|----------|---------|-------|
| **Page load** | `GET /competitions/WC/matches?status=FINISHED,LIVE` | Sync live + finished | 60 sec (revalidates every page load) |
| **Every page load** | Scorers lookup (from match response) | Get goal scorers | Included above |
| **When match finishes** | `searchApiFootballTeam()` + `fetchHeadToHeadFixtures()` | Detect penalties | None |

---

## Quick Comparison

| Aspect | Current | Option 1 |
|--------|---------|----------|
| **Live scores** | API only (can stale) | Database (synced every load) |
| **Live scorers** | Nothing | Partial (updated live) |
| **When match ends** | Manual feed scorers | Auto-capture final + scorers |
| **Offline support** | Only old data | Last synced live data |
| **Schema change** | No | Yes (add 4 fields) |

---

## Implementation Checklist for Option 1

- [ ] Create Prisma migration to add score fields to Match model
- [ ] Update `syncLiveMatchResults()` to capture scores during LIVE status
- [ ] Update `syncLiveMatchResults()` to capture scorers during LIVE status
- [ ] Update MatchCard component to display scores from database
- [ ] Test with a live match
