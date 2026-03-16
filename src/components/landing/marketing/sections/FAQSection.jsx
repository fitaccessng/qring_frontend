import { useMemo, useState } from "react";

const defaultFaqs = [
  {
    q: "Do homeowners and residents need to download an app?",
    a: "Homeowners can approve from their phone, and estates can operate from the dashboard. Visitors just scan a QR code at the gate.",
  },
  {
    q: "What hardware is required at the gate?",
    a: "QRing works with a standard smartphone or tablet for security. No expensive hardware required to get started.",
  },
  {
    q: "How fast is approval?",
    a: "Approvals happen in realtime. The homeowner gets notified immediately and the guard sees the decision right away.",
  },
  {
    q: "Can we export visitor logs?",
    a: "Yes. Estates and property managers can access visitor history for audits, reporting, and incident review.",
  },
];

export default function FAQSection({ faqs = defaultFaqs }) {
  const items = useMemo(() => faqs, [faqs]);
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section id="faq" className="bg-slate-50 py-16 dark:bg-slate-900/20 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">FAQ</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">Common questions, answered</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
              If you are evaluating QRing for your estate, this is a good place to start.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-3 shadow-soft dark:border-slate-800 dark:bg-slate-950">
            {items.map((item, idx) => {
              const open = openIdx === idx;
              return (
                <div key={item.q} className={idx === 0 ? "" : "border-t border-slate-200/70 dark:border-slate-800"}>
                  <button
                    type="button"
                    onClick={() => setOpenIdx((prev) => (prev === idx ? -1 : idx))}
                    className="flex w-full items-center justify-between gap-4 rounded-3xl px-4 py-4 text-left"
                    aria-expanded={open}
                  >
                    <span className="text-sm font-semibold tracking-tight text-slate-950 dark:text-white">{item.q}</span>
                    <span
                      className={[
                        "grid h-9 w-9 shrink-0 place-items-center rounded-2xl border text-sm font-bold transition",
                        open
                          ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-slate-800 dark:bg-slate-900 dark:text-brand-100"
                          : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      {open ? "–" : "+"}
                    </span>
                  </button>

                  <div className={open ? "px-4 pb-5" : "hidden"}>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

