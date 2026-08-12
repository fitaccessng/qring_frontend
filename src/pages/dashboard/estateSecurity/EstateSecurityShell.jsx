import { Link, NavLink, useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, ChevronRight, Shield, ShieldCheck, Sliders, Users } from "lucide-react";

const tabs = [
  { to: "/dashboard/estate/security", label: "Overview", icon: ShieldCheck, end: true },
  { to: "/dashboard/estate/security/team", label: "Team", icon: Users },
  { to: "/dashboard/estate/security/rules", label: "Rules", icon: Shield },
  { to: "/dashboard/estate/security/monitoring", label: "Monitoring", icon: Sliders }
];

export function EstateSecurityShell({
  title,
  eyebrow = "Security Control",
  subtitle,
  children,
  action,
  estates = [],
  estateId = "",
  onEstateChange
}) {
  const navigate = useNavigate();
  const showEstateSelector = Array.isArray(estates) && estates.length > 1 && typeof onEstateChange === "function";
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f9fa] pb-32 font-sans text-[#2b3437]">
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-100 bg-white/90 px-4 backdrop-blur-xl md:px-6">
   <button 
  onClick={() => navigate('/dashboard/estate')} 
  className="rounded-xl p-2 text-[#4955b3] active:bg-indigo-50" 
  aria-label="Go back to Estate Dashboard"
>
  <ArrowLeft size={24} />
</button>
        <h1 className="truncate text-sm font-black uppercase tracking-widest">Estate Security</h1>
        <Link to="/dashboard/notifications" className="relative rounded-xl p-2 text-[#4955b3] active:bg-indigo-50" aria-label="Notifications">
          <Bell size={22} />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
        </Link>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 pt-24 md:px-6">
        <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-[#4955b3]">{eyebrow}</span>
            <h2 className="truncate text-3xl font-black leading-tight text-[#2b3437] md:text-4xl">{title}</h2>
            {subtitle ? <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-slate-500">{subtitle}</p> : null}
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-[18rem]">
            {showEstateSelector ? (
              <label className="block">
                <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-400">Active Estate</span>
                <select
                  value={estateId || ""}
                  onChange={(event) => onEstateChange(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#2b3437] outline-none focus:border-[#4955b3]"
                >
                  {estates.map((estate) => (
                    <option key={estate.id} value={estate.id}>{estate.name || "Estate"}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {action}
          </div>
        </section>

        <nav className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border px-4 text-xs font-black transition ${
                    isActive
                      ? "border-[#4955b3] bg-[#4955b3] text-white shadow-lg shadow-indigo-100"
                      : "border-slate-200 bg-white text-slate-600 active:bg-slate-50"
                  }`
                }
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {children}
      </main>
    </div>
  );
}

export function SecurityStatCard({ icon: Icon, label, value, helper, tone = "indigo" }) {
  const toneClass = tone === "emerald" ? "bg-emerald-50 text-emerald-600" : tone === "rose" ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-[#4955b3]";
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`mb-3 grid h-11 w-11 place-items-center rounded-2xl ${toneClass}`}>
        <Icon size={22} />
      </div>
      <p className="text-2xl font-black text-[#2b3437]">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      {helper ? <p className="mt-2 text-xs font-semibold text-slate-500">{helper}</p> : null}
    </div>
  );
}

export function SecurityPanel({ title, subtitle, children, action }) {
  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-[#2b3437]">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SecurityListLink({ to, icon: Icon, title, subtitle, meta }) {
  return (
    <Link to={to} className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-b-0 active:bg-slate-50">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-[#4955b3]">
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[#2b3437]">{title}</p>
          <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {meta ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">{meta}</span> : null}
        <ChevronRight size={18} className="text-slate-300" />
      </div>
    </Link>
  );
}

export function SecurityToggleRow({ title, subtitle, active, onToggle, busy }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-black text-[#2b3437]">{title}</p>
        <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${active ? "bg-[#4955b3]" : "bg-slate-200"}`}
        aria-pressed={active}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${active ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}
