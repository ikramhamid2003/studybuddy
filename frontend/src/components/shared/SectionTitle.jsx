import PropTypes from "prop-types";

export default function SectionTitle({ color = "text-slate-400", children }) {
  return (
    <div className={`text-xs font-mono uppercase tracking-widest mb-3 ${color}`}>
      {children}
    </div>
  );
}

SectionTitle.propTypes = {
  color: PropTypes.string,
  children: PropTypes.node.isRequired,
};
