import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTheme } from "../../state/ThemeContext";
import BrandMark from "../../components/BrandMark";

const navItems = [
  { title: "Home", href: "/" },
  { title: "About", href: "/about" },
  { title: "Pricing", href: "/pricing" },
  { title: "Contact", href: "/contact" }
];

const testimonials = [
  {
    name: "Chukwudi Okafor",
    role: "Homeowner, Abuja",
    quote: "No more missed deliveries. I approve visitors from anywhere, anytime. Game changer."
  },
  {
    name: "Aisha Mohammed",
    role: "Estate Manager, Lekki",
    quote: "Visitor flow is now fast and organized. Security and convenience improved immediately."
  },
  {
    name: "Tunde Alabi",
    role: "Facility Lead, Ibadan",
    quote: "Qring made access control simple for both staff and residents. We see everything in real time."
  },
  {
    name: "Jennifer Adebayo",
    role: "Property Developer, Lagos",
    quote: "The rollout was smooth and residents adopted it quickly. Support has also been excellent."
  }
];

const features = [
  {
    title: "Instant Alerts",
    description: "Get notified the moment a visitor scans your QR code."
  },
  {
    title: "Smart Routing",
    description: "Send visitors to the right door or person automatically."
  },
  {
    title: "Secure",
    description: "Encrypted sessions and strict permissions keep your home safe."
  },
  {
    title: "No App Needed",
    description: "Visitors just use their browser."
  },
  {
    title: "HD Video & Audio Calls",
    description: "Connect instantly and securely."
  },
  {
    title: "Complete Logs & Analytics",
    description: "Track visitor activity and security events over time."
  }
];

const workflow = [
  {
    number: "01",
    title: "Visitor Scans",
    description: "Visitor scans your unique QR code at the gate."
  },
  {
    number: "02",
    title: "System Validates",
    description: "The system checks the QR code and routing permissions."
  },
  {
    number: "03",
    title: "You Approve",
    description: "Get a notification and approve or deny the request instantly."
  },
  {
    number: "04",
    title: "Access Granted",
    description: "Secure chat, voice, or video session starts immediately."
  }
];

