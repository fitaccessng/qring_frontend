import React from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  CloudCheck,
  LockKeyhole,
  Map,
  QrCode,
  RefreshCw,
  ShieldCheck,
  TimerReset,
  TriangleAlert
} from "lucide-react";
import LandingPageNavbar from "../../components/landing/marketing/sections/LandingPageNavbar";


const footerLinks = [
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms of Service", to: "/terms" },
  { label: "Cookie Policy", to: "/privacy" },
  { label: "Security Whitepaper", to: "/security", active: true },
  { label: "Compliance", to: "/compliance" },
  { label: "Contact", to: "/contact" }
];

export default function SecurityPage() {
  return (
    <div className="flex min-h-[105dvh] flex-col overflow-x-hidden bg-[#f8f9fa] font-saas text-slate-900 antialiased">
      <LandingPageNavbar />

      <main className="relative flex-1">
        <section className="relative overflow-hidden bg-[#f8f9fa] py-24 md:py-32">
          <div className="relative z-10 mx-auto max-w-screen-2xl px-6 lg:px-8">
            <div className="max-w-3xl">
              <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#00346f]">
                Technical Document 04-22
              </span>
              <h1 className="mb-8 font-heading text-6xl font-extrabold leading-none tracking-[-0.07em] text-[#00346f] md:text-8xl">
                Security Whitepaper
              </h1>
              <p className="max-w-2xl border-l-4 border-[#00346f] pl-6 text-xl font-light leading-relaxed text-slate-600 md:text-2xl">
                The architectural integrity of digital access. A deep dive into
                the protocols governing the QRing ecosystem.
              </p>
            </div>
          </div>

          <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-1/2 opacity-10 lg:block">
            <div className="grid h-full grid-cols-6 gap-1">
              <div className="h-full bg-[#00346f]/20" />
              <div className="h-full bg-[#00346f]/10" />
              <div className="h-full translate-y-12 bg-[#00346f]/30" />
              <div className="h-full -translate-y-8 bg-[#00346f]/20" />
              <div className="h-full translate-y-24 bg-[#00346f]/40" />
              <div className="h-full bg-[#00346f]/15" />
            </div>
          </div>
        </section>

        <section className="bg-slate-100 py-20">
          <div className="mx-auto max-w-screen-2xl px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
              <div className="flex min-h-[400px] flex-col justify-between rounded-xl bg-white p-10 md:col-span-7">
                <div>
                  <LockKeyhole className="mb-6 h-10 w-10 text-[#00346f]" />
                  <h2 className="mb-4 font-heading text-3xl font-bold text-[#00346f]">
                    End-to-End Encryption
                  </h2>
                  <p className="max-w-lg text-lg leading-relaxed text-slate-600">
                    Every access request is encapsulated within a TLS 1.3 tunnel
                    using AES-256-GCM. We employ a Zero-Knowledge Architecture,
                    ensuring that access credentials never persist on any
                    intermediary node.
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap gap-4">
                  {["AES-256-GCM", "RSA-4096", "ZERO-KNOWLEDGE"].map((tag) => (
                    <div key={tag} className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-mono font-medium text-[#00346f]">
                      {tag}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] p-10 text-white md:col-span-5">
                <div className="flex items-start justify-between">
                  <RefreshCw className="h-10 w-10" />
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-60">
                      Cycle Rate
                    </p>
                    <p className="font-mono text-2xl">15s</p>
                  </div>
                </div>
                <div>
                  <h3 className="mb-4 font-heading text-2xl font-bold">QR Rotation Protocol</h3>
                  <p className="text-sm leading-7 text-blue-100">
                    Our proprietary &quot;Temporal Seed&quot; algorithm forces QR
                    regeneration every 15 seconds. This renders screen-captures and
                    physical copies obsolete within seconds of generation.
                  </p>
                </div>
              </div>

              <div className="relative min-h-[300px] overflow-hidden rounded-xl bg-white p-1 md:col-span-5">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA164f6CcgB8zT6sjLyb4KQDHegT17XtaP937rObYbYlUIuwWjaZRJM-DcNViO9ZtL5b6m0G0VNCN6urmooSNAlq-QvexcZ-dbkHZtHUrQxOHIAAyleFJPb8Z_rYiouH1tWlL9XnCuPJrw1-c3RSP3N8GtT5VtQ5ph2w3TL6PESnaCEgvBAuMB8TcWgAld5SjDiPSLTN-UmwHRx_ac9acWCvU5j5I4pMMtC172Lt1FCgFFyV7xDUiTFl5SCSlQehjUeuMK9SeYRb7na"
                  alt="Server infrastructure"
                  className="h-full w-full rounded-lg object-cover opacity-80 transition-opacity hover:opacity-100"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-[#00346f]/20">
                  <div className="rounded-xl border border-white/20 bg-white/90 p-6 backdrop-blur-md">
                    <h4 className="text-center text-sm font-bold uppercase tracking-[0.18em] text-[#00346f]">
                      Global Node Map
                    </h4>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-200 p-10 md:col-span-7">
                <h2 className="mb-6 font-heading text-3xl font-bold text-[#00346f]">
                  Real-Time Monitoring Architecture
                </h2>
                <div className="grid gap-8 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div className="mb-4 h-1 w-12 bg-[#016b54]" />
                    <h4 className="text-lg font-bold">Threat Detection</h4>
                    <p className="text-sm text-slate-600">
                      AI-driven anomaly detection identifies brute-force patterns
                      and suspicious geographic shifts in real-time.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="mb-4 h-1 w-12 bg-[#016b54]" />
                    <h4 className="text-lg font-bold">Audit Trails</h4>
                    <p className="text-sm text-slate-600">
                      Immutable ledger logs for every access event, providing a
                      fully transparent history of site entry and exit.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f8f9fa] py-24">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <article className="max-w-none">
              <h2 className="mb-12 font-heading text-4xl font-extrabold tracking-tight text-[#00346f]">
                Infrastructure Resilience
              </h2>
              <div className="space-y-12">
                <div className="rounded-xl bg-white p-8">
                  <h3 className="mb-4 flex items-center gap-3 text-2xl font-bold">
                    <CloudCheck className="h-6 w-6 text-[#016b54]" />
                    Multi-Region Redundancy
                  </h3>
                  <p className="leading-8 text-slate-600">
                    Our infrastructure is distributed across four distinct
                    geographic regions. In the event of a regional outage, our
                    Sentinel Failover system redirects traffic within 400ms,
                    ensuring that access control remains operational even during
                    large-scale network disruptions.
                  </p>
                </div>

                <div className="border-l-2 border-slate-300 p-8">
                  <h3 className="mb-4 text-2xl font-bold">Verification Latency</h3>
                  <div className="flex flex-col items-end gap-12 md:flex-row">
                    <div className="w-full flex-1">
                      <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                        <span>Current Performance</span>
                        <span>88ms</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full w-[88%] bg-[#016b54]" />
                      </div>
                    </div>
                    <p className="max-w-xs text-sm text-slate-600">
                      We prioritize speed without compromising depth. Our
                      verification handshake occurs at the edge, reducing round-trip
                      time significantly.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-[#00346f] p-8 text-white">
                  <h3 className="mb-6 text-2xl font-bold">Compliance &amp; Certifications</h3>
                  <div className="flex flex-wrap gap-8 opacity-90">
                    {[
                      ["Standard", "SOC2 TYPE II"],
                      ["Regulation", "GDPR COMPLIANT"],
                      ["Protocol", "ISO/IEC 27001"]
                    ].map(([label, value]) => (
                      <div key={value} className="flex flex-col">
                        <span className="mb-1 text-xs uppercase tracking-tight">{label}</span>
                        <span className="text-xl font-bold">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="bg-slate-300 py-20">
          <div className="mx-auto max-w-screen-2xl px-6 text-center lg:px-8">
            <h2 className="mb-6 font-heading text-4xl font-bold text-[#00346f]">
              Ready for the Technical Review?
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-600">
              Speak with our security architects to understand how QRing
              integrates into your existing security stack.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to="/contact"
                className="rounded-xl bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] px-8 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:opacity-90"
              >
                Schedule Consultation
              </Link>
              <button
                type="button"
                className="rounded-xl bg-white px-8 py-4 text-sm font-bold uppercase tracking-[0.18em] text-[#00346f] transition hover:bg-slate-100"
              >
                Full Data Spec
              </button>
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
