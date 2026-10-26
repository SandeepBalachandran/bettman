/** Team logo in a round chip; falls back to the team's initials when there's no logo. */
export function TeamBadge({
  flag,
  name,
  size = 44,
}: {
  readonly flag: string | null | undefined;
  readonly name: string;
  readonly size?: number;
}) {
  const logoSize = Math.round(size * 0.64);
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/10"
      style={{ width: size, height: size }}
    >
      {flag ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={flag}
          alt=""
          width={logoSize}
          height={logoSize}
          className="rounded-full object-contain"
          style={{ width: logoSize, height: logoSize }}
        />
      ) : (
        <span className="font-display text-white/70" style={{ fontSize: size * 0.36 }} aria-hidden="true">
          {name
            .split(/\s+/)
            .map((w) => w[0])
            .join("")
            .slice(0, 3)}
        </span>
      )}
    </span>
  );
}
