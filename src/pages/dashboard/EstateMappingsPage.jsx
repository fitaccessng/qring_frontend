import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  LayoutGrid,
  ShieldCheck,
  Building2,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  DoorOpen,
  GitBranch,
  Settings,
  ScanLine
} from 'lucide-react';

// Service & Utility Imports
import { getEstateMappings, getEstateMappingsSnapshot } from "../../services/estateService";
import { showError } from "../../utils/flash";
import PageSkeleton from "../../components/PageSkeleton";

const EstateMappingsPage = () => {
  const navigate = useNavigate();

  // Logic from your service
  const [mappings, setMappings] = useState(() => getEstateMappingsSnapshot() ?? []);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(() => !getEstateMappingsSnapshot());

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getEstateMappings();
        if (!mounted) return;
        setMappings(data);
      } catch (requestError) {
        if (!mounted) return;
        setError(requestError.message ?? "Failed to load mappings");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  // Derived stats for the Bento Grid
  const totalDoors = useMemo(() =>
    mappings.reduce((sum, home) => sum + (home.doors?.length ?? 0), 0),
  [mappings]);

  return (
    <div className="bg-[#f8f9fa] text-[#2b3437] min-h-screen font-sans pb-32">

      {/* Fixed Header */}
      <header className="fixed top-0 w-full z-50 bg-[#f8f9fa]/80 backdrop-blur-xl flex items-center justify-between px-6 h-16 border-b border-slate-100">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-[#4955b3] active:bg-indigo-50 rounded-full transition-all"
        >
          <ArrowLeft size={24} />
        </button>

        <h1 className="text-lg font-extrabold tracking-tight text-[#2b3437]">Mappings</h1>

        <div className="relative">
          <button className="p-2 text-[#4955b3] active:bg-indigo-50 rounded-full transition-all">
            <Bell size={22} />
          </button>
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#f8f9fa]" />
        </div>
      </header>

      <main className="pt-24 px-6 max-w-5xl mx-auto">

        {/* Title Section */}
        <section className="mb-10">
          <div className="inline-block px-3 py-1 mb-4 rounded-full bg-[#dfe0ff] text-[#3b48a6] font-black text-[10px] tracking-widest uppercase">
            Structure
          </div>
          <h2 className="text-4xl font-black text-[#2b3437] tracking-tight mb-2">Door Mappings</h2>
          <p className="text-slate-500 font-medium max-w-xl text-lg leading-relaxed">
            Review how homes and doors are mapped across your estate.
          </p>
        </section>

        {/* Bento Grid Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="md:col-span-2 p-8 rounded-[2.5rem] bg-white border border-slate-50 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Estate Health</h3>
                <p className="text-2xl font-black text-[#2b3437]">{totalDoors} Active Nodes</p>
              </div>
              <div className="text-[#4955b3] opacity-40">
                <LayoutGrid size={32} />
              </div>
            </div>
            <div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden">
              <div className="bg-[#4955b3] h-full w-[100%] rounded-full shadow-[0_0_12px_rgba(73,85,179,0.3)]"></div>
            </div>
            <p className="mt-4 text-xs font-bold text-slate-400">
              All access points synchronized with primary hub.
            </p>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-[#4955b3] text-white flex flex-col justify-between shadow-lg shadow-indigo-100/50">
            <ShieldCheck className="opacity-40" size={40} />
            <div>
              <p className="text-4xl font-black mb-1">{mappings.length}</p>
              <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">Mapped Homes</p>
            </div>
          </div>
        </div>

        {/* Tree Structure */}
        <div className="space-y-6">
          {loading ? (
            <PageSkeleton blocks={3} />
          ) : (
            mappings.map((home) => (
              <div key={home.homeId} className="space-y-3">
                <div className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-50 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#4955b3]">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-[#2b3437]">{home.homeName}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        {home.homeownerName || "No Resident Assigned"}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="text-slate-300" size={20} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6 md:pl-12">
                  {(home.doors ?? []).map((door) => (
                    <DoorCard
                      key={door.id}
                      title={door.name}
                      status={door.qr?.length > 0 ? "QR Linked" : "No QR"}
                      statusColor={door.qr?.length > 0 ? "text-[#006b61]" : "text-[#9e3f4e]"}
                      icon={<DoorOpen size={18} />}
                      active={door.qr?.length > 0}
                    />
                  ))}
                  {(!home.doors || home.doors.length === 0) && (
                    <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest pl-2">No doors mapped</p>
                  )}
                </div>
              </div>
            ))
          )}

          {!loading && mappings.length === 0 && (
             <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                <GitBranch className="text-slate-200 mx-auto mb-4" size={48} />
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No mappings found.</p>
             </div>
          )}
        </div>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-8 pt-4 bg-white/90 backdrop-blur-2xl rounded-t-[2.5rem] z-50 border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        <NavItem icon={<DoorOpen size={22} />} label="Doors" />
        <NavItem icon={<GitBranch size={22} />} label="Mappings" active />
        <NavItem icon={<ShieldCheck size={22} />} label="Security" />
        <NavItem icon={<Settings size={22} />} label="Settings" />
      </nav>
    </div>
  );
};

// Internal Helper Components
const DoorCard = ({ title, status, statusColor, icon, active = false }) => (
  <div className="p-5 bg-white rounded-3xl flex items-center gap-4 border border-slate-50 shadow-sm active:scale-[0.98] transition-transform">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-emerald-50 text-[#006b61]' : 'bg-slate-50 text-slate-400'}`}>
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-sm font-black text-[#2b3437] truncate">{title}</p>
      <p className={`text-[9px] ${statusColor} font-black uppercase tracking-widest`}>{status}</p>
    </div>
    <MoreVertical className="text-slate-300" size={18} />
  </div>
);

const NavItem = ({ icon, label, active = false }) => (
  <button className={`flex flex-col items-center gap-1.5 px-5 py-2 rounded-2xl transition-all active:scale-90 ${active ? 'bg-indigo-50/50 text-[#4955b3]' : 'text-slate-300'}`}>
    {icon}
    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default EstateMappingsPage;