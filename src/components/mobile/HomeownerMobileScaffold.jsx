export default function ResidentMobileScaffold({
  topBar,
  children,
  navItems,
  floatingAction = null,
  maxWidthClassName = "max-w-xl",
  className = ""
}) {
  return (
    <div className={`relative min-h-[100dvh] overflow-x-hidden text-slate-900 ${className}`}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(37,93,173,0.14),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(1,107,84,0.10),_transparent_28%)]" />
      <div className={`mx-auto w-full ${maxWidthClassName}`}>
        {topBar}
        <main className="px-4 pb-32 pt-4 sm:px-6">{children}</main>
      </div>

      {floatingAction ? <div className="fixed bottom-28 right-5 z-40 sm:right-8">{floatingAction}</div> : null}
    </div>
  );
}
