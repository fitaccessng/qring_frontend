import { useEffect, useMemo, useState } from "react";

const defaultTestimonials = [
  {
    name: "Chukwudi Okafor",
    role: "Homeowner, Abuja",
    quote: "Approvals are instant now. I see who is at the gate and respond in seconds — even when I'm in a meeting.",
  },
  {
    name: "Aisha Mohammed",
    role: "Estate Manager, Lekki",
    quote: "We went from manual paper logs to realtime visibility. Our security team finally has full control.",
  },
  {
    name: "Tunde Alabi",
    role: "Facility Lead, Ibadan",
    quote: "QRing unified access control, messaging, and incident logs in one clean dashboard. Game changer.",
  },
];

export default function TestimonialsSection({ testimonials = defaultTestimonials }) {
  const items = useMemo(() => testimonials, [testimonials]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setIdx((i) => (i + 1) % items.length), 5500);
    return () => window.clearInterval(t);
  }, [items.length]);

  const active = items[idx];

  return (
    <section className="bg-slate-950 py-16 text-white sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Trust</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Teams switch because it’s clearer</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">
              The best visitor management system is the one people actually use. QRing keeps the flow simple for guards and homeowners, and gives managers
              the records they need.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-soft">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(36,86,245,0.35),transparent_42%),radial-gradient(circle_at_70%_70%,rgba(31,157,98,0.22),transparent_52%)]" />
            <div className="relative">
              <div className="flex gap-1 text-amber-300">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <span key={i} className="text-lg" aria-hidden="true">
                      ★
                    </span>
                  ))}
              </div>
              <p className="mt-6 text-xl font-semibold leading-relaxed tracking-tight sm:text-2xl">“{active.quote}”</p>
              <div className="mt-8 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{active.name}</p>
                  <p className="text-xs text-white/60">{active.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  {items.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIdx(i)}
                      aria-label={`Testimonial ${i + 1}`}
                      className={[
                        "h-2 rounded-full transition",
                        i === idx ? "w-8 bg-white" : "w-2 bg-white/25 hover:bg-white/40",
                      ].join(" ")}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

