# Project: World Cup Prediction League

You are an expert Full Stack Software Engineer with deep experience in Next.js 15, TypeScript, PostgreSQL, Prisma, and modern React architecture.

Your goal is to help me build a production-quality private World Cup Prediction League application.

This application is **NOT** a gambling platform. It is a private prediction game among a small group of friends (maximum 5 users) where users earn points based on prediction accuracy. No money, payments, wallets, deposits, withdrawals, or betting transactions exist in this application.

The project should follow clean architecture, best coding practices, reusable components, scalable folder structure, and production-ready code.

---

# Tech Stack

Use the following technologies.

* Next.js 15 (App Router)
* React 19
* TypeScript
* Tailwind CSS
* Prisma ORM
* PostgreSQL (Neon or Supabase)
* Auth.js (NextAuth v5)
* Zod
* React Hook Form
* Server Actions
* Lucide Icons
* shadcn/ui
* TanStack Table (if necessary)
* Vercel deployment compatible

Avoid unnecessary dependencies.

---

# Project Goal

Create a private prediction application where invited users can:

* Login
* Predict winners of knockout matches
* Predict goal scorers
* View leaderboard
* View previous predictions
* Earn points automatically
* See rankings after every completed match

Only one administrator exists.

---

# Users

Maximum users:

5

No public registration.

Users are manually created by the administrator.

Only authenticated users can access the application.

---

# Roles

## Administrator

Only one administrator exists.

The administrator can

* Create matches
* Edit matches
* Delete matches
* Lock or unlock predictions
* Enter actual match winner
* Enter actual goal scorers
* Trigger score calculation
* Manage users
* View every prediction

---

## User

Users can

* Login
* View fixtures
* Submit predictions
* Edit predictions before kickoff
* View leaderboard
* View completed matches
* View prediction history

Users cannot access admin pages.

---

# Tournament Structure

Support only knockout rounds.

Round of 16

8 matches

↓

Quarter Finals

4 matches

↓

Semi Finals

2 matches

↓

Final

1 match

Total

15 matches

Each match belongs to one round.

---

# Scoring Rules

Winner prediction

Correct

+30 points

Wrong

0 points

No prediction

0 points

Goal scorer prediction

Each user selects exactly three players.

Each player is evaluated individually.

Correct player

+10 points

Wrong player

-5 points

Example

Prediction

Messi

Mbappe

Vinicius

Actual scorers

Messi

Alvarez

Points

Messi

+10

Mbappe

-5

Vinicius

-5

Total

0

Maximum scorer points

30

Minimum scorer points

-15

Maximum points per match

60

Minimum points per match

-15

---

# Match Locking

Predictions must automatically lock once kickoff time is reached.

Users cannot edit predictions after kickoff.

Locking must happen on the server.

Do not rely on frontend validation.

---

# Database Design

Create a proper Prisma schema.

## User

* id
* name
* email
* password
* role
* createdAt
* updatedAt

---

## Team

* id
* name
* shortName
* fifaCode
* flag
* createdAt

---

## Player

* id
* teamId
* name
* position

---

## Match

* id
* round
* homeTeamId
* awayTeamId
* kickoffTime
* status
* winnerTeamId
* locked
* createdAt

Status values

Upcoming

Live

Finished

---

## MatchScorer

Stores actual scorers.

* id
* matchId
* playerId

---

## Prediction

One prediction per user per match.

* id
* userId
* matchId
* winnerTeamId
* createdAt
* updatedAt

Unique

userId + matchId

---

## PredictionScorer

Stores three predicted scorers.

* id
* predictionId
* playerId

Maximum

Three records

---

# Authentication

Implement Auth.js using Credentials Provider.

Password hashing

bcrypt

Sessions

JWT

Protected routes

Middleware

No signup page.

Administrator creates users manually.

---

# Application Pages

## Login

Simple login form.

Email

Password

Remember me

---

## Dashboard

Display

Upcoming matches

Countdown to next match

Leaderboard summary

Recent completed matches

My current ranking

---

## Fixtures

Display all knockout matches grouped by round.

Round of 16

Quarter Finals

Semi Finals

Final

Each match card shows

Home flag

Away flag

Kickoff time

Prediction status

Locked status

---

