import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, PhoneCall, QrCode, ShieldCheck } from "lucide-react";
import LandingPageNavbar from "../../components/landing/marketing/sections/LandingPageNavbar";

const contactChannels = [
  {
    icon: Mail,
    label: "Email Support",
    value: "contact@qring.security"
  },
  {
    icon: PhoneCall,
    label: "Phone Enquiries",
    value: "+234 (0) 800-QRING-SEC"
  },
  {
    icon: MapPin,
    label: "Lagos HQ",
    value: "Architectural Towers, Level 14, Eko Atlantic City, Victoria Island, Lagos, Nigeria"
  }
];

const footerLinks = [
  "Privacy Policy",
  "Terms of Service",
  "Cookie Policy",
  "Contact Support",
  "Security Whitepaper"
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="flex min-h-[105dvh] flex-col overflow-x-hidden bg-[#f8f9fa] font-saas text-slate-900">
      <LandingPageNavbar />

      <main className="flex-1 pb-20 pt-24">
        <section className="mx-auto mb-16 max-w-7xl px-6 lg:px-8">
          <div className="relative flex h-[420px] items-center overflow-hidden rounded-[2rem]">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjjwgI59A98Nt5E8teCH65y3fAmFtgqVnWgt-Iv_RfbYDSSF5cEBlOi1de5gvvjhRrcrOwgwXrpoMqCrwIh7dTt8C9ZdJ51DPJIJ79grZX2ULTc06hqbE37vryrPDpTJwVaLJcSLInqJHwljy8YGBpeOFcQQ9JQP5EFxeTZwo-Q7JRrUsOx3z4W-jml_xT90rpiJ0Aq52PCgRNVs9ElTYbKnYf4D5FAZhMoqjVe8WKQXNSyeMfyqoBpWfcPQrh-mDjeeTHRfIPyjDJ"
              alt="Modern Lagos architecture"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#00346f]/95 to-[#00346f]/45" />
            <div className="relative z-10 max-w-2xl px-8 md:px-12">
              <span className="mb-4 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-emerald-800">
                Contact Our Team
              </span>
              <h1 className="font-heading text-5xl font-extrabold tracking-[-0.06em] text-white md:text-6xl">
                We&apos;re here to help you secure your space.
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-blue-100">
                Experience a new standard of architectural security. Whether
                you&apos;re scaling an enterprise or protecting a private estate,
                our sentinels are ready.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 lg:grid-cols-12 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200/60 bg-white p-8 shadow-sm lg:col-span-7 lg:p-10">
            <h2 className="font-heading text-3xl font-bold text-[#00346f]">
              Send a Message
            </h2>

            <form
              className="mt-8 space-y-6"
              onSubmit={(event) => {
                event.preventDefault();
                setSent(true);
              }}
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field label="Full Name" placeholder="John Doe" />
                <Field
                  label="Email Address"
                  type="email"
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-sm font-semibold text-slate-600">
                  Subject
                </label>
                <select className="w-full rounded-xl border-none bg-slate-100 px-4 py-3.5 text-slate-900 outline-none ring-0 transition focus:ring-2 focus:ring-[#00346f]/30">
                  <option>Sales Inquiry</option>
                  <option>Technical Support</option>
                  <option>Partnership Proposal</option>
                  <option>General Feedback</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-sm font-semibold text-slate-600">
                  Your Message
                </label>
                <textarea
                  rows={5}
                  placeholder="How can we assist you today?"
                  className="w-full rounded-xl border-none bg-slate-100 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-[#00346f]/30"
                  required
                />
              </div>

              {sent ? (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Message received. Our team will reach out shortly.
                </p>
              ) : null}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] py-4 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-lg shadow-blue-900/15 transition hover:scale-[1.01] active:scale-[0.98]"
                >
                  Transmit Message
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-8 lg:col-span-5">
            <div className="group relative overflow-hidden rounded-[2rem] bg-[#00346f] p-8 text-white lg:p-10">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#004a99] opacity-20 blur-3xl transition-all duration-500 group-hover:scale-125" />
              <h3 className="relative z-10 font-heading text-2xl font-bold">
                Direct Channels
              </h3>

              <div className="relative z-10 mt-8 space-y-8">
                {contactChannels.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start space-x-5">
                      <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-md">
                        <Icon className="h-6 w-6 text-emerald-200" />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-blue-200">
                          {item.label}
                        </p>
                        <p className="text-lg font-medium leading-relaxed text-white">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative h-64 overflow-hidden rounded-[2rem] bg-slate-100">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8HojsVCL8FNvDzqQEBMCxbiEKVoHoBjKU_5dKtbfSWCAdoK8RQD3ToiIbSl3LL4hf-RJ0lMtO1farX56AwZ7IrvdY37QfEOHHoAEy-ndNkBzoattz2fixE01apg1Pm1ylQ798jLBcDKmBLoL4weydvyDpR0o6e_mC-gCmhojxBuZg0jLkUMxE9ujsZNOkV3P_eccZLcJnY4_2tjm4V6C-s6V6_F4mcqoVYFQZWiNQI_lBeXD_SytPRM2wTu3t30qKR4IpJbamizZ0"
                alt="Location view of Lagos"
                className="h-full w-full object-cover opacity-50 grayscale transition-all duration-500 hover:grayscale-0"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full bg-white p-4 shadow-2xl">
                  <MapPin className="h-8 w-8 fill-[#00346f] text-[#00346f]" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/30 bg-white/80 px-4 py-3 backdrop-blur-2xl">
                <span className="font-heading text-xs font-bold uppercase tracking-[0.14em] text-[#00346f]">
                  Eko Atlantic Sentinel Hub
                </span>
                <span className="flex items-center text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                  <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  Operational
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
<footer className="mt-20 rounded-t-[3rem] bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-8 py-12 md:flex-row">
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

function Field({ label, placeholder, type = "text" }) {
  return (
    <div className="space-y-2">
      <label className="ml-1 text-sm font-semibold text-slate-600">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        required
        className="w-full rounded-xl border-none bg-slate-100 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-[#00346f]/30"
      />
    </div>
  );
}
