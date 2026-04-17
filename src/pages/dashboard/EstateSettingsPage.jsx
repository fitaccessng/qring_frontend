import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Bell, 
  User, 
  Shield, 
  Lock, 
  BellRing, 
  Moon, 
  Globe, 
  LogOut, 
  ChevronRight, 
  Camera,
  Building2,
  CreditCard,
  Pencil,
  Smartphone,
  Loader,
  X,
  Check,
  AlertCircle,
  LayoutDashboard as LayoutDashboardIcon,
  ShieldAlert as ShieldIcon,
  Settings as SettingsIcon
} from "lucide-react";
import { useAuth } from "../../state/AuthContext";
import { useApiQuery } from "../../hooks/useApi";
import { endpoints } from "../../services/endpoints";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";

export default function EstateSettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { overview, estateId } = useEstateOverviewState();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("darkMode") === "true" || window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });
  const [editingField, setEditingField] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [activeModal, setActiveModal] = useState(null);
  const [notificationPrefs, setNotificationPrefs] = useState({
    pushNotifications: true,
    emailNotifications: true,
  });

  // Apply dark mode on mount and when it changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    }
  }, [isDarkMode]);

  // Get current estate
  const currentEstate = useMemo(() => {
    if (!overview?.estates?.length) return null;
    return overview.estates.find((e) => String(e.id) === String(estateId)) ?? overview.estates[0];
  }, [estateId, overview?.estates]);

  const currentEstateId = currentEstate?.id ?? "";

  // Count active estates
  const activeEstates = useMemo(() => {
    return (overview?.estates ?? []).filter((e) => String(e.status || "").toLowerCase() === "active").length;
  }, [overview?.estates]);

  // Count estates
  const totalEstates = overview?.estates?.length ?? 0;

  // Count connected devices (gate terminals)
  const connectedDevices = useMemo(() => {
    if (!currentEstateId) return 0;
    return (overview?.doors ?? []).filter((d) => String(d.estateId || d.homeId) === String(currentEstateId)).length;
  }, [currentEstateId, overview?.doors]);

  // Get subscription info
  const subscription = overview?.subscription ?? {};

  // Handle edit
  const handleEditField = (field, currentValue) => {
    setEditingField(field);
    setEditValues({ ...editValues, [field]: currentValue });
  };

  const handleSaveField = async (field) => {
    // TODO: Implement API call to update field
    setEditingField(null);
  };

  const profile = {
    name: user?.fullName || "User",
    role: "Estate Manager",
    email: user?.email || "",
    avatar: user?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`
  };

  return (
    <div className="min-h-[100dvh] bg-[#f8f9fa] text-[#2b3437] font-body antialiased">
      
      {/* --- Header --- */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-all active:scale-90"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="font-headline font-black tracking-tighter text-indigo-700 text-lg uppercase">
              Profile & Settings
            </h1>
          </div>
          
          <button className="p-2 rounded-xl bg-slate-50 text-indigo-600 relative hover:bg-indigo-50 transition-all">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="pt-24 pb-32 px-6 max-w-2xl mx-auto space-y-8">
        
        {/* Profile Bento Card */}
        <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-indigo-900/5 text-center relative overflow-hidden">
          <div className="relative z-10">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-[2rem] bg-indigo-50 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                <img src={profile.avatar} alt="Admin" className="w-full h-full object-cover" />
              </div>
              <button className="absolute -bottom-1 -right-1 bg-[#00346f] text-white p-2 rounded-xl shadow-lg border-2 border-white active:scale-90 transition-all">
                <Camera size={14} />
              </button>
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{profile.name}</h2>
            <p className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mt-2 bg-indigo-50 inline-block px-3 py-1 rounded-full">
              {profile.role}
            </p>
          </div>
          
          {/* Subtle Background Decor */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        </section>

        {/* Section: Account Settings */}
        <section className="space-y-3">
          <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Account Configuration</h3>
          <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
            <SettingsRow 
              icon={<User size={18} />} 
              label="Personal Details" 
              value={`${user?.fullName || "N/A"} • ${user?.email || "N/A"}`}
              onEdit={() => setActiveModal("personalDetails")}
            />
            <SettingsRow 
              icon={<Lock size={18} />} 
              label="Password & Security" 
              value="Update your password"
              onEdit={() => setActiveModal("password")}
            />
            <SettingsRow 
              icon={<CreditCard size={18} />} 
              label="Billing & Subscription" 
              value={subscription?.planName || "No active subscription"}
              onEdit={() => navigate("/billing/paywall")}
            />
          </div>
        </section>

        {/* Section: Estate Controls */}
        <section className="space-y-3">
          <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Management</h3>
          <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
            <SettingsRow 
              icon={<Building2 size={18} />} 
              label="My Estates" 
              value={`${activeEstates} Active · ${totalEstates} Total`}
              onEdit={() => setActiveModal("estates")}
            />
            <SettingsRow 
              icon={<Shield size={18} />} 
              label="Compliance Rules" 
              value="Access protocols configured"
              onEdit={() => setActiveModal("compliance")}
            />
            <SettingsRow 
              icon={<Smartphone size={18} />} 
              label="Connected Devices" 
              value={`${connectedDevices} Gate Terminal${connectedDevices !== 1 ? "s" : ""}`}
              onEdit={() => setActiveModal("devices")}
            />
          </div>
        </section>

        {/* Section: App Preferences */}
        <section className="space-y-3">
          <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Preferences</h3>
          <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                  <Moon size={18} />
                </div>
                <span className="text-sm font-black text-slate-800">Dark Mode</span>
              </div>
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`w-12 h-6 rounded-full transition-all relative ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDarkMode ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            <SettingsRow icon={<BellRing size={18} />} label="Notification Pulse" value="Push & Email" onEdit={() => setActiveModal("notifications")} />
            <SettingsRow icon={<Globe size={18} />} label="System Language" value="English (US)" />
          </div>
        </section>

        {/* Logout Action */}
        <button 
          onClick={async () => {
            await logout();
            navigate("/login");
          }}
          className="w-full py-5 rounded-[2rem] flex items-center justify-center gap-3 text-rose-500 font-black text-xs uppercase tracking-widest hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100 active:scale-95"
        >
          <LogOut size={18} />
          Terminate Session
        </button>

        {/* ===== MODALS ===== */}

        {/* Personal Details Modal */}
        {activeModal === "personalDetails" && (
          <BottomModal onClose={() => setActiveModal(null)}>
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-900">Edit Personal Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-black text-slate-600 uppercase">Full Name</label>
                  <input 
                    type="text" 
                    defaultValue={user?.fullName || ""} 
                    onChange={(e) => setEditValues({ ...editValues, fullName: e.target.value })}
                    className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-600 uppercase">Email</label>
                  <input 
                    type="email" 
                    defaultValue={user?.email || ""} 
                    onChange={(e) => setEditValues({ ...editValues, email: e.target.value })}
                    className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all"
              >
                Save Changes
              </button>
            </div>
          </BottomModal>
        )}

        {/* Password & Security Modal */}
        {activeModal === "password" && (
          <BottomModal onClose={() => setActiveModal(null)}>
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-900">Password & Security</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-black text-slate-600 uppercase">Current Password</label>
                  <input 
                    type="password" 
                    placeholder="Enter current password"
                    className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-600 uppercase">New Password</label>
                  <input 
                    type="password" 
                    placeholder="Enter new password"
                    className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-600 uppercase">Confirm Password</label>
                  <input 
                    type="password" 
                    placeholder="Confirm new password"
                    className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all"
              >
                Update Password
              </button>
            </div>
          </BottomModal>
        )}

        {/* Estates Modal */}
        {activeModal === "estates" && (
          <BottomModal onClose={() => setActiveModal(null)}>
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-900">My Estates</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {overview?.estates?.map((estate) => (
                  <div key={estate.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer">
                    <h3 className="font-black text-slate-900">{estate.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">Status: <span className="uppercase font-black">{estate.status}</span></p>
                    <p className="text-xs text-slate-500 mt-1">Doors: {(overview?.doors ?? []).filter(d => String(d.estateId || d.homeId) === String(estate.id)).length}</p>
                  </div>
                ))}
                {!overview?.estates?.length && <p className="text-center text-slate-500 text-sm py-8">No estates found</p>}
              </div>
            </div>
          </BottomModal>
        )}

        {/* Compliance Rules Modal */}
        {activeModal === "compliance" && (
          <BottomModal onClose={() => setActiveModal(null)}>
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-900">Compliance Rules</h2>
              <div className="space-y-3">
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                  <h3 className="font-black text-indigo-900 text-sm">Access Protocols</h3>
                  <p className="text-xs text-indigo-700 mt-2">✓ Two-factor authentication enabled</p>
                  <p className="text-xs text-indigo-700">✓ Session timeout: 30 minutes</p>
                  <p className="text-xs text-indigo-700">✓ IP whitelist active</p>
                  <p className="text-xs text-indigo-700">✓ Audit logs enabled</p>
                </div>
                <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                  <h3 className="font-black text-rose-900 text-sm">Security Guidelines</h3>
                  <p className="text-xs text-rose-700 mt-2">• Update password every 90 days</p>
                  <p className="text-xs text-rose-700">• Never share credentials</p>
                  <p className="text-xs text-rose-700">• Report suspicious activity</p>
                </div>
              </div>
            </div>
          </BottomModal>
        )}

        {/* Connected Devices Modal */}
        {activeModal === "devices" && (
          <BottomModal onClose={() => setActiveModal(null)}>
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-900">Connected Devices</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {overview?.doors?.filter(d => String(d.estateId || d.homeId) === String(currentEstateId)).map((door) => (
                  <div key={door.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <h3 className="font-black text-slate-900">{door.name || door.doorName}</h3>
                      <p className="text-xs text-slate-500 mt-1">Device ID: {door.deviceId || "N/A"}</p>
                      <p className="text-xs text-slate-500">Status: <span className={`font-black ${door.status === "online" ? "text-green-600" : "text-amber-600"}`}>{door.status || "Unknown"}</span></p>
                    </div>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-black">
                      {door.status === "online" ? "🟢" : "🔴"}
                    </span>
                  </div>
                ))}
                {!overview?.doors?.filter(d => String(d.estateId || d.homeId) === String(currentEstateId)).length && <p className="text-center text-slate-500 text-sm py-8">No devices found</p>}
              </div>
            </div>
          </BottomModal>
        )}

        {/* Notifications Preferences Modal */}
        {activeModal === "notifications" && (
          <BottomModal onClose={() => setActiveModal(null)}>
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-900">Notification Preferences</h2>
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Smartphone size={18} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">Push Notifications</p>
                      <p className="text-xs text-slate-500">Mobile & web alerts</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setNotificationPrefs({ ...notificationPrefs, pushNotifications: !notificationPrefs.pushNotifications })}
                    className={`w-12 h-6 rounded-full transition-all relative ${notificationPrefs.pushNotifications ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationPrefs.pushNotifications ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Bell size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">Email Notifications</p>
                      <p className="text-xs text-slate-500">Important updates via email</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setNotificationPrefs({ ...notificationPrefs, emailNotifications: !notificationPrefs.emailNotifications })}
                    className={`w-12 h-6 rounded-full transition-all relative ${notificationPrefs.emailNotifications ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationPrefs.emailNotifications ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>
              <button 
                onClick={() => {
                  // TODO: Save notification preferences to backend
                  setActiveModal(null);
                }}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all"
              >
                Save Preferences
              </button>
            </div>
          </BottomModal>
        )}

      </main>

      {/* --- Bottom Navigation --- */}
      
    </div>
  );
}

