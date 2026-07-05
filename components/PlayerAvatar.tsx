export function PlayerAvatar({
  name,
  photoUrl,
  size = 20,
}: {
  readonly name: string;
  readonly photoUrl?: string | null;
  readonly size?: number;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-500 dark:bg-white/10"
      style={{ width: size, height: size }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
