import React from "react";
import { Link } from "react-router-dom";
import {
  Database,
  History,
  LockKeyhole,
  MapPin,
  QrCode,
  ShieldCheck,
  UserRoundCheck
} from "lucide-react";
import LandingPageNavbar from "../../components/landing/marketing/sections/LandingPageNavbar";

const footerLinks = [
  { label: "Privacy Policy", to: "/privacy", active: true },
  { label: "Terms of Service", to: "/terms" },
  { label: "Cookie Policy", to: "/privacy" },
  { label: "Security Whitepaper", to: "/security" },
  { label: "Compliance", to: "/compliance" },
  { label: "Contact", to: "/contact" }
];

export default function PrivacyPage() {
  return (
    <div className="flex min-h-[105dvh] flex-col overflow-x-hidden bg-[#f8f9fa] font-saas text-slate-900">
      <LandingPageNavbar />

      <main className="min-h-[100dvh] flex-1">
        <header className="mx-auto max-w-screen-xl px-6 pb-16 pt-24 text-center lg:px-8">
          <h1 className="mb-6 font-heading text-5xl font-extrabold tracking-[-0.06em] text-[#00346f] md:text-7xl">
            Privacy Policy
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
            Your trust is our foundation. Here is how we protect your information
            through meticulous structural integrity and digital precision.
          </p>
        </header>

        <div className="mx-auto grid max-w-screen-xl grid-cols-1 gap-8 px-6 pb-32 md:grid-cols-12 lg:px-8">
          <aside className="md:col-span-3">
            <div className="sticky top-12 space-y-1 rounded-xl bg-slate-100 p-6">
              <p className="mb-4 font-heading text-[10px] uppercase tracking-[0.22em] text-slate-400">
                On this page
              </p>
              {[
                ["Data Collection", "#data-collection"],
                ["Visitor Logs", "#visitor-logs"],
                ["Resident Information", "#resident-info"],
                ["User Rights", "#user-rights"],
                ["Security Measures", "#security"]
              ].map(([label, href], idx) => (
                <a
                  key={label}
                  href={href}
                  className={`block py-2 text-sm transition-colors ${
                    idx === 0 ? "font-medium text-[#00346f]" : "text-slate-500 hover:text-[#00346f]"
                  }`}
                >
                  {label}
                </a>
              ))}
            </div>
          </aside>

          <article className="rounded-xl bg-white p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.04)] md:col-span-9 md:p-16">
            <section id="data-collection" className="mb-20">
              <div className="mb-6 flex items-center gap-3">
                <Database className="h-6 w-6 text-[#00346f]" />
                <h2 className="font-heading text-3xl font-bold tracking-tight text-[#00346f]">
                  Data Collection
                </h2>
              </div>
              <p className="mb-8 leading-8 text-slate-600">
                At QRing by Architectural Sentinel, we treat your data as the most
                sensitive asset in our vault. We only collect the minimum
                information required to facilitate secure access and maintain the
                integrity of your environment.
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl bg-slate-100 p-6">
                  <h3 className="mb-2 font-heading text-lg font-bold">Direct Collection</h3>
                  <p className="text-sm text-slate-600">
                    Information you provide when creating an account, such as name,
                    email, and property address.
                  </p>
                </div>
                <div className="rounded-xl bg-slate-100 p-6">
                  <h3 className="mb-2 font-heading text-lg font-bold">Automated Collection</h3>
                  <p className="text-sm text-slate-600">
                    Device identifiers, timestamp data, and encrypted entry logs
                    generated during QR scanning events.
                  </p>
                </div>
              </div>
            </section>

            <section id="visitor-logs" className="mb-20">
              <div className="mb-6 flex items-center gap-3">
                <History className="h-6 w-6 text-[#00346f]" />
                <h2 className="font-heading text-3xl font-bold tracking-tight text-[#00346f]">
                  Visitor Logs
                </h2>
              </div>
              <p className="mb-6 leading-8 text-slate-600">
                When a visitor utilizes a QRing point, we record specific metadata
                to ensure the safety of the premises. This includes:
              </p>
              <ul className="space-y-4">
                {[
                  ["The unique ID of the scanned QR code and its expiration status.", QrCode],
                  ["Approximate GPS location of the scan to verify physical presence.", MapPin],
                  ["The precise millisecond timestamp of the entry request.", ShieldCheck]
                ].map(([text, Icon]) => (
                  <li key={text} className="flex items-start gap-4">
                    <Icon className="mt-1 h-4 w-4 text-[#016b54]" />
                    <span className="text-slate-800">{text}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="relative my-20 h-64 overflow-hidden rounded-xl">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGsK8reHvMZ4TV6iRlx79cxAKuH-gQS_arntDT3xEVXK3WamZ1mI7HLqHH0YBFs8mfUrPVmcD4EoB9DGgKoPRVrGwGIKxzWOaqCzypv4iQ_mWccfqtlHNgNxAVTBb8JgySjTr_G3Ftnx5-kGySJXP3VFp22xyLeIIBhFtKNxpNqU4eGcKFfTX6KcsyYIMcW5TMov357wDDROqkYoaXlGHsbsdaTEFXuFdwI1-4NItMCbgzprhdOfIw-5Cvb955CddTGlMqcpJAvsV5"
                alt="Modern minimalist architectural hallway"
                className="h-full w-full object-cover opacity-80 grayscale"
              />
              <div className="absolute inset-0 bg-[#00346f]/20 mix-blend-multiply" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="max-w-md rounded-xl bg-white/90 p-8 text-center backdrop-blur-md">
                  <p className="font-heading text-sm font-bold italic text-[#00346f]">
                    &quot;Security is not a feature; it is the fundamental structure
                    of our existence.&quot;
                  </p>
                </div>
              </div>
            </div>

            <section id="resident-info" className="mb-20">
              <div className="mb-6 flex items-center gap-3">
                <UserRoundCheck className="h-6 w-6 text-[#00346f]" />
                <h2 className="font-heading text-3xl font-bold tracking-tight text-[#00346f]">
                  Resident Information
                </h2>
              </div>
              <p className="leading-8 text-slate-600">
                We prioritize the anonymity of residents. Personal data such as unit
                numbers and contact details are encrypted at rest using AES-256
                standards. Our administrators do not have access to plain-text
                resident credentials without explicit multi-factor authorization
                from the account holder.
              </p>
            </section>

            <section id="user-rights" className="mb-20">
              <div className="mb-6 flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-[#00346f]" />
                <h2 className="font-heading text-3xl font-bold tracking-tight text-[#00346f]">
                  User Rights
                </h2>
              </div>
              <p className="leading-8 text-slate-600">
                Residents and account owners may request access, export, and
                correction of relevant records maintained within the Sentinel
                platform, subject to security validation and legal retention
                obligations.
              </p>
            </section>

            <section id="security" className="mb-20">
              <div className="mb-6 flex items-center gap-3">
                <LockKeyhole className="h-6 w-6 text-[#016b54]" />
                <h2 className="font-heading text-3xl font-bold tracking-tight text-[#00346f]">
                  Security Measures
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ["Zero Trust", "Every access request is verified as if it originated from an untrusted network."],
                  ["End-to-End", "Encryption from the QR scan point to the resident's mobile alert interface."],
                  ["Regular Audits", "Third-party penetration testing performed quarterly to ensure vault integrity."]
                ].map(([title, body]) => (
                  <div key={title} className="rounded-xl border-l-4 border-[#016b54] bg-slate-200 p-6">
                    <h4 className="mb-2 font-heading text-sm font-extrabold uppercase tracking-[0.18em] text-[#00346f]">
                      {title}
                    </h4>
                    <p className="text-xs leading-6 text-slate-600">{body}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-32 rounded-2xl bg-[#00346f] p-12 text-white">
              <h3 className="mb-4 font-heading text-2xl font-bold">
                Questions about your data?
              </h3>
              <p className="mb-8 max-w-lg text-blue-100">
                Our dedicated Privacy Office is available to discuss our structural
                security measures and your data rights.
              </p>
              <Link
                to="/contact"
                className="inline-flex rounded-xl bg-white px-8 py-4 font-heading text-xs font-bold uppercase tracking-[0.18em] text-[#00346f] transition hover:bg-slate-100"
              >
                Contact Privacy Office
              </Link>
            </div>
          </article>
        </div>
      </main>



         <footer className="mt-20 rounded-t-[3rem] bg-slate-50">
              <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-8 py-12 md:flex-row">
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
