/**
 * Inline activity sparkline.
 *
 * Hand-rolled SVG rather than a chart library: the data is 14 integers and the
 * bundle is already 241 kB gzipped. Bars, not a line, because zero-activity days
 * must stay visibly zero instead of reading as a dip in a curve.
 */
export default function Sparkline({ series = [], className = "", height = 56 }) {
  if (!series.length) return null;

  const max = Math.max(1, ...series.map((day) => day.count));
  const barWidth = 100 / series.length;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`Activity over the last ${series.length} days, peak ${max} per day`}
      >
        {series.map((day, index) => {
          // A day with nothing still draws a hairline so the axis reads as time.
          const barHeight = day.count ? Math.max(3, (day.count / max) * (height - 6)) : 1.5;
          const x = index * barWidth + barWidth * 0.18;
          const width = barWidth * 0.64;
          return (
            <rect
              key={day.key}
              x={x}
              y={height - barHeight}
              width={width}
              height={barHeight}
              rx={Math.min(1.5, width / 2)}
              className={
                day.isToday
                  ? "fill-indigo-600"
                  : day.count
                    ? "fill-indigo-300"
                    : "fill-slate-200"
              }
            >
              <title>{`${day.label} ${day.day}: ${day.count}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
        <span>{series[0].label}</span>
        <span className="text-indigo-600">Today</span>
      </div>
    </div>
  );
}
