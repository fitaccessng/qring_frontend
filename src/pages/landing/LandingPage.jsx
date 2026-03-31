import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import BrandMark from '../../components/BrandMark';
import { 
  Shield, ArrowRight, Menu, X, CheckCircle2, User, Clock, 
  MapPin, Smartphone, Zap, Lock, AlertCircle, ChevronRight, 
  Bell, FileText, SmartphoneIcon, Users, Database, PieChart,
  QrCode, ScanLine, PhoneCall, Video, ListOrdered, History, LayoutDashboard
} from 'lucide-react';

// --- Shared Animation Variants ---
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

const keyFeatures = [
  {
    icon: QrCode,
    title: 'QR Visitor Check‑in',
    description: 'Visitors request entry by scanning a gate QR—fast, touchless, and consistent.',
  },
  {
    icon: Smartphone,
    title: 'Instant Homeowner Approval',
    description: 'Homeowners approve or deny entry from their phone with one tap.',
  },
  {
    icon: Video,
    title: 'Video Call Verification',
    description: 'Start a quick video call with the visitor for identity confirmation.',
  },
  {
    icon: ListOrdered,
    title: 'Live Visitor Queue',
    description: 'Guards see approved, waiting, and denied visitors in real time.',
  },
  {
    icon: History,
    title: 'Visitor History Logs',
    description: 'Estates track visitor activity with timestamps and searchable records.',
  },
  {
    icon: LayoutDashboard,
    title: 'Multi‑Estate Dashboard',
    description: 'Property managers oversee multiple estates from one control panel.',
  },
];

const estateManagerFeatures = [
  { icon: Users, title: 'Manage residents', description: 'Create units, invite residents, and control roles at scale.' },
  { icon: Bell, title: 'Send announcements', description: 'Broadcast updates to residents in seconds—urgent or scheduled.' },
  { icon: PieChart, title: 'Visitor logs & analytics', description: 'See peak hours, trends, and incidents with exportable reports.' },
  { icon: Shield, title: 'Security guard dashboard', description: 'Give guards a dedicated view for approvals, queues, and shift clarity.' },
  { icon: MapPin, title: 'Manage access points', description: 'Configure gates, checkpoints, and QR entry policies per location.' },
  { icon: FileText, title: 'Digital visitor records', description: 'Keep verifiable, searchable visitor records for compliance and audits.' },
];

