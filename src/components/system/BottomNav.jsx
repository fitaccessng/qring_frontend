import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export default function PremiumBottomNav({ items = [] }) {
  const location = useLocation();

  if (!Array.isArray(items) || items.length === 0) return null;

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
      <div className="mx-auto flex w-full max-w-md items-center justify-between rounded-[24px] border border-neutral-200/60 bg-white/80 px-2 py-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.12)] backdrop-blur-lg dark:border-neutral-800/50 dark:bg-neutral-950/80">
        {items.map((item) => {
          const Icon = item.icon;
          
          // Determine active state manually for Framer Motion LayoutId matching
          // Supports custom rule or fallback to strict matching
          const isItemActive = item.end ?? true 
            ? location.pathname === item.to 
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end ?? true}
              onClick={handleScrollToTop}
              className="relative flex flex-1 flex-col items-center justify-center rounded-xl py-2 text-center transition-colors duration-200"
            >
              {({ isActive }) => (
                <motion.div 
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center justify-center z-10"
                >
                  {/* Icon Area */}
                  <div
                    className={`flex items-center justify-center transition-colors duration-200 ${
                      isActive 
                        ? "text-neutral-900 dark:text-neutral-50" 
                        : "text-neutral-400 dark:text-neutral-500"
                    }`}
                  >
                    <Icon 
                      className="h-5 w-5" 
                      strokeWidth={isActive ? 2.25 : 1.75} 
                    />
                  </div>
                  
                  {/* Label Text */}
                  <span 
                    className={`mt-1 text-[11px] font-medium transition-colors duration-200 ${
                      isActive 
                        ? "text-neutral-900 font-semibold dark:text-neutral-50" 
                        : "text-neutral-400 dark:text-neutral-500"
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Smart Sliding Active Indicator Pod */}
                  {isItemActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-0 -z-10 rounded-2xl bg-neutral-100 dark:bg-neutral-900"
                    />
                  )}
                </motion.div>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}