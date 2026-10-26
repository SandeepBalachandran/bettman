"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { InstallButton } from "@/components/InstallButton";
import { BrandLogo } from "@/components/BrandLogo";
import { PrizesCard } from "@/components/PrizesCard";
import type { PrizeSettings } from "@/lib/prizes";
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
    title: "Match Predictions",
    description: "Call every result — home win, draw or away win — all season long.",
  },
  {
    icon: Goal,
    title: "Goal Scorer Picks",
    description: "Name 2–4 goal scorers per match — you win for every goal they score.",
  },
  {
    icon: Trophy,
    title: "Live Leaderboard",
    description: "Medals, hot streaks and rank-change arrows update the moment a match ends.",
  },
  {
    icon: Lock,
    title: "Auto-Lock Before Kickoff",
    description: "Predictions seal themselves 30 minutes before kickoff — no late edits, no excuses.",
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
    description: "A dedicated celebration crowns the champion when the season's last match is done.",
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
    description: "Pick the result and your goal scorers for every match, before it locks.",
  },
  {
    number: "3",
    title: "Climb & earn coins",
    description: "Win on every correct call, chase daily rewards, and watch your name rise up the leaderboard.",
  },
];

/**
 * Hero photo. Only openly licensed photos (Wikimedia Commons) with their credit —
 * club/league/agency photos are copyrighted. Add more here to rotate later.
 */
const HERO_PHOTO = {
  src: "/landing/adrian-luna.webp",
  alt: "Adrian Luna smiling in a Kerala Blasters training kit",
  player: "Adrian Luna",
  credit: "Sonu Shaji01",
  licence: "CC BY-SA 4.0",
  licenceUrl: "https://commons.wikimedia.org/wiki/File:Adrian_Luna_Kerala.jpg",
};

const PREVIEW_ROWS = [
  { medal: "🥇", name: "Priya", amount: "₹285" },
  { medal: "🥈", name: "Arjun", amount: "₹260" },
  { medal: "🥉", name: "You", amount: "₹245", isYou: true },
];

export function Landing({
  prizes,
  seasonName,
}: {
  readonly prizes: PrizeSettings;
  readonly seasonName: string;
}) {
  return (
    <main className="flex flex-col">
      {/* Header */}
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-40 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-background/90 px-4 py-3 backdrop-blur sm:px-8">
        <BrandLogo />
        <div className="flex items-center gap-2 sm:gap-3">
          <InstallButton className="btn btn-outline h-10 w-10 shrink-0 p-0 text-xs sm:w-auto sm:px-4 sm:text-sm" />
          <Link href="/login" className="btn btn-outline h-10 shrink-0 px-4 text-sm">
            Sign In
          </Link>
          <Link href="/signup" className="btn btn-primary hidden h-10 px-4 text-sm sm:inline-flex">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 pt-10 pb-14 sm:px-8 sm:pt-14 sm:pb-24">
        <div className="mx-auto flex max-w-5xl flex-col items-stretch gap-10 md:flex-row md:items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1"
          >
            <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              Private football prediction league
            </p>
            <h1 className="font-display mt-3 text-[3.4rem] leading-[0.95] uppercase sm:text-7xl">
              Predict results.
              <br />
              <span className="text-accent">Climb the board.</span>
              <br />
              Win bragging rights.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-gray-400 sm:text-base">
              Bettman is a private, invite-only football prediction game for you and your
              friends. Call every winner, name your goal scorers, and see who really knows football.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3 sm:flex sm:max-w-sm">
              <Link href="/signup" className="btn btn-primary h-12 flex-1 text-sm">
                Get Started
              </Link>
              <Link href="/login" className="btn btn-outline h-12 flex-1 text-sm">
                Sign In
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="w-full flex-1 md:max-w-sm"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#161616] shadow-2xl ring-1 ring-white/10">
              <Image
                src={HERO_PHOTO.src}
                alt={HERO_PHOTO.alt}
                fill
                priority
                sizes="(min-width: 768px) 384px, 100vw"
                className="object-cover object-top"
              />
              {/* Fade into the page at the bottom, lime glow top-right */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-black/90" aria-hidden="true" />
              <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-accent/35 blur-3xl" aria-hidden="true" />

              <a
                href={HERO_PHOTO.licenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-3 right-4 max-w-[70%] truncate text-[10px] text-white/60 hover:text-white"
              >
                Photo: {HERO_PHOTO.credit} · {HERO_PHOTO.licence}
              </a>
              <span className="absolute top-3 left-4 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                {HERO_PHOTO.player}
              </span>

              <div className="absolute inset-x-3 bottom-3 rounded-3xl bg-black/55 p-3 ring-1 ring-white/10 backdrop-blur-md">
                <p className="font-display mb-2 text-2xl leading-none text-white">Leaderboard</p>
                <div className="space-y-1.5">
                  {PREVIEW_ROWS.map((row, i) => (
                    <motion.div
                      key={row.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 + i * 0.12 }}
                      className={`flex items-center justify-between rounded-xl px-3 py-1.5 ${
                        row.isYou ? "bg-accent text-accent-foreground" : "bg-white/[0.08] text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span>{row.medal}</span>
                        {row.name}
                      </span>
                      <span className="font-display text-xl leading-none">{row.amount}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-4xl leading-none uppercase sm:text-center sm:text-5xl">
            Everything you need to talk trash <span className="text-accent">responsibly</span>
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="card card-interactive flex items-start gap-4 p-4 sm:block sm:p-5">
                <div className="gradient-header flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white sm:mb-3">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-gray-400">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-4xl leading-none uppercase sm:text-center sm:text-5xl">
            Up and running in 3 steps
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:mt-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step) => (
              <div key={step.number} className="flex items-start gap-4 md:block md:text-center">
                <div className="gradient-header font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl text-white md:mx-auto">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-sm font-semibold md:mt-3">{step.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-gray-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      {prizes.enabled && (
        <section className="px-5 pb-14 sm:px-8 sm:pb-16">
          <div className="mx-auto max-w-xl">
            <PrizesCard settings={prizes} seasonName={seasonName} compact />
          </div>
        </section>
      )}

      <section className="mx-4 rounded-[2rem] bg-accent px-6 py-12 text-center text-accent-foreground sm:mx-8">
        <h2 className="font-display text-4xl leading-none uppercase sm:text-5xl">Ready to prove you know football?</h2>
        <p className="mt-3 text-sm font-medium sm:text-base">
          Join Bettman and put your predictions on the board.
        </p>
        <Link href="/signup" className="btn mt-6 inline-flex h-12 bg-black px-8 text-sm font-semibold text-white hover:bg-black/85">
          Get Started
        </Link>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-center gap-2 px-4 py-10 text-center sm:px-8">
        <BrandLogo size="sm" />
        <p className="text-xs text-gray-500">
          A private football prediction league. &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