## Prediction Page

Each match displays

Home team

Away team

Winner selector

Goal scorer selector

Three dropdowns

Save button

Update button

Disable editing when locked.

---

## Leaderboard

Display

Rank

Player

Winner points

Scorer points

Penalty

Total

Sort descending.

Highlight current logged in user.

---

## Match Details

Display

Teams

Winner

Actual scorers

My prediction

Points earned

Prediction accuracy

---

## My Predictions

Group predictions by round.

Display

Winner prediction

Scorer predictions

Points earned

Locked status

---

## Admin Dashboard

Statistics

Number of users

Matches completed

Predictions submitted

Prediction percentage

Leaderboard

---

## Admin Match Management

CRUD

Create

Edit

Delete

Lock

Unlock

Finish

Enter winner

Enter scorers

Recalculate scores

---

## Admin User Management

Create user

Reset password

Deactivate user

Delete user

---

# UI Requirements

Modern design

Minimal

Dark mode

Responsive

Mobile-first

Cards

Rounded corners

Smooth animations

Loading skeletons

Toast notifications

Empty states

Error states

Use shadcn/ui wherever possible.

## Addendum (added post-Milestone 5)

Every screen — including admin pages (dashboard, matches table, users table) — must be usable on a small phone viewport (~375px wide), not just desktop. Tables must scroll horizontally or reflow on narrow screens rather than overflowing/clipping.

Use an eye-catching accent color palette (not just black/white/gray) for primary actions, badges, and highlights. Use **Poppins** as the site's primary font (replacing the default Geist font).

---

# Folder Structure

Use scalable architecture.

app/

(auth)

(admin)

(dashboard)

(fixtures)

(leaderboard)

(predictions)

(match)

components/

features/

hooks/

actions/

lib/

prisma/

types/

utils/

constants/

middleware.ts

Keep components reusable.

Avoid duplicated logic.

---

# Server Actions

Use Server Actions instead of REST APIs whenever possible.

Examples

createPrediction()

updatePrediction()

createMatch()

updateMatch()

finishMatch()

calculateLeaderboard()

createUser()

---

# Business Rules

Only one prediction per user per match.

Predictions editable before kickoff.

Users cannot predict finished matches.

Only admin can finish matches.

Leaderboard updates automatically.

Users cannot change completed predictions.

---

# Leaderboard Calculation

Never permanently store total points.

Calculate dynamically.

Winner points

*

Scorer points

=

Match points

Sum every completed match

Sort descending.

---

# Nice Features

Countdown timer

Country flags

Player search

Prediction progress

Leaderboard medals

Recent activity

Current champion

Animated ranking changes

Confetti for perfect prediction

---

# Validation

Use Zod everywhere.

Validate

Emails

Passwords

Prediction count

Kickoff time

Duplicate predictions

Admin permissions

---

# Error Handling

Graceful error pages

404

500

Unauthorized

Validation errors

Database errors

Toast notifications

---

# Performance

Use React Server Components whenever possible.

Minimize client components.

Use Suspense.

Lazy load heavy components.

Optimize database queries.

Avoid unnecessary re-renders.

---

# Security

Protected routes

Role-based authorization

Server-side validation

Hashed passwords

No client-side trust

Secure session management

CSRF protection through Auth.js

Parameterized database queries

---

# Future Expansion

Design the architecture so it can later support

* UEFA Champions League
* Euro Cup
* Copa America
* IPL Prediction League
* Multiple tournaments
* Multiple seasons
* Different scoring systems
* Invite codes
* Push notifications
* Email reminders
* Live match updates using football APIs

The codebase should remain clean, modular, and maintainable as features grow.

---

# Development Expectations

When generating code:

* Write production-quality TypeScript.
* Follow Next.js best practices.
* Keep components small and reusable.
* Use meaningful file names.
* Use clean folder organization.
* Explain architectural decisions when appropriate.
* Never generate placeholder logic if the real implementation can reasonably be written.
* Prefer Server Components unless client-side interactivity is required.
* Follow SOLID principles where practical.
* Keep the UI polished and responsive.

Build the application incrementally in logical milestones, starting with project setup, authentication, Prisma schema, database integration, and core prediction functionality before implementing admin tools and leaderboard features.
