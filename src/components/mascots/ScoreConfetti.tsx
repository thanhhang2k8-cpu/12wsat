const SPOTS: { top: string; left: string; rotate: number; size: number; color: string; opacity: number }[] = [
  { top: "6%", left: "8%", rotate: -12, size: 46, color: "var(--color-pen)", opacity: 0.14 },
  { top: "14%", left: "82%", rotate: 8, size: 64, color: "var(--color-amber)", opacity: 0.16 },
  { top: "72%", left: "4%", rotate: 10, size: 40, color: "var(--color-chalk-green)", opacity: 0.14 },
  { top: "80%", left: "88%", rotate: -6, size: 52, color: "var(--color-pen)", opacity: 0.13 },
  { top: "42%", left: "2%", rotate: -18, size: 30, color: "var(--color-amber)", opacity: 0.12 },
  { top: "4%", left: "45%", rotate: 4, size: 28, color: "var(--color-pen)", opacity: 0.1 },
  { top: "90%", left: "45%", rotate: -8, size: 32, color: "var(--color-chalk-green)", opacity: 0.1 },
  { top: "48%", left: "92%", rotate: 14, size: 34, color: "var(--color-amber)", opacity: 0.12 },
];

/** Faint "1600" (the top SAT score) scattered as background texture — decorative only. */
export function ScoreConfetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {SPOTS.map((s, i) => (
        <span
          key={i}
          className="font-mono font-semibold"
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            fontSize: s.size,
            color: s.color,
            opacity: s.opacity,
            transform: `rotate(${s.rotate}deg)`,
          }}
        >
          1600
        </span>
      ))}
    </div>
  );
}
