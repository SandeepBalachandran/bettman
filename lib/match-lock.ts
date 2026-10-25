export const AUTO_LOCK_MINUTES_BEFORE_KICKOFF = 30;

/** True once a match is manually locked, or within the auto-lock window before kickoff. */
export function isMatchLocked(
  match: { locked: boolean; kickoffTime: Date },
  now: Date = new Date()
): boolean {
  const autoLockTime =
    match.kickoffTime.getTime() - AUTO_LOCK_MINUTES_BEFORE_KICKOFF * 60 * 1000;
  return match.locked || now.getTime() >= autoLockTime;
}

/** True once the match's scheduled kickoff time has passed. */
export function hasKickedOff(match: { kickoffTime: Date }, now: Date = new Date()): boolean {
  return now.getTime() >= match.kickoffTime.getTime();
}
