import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { requireFeaturePage } from "@/lib/feature-flags";
import { MatchCard, type MatchCardData } from "@/components/features/matches/MatchCard";
import { fetchLiveCompetitionMatches, type FootballDataMatch } from "@/lib/football-data";
import { isMatchLocked, hasKickedOff, AUTO_LOCK_MINUTES_BEFORE_KICKOFF } from "@/lib/match-lock";
import { FirstMatchCountdown } from "@/components/FirstMatchCountdown";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { activeMatchWhere, getActiveCompetition } from "@/lib/competition";
import { groupByMatch } from "@/lib/match-groups";
import { refreshActiveCompetitionResults } from "@/lib/refresh-results";
import { getFeatureFlags } from "@/lib/feature-flags";
import { ScrollIntoViewOnMount } from "@/components/ScrollIntoViewOnMount";

const COMPETITION_CODE = process.env.FOOTBALL_DATA_COMPETITION_CODE ?? "WC";

async function getLiveStatusByExternalId(): Promise<Map<number, FootballDataMatch>> {
  // goal-api competitions keep live status/scores on the Match rows themselves
  // (see refreshActiveCompetitionResults); football-data is only for the World Cup.
  if (getActiveCompetition().goalApi) {
    return new Map();
  }
  try {
    const liveMatches = await fetchLiveCompetitionMatches(COMPETITION_CODE);
    return new Map(liveMatches.map((match) => [match.id, match]));
  } catch {
    // Live status is a display enhancement — fall back to DB-only rendering
    // if the API token is missing or football-data.org is unreachable.
    return new Map();
  }
}

export default async function FixturesPage() {
  const user = await requireAuth();
  await requireFeaturePage("navFixtures", user.role);
  refreshActiveCompetitionResults();

  const [matches, liveStatusByExternalId, storedFlags] = await Promise.all([
    prisma.match.findMany({
      where: activeMatchWhere(),
      include: {
        homeTeam: true,
        awayTeam: true,
        predictions: { where: { userId: user.id } },
      },
      orderBy: { kickoffTime: "asc" },
    }),
    getLiveStatusByExternalId(),
    // Raw stored flags, not effectiveFlags(): this is a layout choice the
    // admin sets for everyone, including themselves.
    getFeatureFlags(),
  ]);

  const allGroups = groupByMatch(matches, (match) => match); // latest first
  const isComplete = (group: (typeof allGroups)[number]) =>
    group.items.every((m) => m.status === "FINISHED");
  const chronological = storedFlags.fixturesChronological;
  const groups = chronological
    ? // Date order, past matches on top; the page scrolls to scrollTarget below.
      [...allGroups].reverse()
    : // Rounds/matchweeks still to be played first (soonest first), then
      // completed ones (most recent first) — so the current matchweek is on top.
      [...allGroups.filter((g) => !isComplete(g)).reverse(), ...allGroups.filter(isComplete)];

  // The match the page scrolls to: one in progress, else the latest finished one.
  const scrollTarget = chronological
    ? (matches.find((m) => m.status === "LIVE") ??
      matches.filter((m) => m.status === "FINISHED").at(-1))
    : undefined;

  const nextMatch = matches
    .filter((m) => m.status !== "FINISHED")
    .reduce<(typeof matches)[number] | null>(
      (earliest, m) => (!earliest || m.kickoffTime < earliest.kickoffTime ? m : earliest),
      null
    );

  const nextKickoff = matches.find((m) => m.status === "UPCOMING" && !hasKickedOff(m));

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-4 sm:space-y-10 sm:p-6">
      <h1 className="text-2xl font-bold gradient-text">Fixtures</h1>

      <PushNotificationPrompt />

      {nextKickoff && (
        <FirstMatchCountdown
          kickoffTime={nextKickoff.kickoffTime.toISOString()}
          matchName={`${nextKickoff.homeTeam.name} vs ${nextKickoff.awayTeam.name}`}
        />
      )}

      <p className="text-xs text-gray-500">
        Predictions lock automatically {AUTO_LOCK_MINUTES_BEFORE_KICKOFF +' '}  minutes before each
        match&apos;s kickoff.
      </p>

      {matches.length === 0 && (
        <p className="text-sm text-gray-500">
          No matches yet. Ask the admin to run the match sync script.
        </p>
      )}

      {scrollTarget && <ScrollIntoViewOnMount targetId={`match-${scrollTarget.id}`} />}

      {groups.map((group) => {
        return (
          <section key={group.key} className="space-y-3">
            <h2 className="inline-block">
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${group.badgeClass}`}>
                {group.label}
              </span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.items.map((match) => {
                const liveMatch = match.externalId
                  ? liveStatusByExternalId.get(match.externalId)
                  : undefined;
                const cardData: MatchCardData = {
                  id: match.id,
                  kickoffTime: match.kickoffTime,
                  locked: isMatchLocked(match),
                  status: match.status,
                  homeTeam: { name: match.homeTeam.name, flag: match.homeTeam.flag },
                  awayTeam: { name: match.awayTeam.name, flag: match.awayTeam.flag },
                  hasPrediction: match.predictions.length > 0,
                  liveStatus: liveMatch?.status ?? (match.status === "LIVE" ? "IN_PLAY" : undefined),
                  score:
                    match.homeScore !== null && match.awayScore !== null
                      ? { home: match.homeScore, away: match.awayScore }
                      : undefined,
                  isNext: match.id === nextMatch?.id,
                };
                return <MatchCard key={match.id} match={cardData} />;
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