export default function LandingPage() {
  const { isDark, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_10%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_88%_92%,rgba(59,130,246,0.12),transparent_40%),#f8fafc] text-slate-900 dark:bg-[radial-gradient(circle_at_12%_10%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_88%_92%,rgba(59,130,246,0.16),transparent_40%),#020617] dark:text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 sm:h-12 sm:w-12 dark:bg-white">
              <BrandMark tone="light" className="h-6 w-6 sm:h-7 sm:w-7 dark:invert-0" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">Qring</h1>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Smart Access Control</p>
            </div>
          </div>

          <div className="hidden items-center gap-8 md:flex lg:gap-10">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href} className="text-sm font-semibold text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                {item.title}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-4 sm:text-sm dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              {isDark ? "Light" : "Dark"}
            </button>
            <Link
              to="/login"
              className="hidden rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 sm:px-6 sm:text-sm sm:inline-block dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Login
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden rounded-lg border border-slate-200 px-3 py-2 text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </nav>

        {sidebarOpen && (
          <div className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:hidden">
            <div className="space-y-1 px-4 py-4 sm:px-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  {item.title}
                </Link>
              ))}
              <Link
                to="/login"
                onClick={() => setSidebarOpen(false)}
                className="block rounded-lg bg-slate-900 px-3 py-2 text-base font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Login
              </Link>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-50 to-white dark:from-slate-900 dark:to-slate-950" />
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-14 lg:px-10 lg:py-24">
            <div className="relative z-10">
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-cyan-700 dark:text-cyan-300">Qring - Smart Door Access for Homes and Estates</p>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">Replace old doorbells with Qring</h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
                Get QR-based visitor access, real-time alerts, and secure video calls - all without complicated hardware.
              </p>

              <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
                <Link to="/signup" className="rounded-lg bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 sm:px-8 sm:py-4">
                  Start Free Trial
                </Link>
                <Link to="/contact" className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 sm:px-8 sm:py-4 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                  Book a Demo
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-4 sm:gap-6">
                <StatBadge value="99.9%" label="Uptime" />
                <StatBadge value="<1s" label="Response" />
                <StatBadge value="24/7" label="Support" />
              </div>
            </div>

            <div className="relative z-10">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <img
                  src="https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1600&q=80"
                  alt="Modern smart estate entrance"
                  className="h-64 w-full object-cover sm:h-72"
                />
                <div className="p-5 sm:p-6">
                  <h3 className="text-lg font-extrabold tracking-tight">Live Activity Example</h3>
                  <div className="mt-4 space-y-3">
                    <ActivityCard title="Visitor scanned QR at Gate A" time="just now" status="active" />
                    <ActivityCard title="Access approved" time="2 min ago" status="success" />
                    <ActivityCard title="Video call started" time="4 min ago" status="complete" />
                    <ActivityCard title="Session ended" time="8 min ago" status="complete" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">Today’s activity: +12%</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-12 sm:py-16 lg:py-20 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="mb-10 text-center sm:mb-12">
              <h3 className="text-3xl font-black tracking-tight sm:text-4xl">Features You’ll Love</h3>
            </div>
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((item) => (
                <FeatureCard key={item.title} title={item.title} description={item.description} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <h3 className="text-3xl font-black tracking-tight sm:text-4xl">How Qring Works</h3>
              <div className="mt-8 space-y-4">
                {workflow.map((step) => (
                  <ProcessStep key={step.number} number={step.number} title={step.title} description={step.description} />
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <img
                src="https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?auto=format&fit=crop&w=1400&q=80"
                alt="Mobile visitor approval workflow illustration"
                className="h-full min-h-[320px] w-full object-cover"
              />
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-12 sm:py-16 lg:py-20 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="mb-10 text-center sm:mb-12">
              <h3 className="text-3xl font-black tracking-tight sm:text-4xl">Platform Stats</h3>
            </div>
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard value="100+" label="Active Users" />
              <MetricCard value="100" label="Monthly Scans" />
              <MetricCard value="94%" label="Approval Rate" />
              <MetricCard value="<1s" label="Average Response Time" />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
          <div className="mb-10 text-center sm:mb-12">
            <h3 className="text-3xl font-black tracking-tight sm:text-4xl">What Our Users Say</h3>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8 lg:p-12 dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-lg font-medium leading-relaxed text-slate-700 sm:text-xl lg:text-2xl dark:text-slate-200">
                "{testimonials[currentTestimonial].quote}"
              </p>
              <div className="mt-6 sm:mt-8">
                <p className="text-lg font-bold sm:text-xl">{testimonials[currentTestimonial].name}</p>
                <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">{testimonials[currentTestimonial].role}</p>
              </div>
            </div>
            <div className="mt-8 flex justify-center gap-2 sm:mt-10">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentTestimonial(i)}
                  className={`h-2 rounded-full transition-all ${i === currentTestimonial ? "w-8 bg-cyan-600" : "w-2 bg-slate-300 dark:bg-slate-600"}`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-900 py-12 sm:py-16 lg:py-20 dark:border-slate-800">
          <div className="mx-auto w-full max-w-4xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">Get Started Today</h2>
            <p className="mt-4 text-base text-slate-300 sm:mt-6 sm:text-xl">
              Join thousands using Qring. Start your free trial - no credit card required.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 sm:mt-10 sm:gap-4">
              <Link to="/signup" className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 sm:px-10 sm:py-4">
                Start Free Trial
              </Link>
              <Link to="/contact" className="rounded-lg border border-slate-700 bg-transparent px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:px-10 sm:py-4">
                Contact Sales
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-slate-400 sm:mt-8 sm:gap-6 sm:text-sm">
              <span>60-day free trial</span>
              <span>Cancel anytime</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10 sm:py-12 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="grid gap-8 sm:gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-black">Qring</span>
              </div>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Qring - Modern door access control for homes and estates.</p>
            </div>

            <FooterColumn
              title="Product"
              links={[
                { to: "/platform", label: "Platform" },
                { to: "/pricing", label: "Pricing" },
                { to: "/security", label: "Security" },
                { to: "/api-docs", label: "API Docs" }
              ]}
            />
            <FooterColumn
              title="Company"
              links={[
                { to: "/about", label: "About" },
                { to: "/blog", label: "Blog" },
                { to: "/careers", label: "Careers" },
                { to: "/contact", label: "Contact" }
              ]}
            />
            <FooterColumn
              title="Legal"
              links={[
                { to: "/privacy", label: "Privacy" },
                { to: "/terms", label: "Terms" },
                { to: "/compliance", label: "Compliance" }
              ]}
            />
          </div>

          <div className="mt-10 border-t border-slate-200 pt-6 text-center text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
            <p>2026 Qring Technologies. All rights reserved.</p>
            <p className="mt-1">techspareng.online</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <h4 className="text-sm font-semibold uppercase tracking-wider">{title}</h4>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.label}>
            <Link to={link.to} className="text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatBadge({ value, label }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-900">
      <p className="text-2xl font-black sm:text-3xl">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">{label}</p>
    </div>
  );
}

function ActivityCard({ title, time, status }) {
  const statusColors = {
    active: "border-cyan-300 bg-cyan-50 dark:border-cyan-700 dark:bg-cyan-900/20",
    success: "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20",
    complete: "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
  };

  return (
    <div className={`flex items-center justify-between rounded-lg border p-3 ${statusColors[status]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{time}</span>
    </div>
  );
}

function FeatureCard({ title, description }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 transition hover:shadow-lg sm:p-8 dark:border-slate-700 dark:bg-slate-900">
      <h4 className="text-xl font-bold">{title}</h4>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
    </article>
  );
}

function ProcessStep({ number, title, description }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-cyan-600 text-sm font-black text-white">
        {number}
      </div>
      <h4 className="text-lg font-bold">{title}</h4>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
    </article>
  );
}

function MetricCard({ value, label }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 text-center sm:p-8 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-3xl font-black sm:text-4xl">{value}</p>
      <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">{label}</p>
    </article>
  );
}
