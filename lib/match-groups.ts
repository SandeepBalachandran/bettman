import type { Round } from "@prisma/client";

const ROUND_LABELS: Record<Round, string> = {
  GROUP_STAGE: "Group Stage",
  REGULAR_SEASON: "Regular Season",
  ROUND_OF_16: "Round of 16",
  QUARTER_FINALS: "Quarter Finals",
  SEMI_FINALS: "Semi Finals",
  THIRD_PLACE: "Third Place Play-off",
  FINAL: "Final",
};

const ROUND_BADGE_STYLES: Record<Round, string> = {
  GROUP_STAGE: "bg-accent/15 text-accent",
  REGULAR_SEASON: "bg-accent/15 text-accent",
  ROUND_OF_16: "bg-accent/15 text-accent",
  QUARTER_FINALS: "bg-accent/15 text-accent",
  SEMI_FINALS: "bg-accent/15 text-accent",
  THIRD_PLACE: "bg-white/10 text-white",
  FINAL: "bg-accent text-accent-foreground",
};

export type MatchGroupFields = { round: Round; matchweek: number | null; kickoffTime: Date };

/** Stable key a match is grouped under: its matchweek for league play, else its knockout round. */
export function matchGroupKey(match: Pick<MatchGroupFields, "round" | "matchweek">): string {
  return match.matchweek ? `MW${match.matchweek}` : match.round;
}

export function matchGroupLabel(match: Pick<MatchGroupFields, "round" | "matchweek">): string {
  return match.matchweek ? `Matchweek ${match.matchweek}` : ROUND_LABELS[match.round];
}

export function matchGroupBadgeStyle(match: Pick<MatchGroupFields, "round" | "matchweek">): string {
  return ROUND_BADGE_STYLES[match.round];
}

export type MatchGroup<T> = {
  key: string;
  label: string;
  badgeClass: string;
  items: T[];
};

/**
 * Buckets items by their match's round/matchweek, groups ordered latest first
 * (by each group's earliest kickoff) and items kept in their incoming order.
 */
export function groupByMatch<T>(items: T[], getMatch: (item: T) => MatchGroupFields): MatchGroup<T>[] {
  const groups = new Map<string, MatchGroup<T> & { earliest: number }>();
  for (const item of items) {
    const match = getMatch(item);
    const key = matchGroupKey(match);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        label: matchGroupLabel(match),
        badgeClass: matchGroupBadgeStyle(match),
        items: [],
        earliest: match.kickoffTime.getTime(),
      };
      groups.set(key, group);
    }
    group.items.push(item);
    group.earliest = Math.min(group.earliest, match.kickoffTime.getTime());
  }
  return [...groups.values()]
    .sort((a, b) => b.earliest - a.earliest)
    .map((group) => ({ key: group.key, label: group.label, badgeClass: group.badgeClass, items: group.items }));
}