// --- Helper Components ---

function SettingsRow({ icon, label, value, onEdit, isEditing }) {
  return (
    <div className="flex items-center justify-between p-5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-800">{label}</p>
          {value && <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{value}</p>}
        </div>
      </div>
      {onEdit && (
        <button 
          onClick={onEdit}
          className="text-slate-400 group-hover:text-indigo-600 transition-all p-2 rounded-lg hover:bg-indigo-50"
        >
          <Pencil size={16} />
        </button>
      )}
      {!onEdit && <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-all" />}
    </div>
  );
}

function NavItem({ to, icon, label, active = false }) {
  return (
    <Link to={to} className={`flex flex-col items-center gap-1 px-4 py-1 transition-all ${active ? 'text-indigo-700' : 'text-slate-400'}`}>
      {icon}
      <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-60'}`}>
        {label}
      </span>
      {active && <div className="w-1 h-1 bg-indigo-700 rounded-full mt-0.5"></div>}
    </Link>
  );
}

// Bottom Modal Component
function BottomModal({ children, onClose }) {
  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 z-[1001] bg-white rounded-t-[2rem] p-6 max-w-2xl mx-auto w-full max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-500"
        >
          <X size={20} />
        </button>
        
        <div className="pr-6">
          {children}
        </div>
      </div>
    </>
  );
}