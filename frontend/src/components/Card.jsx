export default function Card({ children, className = "", accent = null, hover = false }) {
  const accentMap = {
    amber: "border-l-amber-400",
    emerald: "border-l-emerald-400",
    violet: "border-l-violet-400",
    sky: "border-l-sky-400",
    rose: "border-l-rose-400",
  };

  return (
    <div
      className={`
        bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-card
        ${accent ? `border-l-4 ${accentMap[accent] || "border-l-amber-400"}` : ""}
        ${hover ? "hover:border-slate-700 hover:shadow-card-hover transition-all duration-200 cursor-pointer" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
