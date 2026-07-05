function letters(word: string) {
  return word.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * api-football often returns abbreviated names ("D. Henderson") while our
 * Player records (originally from football-data.org) have full names
 * ("Dean Henderson") — exact-name matching only works for single-word names.
 * Match on surname (last word) + first initial instead.
 */
export function playerMatchKey(name: string): string | null {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const surname = letters(parts[parts.length - 1]);
  const initial = letters(parts[0])[0];
  if (!surname || !initial) return null;
  return `${surname}|${initial}`;
}
