export function AuroraBg() {
  return (
    <div className="aurora-bg" aria-hidden="true">
      <div
        className="aurora-blob"
        style={{
          width: 520,
          height: 520,
          top: "-10%",
          left: "-8%",
          background: "radial-gradient(circle, #00e5ff 0%, transparent 70%)",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          width: 620,
          height: 620,
          top: "20%",
          right: "-12%",
          background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)",
          animationDelay: "-6s",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          width: 460,
          height: 460,
          bottom: "-15%",
          left: "30%",
          background: "radial-gradient(circle, #22d3ee 0%, transparent 70%)",
          animationDelay: "-12s",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />
    </div>
  );
}

export function Particles({ count = 24 }: { count?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => {
        const size = Math.random() * 4 + 2;
        const left = Math.random() * 100;
        const delay = Math.random() * 15;
        const duration = 12 + Math.random() * 14;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              bottom: `-${size * 2}px`,
              left: `${left}%`,
              width: size,
              height: size,
              borderRadius: "9999px",
              background:
                i % 3 === 0 ? "#00e5ff" : i % 3 === 1 ? "#7c3aed" : "#22d3ee",
              boxShadow: "0 0 8px currentColor",
              opacity: 0,
              animation: `particle-drift ${duration}s linear ${delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}