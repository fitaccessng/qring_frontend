import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import BrandMark from '../../components/BrandMark';
import { 
  Shield, ArrowRight, Menu, X, CheckCircle2, User, Clock, 
  MapPin, Smartphone, Zap, Lock, AlertCircle, ChevronRight, 
  Bell, FileText, SmartphoneIcon, Users, Database, PieChart,
  QrCode, Video, ListOrdered, History, LayoutDashboard
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
            <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-[#3b82f6] transition-colors">{item}</a>
          ))}
        </div>
        <Link to="/signup" className="hidden md:block bg-[#2563eb] text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#1d4ed8] transition-all">
          Get Started
        </Link>
        
       
      </nav>
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
        <section className="py-32 bg-white px-6" id="features">
          <div className="max-w-7xl mx-auto">
            <motion.div {...fadeInUp} className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-700">
                Key Features
              </span>
              <h2 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-slate-900">Built for every gate shift.</h2>
              <p className="mt-5 text-lg font-medium leading-relaxed text-slate-600">
                QRing combines verification, approvals, and audit trails into one workflow—so guards move faster and residents stay in control.
              </p>
            </motion.div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {keyFeatures.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className="group rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(2,6,23,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(37,99,235,0.16)]"
                >
                  <div className="mb-6 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_12px_30px_rgba(37,99,235,0.35)]">
                    <f.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">{f.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{f.description}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-700/70">
                    Explore <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 4: ESTATE MANAGEMENT (PROPERTY MANAGERS) */}
        <section className="relative overflow-hidden bg-slate-50 px-6 py-32" id="managers">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-28 top-10 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.20),transparent_60%)] blur-2xl" />
            <div className="absolute -right-32 bottom-0 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.14),transparent_58%)] blur-2xl" />
            <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(to_right,rgba(15,23,42,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.10)_1px,transparent_1px)] [background-size:34px_34px]" />
          </div>

          <div className="relative mx-auto max-w-7xl">
            <motion.div {...fadeInUp} className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-900">
                Estate Management
              </span>

              <h2 className="mt-6 text-3xl font-black italic uppercase tracking-tighter text-slate-900 sm:text-4xl md:text-5xl">
                Built for Estate Managers
              </h2>
              <p className="mt-5 text-lg font-medium leading-relaxed text-slate-600">
                Run resident operations, security workflows, and compliance logging from one dashboard—designed for busy property teams.
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {[
                  'Multi‑estate control',
                  'Role‑based access',
                  'Export‑ready logs',
                  'Real‑time visibility',
                ].map((label) => (
                  <div
                    key={label}
                    className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 backdrop-blur"
                  >
                    {label}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div {...fadeInUp} className="mt-12">
              <div className="relative">
                <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,0.22),transparent_58%),radial-gradient(circle_at_75%_70%,rgba(59,130,246,0.12),transparent_55%)] blur-2xl" />
                <div className="rounded-[3rem] border border-slate-200/70 bg-white/60 p-3 shadow-[0_40px_120px_rgba(2,6,23,0.12)] backdrop-blur">
                  <div className="rounded-[2.6rem] bg-white">
                    <LaptopPreview className="max-w-5xl" />
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { k: 'Ops', v: 'One dashboard' },
                    { k: 'Comms', v: 'Instant blasts' },
                    { k: 'Logs', v: 'Audit‑ready' },
                  ].map((stat) => (
                    <div
                      key={stat.k}
                      className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-[0_18px_50px_rgba(2,6,23,0.06)] backdrop-blur"
                    >
                      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">{stat.k}</div>
                      <div className="mt-2 text-sm font-black uppercase tracking-tight text-slate-900">{stat.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {estateManagerFeatures.map((f, idx) => {
                const isHero = idx === 0;
                return (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.7, delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    className={[
                      'group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(2,6,23,0.06)]',
                      isHero ? 'md:col-span-2 lg:col-span-2 lg:row-span-2 sm:p-7' : '',
                    ].join(' ')}
                  >
                    {isHero && (
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(37,99,235,0.18),transparent_52%),radial-gradient(circle_at_80%_75%,rgba(59,130,246,0.10),transparent_55%)]" />
                    )}

                    <div className="relative flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] sm:h-11 sm:w-11">
                        <f.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-900">{f.title}</div>
                        <div className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{f.description}</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-12 flex flex-col gap-3 sm:flex-row">
              <Link to="/request-demo" className="inline-flex items-center justify-center gap-3 rounded-full bg-blue-600 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-[0_18px_60px_rgba(37,99,235,0.30)] transition-colors hover:bg-blue-700">
                Request Demo <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/dashboard/estate" className="rounded-full border border-slate-300 bg-white/80 px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-900 backdrop-blur transition-colors hover:bg-white">
                View Manager Tools
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION 5: EVOLUTION COMPARISON */}
        <section className="py-32 bg-slate-50 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-1 px-4 md:px-0">
              <div className="bg-white p-10 rounded-t-[2.5rem] md:rounded-l-[2.5rem] md:rounded-tr-none border border-slate-200">
                <h4 className="text-slate-500 font-black text-[10px] uppercase mb-8 tracking-[0.3em]">Traditional Logbooks</h4>
                <div className="space-y-6">
                  {["Illegible handwriting", "Manual radio/phone calls", "Zero digital audit trail"].map(item => (
                    <div key={item} className="flex items-center gap-4 text-slate-600 font-medium">
                      <AlertCircle size={18} className="text-red-500 shrink-0" /> {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#2563eb] p-10 rounded-b-[2.5rem] md:rounded-r-[2.5rem] md:rounded-bl-none text-white border border-[#2563eb]">
                <h4 className="text-white/30 font-black text-[10px] uppercase mb-8 tracking-[0.3em]">QRing Ecosystem</h4>
                <div className="space-y-6">
                  {["Encrypted Cloud Logs", "Instant Push Alerts", "Immutable History"].map(item => (
                    <div key={item} className="flex items-center gap-4 font-black italic">
                      <CheckCircle2 size={18} className="text-white shrink-0" /> {item}
                    </div>
                  ))}
                </div>
              </div>
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

        {/* SECTION 5: INCIDENT RECEIPT */}
        <section className="py-32 bg-slate-50 border-y border-slate-200 px-6">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-5xl font-black italic tracking-tighter mb-8 leading-none uppercase text-slate-900">Digital <br/> Receipts.</h2>
              <p className="text-slate-500 text-lg mb-10 font-medium">Every scan generates a cryptographically signed digital receipt, ensuring total accountability for every entry.</p>
              <div className="space-y-4">
                <div className="flex items-center gap-4 font-black italic text-slate-700"><CheckCircle2 className="text-blue-600" /> Tamper-Proof Timestamps</div>
                <div className="flex items-center gap-4 font-black italic text-slate-700"><CheckCircle2 className="text-blue-600" /> High-Res Visitor Photos</div>
              </div>
            </div>
            <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity }} className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 border border-slate-100 mx-auto">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-dashed border-slate-200">
                <Shield className="text-blue-600" />
                <span className="text-[10px] font-black text-slate-400">RECEIPT #QR-4402</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold uppercase"><span className="text-slate-400">Visitor</span><span className="text-slate-900">Marcus Cole</span></div>
                <div className="mt-6 bg-blue-600 text-white p-4 rounded-xl text-center text-[10px] font-black tracking-widest uppercase">Verified Entry Successful</div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 6: PRICING */}
        <section className="py-32 bg-[#071226] text-white px-6" id="pricing">
          <div className="max-w-7xl mx-auto text-center">
            <div className="mb-14">
              <h2 className="text-5xl font-black italic tracking-tighter mb-6 uppercase">Estate Plans</h2>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/90 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb]" />
                Monthly
              </div>
            </div>

            {(() => {
              const estatePlans = [
                {
                  name: 'Starter Estate',
                  tagline: 'Up to 3 doors (trial only, 30 days)',
                  price: '₦0',
                  period: '/month',
                  features: ['Up to 3 doors', 'Trial only - 30 days'],
                  cta: 'Start Free Trial',
                },
                {
                  name: 'Estate Basic',
                  tagline: 'Up to 10 doors',
                  price: '₦8,000',
                  period: '/month',
                  features: ['Up to 10 doors', 'Realtime alerts', 'Visitor logs', 'Resident management', 'Mobile dashboard'],
                  cta: 'Start Basic',
                },
                {
                  name: 'Estate Growth',
                  tagline: 'Up to 25 doors',
                  price: '₦18,000',
                  period: '/month',
                  features: ['Up to 25 doors', 'Chat + call access', 'Multi-admin roles', 'Visitor scheduling', 'Access windows', 'Analytics'],
                  cta: 'Choose Growth',
                },
                {
                  name: 'Estate Pro',
                  badge: 'Popular',
                  tagline: 'Up to 60 doors',
                  price: '₦35,000',
                  period: '/month',
                  highlight: true,
                  features: ['Advanced analytics', 'Security audit logs', 'Multi-location control', 'Role permissions', 'Priority support'],
                  cta: 'Start Pro',
                },
                {
                  name: 'Enterprise Estate',
                  tagline: 'Custom annual contract - unlimited doors',
                  price: 'Custom',
                  period: '',
                  features: ['Unlimited doors', 'SLA + API access'],
                  cta: 'Contact Sales',
                },
              ];

              const homeownerPlans = [
                {
                  name: 'Free',
                  tagline: '1 door',
                  price: 'Free',
                  period: '',
                  features: ['1 door', 'Basic notifications', 'Limited logs'],
                  cta: 'Get Started Free',
                },
                {
                  name: 'Home Pro',
                  tagline: 'Smart homeowner controls',
                  price: '₦2,500',
                  period: '/month',
                  highlight: true,
                  features: ['Chat + call verification', 'Visitor history', 'Visitor scheduling', 'Advanced notifications'],
                  cta: 'Choose Home Pro',
                },
                {
                  name: 'Home Premium',
                  tagline: 'Advanced access and privacy',
                  price: '₦4,500',
                  period: '/month',
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
                          <div className="text-5xl font-black italic tracking-tighter">{plan.price}</div>
                          {plan.period && <div className="pb-2 text-xs font-black uppercase tracking-widest text-white/50">{plan.period}</div>}
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
                    <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/90 backdrop-blur">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb]" />
                      Monthly
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
 {/* SECTION 3: APP DOWNLOADS */}
        <section className="bg-white px-6 py-28" id="downloads">
          <div className="mx-auto max-w-7xl">
            <motion.div {...fadeInUp} className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-800">
                Mobile Apps
              </span>
              <h2 className="mt-6 text-3xl font-black italic uppercase tracking-tighter text-slate-900 sm:text-4xl md:text-5xl">
                Download QRing for your device
              </h2>
              <p className="mt-5 text-lg font-medium leading-relaxed text-slate-600">
                Install the Android app directly now. The iOS app section is ready on the site and will switch live once the App Store build is available.
              </p>
            </motion.div>

            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden rounded-[2.5rem] border border-blue-200 bg-[linear-gradient(135deg,#071226_0%,#0f274f_52%,#2563eb_100%)] p-8 text-white shadow-[0_28px_90px_rgba(37,99,235,0.22)] sm:p-10"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_78%_80%,rgba(255,255,255,0.14),transparent_32%)]" />
                <div className="relative">
                  <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/90">
                    Android
                  </div>
                  <h3 className="mt-6 text-3xl font-black italic uppercase tracking-tighter sm:text-4xl">APK Download</h3>
                  <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-white/80 sm:text-base">
                    Download the latest QRing Android installer and sideload it on supported devices for homeowner and estate access.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-white/80">
                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">Direct Install</span>
                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">Latest Bundled APK</span>
                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">Device Ready</span>
                  </div>

                  <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <a
                      href="/qring.apk"
                      download="qring.apk"
                      className="inline-flex items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-950 transition-transform hover:scale-[1.02]"
                    >
                      Download Android APK
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <div className="text-xs font-bold text-white/70">
                      Best for Android phones, tablets, and managed estate devices.
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.75, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-slate-50 p-8 shadow-[0_24px_70px_rgba(2,6,23,0.06)] sm:p-10"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(37,99,235,0.10),transparent_26%),radial-gradient(circle_at_82%_78%,rgba(15,23,42,0.08),transparent_28%)]" />
                <div className="relative">
                  <div className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-slate-700">
                    iOS
                  </div>
                  <h3 className="mt-6 text-3xl font-black italic uppercase tracking-tighter text-slate-900 sm:text-4xl">Coming Soon</h3>
                  <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
                    The iPhone version is being prepared for release. This section is already in place and will switch to an App Store download as soon as it is ready.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                    <span className="rounded-full border border-slate-200 bg-white px-4 py-2">App Store Release</span>
                    <span className="rounded-full border border-slate-200 bg-white px-4 py-2">Same QRing Experience</span>
                    <span className="rounded-full border border-slate-200 bg-white px-4 py-2">In Review Pipeline</span>
                  </div>

                  <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center justify-center rounded-full bg-slate-200 px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500"
                    >
                      iOS Coming Soon
                    </button>
                    <div className="text-xs font-bold text-slate-500">
                      Share this page with iPhone users so they can check back when the release goes live.
                    </div>
                  </div>
                </div>
              </motion.div>
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
