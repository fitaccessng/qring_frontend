import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DoorOpen,
  Home,
  HousePlus,
  MessageSquareMore,
  QrCode,
  ScanLine,
  ShieldCheck,
  Star,
  Video,
  XCircle
} from "lucide-react";
import LandingPageNavbar from "../../components/landing/marketing/sections/LandingPageNavbar";

const steps = [
  {
    icon: ScanLine,
    title: "1. Scan",
    description:
      "Visitor scans your permanent or temporary QR code at the gate terminal or entryway.",
    accent: "bg-blue-100 text-blue-800"
  },
  {
    icon: BellRing,
    title: "2. Alert",
    description:
      "Get an instant push notification on your mobile device with a live video feed of the visitor.",
    accent: "bg-emerald-100 text-emerald-800"
  },
  {
    icon: DoorOpen,
    title: "3. Approve",
    description:
      "Approve entry with a single tap or communicate via encrypted two-way audio instantly.",
    accent: "bg-slate-900 text-white"
  }
];

const featureCards = [
  {
    icon: Video,
    title: "Live Visitor Alerts",
    description:
      "Real-time notification as soon as a visitor approaches your access point."
  },
  {
    icon: MessageSquareMore,
    title: "Real-Time Communication",
    description:
      "Crystal clear two-way audio to give instructions or verify identity."
  },
  {
    icon: QrCode,
    title: "QR Code Access",
    description:
      "Generate unique, timed codes for contractors or regular visitors."
  },
  {
    icon: Clock3,
    title: "Visitor History",
    description:
      "Searchable logs with timestamps and photos of all past entrants."
  },
  {
    icon: CalendarDays,
    title: "Scheduled Visitors",
    description:
      "Automate access for housekeepers or recurring delivery services."
  },
  {
    icon: ShieldCheck,
    title: "Privacy Protection",
    description:
      "Military-grade encryption helps keep your data, audio, and approvals private."
  }
];

const useCases = [
  {
    title: "Luxury Estates",
    description:
      "Manage multiple gates and entry points from a single dashboard.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCcqdhP158DlA6bBrJ9q8d5MwG2PbdoIpKFPARk4yYcHgf_oeSQ-FrC6pU-YuDm8ElLxnQFQ8fmxksSFxwSCVFKH_aOZB-XeELw2kh5N9DgU8LrVWjjQWucfydUE_k29bfdSgSfKCvbY56EjLdYbKa6Ctb8sNoiO7qdKEmaqn2le49wfWexJBLCcpeO8pVMBUtuSULQZhvubUYfzb4RqC0FqGgOGERlQ43QNKMyXdErnr_BCkkU3l1HhNqQJ_oqAKgnjH9leHmTeSAQ",
    size: "md:col-span-8"
  },
  {
    title: "Airbnb Hosts",
    description:
      "Zero-hassle check-ins for guests without physical key exchanges.",
    icon: HousePlus,
    tone: "bg-[#0e4f9e]"
  },
  {
    title: "Busy Professionals",
    description:
      "Never miss a critical delivery or maintenance appointment while at work.",
    icon: Home,
    tone: "bg-[#00755d]"
  },
  {
    title: "Modern Families",
    description:
      "Give kids and grandparents easy, phone-free access via personalized QR tags.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAQOq9yDnHdi3EvQjEqnVbpkD8fVfw0wWTguYxmYzGJdxhvc947wpUBskk7YUODB5CECdRP3aFCzBDmhfZDzwg-cLW7YQAvlkBeHwsKAwMwceywbfD8ApNgdhdl6ngtPRqlCYQ9eKWm01e-TlKEIZgCFVU4TiSHW3LqDluQLLDos_LXAudifFVFnzOqP7qH1tWYgV0xTjIjx7fXtbYRVLJpx4l7nWsef-q1167u9Osw-CwM6oL7mmWukaOxEBrhuascgImNd5InY4eG",
    size: "md:col-span-8"
  }
];

const testimonials = [
  {
    quote:
      "QRing changed how I manage my rental property. I no longer have to drive over just to let a guest in or worry about lost keys.",
    name: "Sarah Jenkins",
    role: "Estate Owner"
  },
  {
    quote:
      "The video quality is superb. I can see exactly who is at my gate even at 2 AM. The peace of mind is worth every penny.",
    name: "David Chen",
    role: "Security Consultant"
  }
];

function SectionHeading({ title, subtitle }) {
  return (
    <div className="mx-auto mb-16 max-w-3xl text-center">
      <h2 className="font-heading text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">{subtitle}</p>
      ) : null}
    </div>
  );
}

