export default function StickyCTA({ children }) {
  if (!children) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.8rem+env(safe-area-inset-bottom))] z-40 px-4">
      <div className="pointer-events-auto mx-auto w-full max-w-xl">{children}</div>
    </div>
  );
}
