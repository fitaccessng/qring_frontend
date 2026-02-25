export default function LoaderPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-md animate-screen-enter">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-300">Loading</p>
        <h1 className="mt-3 font-heading text-3xl font-extrabold">Preparing your workspace</h1>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-[qring-loader_1.1s_ease-in-out_infinite] rounded-full bg-brand-500" />
        </div>
        <div className="mt-8 space-y-3">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return <div className="h-20 animate-pulse rounded-2xl bg-white/10" />;
}
