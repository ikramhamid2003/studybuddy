/**
 * SVG progress ring used by the onboarding checklist.
 * `progress` is 0-100; the stroke offset is derived so 0 renders an empty ring
 * rather than a full one.
 */
export default function ProgressRing({ progress = 0, size = 72, stroke = 7, label }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, progress));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-indigo-600 transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-base font-bold leading-none text-slate-900">
          {clamped}%
        </span>
        {label && <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">{label}</span>}
      </div>
    </div>
  );
}