function LaptopPreview({ className = 'max-w-2xl' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className={`relative mx-auto w-full ${className}`}
    >
      <div className="absolute -inset-10 -z-10 rounded-[2.75rem] bg-[radial-gradient(circle_at_25%_25%,rgba(37,99,235,0.28),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(59,130,246,0.16),transparent_55%)] blur-2xl" />

      <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/80 bg-white shadow-[0_35px_110px_rgba(2,6,23,0.12)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(37,99,235,0.18),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(59,130,246,0.10),transparent_55%),linear-gradient(180deg,rgba(2,6,23,0.03),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.25] [background-image:linear-gradient(to_right,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:32px_32px]" />

        <div className="relative">
          <div className="flex items-center justify-between border-b border-slate-200/70 bg-white/70 px-5 py-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563eb,rgba(37,99,235,0.35))] shadow-[0_0_22px_rgba(37,99,235,0.35)]">
                <LayoutDashboard className="h-4 w-4 text-white sm:h-[18px] sm:w-[18px]" />
              </div>
              <div className="leading-none">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Built for managers</div>
                <div className="text-sm font-black uppercase tracking-tighter text-slate-900">Estate Dashboard</div>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 sm:flex">
                Lagoon Estate
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-bold text-slate-600 sm:flex">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                Search logs, residents…
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 md:flex">
                Live
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <div className="h-10 w-10 rounded-2xl bg-slate-200 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]" />
            </div>
          </div>

          <div className="grid min-h-[460px] grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
            <div className="hidden border-r border-slate-200/70 bg-white/60 p-5 backdrop-blur md:block">
              <div className="space-y-2">
                {[
                  { label: 'Overview', icon: LayoutDashboard, active: true },
                  { label: 'Residents', icon: Users, active: false },
                  { label: 'Announcements', icon: Bell, active: false },
                  { label: 'Visitor Logs', icon: FileText, active: false },
                  { label: 'Guards', icon: Shield, active: false },
                  { label: 'Access Points', icon: MapPin, active: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
                      item.active
                        ? 'bg-blue-600 text-white shadow-[0_16px_40px_rgba(37,99,235,0.25)]'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <item.icon className={`h-4 w-4 ${item.active ? 'text-white' : 'text-slate-500'}`} />
                      <span className="truncate text-[11px] font-black uppercase tracking-[0.18em]">{item.label}</span>
                    </div>
                    {item.active ? <ChevronRight className="h-3.5 w-3.5 opacity-80" /> : null}
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Today</div>
                  <div className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
                    +12%
                  </div>
                </div>
                <div className="mt-3 text-2xl font-black italic text-slate-900">142</div>
                <div className="mt-1 text-xs font-bold text-slate-500">Total visitors</div>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[68%] rounded-full bg-blue-600" />
                </div>
                <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-3">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                    <span>Active guards</span>
                    <span className="text-slate-900">6</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Overview</div>
                  <div className="mt-2 text-2xl font-black italic uppercase tracking-tighter text-slate-900 sm:text-3xl">
                    Live Ops Snapshot
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-600">Queue status, approvals, and traffic trends—updated in real time.</div>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">
                    Export
                  </div>
                  <div className="rounded-full bg-blue-600 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white shadow-[0_16px_40px_rgba(37,99,235,0.25)]">
                    New Announcement
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {[
                  { t: 'Waiting', v: '9', c: 'bg-amber-500', icon: Clock },
                  { t: 'Approved', v: '27', c: 'bg-emerald-500', icon: CheckCircle2 },
                  { t: 'Denied', v: '2', c: 'bg-rose-500', icon: AlertCircle },
                ].map((kpi) => (
                  <div key={kpi.t} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(2,6,23,0.06)]">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{kpi.t}</div>
                      <div className="flex items-center gap-2">
                        <kpi.icon className="h-4 w-4 text-slate-400" />
                        <div className={`h-2.5 w-2.5 rounded-full ${kpi.c}`} />
                      </div>
                    </div>
                    <div className="mt-3 text-2xl font-black italic text-slate-900 sm:text-3xl">{kpi.v}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">Live queue status</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Traffic</div>
                      <div className="mt-1 text-sm font-black uppercase tracking-tighter text-slate-900">Peak hours</div>
                    </div>
                    <div className="rounded-xl bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
                      7 days
                    </div>
                  </div>
                  <div className="mt-4 h-28 rounded-2xl bg-[linear-gradient(180deg,rgba(37,99,235,0.20),rgba(37,99,235,0.0))] p-3">
                    <div className="flex h-full items-end justify-between gap-2">
                      {[45, 62, 34, 78, 58, 88, 40].map((h, idx) => (
                        <div key={idx} className="flex-1 rounded-xl bg-blue-600/15">
                          <div className="w-full rounded-xl bg-blue-600" style={{ height: `${h}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Avg approval</div>
                      <div className="mt-2 text-lg font-black italic text-slate-900">18s</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Peak window</div>
                      <div className="mt-2 text-lg font-black italic text-slate-900">6–8pm</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Recent activity</div>
                      <div className="mt-1 text-sm font-black uppercase tracking-tighter text-slate-900">Visitor logs</div>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Auto-saved</div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      ['Villa 12A', 'Approved', '10:42', 'bg-emerald-500/10 text-emerald-700'],
                      ['Gate B', 'Waiting', '10:48', 'bg-amber-500/10 text-amber-700'],
                      ['Villa 03C', 'Approved', '10:51', 'bg-emerald-500/10 text-emerald-700'],
                      ['Gate A', 'Denied', '10:55', 'bg-rose-500/10 text-rose-700'],
                    ].map(([where, status, time, badge]) => (
                      <div key={`${where}-${time}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-black uppercase tracking-[0.18em] text-slate-700">{where}</div>
                          <div className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${badge}`}>
                            {status}
                          </div>
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200/70 bg-white/70 px-6 py-4 backdrop-blur-md">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">Multi-estate ready</div>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">
              <span className="hidden sm:inline">Sync: &lt; 150ms</span>
              <span className="text-blue-700">Encrypted records</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-2 h-5 w-[75%] rounded-b-[2.25rem] bg-slate-200 shadow-[0_25px_60px_rgba(2,6,23,0.12)]" />
    </motion.div>
  );
}

// --- Sub-Components ---

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <nav className="flex items-center justify-between px-6 md:px-12 py-6 bg-white/90 border-b border-slate-200 sticky top-0 z-[100] backdrop-blur-md">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <BrandMark tone="light" className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </div>
            <span className="tracking-tighter uppercase font-black text-sm">QRing</span>
          </div>
        <div className="hidden md:flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          {[ "Security", "Pricing", "FAQ"].map((item) => (
            <a
              key={item}
              href={item === "Security" ? "#features" : `#${item.toLowerCase()}`}
              className="hover:text-[#3b82f6] transition-colors"
            >
              {item}
            </a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-full border border-slate-200 bg-white px-5 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="bg-[#2563eb] text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#1d4ed8] transition-all"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-900 shadow-sm active:scale-[0.99]"
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] md:hidden"
          >
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: -16, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -16, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="absolute left-3 right-3 top-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_40px_120px_rgba(2,6,23,0.18)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-200">
                    <BrandMark tone="light" className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Menu</div>
                    <div className="text-sm font-black uppercase tracking-tighter text-slate-900">QRing</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 grid gap-2">
                {[
                  { label: "Security", href: "#features" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "FAQ", href: "#faq" }
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900"
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </a>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-700"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsOpen(false)}
                  className="rounded-2xl bg-[#2563eb] px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-white"
                >
                  Get Started
                </Link>
              </div>

              <p className="mt-3 text-[11px] font-medium text-slate-500">
                QRing facilitates secure visitor access and emergency coordination for estates and homes.
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

const UIPhone = ({ title, description, icon, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.8 }}
    className="flex flex-col items-center"
  >
    <div className="relative w-[240px] sm:w-[280px] h-[520px] sm:h-[580px] bg-[#0a1118] rounded-[3rem] border-[6px] sm:border-[8px] border-[#1e293b] p-3 shadow-2xl mb-8 overflow-hidden">
      {/* Dynamic Screen Content */}
      <div className="bg-white h-full w-full rounded-[2.2rem] overflow-hidden p-5 sm:p-6 text-slate-900 relative">
        <div className="w-20 h-4 bg-slate-100 rounded-full mx-auto mb-8" />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">{icon}</div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase">Live Module</p>
            <p className="text-xs font-black uppercase tracking-tight">{title}</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center px-3 gap-3">
              <div className="w-6 h-6 bg-slate-200 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-2 w-16 bg-slate-200 rounded" />
                <div className="h-1 w-10 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="absolute bottom-6 left-6 right-6 p-4 bg-blue-600 rounded-2xl text-white text-[10px] font-bold text-center uppercase tracking-widest">
          Action Required
        </div>
      </div>
    </div>
    <h3 className="text-xl sm:text-2xl font-black italic mb-2 text-white">{title}</h3>
    <p className="text-white/60 text-sm max-w-[240px] text-center font-medium leading-relaxed">{description}</p>
  </motion.div>
);

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-200">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full py-8 flex justify-between items-center text-left">
        <span className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tighter">{question}</span>
        <motion.div animate={{ rotate: isOpen ? 45 : 0 }} className="text-[#3b82f6]"><X size={24} /></motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="pb-8 text-slate-600 text-lg leading-relaxed max-w-3xl">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function LandingPricingSection() {
  const [pricingCycle, setPricingCycle] = useState('monthly');

  return (
    <section className="py-32 bg-[#071226] text-white px-6" id="pricing">
      <div className="max-w-7xl mx-auto text-center">
        <div className="mb-14">
          <h2 className="text-5xl font-black italic tracking-tighter mb-6 uppercase">Estate Plans</h2>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 p-1 text-[10px] font-black uppercase tracking-widest text-white/90 backdrop-blur">
            {['monthly', 'yearly'].map((cycle) => {
              const active = pricingCycle === cycle;
              return (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setPricingCycle(cycle)}
                  className={[
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 transition',
                    active ? 'bg-white text-[#071226]' : 'text-white/75 hover:text-white',
                  ].join(' ')}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-[#2563eb]' : 'bg-white/40'}`} />
                  {cycle}
                </button>
              );
            })}
          </div>
        </div>

        {(() => {
          const formatPrice = (value) => (typeof value === 'number' ? `₦${value.toLocaleString()}` : value);

          const estatePlans = [
            {
              name: 'Starter Estate',
              tagline: 'Up to 3 houses (trial only, 30 days)',
              monthlyPrice: 0,
              yearlyPrice: 0,
              monthlyPeriod: '/month',
              yearlyPeriod: '/year',
              features: ['Up to 3 houses', 'Full system access (limited scale)', 'Trial only - 30 days'],
              cta: 'Start Free Trial',
            },
            {
              name: 'Estate Basic',
              tagline: 'Up to 10 houses',
              monthlyPrice: 6000,
              yearlyPrice: 72000,
              monthlyPeriod: '/month',
              yearlyPeriod: '/year',
              features: ['Up to 10 houses', 'Realtime alerts', 'Visitor logs', 'Resident management', 'Mobile dashboard'],
              cta: 'Start Basic',
            },
            {
              name: 'Estate Plus',
              tagline: 'Up to 15 houses',
              monthlyPrice: 9000,
              yearlyPrice: 108000,
              monthlyPeriod: '/month',
              yearlyPeriod: '/year',
              features: ['Everything in Basic', 'Visitor scheduling', 'Access time windows', 'Chat + call verification'],
              cta: 'Choose Plus',
            },
            {
              name: 'Estate Growth',
              badge: 'Popular',
              tagline: 'Up to 30 houses',
              monthlyPrice: 18000,
              yearlyPrice: 216000,
              monthlyPeriod: '/month',
              yearlyPeriod: '/year',
              features: ['Everything in Plus', 'Multi-admin roles', 'Analytics dashboard', 'Activity tracking'],
              cta: 'Choose Growth',
            },
            {
              name: 'Estate Pro',
              tagline: 'Up to 50 houses',
              monthlyPrice: 30000,
              yearlyPrice: 360000,
              monthlyPeriod: '/month',
              yearlyPeriod: '/year',
              features: ['Everything in Growth', 'Advanced analytics', 'Security audit logs', 'Role permissions', 'Priority support'],
              cta: 'Start Pro',
            },
            {
              name: 'Enterprise Estate',
              tagline: 'Custom plan for large estates',
              monthlyPrice: 'Custom Pricing',
              yearlyPrice: 'Custom Pricing',
              monthlyPeriod: '',
              yearlyPeriod: '',
              features: ['Unlimited houses', 'SLA + API access', 'Multi-location control', 'Dedicated support'],
              cta: 'Contact Sales',
            },
          ];

          const homeownerPlans = [
            {
              name: 'Free',
              tagline: '1 door',
              monthlyPrice: 'Free',
              yearlyPrice: 'Free',
              monthlyPeriod: '',
              yearlyPeriod: '',
              features: ['1 door', 'Basic notifications', 'Limited logs'],
              cta: 'Get Started Free',
            },
            {
              name: 'Home Pro',
              tagline: 'Smart homeowner controls',
              monthlyPrice: 2500,
              yearlyPrice: 30000,
              monthlyPeriod: '/month',
              yearlyPeriod: '/year',
              highlight: true,
              features: ['Chat + call verification', 'Visitor history', 'Visitor scheduling', 'Advanced notifications'],
              cta: 'Choose Home Pro',
            },
            {
              name: 'Home Premium',
              tagline: 'Advanced access and privacy',
              monthlyPrice: 4500,
              yearlyPrice: 54000,
              monthlyPeriod: '/month',
              yearlyPeriod: '/year',
              features: ['Multiple doors', 'Access time windows', 'Priority support', 'Advanced privacy controls'],
              cta: 'Choose Home Premium',
            },
          ];

          const PricingGrid = ({ plans }) => (
            <div className="grid gap-8 text-left md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={[
                    'relative overflow-hidden rounded-[3rem] border p-10 transition-all',
                    plan.highlight
                      ? 'border-[#2563eb] bg-[linear-gradient(180deg,rgba(37,99,235,0.20),rgba(7,18,38,0.85))] shadow-[0_40px_140px_rgba(37,99,235,0.22)]'
                      : 'border-white/12 bg-white/5',
                  ].join(' ')}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.10),transparent_50%)]" />
                  {plan.badge && (
                    <div className="absolute right-8 top-8 rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#071226]">
                      {plan.badge}
                    </div>
                  )}

                  <div className="relative">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">{plan.name}</h3>
                    <p className="mt-3 text-sm font-medium text-white/70">{plan.tagline}</p>

                    <div className="mt-8 flex items-end gap-3">
                      <div className="text-5xl font-black italic tracking-tighter">
                        {formatPrice(pricingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice)}
                      </div>
                      {(pricingCycle === 'yearly' ? plan.yearlyPeriod : plan.monthlyPeriod) && (
                        <div className="pb-2 text-xs font-black uppercase tracking-widest text-white/50">
                          {pricingCycle === 'yearly' ? plan.yearlyPeriod : plan.monthlyPeriod}
                        </div>
                      )}
                    </div>

                    <ul className="mt-10 space-y-4">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/80">
                          <CheckCircle2 size={14} className="text-[#2563eb]" /> {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className={[
                        'mt-10 w-full rounded-2xl py-4 text-xs font-black uppercase tracking-widest transition-colors',
                        plan.highlight ? 'bg-white text-[#071226] hover:bg-white/90' : 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]',
                      ].join(' ')}
                    >
                      {plan.cta}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );

          return (
            <div>
              <PricingGrid plans={estatePlans} />

              <div className="mt-20 text-center">
                <h3 className="text-4xl font-black italic tracking-tighter mb-6 uppercase">Homeowner Plans</h3>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 p-1 text-[10px] font-black uppercase tracking-widest text-white/90 backdrop-blur">
                  {['monthly', 'yearly'].map((cycle) => {
                    const active = pricingCycle === cycle;
                    return (
                      <button
                        key={cycle}
                        type="button"
                        onClick={() => setPricingCycle(cycle)}
                        className={[
                          'inline-flex items-center gap-2 rounded-full px-4 py-2 transition',
                          active ? 'bg-white text-[#071226]' : 'text-white/75 hover:text-white',
                        ].join(' ')}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-[#2563eb]' : 'bg-white/40'}`} />
                        {cycle}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-12">
                <PricingGrid plans={homeownerPlans} />
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
}

const qrFlowSteps = [
  {
    title: 'Generate QR Code',
    desc: 'Homeowner creates a secure QR access code from the app.',
    icon: QrCode,
  },
  {
    title: 'Place at Gate',
    desc: 'Print or display the QR code at your estate entrance.',
    icon: QrCode,
  },
  {
    title: 'Visitor Scans',
    desc: 'Visitor scans the QR code to request access.',
    icon: ScanLine,
  },
  {
    title: 'Approve + Video Call',
    desc: 'Homeowner verifies and approves with optional video call.',
    icon: PhoneCall,
  },
];

const QRFlowSection = () => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % qrFlowSteps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative py-32 px-6 bg-gradient-to-b from-white to-slate-50 overflow-hidden">
      {/* background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[800px] bg-blue-100/40 blur-3xl rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
        {/* LEFT CONTENT */}
        <div>
          <span className="text-xs uppercase tracking-[0.3em] text-blue-600 font-semibold">
            How it works
          </span>

          <h2 className="mt-6 text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Access control in{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-500 text-transparent bg-clip-text">
              4 simple steps
            </span>
          </h2>

          <p className="mt-6 text-lg text-slate-600">
            QRing simplifies visitor access into a seamless, secure flow—from QR generation to real-time approval.
          </p>

          {/* Steps list */}
          <div className="mt-10 space-y-4">
            {qrFlowSteps.map((step, i) => (
              <div
                key={step.title}
                className={`flex items-start gap-4 p-4 rounded-xl transition ${
                  active === i
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-white border border-slate-200'
                }`}
              >
                <step.icon
                  className={`w-5 h-5 mt-1 ${
                    active === i ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />

                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {step.title}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    {step.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT VISUAL ANIMATION */}
        <div className="relative flex justify-center">
          <div className="relative w-full max-w-sm h-[420px]">
            {qrFlowSteps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                animate={
                  active === i
                    ? { opacity: 1, scale: 1, y: 0 }
                    : { opacity: 0, scale: 0.9, y: 40 }
                }
                transition={{ duration: 0.5 }}
                className="absolute inset-0 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl flex flex-col items-center justify-center text-center"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center text-white mb-6">
                  <step.icon className="w-6 h-6" />
                </div>

                <h3 className="text-lg font-semibold text-slate-900">
                  {step.title}
                </h3>

                <p className="text-sm text-slate-600 mt-3 max-w-xs">
                  {step.desc}
                </p>

                {/* simulated UI */}
                {i === 0 && (
                  <div className="mt-6 w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400">
                    QR CODE
                  </div>
                )}

                {i === 2 && (
                  <div className="mt-6 text-xs text-slate-500">
                    Scanning...
                  </div>
                )}

                {i === 3 && (
                  <div className="mt-6 flex items-center gap-2 text-green-600 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Approved
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default function LandingPage() {
  return (
    <div className="bg-white text-slate-900 selection:bg-[#3b82f6] selection:text-white font-sans antialiased">
      <Navbar />

      <main>
        {/* SECTION 1: HERO */}
        <section className="relative pt-20 pb-32 px-6 text-center overflow-hidden">
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }} transition={{ duration: 10, repeat: Infinity }} className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#2563eb] blur-[140px] rounded-full" />
          <motion.div {...fadeInUp} className="relative z-10 max-w-5xl mx-auto">
            <h1 className="text-6xl md:text-[9.5rem] font-black mb-8 leading-[0.85] tracking-tighter italic">SECURITY<br/>YOU CAN RELY ON</h1>
            <p className="text-slate-600 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium leading-relaxed">The end-to-end encrypted visitor management system for high-security estates and modern complexes.</p>
            <div className="flex flex-col md:flex-row justify-center gap-4">
              <Link to="/signup" className="bg-[#0000FF] text-white px-12 py-5 rounded-full font-black text-xs uppercase tracking-widest shadow-[0_10px_40px_rgba(37,99,235,0.3)]">
                Get Started
              </Link>
              <button className="bg-slate-200 text-black px-12 py-5 rounded-full font-black text-xs uppercase tracking-widest border border-slate-200 hover:bg-slate-200 transition-all">Watch Product Film</button>
            </div>
          </motion.div>
        </section>

        {/* SECTION 2: MOBILE UI PREVIEW (NEW) */}
        <section className="relative isolate py-32 px-6 bg-[#071226] text-white overflow-hidden" id="platform">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[#0000FF] " />
          <div className="max-w-7xl mx-auto text-center mb-24">
            <motion.div {...fadeInUp} className="relative z-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-4">Complete Ecosystem</h2>
              <p className="text-white/60 font-bold uppercase text-[10px] tracking-[0.3em]">One platform. Three powerful interfaces.</p>
            </motion.div>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto grid md:grid-cols-3 gap-16">
            <UIPhone 
              title="Homeowner App" 
              description="Control who enters your home from anywhere.
Receive instant visitor requests, video call Visitor, and approve or reject access in seconds.
Your phone becomes your personal gate control." 
              icon={<Shield className="h-5 w-5 sm:h-6 sm:w-6" />}
              delay={0.1}
            />
            <UIPhone 
              title="Estate Overview" 
              description="See everything happening at your estate in real time.
Track visitor entries, approvals, and security activity from one simple dashboard designed for residents." 
              icon={<SmartphoneIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
              delay={0.2}
            />
            <UIPhone 
              title="Office Dashboard" 
              description="Built for modern workplaces.
Reception teams can manage visitor check-ins, monitor building access, and keep real-time records of everyone entering the office — all from one simple dashboard." 
              icon={<PieChart className="h-5 w-5 sm:h-6 sm:w-6" />}
              delay={0.3}
            />
          </div>
        </section>

       

        {/* SECTION 4: KEY FEATURES */}
     <section className="relative py-32 px-6 bg-gradient-to-b from-white to-slate-50 overflow-hidden" id="features">
  {/* subtle background glow */}
  <div className="absolute inset-0 -z-10">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[800px] bg-blue-100/40 blur-3xl rounded-full" />
  </div>

  <div className="max-w-7xl mx-auto">
    {/* Header */}
    <motion.div {...fadeInUp} className="max-w-3xl">
      <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/70 backdrop-blur px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-blue-700 shadow-sm">
        Key Features
      </span>

      <h2 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
        Built for{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
          every gate shift
        </span>
      </h2>

      <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-2xl">
        QRing unifies verification, approvals, and audit trails into a single intelligent workflow—so guards move faster and residents stay fully in control.
      </p>
    </motion.div>

    {/* Features Grid */}
    <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {keyFeatures.map((f, i) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{
            duration: 0.6,
            delay: i * 0.06,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="group relative rounded-3xl border border-slate-200/70 bg-white/80 backdrop-blur-xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
        >
          {/* glow effect */}
          <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-blue-500/10 to-indigo-500/10 blur-xl" />

          {/* Icon */}
          <div className="relative mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-lg group-hover:scale-105 transition">
            <f.icon className="h-6 w-6" />
          </div>

          {/* Title */}
          <h3 className="relative text-xl font-semibold text-slate-900">
            {f.title}
          </h3>

          {/* Description */}
          <p className="relative mt-3 text-sm leading-relaxed text-slate-600">
            {f.description}
          </p>

          {/* CTA */}
          <div className="relative mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
            Learn more
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </motion.div>
      ))}
    </div>
  </div>
</section>

        {/* SECTION 4: ESTATE MANAGEMENT (PROPERTY MANAGERS) */}
      <section className="relative py-32 px-6 bg-gradient-to-b from-slate-50 to-white overflow-hidden" id="managers">
  {/* Background glow */}
  <div className="absolute inset-0 -z-10">
    <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 h-[500px] w-[900px] bg-blue-100/40 blur-3xl rounded-full" />
  </div>

  <div className="max-w-7xl mx-auto">
    {/* Header */}
    <motion.div {...fadeInUp} className="max-w-3xl">
      <span className="inline-flex items-center rounded-full border border-blue-200 bg-white/80 backdrop-blur px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-blue-700">
        Estate Management
      </span>

      <h2 className="mt-6 text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
        Built for{" "}
        <span className="bg-gradient-to-r from-blue-600 to-indigo-500 text-transparent bg-clip-text">
          modern estate teams
        </span>
      </h2>

      <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
        Manage residents, security workflows, and compliance from a single intelligent dashboard designed for speed and clarity.
      </p>
    </motion.div>

    {/* Dashboard Preview (Hero) */}
    <motion.div {...fadeInUp} className="mt-16 relative">
      <div className="relative rounded-[2.5rem] border border-slate-200/70 bg-white/70 backdrop-blur-xl p-4 shadow-[0_40px_120px_rgba(2,6,23,0.12)]">
        <div className="rounded-[2rem] bg-white overflow-hidden">
          <LaptopPreview className="w-full" />
        </div>
      </div>

      {/* Floating stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 max-w-xl">
        {[
          { k: "Operations", v: "Unified dashboard" },
          { k: "Communication", v: "Instant alerts" },
          { k: "Compliance", v: "Audit-ready logs" },
        ].map((stat) => (
          <div
            key={stat.k}
            className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur px-4 py-4 shadow-sm hover:shadow-md transition"
          >
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              {stat.k}
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {stat.v}
            </div>
          </div>
        ))}
      </div>
    </motion.div>

    {/* Features */}
    <div className="mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {estateManagerFeatures.map((f, idx) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: idx * 0.05 }}
          className="group relative rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-xl p-6 hover:-translate-y-2 transition-all duration-300 shadow-sm hover:shadow-xl"
        >
          {/* glow */}
          <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 blur-xl transition" />

          <div className="relative flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-md">
              <f.icon className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {f.description}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>

    {/* CTA */}
    <div className="mt-16 flex flex-col sm:flex-row gap-4">
      <Link
        to="/request-demo"
        className="inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 px-8 py-4 text-xs font-semibold uppercase tracking-widest text-white shadow-lg hover:opacity-90 transition"
      >
        Request Demo <ArrowRight className="h-4 w-4" />
      </Link>

      <Link
        to="/dashboard/estate"
        className="rounded-full border border-slate-300 bg-white/80 backdrop-blur px-8 py-4 text-xs font-semibold uppercase tracking-widest text-slate-900 hover:bg-white transition"
      >
        View Manager Tools
      </Link>
    </div>
  </div>
</section>

        {/* SECTION 5: EVOLUTION COMPARISON */}
      <section className="relative py-32 px-6 bg-gradient-to-b from-white to-slate-50 overflow-hidden">
  {/* subtle background glow */}
  <div className="absolute inset-0 -z-10">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[800px] bg-blue-100/40 blur-3xl rounded-full" />
  </div>

  <div className="max-w-6xl mx-auto">
    {/* Header */}
    <div className="text-center max-w-2xl mx-auto">
      <span className="inline-block text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
        Transformation
      </span>

      <h3 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
        From outdated logs to{" "}
        <span className="bg-gradient-to-r from-blue-600 to-indigo-500 text-transparent bg-clip-text">
          intelligent access control
        </span>
      </h3>

      <p className="mt-5 text-lg text-slate-600">
        Replace manual processes with a secure, automated system designed for speed, clarity, and accountability.
      </p>
    </div>

    {/* Comparison */}
    <div className="mt-20 grid md:grid-cols-2 gap-10 items-stretch">
      {/* OLD SYSTEM */}
      <div className="relative rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h4 className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
            Traditional System
          </h4>
          <p className="mt-2 text-sm text-slate-500">
            Fragmented, manual, and prone to errors.
          </p>
        </div>

        <div className="space-y-5">
          {[
            "Illegible handwriting and human errors",
            "Manual phone calls slow down access",
            "No centralized or secure audit trail",
            "Difficult to track visitor history",
            "No real-time visibility for residents",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 text-slate-600">
              <AlertCircle className="text-red-500 w-5 h-5 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* QRING SYSTEM */}
      <div className="relative rounded-3xl p-8 text-white bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl overflow-hidden">
        {/* glow */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,white,transparent)]" />

        <div className="relative mb-8">
          <h4 className="text-xs uppercase tracking-widest text-white/70 font-semibold">
            QRing System
          </h4>
          <p className="mt-2 text-sm text-white/80">
            Secure, automated, and built for modern estates.
          </p>
        </div>

        <div className="space-y-5 relative">
          {[
            "Encrypted cloud-based visitor logs",
            "Instant approvals and real-time alerts",
            "Immutable and searchable history",
            "Centralized dashboard for all estates",
            "Full visibility for residents and managers",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 font-medium">
              <CheckCircle2 className="w-5 h-5 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Value Highlights */}
    <div className="mt-20 grid sm:grid-cols-3 gap-6">
      {[
        { title: "Faster Access", desc: "Reduce gate delays with instant approvals and automation." },
        { title: "Better Security", desc: "Track every entry with encrypted and verifiable logs." },
        { title: "Full Control", desc: "Residents and managers stay in control at all times." },
      ].map((item) => (
        <div
          key={item.title}
          className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-6 text-center shadow-sm hover:shadow-md transition"
        >
          <h5 className="text-sm font-semibold text-slate-900">{item.title}</h5>
          <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
        </div>
      ))}
    </div>

    {/* Metrics / Proof */}
    <div className="mt-16 grid grid-cols-3 gap-6 text-center max-w-3xl mx-auto">
      {[
        { value: "90%", label: "Faster check-ins" },
        { value: "100%", label: "Digital logs" },
        { value: "24/7", label: "Real-time monitoring" },
      ].map((stat) => (
        <div key={stat.label}>
          <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mt-1">
            {stat.label}
          </div>
        </div>
      ))}
    </div>

    {/* CTA */}
    <div className="mt-16 flex flex-col sm:flex-row justify-center gap-4">
      <button className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 px-8 py-4 text-xs font-semibold uppercase tracking-widest text-white shadow-lg hover:opacity-90 transition">
        Get Started
      </button>

      <button className="rounded-full border border-slate-300 bg-white/80 backdrop-blur px-8 py-4 text-xs font-semibold uppercase tracking-widest text-slate-900 hover:bg-white transition">
        See How It Works
      </button>
    </div>
  </div>
</section>

        {/* SECTION 4: 3-STEP WORKFLOW */}
        <section className="py-32 bg-white text-slate-900 px-6">
          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-16">
            {[
              { t: "SCAN", d: "Visitor scans the unique gate QR code.", i: <Smartphone /> },
              { t: "ALERT", d: "Resident gets a notification with visitor photo.", i: <Bell /> },
              { t: "ENTER", d: "Guard is instantly notified of approval.", i: <CheckCircle2 /> },
            ].map((step, i) => (
              <div key={i} className="relative group">
                <div className="text-6xl sm:text-7xl md:text-8xl font-black text-slate-50 absolute -top-8 -left-4">0{i+1}</div>
                <div className="relative z-10">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#2563eb] text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl">{step.i}</div>
                  <h3 className="text-xl sm:text-2xl font-black mb-4 tracking-tighter uppercase italic">{step.t}</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <QRFlowSection />

        <LandingPricingSection />
<section className="relative py-32 px-6 bg-gradient-to-b from-white to-slate-50 overflow-hidden" id="downloads">
  {/* background glow */}
  <div className="absolute inset-0 -z-10">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[800px] bg-blue-100/40 blur-3xl rounded-full" />
  </div>

  <div className="max-w-7xl mx-auto">
    {/* HEADER */}
    <motion.div {...fadeInUp} className="max-w-3xl">
      <span className="inline-flex rounded-full border border-blue-200 bg-white/80 backdrop-blur px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-blue-700">
        Mobile Apps
      </span>

      <h2 className="mt-6 text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
        Get QRing on{" "}
        <span className="bg-gradient-to-r from-blue-600 to-indigo-500 text-transparent bg-clip-text">
          your device
        </span>
      </h2>

      <p className="mt-6 text-lg text-slate-600 max-w-2xl">
        Install QRing to manage visitor access, approvals, and real-time monitoring—anytime, anywhere.
      </p>
    </motion.div>

    {/* PLATFORM GRID */}
    <div className="mt-20 grid gap-8 lg:grid-cols-2">
      
      {/* ANDROID CARD */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="group relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-[#0b1b34] via-[#102a54] to-[#2563eb] p-10 text-white shadow-[0_40px_120px_rgba(37,99,235,0.25)]"
      >
        {/* glow */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_30%)]" />

        <div className="relative">
          {/* top */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-white p-2 shadow-md">
                <img src="/qring_logo.png" className="h-full w-full object-contain" />
              </div>
              <span className="text-xs uppercase tracking-widest text-white/70">
                Android
              </span>
            </div>

            <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full tracking-widest uppercase">
              Live
            </span>
          </div>

          {/* title */}
          <h3 className="mt-8 text-3xl font-bold">
            Download APK
          </h3>

          <p className="mt-4 text-white/80 max-w-md">
            Get the latest QRing Android build and install instantly on supported devices for homeowners and estate managers.
          </p>

          {/* features */}
          <div className="mt-6 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider">
            {["Direct Install", "Fast Setup", "Offline Ready"].map(tag => (
              <span key={tag} className="bg-white/10 border border-white/20 px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 sm:items-center">
            <a
              href="/qring.apk"
              download
              className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-full text-xs font-semibold uppercase tracking-widest hover:scale-[1.02] transition"
            >
              Download APK <ArrowRight className="w-4 h-4" />
            </a>

            <span className="text-xs text-white/70">
              ~19MB • Works on most Android devices
            </span>
          </div>
        </div>
      </motion.div>

      {/* IOS CARD */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative rounded-[2.5rem] border border-slate-200 bg-white/80 backdrop-blur-xl p-10 shadow-lg"
      >
        {/* badge */}
        <div className="flex justify-between items-center">
          <span className="text-xs uppercase tracking-widest text-slate-500">
            iOS
          </span>

          <span className="text-[10px] bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest text-slate-500">
            Coming Soon
          </span>
        </div>

        <h3 className="mt-8 text-3xl font-bold text-slate-900">
          App Store Release
        </h3>

        <p className="mt-4 text-slate-600 max-w-md">
          The iOS version is currently in preparation and will be available on the App Store soon with the full QRing experience.
        </p>

        {/* features */}
        <div className="mt-6 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-slate-500">
          {["App Store Launch", "Same Features", "Optimized UI"].map(tag => (
            <span key={tag} className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 sm:items-center">
          <button
            disabled
            className="bg-slate-200 text-slate-500 px-8 py-4 rounded-full text-xs font-semibold uppercase tracking-widest"
          >
            Coming Soon
          </button>

          <span className="text-xs text-slate-500">
            Join waitlist or check back soon
          </span>
        </div>
      </motion.div>
    </div>

    {/* TRUST / SUPPORT */}
    <div className="mt-20 grid sm:grid-cols-3 gap-6 text-center max-w-4xl mx-auto">
      {[
        { title: "Secure Install", desc: "Verified and safe application build" },
        { title: "Fast Setup", desc: "Get started in under 2 minutes" },
        { title: "Always Connected", desc: "Real-time access control anywhere" },
      ].map((item) => (
        <div key={item.title}>
          <h4 className="text-sm font-semibold text-slate-900">
            {item.title}
          </h4>
          <p className="text-sm text-slate-600 mt-2">
            {item.desc}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>
        {/* SECTION 7: FAQ */}
        <section className="py-32 bg-white px-6" id="faq">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl font-black italic tracking-tighter mb-16 uppercase">Questions</h2>
            <div className="border-t border-slate-200">
              <FAQItem
                question="What is QRing?"
                answer="QRing is a smart visitor management platform that helps estates, offices, and homeowners manage visitor access easily. Visitors scan a QR code at the gate to request entry, and the homeowner can approve, chat, or call the visitor directly from the QRing app."
              />
              <FAQItem
                question="How does QRing work for visitors?"
                answer="When a visitor arrives at the gate, they simply scan the QR code, enter their name and purpose of visit, and take a quick snapshot. The homeowner immediately receives a visitor request notification and can decide whether to approve the visit, send a message, or call the visitor."
              />
              <FAQItem
                question="Do visitors need to download the QRing app?"
                answer="No. Visitors do not need to install any app. They only need to scan the QR code using their phone camera, fill in their details, and submit the request."
              />
              <FAQItem
                question="How do homeowners approve visitors?"
                answer="Homeowners receive a real-time notification in the QRing app whenever a visitor requests access. They can then approve the visitor, send a message, or start an audio or video call before granting access."
              />
              <FAQItem
                question="Is QRing secure?"
                answer="Yes. QRing improves security by capturing a live snapshot of every visitor, recording entry logs, and giving homeowners direct control over who enters the estate or property."
              />
              <FAQItem
                question="Can QRing be used for offices or estates?"
                answer="Yes. QRing is designed for residential estates, office buildings, and gated communities. Estate managers can monitor visitor activity, manage residents, and track entry logs from a centralized dashboard."
              />
            </div>
          </div>
        </section>

        {/* SECTION 8: FINAL CTA */}
        <section className="py-40 bg-[#2563eb] text-white text-center px-6">
          <motion.div {...fadeInUp} className="max-w-4xl mx-auto">
            <h2 className="text-5xl sm:text-6xl md:text-[7rem] lg:text-[9rem] font-black italic tracking-tighter leading-[0.85] mb-12 uppercase">Secure Your <br/> Estate.</h2>
            <Link to="/signup" className="bg-black text-white px-12 py-6 rounded-full font-black uppercase text-xl tracking-tighter hover:scale-105 transition-transform flex items-center gap-4 mx-auto shadow-2xl">
              Get Started <ChevronRight />
            </Link>
          </motion.div>
        </section>
      </main>

      <footer className="py-12 border-t border-slate-200 text-center text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em]">
        © 2026 QRing. End-to-End Security. Built for Scale.
      </footer>
    </div>
  );
}
