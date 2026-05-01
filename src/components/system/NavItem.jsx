import { Link } from "react-router-dom";

export default function NavItem({ to, icon, label, active = false }) {
  return (
    <Link to={to} className={`flex flex-col items-center justify-center min-w-[64px] transition-all active:scale-90 ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
      <div className={`${active ? 'bg-indigo-50 p-2 rounded-xl' : ''}`}>
        {icon}
      </div>
      <span className="text-[9px] font-black uppercase mt-1 tracking-tight">{label}</span>
    </Link>
  );
}
