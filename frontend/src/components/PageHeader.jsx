import { useLocation } from "react-router-dom";
import { ROUTE_ACCENT_LINE, ROUTE_ACCENT_BG } from "../utils/routeColors";
import PropTypes from "prop-types";

export default function PageHeader({ icon, title, subtitle }) {
  const location = useLocation();
  // The underline follows the current route, giving each tool a recognizable
  // accent while keeping the header component reusable.
  const activeLine = ROUTE_ACCENT_LINE[location.pathname] || "from-amber-500/50 via-amber-500/10 to-transparent";
  const activeBg = ROUTE_ACCENT_BG[location.pathname] || "from-amber-500/10 via-amber-500/5 to-transparent";

  return (
    <div className="mb-10 animate-fade-up relative">
      {/* Subtle accent background glow */}
      <div className={`absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-r ${activeBg} rounded-2xl pointer-events-none -z-10 opacity-50`} />
      {/* Header content is supplied by each page; color is inferred from route. */}
      <div className="flex items-center gap-4 mb-3 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-center text-2xl shadow-inner backdrop-blur-md">
          {icon}
        </div>
        <div>
          <h2 className="font-display text-3xl font-extrabold text-white tracking-tight">{title}</h2>
          <p className="text-slate-400 text-xs font-light font-body mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className={`mt-5 h-[1.5px] bg-gradient-to-r ${activeLine} relative z-10`} />
    </div>
  );
}

PageHeader.propTypes = {
  icon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
};
