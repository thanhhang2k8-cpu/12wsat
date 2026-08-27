export function Squirrel({
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
      {/* fluffy tail, behind the body/head on the right */}
      <ellipse
        cx="76"
        cy="50"
        rx="20"
        ry="30"
        transform="rotate(20 76 50)"
        fill="var(--color-paper)"
        stroke="var(--color-pen)"
        strokeWidth="2"
      />
      <ellipse cx="76" cy="50" rx="11" ry="20" transform="rotate(20 76 50)" fill="var(--color-pen)" opacity="0.1" />

      {/* body */}
      <ellipse cx="46" cy="72" rx="22" ry="20" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2" />

      {/* head + round ears */}
      <circle cx="46" cy="38" r="19" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2" />
      <circle cx="34" cy="23" r="7" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2" />
      <circle cx="58" cy="23" r="7" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2" />
      <circle cx="34" cy="24" r="3" fill="var(--color-amber)" />
      <circle cx="58" cy="24" r="3" fill="var(--color-amber)" />

      {/* face */}
      <g className="mascot-eye" style={{ animationDelay: blinkDelay }}>
        <ellipse cx="39" cy="38" rx="3.2" ry="4.4" fill="var(--color-ink)" />
        <ellipse cx="53" cy="38" rx="3.2" ry="4.4" fill="var(--color-ink)" />
      </g>
      <circle cx="30" cy="46" r="4" fill="var(--color-amber)" opacity="0.3" />
      <circle cx="62" cy="46" r="4" fill="var(--color-amber)" opacity="0.3" />
      <path d="M43 47 L49 47 L46 50 Z" fill="var(--color-ink)" opacity="0.85" />

      {/* acorn held at chest */}
      <ellipse cx="46" cy="62" rx="8" ry="9" fill="var(--color-amber)" />
      <path d="M38 57 C38 51 54 51 54 57 Z" fill="var(--color-ink)" />
      <rect x="44.5" y="49" width="3" height="6" rx="1.5" fill="var(--color-ink)" />
    </svg>
  );
}
