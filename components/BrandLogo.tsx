/** Bettman mark (lime check in a circle) + condensed wordmark. */
export function BrandLogo({ size = "md" }: { readonly size?: "sm" | "md" | "lg" }) {
  const mark = { sm: "h-8 w-8", md: "h-9 w-9", lg: "h-12 w-12" }[size];
  const icon = { sm: 16, md: 18, lg: 24 }[size];
  const word = { sm: "text-xl", md: "text-2xl", lg: "text-4xl" }[size];

  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span className={`flex ${mark} shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground`} aria-hidden="true">
        <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <span className={`font-display ${word} leading-none text-white`}>Bettman</span>
    </span>
  );
}
