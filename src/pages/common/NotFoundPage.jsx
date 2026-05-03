import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h1 className="font-heading text-3xl font-bold">404</h1>
        <p className="mt-2 text-sm text-slate-500">Page not found.</p>
        <Link to="/" className="mt-5 inline-block rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white">
          Go to Landing Page
        </Link>
      </div>
    </div>
  );
}
