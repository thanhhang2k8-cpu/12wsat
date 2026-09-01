/** Tiled "12WSAT · 1600" background texture — decorative branding, not the anti-copy watermark. */
export function ScoreConfetti() {
  const tiles = Array.from({ length: 120 }, (_, i) => i);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="flex flex-wrap content-start gap-x-12 gap-y-10"
        style={{
          position: "absolute",
          top: "-20%",
          left: "-20%",
          width: "140%",
          height: "140%",
          transform: "rotate(-14deg)",
        }}
      >
        {tiles.map((i) => (
          <span
            key={i}
            className="font-display whitespace-nowrap font-semibold italic"
            style={{
              fontSize: i % 3 === 0 ? 30 : 20,
              color: i % 2 === 0 ? "var(--color-pen)" : "var(--color-amber)",
              opacity: 0.06,
            }}
          >
            {i % 2 === 0 ? "12WSAT" : "1600"}
          </span>
        ))}
      </div>
    </div>
  );
}
