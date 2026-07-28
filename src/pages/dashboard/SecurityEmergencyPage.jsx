import { Link } from "react-router-dom";
import { ArrowLeft, Bell, Radio, ShieldAlert } from "lucide-react";
import EstateDashboard from "../../components/panic/EstateDashboard";

export default function SecurityEmergencyPage() {
  return (
    <div className="min-h-screen bg-slate-100/80 font-sans text-slate-900 antialiased pb-12 selection:bg-rose-500 selection:text-white">
      
      {/* Sticky App Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl safe-top">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4 sm:max-w-2xl">
          
          {/* Back Button */}
          <Link
            to="/dashboard/security"
            aria-label="Back to Security"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition-all hover:bg-slate-200 active:scale-90"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          {/* Console Header Info */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-600"></span>
              </span>
              <h1 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Emergency Response
              </h1>
            </div>
            <p className="text-[10px] font-medium text-slate-400">Live Field Response</p>
          </div>

          {/* Quick Notifications Access */}
          <Link
            to="/dashboard/notifications"
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition-all hover:bg-slate-200 active:scale-90"
          >
            <Bell className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* Main Container Shell */}
      <main className="mx-auto max-w-md px-3 pt-3 sm:max-w-2xl space-y-3">
        
        {/* Connection Status Banner */}
     

        {/* Live Backend Data Integration Block */}
        <div className="rounded-3xl bg-white p-2 shadow-xs border border-slate-200/80">
          <EstateDashboard roleLabel="Guard Response Console" />
        </div>

      </main>
    </div>
  );
}