import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTheme } from "../../state/ThemeContext";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import BrandMark from "../../components/BrandMark";
import { getBillingPlans } from "../../services/paymentService";

const NAIRA = "\u20A6";

const navItems = [
  { title: "Home", href: "/" },
  { title: "About", href: "/about" },
  { title: "Pricing", href: "/pricing" },
  { title: "Contact", href: "/contact" }
];

const testimonials = [
  {
    name: "Aisha Mohammed",
    role: "Estate Manager, Lekki Gardens",
    quote: "Reduced unauthorized entries by 87%. Our residents feel safer and love the convenience."
  },
  {
    name: "Chukwudi Okafor",
    role: "Homeowner, Abuja",
    quote: "No more missed deliveries. I approve visitors from anywhere, anytime. Game changer."
  },
  {
    name: "Jennifer Adebayo",
    role: "Property Developer",
    quote: "Deployed across 15 properties. The ROI is undeniable and tenants now expect this."
  }
];

export default function LandingPage() {
  const { isDark, toggleTheme } = useTheme();
  const [pricingMode, setPricingMode] = useState("monthly");
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pricingPlans, setPricingPlans] = useState([]);
  const [pricingError, setPricingError] = useState("");

  const hero = useScrollReveal();
  const features = useScrollReveal();
  const process = useScrollReveal();
  const stats = useScrollReveal();
  const testimonial = useScrollReveal();
  const pricing = useScrollReveal();
  const integration = useScrollReveal();
  const cta = useScrollReveal();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadPlans() {
      setPricingError("");
      try {
        const rows = await getBillingPlans();
        if (!active) return;
        const normalized = normalizeLandingPlans(rows);
        setPricingPlans(normalized);
      } catch (err) {
        if (!active) return;
        setPricingPlans([]);
        setPricingError(err?.message ?? "Unable to load pricing plans.");
      }
    }
    loadPlans();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
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
        <section
          ref={hero.ref}
          className={`mx-auto w-full max-w-7xl px-4 py-12 transition-all duration-700 sm:px-6 sm:py-16 lg:px-10 lg:py-24 ${
            hero.visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-slate-400" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-900 dark:bg-white" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">Live System</span>
              </div>

              <h2 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:mt-8 lg:text-6xl xl:text-7xl">
                Modern Door
                <br />
                Access Control
              </h2>

              <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg lg:mt-6 lg:text-xl dark:text-slate-300">
                Qring replaces outdated doorbells with QR-powered realtime communication, visitor verification, and secure video sessions.
              </p>

              <div className="mt-8 flex flex-wrap gap-3 sm:gap-4 lg:mt-10">
                <Link to="/signup" className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:px-8 sm:py-4 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                  Start Free Trial
                </Link>
                <Link to="/contact" className="rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 sm:px-8 sm:py-4 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900">
                  Book Demo
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-4 sm:gap-6 lg:mt-12">
                <StatBadge value="99.9%" label="Uptime" />
                <StatBadge value="<1s" label="Response" />
                <StatBadge value="24/7" label="Support" />
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-500" />
                    <div className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-500" />
                    <div className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-500" />
                    <span className="ml-auto text-xs font-semibold text-slate-600 dark:text-slate-300">Live Activity</span>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <div className="space-y-3">
                    <ActivityCard title="Visitor request at Gate A" time="Just now" status="active" />
                    <ActivityCard title="Access approved" time="2m ago" status="success" />
                    <ActivityCard title="Video call established" time="4m ago" status="complete" />
                    <ActivityCard title="Session ended" time="8m ago" status="complete" />
                  </div>

                  <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Today's Activity</span>
                      <span className="text-sm font-bold">+12%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div className="h-full w-3/4 bg-slate-900 dark:bg-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          ref={features.ref}
          className={`border-y border-slate-200 bg-slate-50 py-12 transition-all duration-700 sm:py-16 lg:py-20 dark:border-slate-800 dark:bg-slate-900/40 ${
            features.visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="mb-10 text-center sm:mb-12 lg:mb-16">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Features</span>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:mt-4 lg:text-5xl">Everything You Need</h2>
            </div>

            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              <FeatureBlock icon="Alert" title="Instant Notifications" description="Get realtime alerts the moment someone scans your QR code." />
              <FeatureBlock icon="Route" title="Smart Routing" description="Automatically direct visitors to the right person and door." />
              <FeatureBlock icon="Secure" title="Strong Security" description="JWT auth, encrypted sessions, and strict permission controls." />
              <FeatureBlock icon="Web" title="No App Required" description="Visitors use their browser with zero friction." />
              <FeatureBlock icon="Call" title="HD Video Calls" description="Reliable WebRTC video and audio visitor sessions." />
              <FeatureBlock icon="Logs" title="Complete Analytics" description="Track visitor patterns and security events over time." />
            </div>
          </div>
        </section>

        <section
          ref={process.ref}
          className={`mx-auto w-full max-w-7xl px-4 py-12 transition-all duration-700 sm:px-6 sm:py-16 lg:px-10 lg:py-20 ${
            process.visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="mb-10 text-center sm:mb-12 lg:mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Process</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:mt-4 lg:text-5xl">How It Works</h2>
          </div>

          <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4">
            <ProcessStep number="01" title="Visitor Scans" description="Visitor scans a unique QR code at the entry point." />
            <ProcessStep number="02" title="System Validates" description="Backend verifies code and checks routing permissions." />
            <ProcessStep number="03" title="You Approve" description="You receive an alert and approve or deny the request." />
            <ProcessStep number="04" title="Access Granted" description="Secure chat, voice, or video session opens immediately." />
          </div>
        </section>

        <section
          ref={stats.ref}
          className={`border-y border-slate-200 bg-slate-50 py-12 transition-all duration-700 sm:py-16 lg:py-20 dark:border-slate-800 dark:bg-slate-900/40 ${
            stats.visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="mb-10 text-center sm:mb-12">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Platform Statistics</span>
              <h3 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:mt-4">Trusted Worldwide</h3>
            </div>

            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard value="24,000+" label="Active Users" />
              <MetricCard value="1.2M" label="Monthly Scans" />
              <MetricCard value="94%" label="Approval Rate" />
              <MetricCard value="<1s" label="Avg Response" />
            </div>
          </div>
        </section>

        <section
          ref={testimonial.ref}
          className={`mx-auto w-full max-w-7xl px-4 py-12 transition-all duration-700 sm:px-6 sm:py-16 lg:px-10 lg:py-20 ${
            testimonial.visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="mb-10 text-center sm:mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Testimonials</span>
            <h3 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:mt-4">What Our Users Say</h3>
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
                  className={`h-2 rounded-full transition-all ${i === currentTestimonial ? "w-8 bg-slate-900 dark:bg-white" : "w-2 bg-slate-300 dark:bg-slate-600"}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* <section
          ref={pricing.ref}
          className={`border-y border-slate-200 bg-slate-50 py-12 transition-all duration-700 sm:py-16 lg:py-20 dark:border-slate-800 dark:bg-slate-900/40 ${
            pricing.visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:mb-12 sm:flex-row sm:items-center sm:gap-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Pricing</span>
                <h3 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Simple Pricing</h3>
              </div>

              <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setPricingMode("monthly")}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition sm:px-6 ${
                    pricingMode === "monthly" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setPricingMode("yearly")}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition sm:px-6 ${
                    pricingMode === "yearly" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pricingError ? (
                <div className="rounded-2xl border border-danger/30 bg-danger/10 p-5 text-sm text-danger dark:border-danger/30">
                  {pricingError}
                </div>
              ) : pricingPlans.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                  Loading pricing plans...
                </div>
              ) : (
                pricingPlans.map((plan) => (
                <PricingCard
                  key={plan.id}
                  name={plan.name}
                  price={pricingMode === "monthly" ? plan.monthly : plan.yearly}
                  period={pricingMode}
                  note={plan.note}
                  highlight={plan.highlight}
                />
                ))
              )}
            </div>
          </div>
        </section> */}

        {/* <section
          ref={integration.ref}
          className={`mx-auto w-full max-w-7xl px-4 py-12 transition-all duration-700 sm:px-6 sm:py-16 lg:px-10 lg:py-20 ${
            integration.visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Integration</span>
              <h3 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:mt-4">Developer Friendly</h3>
              <p className="mt-4 text-base text-slate-600 sm:mt-6 sm:text-lg dark:text-slate-300">
                Seamless integration with REST APIs, webhooks, and documentation built for fast shipping.
              </p>

              <div className="mt-6 space-y-3 sm:mt-8 sm:space-y-4 lg:mt-10">
                <IntegrationItem icon="API" name="REST API" />
                <IntegrationItem icon="Hook" name="Webhooks" />
                <IntegrationItem icon="Socket" name="WebSocket Events" />
                <IntegrationItem icon="OAuth" name="OAuth 2.0" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 sm:p-6 lg:p-8 dark:border-slate-700">
              <div className="rounded-lg bg-slate-950 p-4 font-mono text-sm sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-slate-400">api.qring.com</span>
                </div>
                <pre className="overflow-x-auto text-xs leading-relaxed text-slate-300">
{`POST /api/v1/sessions/approve
{
  "session_id": "sess_abc123",
  "approved": true,
  "access_duration": 300
}

Response: 200 OK
{
  "status": "approved",
  "door_unlocked": true,
  "expires_at": "2026-02-12T15:30:00Z"
}`}
                </pre>
              </div>
            </div>
          </div>
        </section> */}

        <section
          ref={cta.ref}
          className={`border-y border-slate-200 bg-slate-900 py-12 transition-all duration-700 sm:py-16 lg:py-20 dark:border-slate-800 ${
            cta.visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="mx-auto w-full max-w-4xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">Ready To Get Started?</h2>
            <p className="mt-4 text-base text-slate-300 sm:mt-6 sm:text-xl">
              Join thousands using Qring. Start your free trial today with no credit card required.
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
              <span>14-day free trial</span>
              <span>No credit card needed</span>
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
                {/* <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
                  <BrandMark tone="light" className="h-6 w-6 dark:invert-0" />
                </div> */}
                <span className="text-xl font-black">Qring</span>
              </div>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Modern door access control for homes and estates.</p>
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
    <div className="text-center">
      <p className="text-2xl font-black sm:text-3xl">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">{label}</p>
    </div>
  );
}

function ActivityCard({ title, time, status }) {
  const statusColors = {
    active: "border-slate-900 bg-slate-50 dark:border-slate-400 dark:bg-slate-800",
    success: "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900",
    complete: "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
  };

  return (
    <div className={`flex items-center justify-between rounded-lg border p-3 ${statusColors[status]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{time}</span>
    </div>
  );
}

function FeatureBlock({ icon, title, description }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 transition hover:shadow-lg sm:p-8 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold uppercase tracking-wider dark:border-slate-700 dark:bg-slate-800">
        {icon}
      </div>
      <h4 className="text-xl font-bold">{title}</h4>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
    </article>
  );
}

function ProcessStep({ number, title, description }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-900 bg-white dark:border-white dark:bg-slate-900">
        <span className="text-sm font-black sm:text-base">{number}</span>
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

function PricingCard({ name, price, period, note, highlight }) {
  return (
    <article className={`rounded-xl border bg-white p-6 transition hover:shadow-xl sm:p-8 dark:bg-slate-900 ${highlight ? "border-slate-900 shadow-lg dark:border-white" : "border-slate-200 dark:border-slate-700"}`}>
      {highlight ? (
        <div className="mb-4 inline-block rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white dark:bg-white dark:text-slate-900">
          Popular
        </div>
      ) : null}

      <p className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">{name}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-black sm:text-5xl">
          {NAIRA}
          {formatCurrency(price)}
        </span>
        <span className="text-sm text-slate-600 dark:text-slate-300">/{period === "monthly" ? "mo" : "yr"}</span>
      </div>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{note}</p>

      <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-200">
        <li className="flex items-center gap-2">- Realtime notifications</li>
        <li className="flex items-center gap-2">- QR routing system</li>
        <li className="flex items-center gap-2">- Video and audio calls</li>
        <li className="flex items-center gap-2">- 24/7 support</li>
      </ul>

      <Link
        to="/pricing"
        className={`mt-8 block rounded-lg py-3 text-center text-sm font-semibold transition ${
          highlight
            ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            : "border border-slate-200 text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
        }`}
      >
        Get Started
      </Link>
    </article>
  );
}

function IntegrationItem({ icon, name }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {icon}
        </span>
        <span className="font-semibold">{name}</span>
      </div>
      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
        Ready
      </span>
    </div>
  );
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-NG").format(amount);
}

function normalizeLandingPlans(rows) {
  const plans = Array.isArray(rows) ? rows : [];
  const active = plans.filter((p) => p && p.active !== false);
  const mapped = active.map((plan) => {
    const monthly = Number(plan.amount || 0);
    const yearly = monthly * 12;
    const maxDoors = plan.maxDoors ?? null;
    const maxQr = plan.maxQrCodes ?? null;
    const noteParts = [];
    if (typeof maxDoors === "number") noteParts.push(`Up to ${maxDoors} doors`);
    if (typeof maxQr === "number") noteParts.push(`Up to ${maxQr} QR codes`);
    return {
      id: plan.id,
      name: plan.name ?? plan.id,
      monthly,
      yearly,
      note: noteParts.length ? noteParts.join(" • ") : "Flexible access control plan",
      highlight: false
    };
  });

  // Prefer a sensible default highlight if a common tier exists.
  const highlightId = mapped.some((p) => p.id === "doors_40")
    ? "doors_40"
    : mapped.find((p) => p.monthly > 0)?.id;
  return mapped.map((p) => ({ ...p, highlight: p.id === highlightId }));
}
