"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Target,
  Goal,
  Trophy,
  Lock,
  Coins,
  Bell,
  PartyPopper,
  Smartphone,
} from "lucide-react";

const FEATURES = [
  {
    icon: Target,
    title: "Knockout Predictions",
    description: "Call the winner of every Round of 16, quarter-final, semi-final and the Final.",
  },
  {
    icon: Goal,
    title: "Goal Scorer Picks",
    description: "Name 3 goal scorers per match — +10 points for every hit, -5 for a miss.",
  },
  {
    icon: Trophy,
    title: "Live Leaderboard",
    description: "Medals, hot streaks and rank-change arrows update the moment a match ends.",
  },
  {
    icon: Lock,
    title: "Auto-Lock at Kickoff",
    description: "Predictions seal themselves the second the match starts — no late edits, no excuses.",
  },
  {
    icon: Coins,
    title: "Coin Economy",
    description: "Earn daily rewards, ace the daily quiz, and spend coins on 2x boosters and extra picks.",
  },
  {
    icon: Bell,
    title: "Push Notifications",
    description: "Get pinged the moment a match finishes so you can see where you landed.",
  },
  {
    icon: PartyPopper,
    title: "Champion Finale",
    description: "A dedicated celebration crowns the tournament champion when the dust settles.",
  },
  {
    icon: Smartphone,
    title: "Mobile-First, Dark Mode",
    description: "Built for your phone from the first tap, with a dark mode that's easy on the eyes.",
  },
];

const STEPS = [
  {
    number: "1",
    title: "Get invited & sign in",
    description: "Bettman is a private league — join with an invite from the admin, or sign up directly.",
  },
  {
    number: "2",
    title: "Predict before kickoff",
    description: "Pick the winner and 3 goal scorers for every knockout match, before it locks.",
  },
  {
    number: "3",
    title: "Climb & earn coins",
    description: "Score points, chase daily rewards, and watch your name rise up the leaderboard.",
  },
];

const PREVIEW_ROWS = [
  { medal: "🥇", name: "Priya", pts: 285 },
  { medal: "🥈", name: "Arjun", pts: 260 },
  { medal: "🥉", name: "You", pts: 245, isYou: true },
];

export function Landing() {
  return (
    <main className="flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-2 px-4 py-4 sm:px-8">
        <span className="text-lg font-bold tracking-tight">
          🏆 <span className="gradient-text">Bettman</span>
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="btn btn-outline px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="btn btn-primary px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pt-8 pb-16 sm:px-8 sm:pt-12 sm:pb-24">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 md:flex-row md:items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 text-center md:text-left"
          >
            <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              Predict winners &amp; scorers.{" "}
              <span className="gradient-text">Climb the leaderboard.</span>{" "}
              Win bragging rights.
            </h1>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
              Bettman is a private, invite-only World Cup knockout prediction game for you and your
              friends. Call every winner, name your goal scorers, and see who really knows football.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              <Link href="/signup" className="btn btn-primary justify-center px-6 py-2.5 text-sm">
                Get Started
              </Link>
              <Link href="/login" className="btn btn-outline justify-center px-6 py-2.5 text-sm">
                Sign In
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="w-full max-w-sm flex-1"
          >
            <div className="card gradient-header p-4 text-white shadow-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide opacity-90">
                Leaderboard
              </p>
              <div className="space-y-2">
                {PREVIEW_ROWS.map((row, i) => (
                  <motion.div
                    key={row.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.12 }}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                      row.isYou ? "bg-white/25" : "bg-white/10"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span>{row.medal}</span>
                      {row.name}
                    </span>
                    <span className="text-sm font-extrabold">{row.pts} pts</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            Everything you need to talk trash <span className="gradient-text">responsibly</span>
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="card card-interactive p-5">
                <div className="gradient-header mb-3 flex h-10 w-10 items-center justify-center rounded-full text-white">
                  <Icon size={20} />
                </div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Up and running in 3 steps</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="text-center">
                <div className="gradient-header mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white">
                  {step.number}
                </div>
                <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="gradient-header px-4 py-14 text-center text-white sm:px-8">
        <h2 className="text-2xl font-bold sm:text-3xl">Ready to prove you know football?</h2>
        <p className="mt-2 text-sm opacity-90 sm:text-base">
          Join Bettman and put your predictions on the board.
        </p>
        <Link
          href="/signup"
          className="btn mt-6 inline-flex bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-100"
        >
          Get Started
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 text-center sm:px-8">
        <p className="text-sm font-bold">
          🏆 <span className="gradient-text">Bettman</span>
        </p>
        <p className="mt-1 text-xs text-gray-500">
          A private World Cup prediction league. &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
