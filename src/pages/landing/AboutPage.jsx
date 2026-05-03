import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Fingerprint,
  Handshake,
  Lock,
  Network,
  QrCode,
  ShieldCheck,
  Sparkles,
  Zap
} from "lucide-react";
import LandingPageNavbar from "../../components/landing/marketing/sections/LandingPageNavbar";

const missionCards = [
  {
    icon: Network,
    title: "Unified Ecosystem",
    description:
      "Integrating diverse hardware into a single, cohesive software layer for absolute control.",
    tone: "bg-blue-100 text-[#00346f]"
  },
  {
    icon: Fingerprint,
    title: "Privacy-First Data",
    description:
      "Your identity remains yours. We facilitate access without harvesting your private life.",
    tone: "bg-emerald-100 text-emerald-800"
  },
  {
    icon: Zap,
    title: "Zero Friction",
    description:
      "Security should not be a hurdle. We design for a seamless transition from street to suite.",
    tone: "bg-slate-200 text-slate-800"
  }
];

const challengeItems = [
  "Unverified Manual Entry Logs",
  "High Privacy Exposure",
  "Traffic Congestion at Peaks"
];

const footerCompanyLinks = ["Privacy Policy", "Terms of Service", "Cookie Policy"];
const footerSupportLinks = ["Contact Support", "Security Whitepaper"];

