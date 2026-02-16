import { NavLink } from "react-router-dom";

const modes = [
  { key: "message", label: "Messages" },
  { key: "audio", label: "Audio" },
  { key: "video", label: "Video" }
];

export default function SessionModeNav({ sessionId }) {
  return (
    <>
      <aside className="hidden lg:col-span-3 lg:block">
        <section className="sticky top-6 rounded-3xl border border-slate-200/80 bg-white/85 p-4 shadow-soft backdrop-blur">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Session Pages</p>
          <nav className="space-y-2">
            {modes.map((item) => (
              <NavLink
                key={item.key}
                to={`/session/${sessionId}/${item.key}`}
                className={({ isActive }) =>
                  `block rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </section>
      </aside>

      <nav className="fixed bottom-3 left-1/2 z-30 w-[min(96vw,520px)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-soft backdrop-blur lg:hidden">
        <div className="grid grid-cols-3 gap-2">
          {modes.map((item) => (
            <NavLink
              key={item.key}
              to={`/session/${sessionId}/${item.key}`}
              className={({ isActive }) =>
                `rounded-xl px-2 py-2 text-center text-xs font-semibold ${
                  isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
