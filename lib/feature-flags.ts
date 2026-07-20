import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export type FeatureFlagKey =
  | "quiz"
  | "dailyCoins"
  | "pushBanner"
  | "finalDayBanner"
  | "rewardsPage"
  | "booster"
  | "dailyRewardClaim"
  | "navFixtures"
  | "navMyPredictions"
  | "navLeaderboard"
  | "navMoney";

export type FeatureFlagValues = Record<FeatureFlagKey, boolean>;

export const FEATURE_FLAG_KEYS: FeatureFlagKey[] = [
  "quiz",
  "dailyCoins",
  "pushBanner",
  "finalDayBanner",
  "rewardsPage",
  "booster",
  "dailyRewardClaim",
  "navFixtures",
  "navMyPredictions",
  "navLeaderboard",
  "navMoney",
];

export const ALL_ENABLED: FeatureFlagValues = Object.fromEntries(
  FEATURE_FLAG_KEYS.map((key) => [key, true])
) as FeatureFlagValues;

const CACHE_DURATION = 60000;
let cachedFlags: FeatureFlagValues | null = null;
let cacheTimestamp = 0;

function toValues(row: Record<string, unknown>): FeatureFlagValues {
  return Object.fromEntries(
    FEATURE_FLAG_KEYS.map((key) => [key, Boolean(row[key] ?? true)])
  ) as FeatureFlagValues;
}

/** Raw stored flags (no role bypass). Cached for 60s; creates defaults if missing. */
export async function getFeatureFlags(): Promise<FeatureFlagValues> {
  const now = Date.now();
  if (cachedFlags && now - cacheTimestamp < CACHE_DURATION) {
    return cachedFlags;
  }

  try {
    let flags = await prisma.featureFlags.findFirst();
    if (!flags) {
      flags = await prisma.featureFlags.create({ data: {} });
    }
    cachedFlags = toValues(flags as unknown as Record<string, unknown>);
    cacheTimestamp = now;
    return cachedFlags;
  } catch (error) {
    console.error("Error fetching feature flags:", error);
    return ALL_ENABLED;
  }
}

export function invalidateFeatureFlagsCache() {
  cachedFlags = null;
  cacheTimestamp = 0;
}

/** Effective flags for a role: admins bypass all flags. */
export function effectiveFlags(
  flags: FeatureFlagValues,
  role: string | undefined
): FeatureFlagValues {
  return role === "ADMIN" ? ALL_ENABLED : flags;
}

/**
 * API guard: throws a 403 response if the feature is off for the current user.
 * Returns the session user when allowed.
 */
export async function isFeatureEnabledForCurrentUser(
  key: FeatureFlagKey
): Promise<boolean> {
  const session = await auth();
  if (session?.user?.role === "ADMIN") return true;
  const flags = await getFeatureFlags();
  return flags[key];
}

/** Fallback destinations, in priority order, when a page is hidden. */
const PAGE_FALLBACKS: { key: FeatureFlagKey; href: string }[] = [
  { key: "navFixtures", href: "/fixtures" },
  { key: "navMyPredictions", href: "/my-predictions" },
  { key: "navLeaderboard", href: "/leaderboard" },
  { key: "rewardsPage", href: "/rewards" },
];

/**
 * Page guard for server components. If the feature is off for this role,
 * redirects to the first still-enabled main page (avoids redirect loops
 * since "/" itself forwards to /fixtures).
 */
export async function requireFeaturePage(
  key: FeatureFlagKey,
  role: string | undefined
): Promise<void> {
  const flags = effectiveFlags(await getFeatureFlags(), role);
  if (flags[key]) return;

  const fallback = PAGE_FALLBACKS.find((p) => p.key !== key && flags[p.key]);
  redirect(fallback ? fallback.href : "/unauthorized");
}
