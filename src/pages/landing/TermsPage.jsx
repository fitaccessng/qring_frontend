import React from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileCheck2,
  Gavel,
  LockKeyhole,
  QrCode,
  ShieldAlert,
  Smartphone,
  X
} from "lucide-react";
import LandingPageNavbar from "../../components/landing/marketing/sections/LandingPageNavbar";
const legalLinks = [
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms of Service", to: "/terms", active: true },
  { label: "Cookie Policy", to: "/privacy" },
  { label: "Security Whitepaper", to: "/security" },
  { label: "Compliance", to: "/compliance" },
  { label: "Contact", to: "/contact" }
];

const sideNav = [
  ["01. Acceptance", "#acceptance"],
  ["02. User Responsibilities", "#user-responsibilities"],
  ["03. QR Pass Usage", "#qr-pass-usage"],
  ["04. Property Management", "#property-management"],
  ["05. System Liability", "#liability"]
];

export default function TermsPage() {
  return (
    <div className="flex min-h-[105dvh] flex-col overflow-x-hidden bg-[#f8f9fa] font-saas text-slate-900 selection:bg-[#004a99] selection:text-white">
      <LandingPageNavbar />


      <main className="mx-auto w-full max-w-screen-2xl flex-1">
        <section className="bg-[#f8f9fa] px-6 pb-16 pt-20 lg:px-8">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-[#001b3f]">
              <Gavel className="h-4 w-4" />
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.22em]">
                Legal Framework
              </span>
            </div>
            <h1 className="mb-4 font-heading text-5xl font-extrabold leading-[1.05] tracking-[-0.06em] text-[#00346f] md:text-6xl">
              Terms of Service
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Establishing the standards for secure architectural access. These
              terms govern your interaction with the Architectural Sentinel
              ecosystem and QRing access technologies.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm font-medium text-slate-400">
              <span>Effective: October 24, 2024</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>Version 4.2.0</span>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-12 px-6 pb-32 lg:flex-row lg:px-8">
          <aside className="hidden lg:block lg:w-1/4">
            <div className="sticky top-32 rounded-xl bg-slate-100 p-6">
              <h3 className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-[#00346f]">
                Navigation
              </h3>
              <ul className="space-y-4">
                {sideNav.map(([label, href], index) => (
                  <li key={label}>
                    <a
                      href={href}
                      className={`flex items-center gap-2 text-sm transition-colors ${
                        index === 0
                          ? "font-medium text-slate-900 hover:text-[#00346f]"
                          : "font-medium text-slate-500 hover:text-[#00346f]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          index === 0 ? "bg-[#00346f]" : "bg-slate-300"
                        }`}
                      />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="space-y-12 lg:w-3/4">
            <article id="acceptance" className="rounded-xl bg-white p-8 md:p-12">
              <div className="flex items-start gap-6">
                <div className="hidden select-none text-4xl font-black text-slate-200 md:flex">01</div>
                <div>
                  <h2 className="mb-6 font-heading text-2xl font-bold text-[#00346f]">
                    Acceptance of Governance
                  </h2>
                  <p className="mb-6 leading-8 text-slate-600">
                    By accessing or using the Architectural Sentinel platform and
                    the QRing security protocols, you agree to be bound by these
                    Terms of Service. This agreement constitutes a legally binding
                    contract between you and Architectural Sentinel. If you do not
                    agree to these terms, you must immediately cease all access to
                    secured premises governed by our systems.
                  </p>
                  <div className="rounded-lg border-l-4 border-[#00346f] bg-slate-100 p-6">
                    <p className="text-sm font-medium italic text-slate-800">
                      &quot;Security is a collaborative effort. Your continued use
                      of the Sentinel ecosystem signifies your commitment to
                      maintaining the integrity of the perimeter.&quot;
                    </p>
                  </div>
                </div>
              </div>
            </article>

            <article id="user-responsibilities" className="rounded-xl bg-slate-100 p-8 md:p-12">
              <div className="flex items-start gap-6">
                <div className="hidden select-none text-4xl font-black text-slate-200 md:flex">02</div>
                <div className="w-full">
                  <h2 className="mb-6 font-heading text-2xl font-bold text-[#00346f]">
                    User Responsibilities &amp; Integrity
                  </h2>
                  <p className="mb-8 leading-8 text-slate-600">
                    Every resident and authorized guest is a key holder in our
                    digital vault. Maintaining the confidentiality of your access
                    credentials is not just a policy, it is a structural
                    requirement.
                  </p>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-xl bg-white p-6">
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                        <BadgeCheck className="h-5 w-5 text-[#00346f]" />
                      </div>
                      <h4 className="mb-2 font-bold text-[#00346f]">Resident Obligations</h4>
                      <p className="text-xs leading-6 text-slate-600">
                        Residents must ensure guest passes are issued only to
                        verified individuals. Unauthorized sharing of resident-level
                        QR codes is grounds for immediate credential revocation.
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-6">
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                        <Smartphone className="h-5 w-5 text-[#016b54]" />
                      </div>
                      <h4 className="mb-2 font-bold text-[#00346f]">Device Security</h4>
                      <p className="text-xs leading-6 text-slate-600">
                        Users are responsible for securing the device used to
                        generate QR passes. Strong passcodes or biometric locks are
                        mandated for the Sentinel mobile application.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article id="qr-pass-usage" className="relative overflow-hidden rounded-xl bg-[#00346f]">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcPzMJoNrCgL_O953dKYT7u2qqa_r0XMQcdYXghjjZcOhxDgLidv0YyxOczZdUW1_hjJlN6KiLsFH4sIDfT98xEYMnzIOSwQ8R4P4fKqEKo8J4j3NL6q8eLiKCcpE_vkGhvZ_MtnXZP7kryze6pqU-8XDAdu83OzmfsSBhxRf8Ax5nsjsVWxUSdKgobsypXSDiI-dQQja9SXsxLekdAUXJwltmwUgZvD0Gr8DJyZeLGxk7FGRIElOJ3enYfNCGjjB9X38AOtfs7hW4"
                alt="Modern architectural corridor"
                className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-overlay"
              />
              <div className="relative z-10 p-8 md:p-12">
                <div className="flex flex-col items-center gap-12 md:flex-row">
                  <div className="md:w-2/3">
                    <div className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
                      Section 03
                    </div>
                    <h2 className="mb-6 font-heading text-3xl font-bold text-white">
                      QR Pass Protocols
                    </h2>
                    <p className="leading-8 text-blue-100">
                      Our proprietary QRing encryption ensures that every pass is
                      unique, time-bound, and geographically locked.
                      <br />
                      <br />
                      • <strong>One-Pass Rule:</strong> Each guest QR code is valid
                      for a single entry and exit event unless otherwise specified
                      as a multi-access pass.
                      <br />
                      • <strong>Time Windows:</strong> Passes expire automatically
                      30 minutes after the scheduled arrival time to prevent
                      tailgating and unauthorized lingering.
                    </p>
                  </div>
                  <div className="w-full rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-xl md:w-1/3">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-xl bg-white">
                        <QrCode className="h-16 w-16 text-[#00346f]" />
                      </div>
                      <div className="text-sm font-bold text-white">Active Encryption</div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-blue-200">
                        Sentinel-Standard
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article id="property-management" className="rounded-xl bg-white p-8 md:p-12">
              <div className="flex items-start gap-6">
                <div className="hidden select-none text-4xl font-black text-slate-200 md:flex">04</div>
                <div>
                  <h2 className="mb-6 font-heading text-2xl font-bold text-[#00346f]">
                    Property Manager Authority
                  </h2>
                  <p className="mb-6 leading-8 text-slate-600">
                    Property Managers serve as the ultimate arbiters of the
                    physical space. Under these terms, Property Managers retain the
                    right to:
                  </p>
                  <ul className="grid gap-4 md:grid-cols-2">
                    {[
                      "Instant lock-down procedures",
                      "Audit access logs at any time",
                      "Revoke individual resident access",
                      "Define restricted 'Dark Zones'"
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3 rounded-lg bg-slate-100 p-3">
                        <CheckCircle2 className="h-4 w-4 text-[#016b54]" />
                        <span className="text-sm font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>

            <article id="liability" className="rounded-xl bg-slate-200 p-8 md:p-12">
              <div className="flex items-start gap-6">
                <div className="hidden select-none text-4xl font-black text-slate-300 md:flex">05</div>
                <div>
                  <h2 className="mb-6 font-heading text-2xl font-bold text-[#00346f]">
                    System Liability
                  </h2>
                  <p className="mb-6 italic leading-8 text-slate-600">
                    WHILE ARCHITECTURAL SENTINEL EMPLOYS INDUSTRY-LEADING ENCRYPTION
                    AND PHYSICAL SECURITY CONTROLS, NO SYSTEM IS IMPERTURBABLE.
                  </p>
                  <p className="leading-8 text-slate-600">
                    We shall not be liable for any indirect, incidental, or
                    consequential damages arising from unauthorized physical access
                    if such access was gained through theft of a user&apos;s mobile
                    device or negligent sharing of credentials. Our liability is
                    strictly limited to the restoration of digital services in the
                    event of a platform-wide outage.
                  </p>
                </div>
              </div>
            </article>

            <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-[#00346f]/5 bg-white/80 p-6 shadow-2xl backdrop-blur-xl md:flex-row">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 animate-pulse">
                  <FileCheck2 className="h-5 w-5 text-[#016b54]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#00346f]">Status: Legally Compliant</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    End-to-End Governance Active
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="rounded-xl bg-[#00346f] px-8 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#004a99]"
              >
                Download PDF Full Policy
              </button>
            </div>
          </div>
        </div>
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