function VisualUseCaseCard({ title, description, image, size = "md:col-span-4" }) {
  return (
    <article
      className={`${size} group relative min-h-[280px] overflow-hidden rounded-[2rem] bg-slate-950 shadow-[0_30px_80px_rgba(15,23,42,0.18)]`}
    >
      <img
        src={image}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
      <div className="absolute bottom-0 left-0 p-8 text-white">
        <h3 className="font-heading text-2xl font-extrabold tracking-tight">{title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-white/78">{description}</p>
      </div>
    </article>
  );
}

function ToneUseCaseCard({ title, description, icon: Icon, tone }) {
  return (
    <article
      className={`${tone} relative flex min-h-[280px] items-end overflow-hidden rounded-[2rem] p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.14)]`}
    >
      <Icon className="absolute left-8 top-8 h-24 w-24 opacity-15" strokeWidth={1.25} />
      <div className="relative z-10">
        <h3 className="font-heading text-2xl font-extrabold tracking-tight">{title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-white/78">{description}</p>
      </div>
    </article>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-[110dvh] flex-col overflow-x-hidden bg-[#f6f8fb] font-saas text-slate-900">
      <LandingPageNavbar />

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 pb-20 pt-32 md:pb-24">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-8%] top-24 h-72 w-72 rounded-full bg-blue-200/45 blur-3xl" />
            <div className="absolute bottom-0 right-[-5%] h-80 w-80 rounded-full bg-cyan-100/70 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
            <div>


              <h1 className="mt-8 max-w-3xl font-heading text-5xl font-extrabold leading-[1.02] tracking-[-0.06em] text-slate-950 md:text-7xl">
                Control who enters your home{" "}
                <span className="bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] bg-clip-text text-transparent">
                  from anywhere
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 md:text-xl">
                See, talk to, and approve visitors instantly. No calls, no stress,
                no security gaps. The refined standard for modern entry management.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] px-8 py-4 text-sm font-bold uppercase tracking-[0.15em] text-white shadow-[0_20px_40px_rgba(0,52,111,0.22)] transition hover:-translate-y-0.5"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/request-demo"
                  className="rounded-2xl bg-slate-200/80 px-8 py-4 text-sm font-bold uppercase tracking-[0.15em] text-[#00346f] transition hover:bg-slate-300/80"
                >
                  Watch Demo
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-[2rem] bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] opacity-10" />
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/92 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.15)] backdrop-blur">
                <div className="rounded-[1.5rem] bg-slate-100/90 p-4">
                  <div className="flex items-center justify-between rounded-[1.25rem] bg-white px-4 py-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00346f] text-white">
                        <QrCode className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Gate Terminal</p>
                        <p className="text-xs text-slate-500">Visitor scanned QR code</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-blue-700">
                      Now
                    </span>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-lg">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzsSWhvCtru8slljoIbCiZH3yCYaMLk2fnPAJVT3WWeo4UprGNAXPTzWGW1CyDuPXhqzBiaK9uUTUQqw8xCdNljUu3UwLCfLskSgdjWeVLy8w0QaI_N1FI8R2tVORRh-yXniVAzqaJaKvvN_M2tH6k3t05Sc3_o4xGTnCv0JqKnFOHyKsfh7OBsMcVScbWIKDcgDgasNwinDOmn8cI6ti99KjjixMsAKq7P0RFyKCAvD9eRn2EvEXmc9DtBUvioUUIjKXxNQ0tZSnN"
                    alt="Premium door intercom with digital QR display at a modern villa"
                    className="h-56 w-full object-cover"
                  />

                  <div className="bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] p-6 text-white">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <h3 className="font-heading text-xl font-extrabold tracking-tight">
                        Incoming Visitor
                      </h3>
                      <span className="rounded-md bg-emerald-400/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">
                        Live Video
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        className="rounded-2xl bg-emerald-500 py-3 text-xs font-bold uppercase tracking-[0.14em] transition hover:bg-emerald-400"
                      >
                        Approve Access
                      </button>
                      <button
                        type="button"
                        className="rounded-2xl bg-white/15 py-3 text-xs font-bold uppercase tracking-[0.14em] transition hover:bg-white/25"
                      >
                        Deny Entry
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-[#edf1f5] py-24">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading title="Simple. Secure. Seamless." />

            <div className="grid gap-8 md:grid-cols-3">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <article
                    key={step.title}
                    className="rounded-[2rem] bg-white p-10 shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-2"
                  >
                    <div
                      className={`mb-8 flex h-16 w-16 items-center justify-center rounded-[1.25rem] ${step.accent}`}
                    >
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="font-heading text-2xl font-extrabold tracking-tight text-slate-950">
                      {step.title}
                    </h3>
                    <p className="mt-3 leading-7 text-slate-600">{step.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#f6f8fb] py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2">
            <div className="rounded-[2rem] bg-slate-100 p-10 md:p-12">
              <h3 className="font-heading text-3xl font-extrabold tracking-tight text-slate-500">
                Traditional Intercoms
              </h3>
              <ul className="mt-8 space-y-6">
                {[
                  ["Missed gate calls", "Never home when deliveries or guests arrive at the gate."],
                  ["Security guessing access", "Vague buzzing systems lead to unauthorized entry risks."],
                  ["Sharing phone numbers", "Giving personal contact info to delivery drivers for access."]
                ].map(([title, text]) => (
                  <li key={title} className="flex items-start gap-4">
                    <XCircle className="mt-1 h-5 w-5 text-rose-600" />
                    <div>
                      <p className="font-bold text-slate-900">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[2rem] bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] p-10 text-white shadow-[0_30px_90px_rgba(0,52,111,0.22)] md:p-12">
              <h3 className="font-heading text-3xl font-extrabold tracking-tight">
                The QRing Standard
              </h3>
              <ul className="mt-8 space-y-6">
                {[
                  ["Instant mobile alerts", "Full control from your pocket, whether you're in the garden or abroad."],
                  ["Direct communication", "Encrypted HD audio and video to verify every single guest."],
                  ["Full visitor history", "A digital log of every scan, photo, and access event for total peace of mind."]
                ].map(([title, text]) => (
                  <li key={title} className="flex items-start gap-4">
                    <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-300" />
                    <div>
                      <p className="font-bold">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-white/75">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="features" className="bg-[#edf1f5] py-24">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading
              title="Enterprise-Grade Home Security"
              subtitle="Advanced features designed for reliability and polished day-to-day control."
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featureCards.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className="rounded-[1.75rem] bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.05)] transition duration-300 hover:shadow-[0_25px_70px_rgba(15,23,42,0.1)]"
                  >
                    <Icon className="mb-5 h-8 w-8 text-[#00346f]" />
                    <h3 className="font-heading text-xl font-extrabold tracking-tight text-slate-950">
                      {feature.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="use-cases" className="bg-[#f6f8fb] py-24">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading title="Built for every lifestyle" />

            <div className="grid gap-6 md:grid-cols-12">
              <VisualUseCaseCard {...useCases[0]} />
              <div className="md:col-span-4">
                <ToneUseCaseCard {...useCases[1]} />
              </div>
              <div className="md:col-span-4">
                <ToneUseCaseCard {...useCases[2]} />
              </div>
              <VisualUseCaseCard {...useCases[3]} />
            </div>
          </div>
        </section>

        <section id="social-proof" className="bg-[#edf1f5] py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid items-start gap-12 lg:grid-cols-3">
              <div>
                <h2 className="font-heading text-4xl font-extrabold tracking-tight text-slate-950">
                  Trusted by modern homeowners.
                </h2>
                <p className="mt-4 max-w-md leading-7 text-slate-600">
                  Join over 10,000 users who have upgraded their home security to the
                  QRing standard.
                </p>
                <div className="mt-6 flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className="h-5 w-5 fill-[#00346f] text-[#00346f]"
                    />
                  ))}
                  <span className="ml-2 font-bold text-slate-900">4.9/5 Rating</span>
                </div>
              </div>

              <div className="grid gap-6 lg:col-span-2 md:grid-cols-2">
                {testimonials.map((item) => (
                  <article
                    key={item.name}
                    className="rounded-[2rem] bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
                  >
                    <p className="text-lg italic leading-8 text-slate-600">"{item.quote}"</p>
                    <div className="mt-8 flex items-center gap-4">
                      <div className="h-11 w-11 rounded-full bg-slate-300" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.name}</p>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                          {item.role}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f6f8fb] py-24">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <div className="relative overflow-hidden rounded-[3rem] bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] px-8 py-16 text-white shadow-[0_35px_100px_rgba(0,52,111,0.22)] md:px-16">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.28),transparent_55%)] opacity-30" />
              <div className="relative z-10">
                <h2 className="font-heading text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
                  See . &nbsp; Talk &nbsp; . &nbsp; Approve &nbsp;
                  <br />
                 All from your phone.

                </h2>
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/80">
                  Get started today and experience the future of secure,
                  architectural access management.
                </p>
                <div className="mt-10 flex flex-wrap justify-center gap-4">
                  <Link
                    to="/signup"
                    className="rounded-2xl bg-white px-10 py-4 text-sm font-bold uppercase tracking-[0.15em] text-[#00346f] transition hover:bg-slate-100"
                  >
                    Get Started
                  </Link>
                  <Link
                    to="/request-demo"
                    className="rounded-2xl border border-white/20 bg-white/10 px-10 py-4 text-sm font-bold uppercase tracking-[0.15em] text-white transition hover:bg-white/15"
                  >
                    Request Demo
                  </Link>
                </div>
              </div>
            </div>
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
            <Link className="text-sm text-slate-500 transition hover:text-blue-700 hover:underline" to="/privacy">
              Privacy Policy
            </Link>
            <Link className="text-sm text-slate-500 transition hover:text-blue-700 hover:underline" to="/terms">
              Terms of Service
            </Link>
            <Link className="text-sm text-slate-500 transition hover:text-blue-700 hover:underline" to="/security">
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
