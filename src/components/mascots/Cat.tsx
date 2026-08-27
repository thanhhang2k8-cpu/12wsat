export function Cat({
  size = 72,
  blinkDelay = "0s",
  bob = true,
  className,
}: {
  size?: number;
  blinkDelay?: string;
  bob?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={[bob ? "mascot-bob" : "", className].filter(Boolean).join(" ")}
      style={{ transformOrigin: "50% 95%" }}
      aria-hidden="true"
    >
      <path
        d="M78 82 C92 78 92 60 82 54 C90 58 92 72 84 80"
        stroke="var(--color-pen)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse cx="50" cy="70" rx="26" ry="22" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2" />
      <circle cx="50" cy="36" r="20" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2" />
      <path d="M28 24 L20 8 L38 20 Z" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M72 24 L80 8 L62 20 Z" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
      <g className="mascot-eye" style={{ animationDelay: blinkDelay }}>
        <ellipse cx="40" cy="36" rx="3.4" ry="4.6" fill="var(--color-ink)" />
        <ellipse cx="60" cy="36" rx="3.4" ry="4.6" fill="var(--color-ink)" />
      </g>
      <circle cx="30" cy="44" r="4" fill="var(--color-amber)" opacity="0.3" />
      <circle cx="70" cy="44" r="4" fill="var(--color-amber)" opacity="0.3" />
      <path d="M47 45 L53 45 L50 48 Z" fill="var(--color-amber)" />
      <path d="M50 48 C48 51 46 51 44 50 M50 48 C52 51 54 51 56 50" stroke="var(--color-ink)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20 40 L34 42 M20 46 L34 45" stroke="var(--color-ink)" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <path d="M80 40 L66 42 M80 46 L66 45" stroke="var(--color-ink)" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