export default function AboutPage() {
  return (
    <div className="flex min-h-[105dvh] flex-col overflow-x-hidden bg-[#f8f9fa] font-saas text-slate-900 selection:bg-[#004a99] selection:text-white">
      <LandingPageNavbar />

      <main className="flex-1 pt-24">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute left-[-10%] top-10 h-72 w-72 rounded-full bg-blue-200/45 blur-3xl" />
            <div className="absolute right-[-8%] top-32 h-80 w-80 rounded-full bg-emerald-100/70 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-slate-200/60 blur-3xl" />
          </div>

          <div className="relative mx-auto min-h-[78vh] max-w-7xl overflow-hidden px-6 py-28 md:min-h-[88vh] md:py-36 lg:px-8">
          <div className="grid min-h-[inherit] grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="z-10 lg:col-span-7">
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/85 px-4 py-1.5 font-heading text-xs font-bold uppercase tracking-[0.2em] text-[#001b3f] shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Redefining Access
              </span>
              <h1 className="mb-8 font-heading text-5xl font-extrabold leading-tight tracking-tight text-[#00346f] md:text-7xl">
                Securing the Future of{" "}
                <span className="text-[#004a99]">Modern Living</span>
              </h1>
              <p className="mb-10 max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl">
                We are building the architectural backbone for secure environments,
                where physical boundaries meet digital intelligence.
              </p>
              <div className="mb-10 flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                  Privacy First
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                  Estate Ready
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                  Built in Africa
                </span>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 rounded-[1.5rem] bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] px-8 py-4 font-heading text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/#use-cases"
                  className="rounded-[1.5rem] border border-slate-200 bg-white/90 px-8 py-4 font-heading text-sm font-bold uppercase tracking-[0.16em] text-[#00346f] shadow-sm transition hover:bg-slate-100"
                >
                  See Use Cases
                </Link>
              </div>
            </div>

            <div className="relative lg:col-span-5">
              <div className="absolute inset-0 translate-x-4 translate-y-5 rounded-[2rem] bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] opacity-10 blur-sm" />
              <div className="group relative aspect-square overflow-hidden rounded-[2rem] border border-white/40 shadow-[0_40px_100px_rgba(15,23,42,0.18)]">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAP74pdp7ViUplYQlRkNTFbvDAYApy36FVn8lQlyvhxBiPHemkVBTtnruEvLfkffdBxUy35RHSMnd5AlQ-XxMG1WXINsmK5bwAeA_hlY-jeXyNYY1DeimeD4m280tnOT_gfP6uxt9hWBZk7Atj1FPDV6UwBV2TLl7Yfdp6D1LJdlO1lF2VOdfUrQFKjgfr9tLbqoLirklqTxgpfz0alDF8WoykYRaZIe8W5r4q4aabG8dhDJalqXum_gj4mMMs0yR9DB5P3vSL4ZTkc"
                  alt="Ultra-modern architectural facade"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[#00346f]/10 mix-blend-multiply" />
              </div>

              <div className="absolute -bottom-6 -left-2 max-w-[220px] rounded-[2rem] border border-emerald-200/70 bg-emerald-100/95 p-6 shadow-xl backdrop-blur sm:-left-6 sm:p-8">
                <ShieldCheck className="mb-4 h-10 w-10 text-emerald-800" />
                <p className="font-heading text-sm font-extrabold leading-tight text-emerald-900">
                  Trust Built Into Every Interaction
                </p>
              </div>
            </div>
          </div>
          </div>
        </section>

        <section className="bg-slate-100 px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-20 text-center">
              <h2 className="mb-6 font-heading text-3xl font-bold text-[#00346f] md:text-5xl">
                Our Mission
              </h2>
              <p className="mx-auto max-w-4xl text-2xl font-light leading-snug text-slate-600 md:text-3xl">
                &quot;Bridging the gap between physical security and digital convenience
                through intentional design.&quot;
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {missionCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.title}
                    className="rounded-[2rem] border border-slate-200/60 bg-white/95 p-10 shadow-[0_20px_60px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
                  >
                    <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl ${card.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-4 font-heading text-xl font-bold text-[#00346f]">
                      {card.title}
                    </h3>
                    <p className="leading-relaxed text-slate-600">{card.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="flex flex-col justify-between rounded-[2rem] border border-rose-100 bg-[linear-gradient(180deg,rgba(255,241,242,0.95),rgba(255,247,247,0.9))] p-8 shadow-[0_20px_60px_rgba(15,23,42,0.04)] md:p-12 lg:col-span-5">
              <div>
                <span className="mb-4 block font-heading text-xs font-bold uppercase tracking-[0.2em] text-rose-700">
                  The Challenge in Nigeria
                </span>
                <h3 className="mb-6 font-heading text-3xl font-bold text-[#00346f]">
                  The Gatekeeping Gap
                </h3>
                <p className="mb-8 leading-relaxed text-slate-600">
                  For decades, security in Nigerian estates and offices has relied
                  on paper logs: inefficient, prone to data breaches, and creating
                  massive bottlenecks at entrances. These manual gaps are where
                  security fails and privacy dies.
                </p>
              </div>

              <ul className="space-y-4">
                {challengeItems.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-900">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100">
                      <span className="text-sm font-bold text-rose-600">×</span>
                    </span>
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] p-8 text-white shadow-[0_30px_90px_rgba(0,52,111,0.2)] md:p-12 lg:col-span-7">
              <div className="relative z-10">
                <span className="mb-4 block font-heading text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
                  The QRing Response
                </span>
                <h3 className="mb-6 font-heading text-3xl font-bold md:text-4xl">
                  Verified, Private, Efficient.
                </h3>
                <p className="mb-12 max-w-xl text-lg leading-relaxed text-blue-100">
                  Our vision transforms every smartphone into a secure architectural
                  key. Encrypted QR codes ensure that only invited guests enter,
                  with zero data leaks and instant throughput.
                </p>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="rounded-[1.25rem] border border-white/10 bg-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
                    <QrCode className="mb-4 h-7 w-7 text-emerald-200" />
                    <p className="mb-1 text-lg font-bold">Instant Verification</p>
                    <p className="text-sm text-blue-100">
                      Sub-second scan and entry authorization.
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-white/10 bg-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
                    <Lock className="mb-4 h-7 w-7 text-emerald-200" />
                    <p className="mb-1 text-lg font-bold">End-to-End Privacy</p>
                    <p className="text-sm text-blue-100">
                      Anonymized logs for resident protection.
                    </p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-[#004a99]/20 blur-3xl" />
            </div>
          </div>
        </section>



        <section className="px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] px-6 py-12 text-center shadow-[0_35px_100px_rgba(0,52,111,0.22)] sm:px-8 md:px-12 md:py-16 lg:px-16 lg:py-20">
            <div className="relative z-10">
              <h2 className="mb-6 font-heading text-3xl font-bold text-white sm:text-4xl md:mb-8 md:text-5xl">
                Ready to evolve your access?
              </h2>
              <p className="mx-auto mb-10 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base md:mb-12 md:text-lg">
                Join the hundreds of estates and corporate offices already securing
                their future with QRing.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
                <Link
                  to="/signup"
                  className="w-full rounded-[1.5rem] bg-emerald-100 px-6 py-4 font-heading text-xs font-bold uppercase tracking-[0.16em] text-emerald-900 transition hover:scale-105 sm:w-auto sm:px-8 sm:text-sm"
                >
                  Get Started Today
                </Link>
                <Link
                  to="/contact"
                  className="w-full rounded-[1.5rem] border border-white/20 bg-white/10 px-6 py-4 font-heading text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-white/20 sm:w-auto sm:px-8 sm:text-sm"
                >
                  Contact Sales
                </Link>
              </div>
            </div>

            <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-white/5" />
            <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-white/5" />
          </div>
        </section>
      </main>

       <footer className="mt-20 rounded-t-[3rem] bg-slate-50">
             <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-8 pb-[calc(1.75rem+env(safe-area-inset-bottom))] pt-12 md:flex-row">
               <div className="flex flex-col gap-2">
                 <span className="font-heading text-lg font-bold text-slate-950">QRing</span>
                 <p className="text-sm text-slate-500">© 2024 QRing. Architectural Security Systems.</p>
               </div>

               <div className="flex flex-wrap justify-center gap-8">
                 <Link className="text-sm text-slate-500 transition hover:text-blue-700 hover:underline" to="/contact">
                   Privacy Policy
                 </Link>
                 <Link className="text-sm text-slate-500 transition hover:text-blue-700 hover:underline" to="/contact">
                   Terms of Service
                 </Link>
                 <Link className="text-sm text-slate-500 transition hover:text-blue-700 hover:underline" to="/contact">
                   Security Whitepaper
                 </Link>
                 <Link className="text-sm text-slate-500 transition hover:text-blue-700 hover:underline" to="/contact">
                   Contact Support
                 </Link>
               </div>
             </div>
           </footer>



    </div>
  );
}
