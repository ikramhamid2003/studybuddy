export default function PageHeader({ icon, title, subtitle, accentColor = "text-amber-400" }) {
  return (
    <div className="mb-8 animate-fade-up">
      <div className="flex items-center gap-3 mb-2">
        <span className={`text-3xl`}>{icon}</span>
        <h2 className={`font-display text-3xl font-bold text-white`}>{title}</h2>
      </div>
      <p className="text-slate-400 text-sm ml-12">{subtitle}</p>
      <div className="mt-4 h-px bg-gradient-to-r from-amber-400/30 via-slate-700 to-transparent" />
    </div>
  );
}
