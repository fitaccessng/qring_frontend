import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  MessageSquare,
  ChevronRight,
  Search,
  Bell,
  MoreHorizontal,
  X,
  Send,
  Image as ImageIcon
} from "lucide-react";

/**
 * 1. UI WRAPPER: MOBILE CONSTRAINED & SAFE AREAS
 */
const MobileFrame = ({ children }) => (
  <div className="min-h-screen bg-slate-50 flex justify-center selection:bg-indigo-100">
    <div className="w-full max-w-md bg-white min-h-screen shadow-2xl flex flex-col relative overflow-hidden">
      {children}
    </div>
  </div>
);

/**
 * 2. STICKY BLURRED HEADER
 */
const Header = () => (
  <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estate Community</span>
      <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Board</h1>
    </div>
    <div className="flex gap-3">
      <motion.button whileTap={{ scale: 0.9 }} className="p-2 bg-slate-100 rounded-full text-slate-600">
        <Search size={20} />
      </motion.button>
      <motion.button whileTap={{ scale: 0.9 }} className="p-2 bg-slate-100 rounded-full text-slate-600 relative">
        <Bell size={20} />
        <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
      </motion.button>
    </div>
  </header>
);

/**
 * 3. NATIVE BOTTOM NAVIGATION
 */
const BottomNav = () => (
  <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] h-16 bg-slate-900/95 backdrop-blur-lg rounded-[2rem] flex items-center justify-around px-6 shadow-2xl z-50">
    <NavItem icon={<Users size={22} />} active />
    <NavItem icon={<MessageSquare size={22} />} />
    <NavItem icon={<MoreHorizontal size={22} />} />
  </nav>
);

const NavItem = ({ icon, active = false }) => (
  <motion.button
    whileTap={{ scale: 0.8 }}
    className={`p-2 rounded-xl transition-colors ${active ? 'text-white' : 'text-slate-500'}`}
  >
    {icon}
  </motion.button>
);

/**
 * 4. INTERACTIVE CARD COMPONENT
 */
const CommunityCard = ({ title, body, author, time, tag }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    whileTap={{ scale: 0.98 }}
    className="bg-white border border-slate-200 p-5 rounded-[2rem] shadow-sm mb-4 transition-all active:shadow-inner"
  >
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-xs">
          {author[0]}
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">{author}</h4>
          <p className="text-[10px] text-slate-400 font-medium">{time}</p>
        </div>
      </div>
      <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
        {tag}
      </span>
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight">{title}</h3>
    <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{body}</p>
    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-slate-400">
       <div className="flex gap-4">
          <span className="text-xs font-medium flex items-center gap-1"><MessageSquare size={14}/> 12</span>
       </div>
       <ChevronRight size={18} />
    </div>
  </motion.div>
);

/**
 * 5. MAIN PAGE
 */
export default function EstateCommunityBoardPage() {
  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <MobileFrame>
      <Header />

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-32">
        {/* Stats Section - Bento Style */}
        <section className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-indigo-600 rounded-[2rem] p-5 text-white shadow-lg shadow-indigo-100">
            <p className="text-[10px] font-bold uppercase opacity-80 mb-1">Status</p>
            <p className="text-2xl font-black">Live</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-[2rem] p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Members</p>
            <p className="text-2xl font-black text-slate-900">1.2k</p>
          </div>
        </section>

        {/* Feed Header */}
        <div className="flex items-center justify-between mb-5 px-1">
          <h2 className="text-xl font-extrabold text-slate-900">Community Feed</h2>
          <button className="text-sm font-bold text-indigo-600">Filter</button>
        </div>

        {/* Dummy Feed */}
        <CommunityCard
          author="Security Chief"
          time="2h ago"
          tag="Notice"
          title="Upcoming Gate Maintenance"
          body="Please be informed that the main estate gate will undergo biometric sensor calibration this Saturday between 8 AM and 11 AM..."
        />
        <CommunityCard
          author="Janet Wilson"
          time="5h ago"
          tag="Discussion"
          title="Garden Club Meeting"
          body="Anyone interested in the monthly landscaping sync? We are meeting at the central park area to discuss the new flower beds."
        />
      </main>

      {/* FAB - Primary Action */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setComposeOpen(true)}
        className="fixed bottom-28 right-6 w-16 h-16 bg-indigo-600 text-white rounded-2xl shadow-2xl shadow-indigo-300 flex items-center justify-center z-40"
      >
        <Plus size={32} strokeWidth={3} />
      </motion.button>

      <BottomNav />

      {/* NATIVE BOTTOM SHEET COMPOSER */}
      <AnimatePresence>
        {composeOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setComposeOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[2.5rem] z-[70] shadow-2xl px-6 pt-4 pb-10"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-900">New Post</h2>
                <button onClick={() => setComposeOpen(false)} className="p-2 bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <form className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Title</label>
                  <input
                    autoFocus
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-900 font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    placeholder="What's the update?"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Message</label>
                  <textarea
                    rows={4}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-900 font-medium placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none"
                    placeholder="Write your message here..."
                  />
                </div>

                <div className="flex gap-2 mb-4">
                    <button type="button" className="p-4 bg-slate-100 rounded-2xl text-slate-500"><ImageIcon size={20}/></button>
                    <button type="button" className="p-4 bg-slate-100 rounded-2xl text-slate-500"><Send size={20}/></button>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
                >
                  Post to Board
                </motion.button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </MobileFrame>
  );
}