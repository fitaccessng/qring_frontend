import { useEffect, useMemo, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { fundWallet, getAdminOverview, listWallets, listWalletTransactions } from "../../services/adminService";
import { ApiError } from "../../services/apiClient";

export default function AdminPaymentsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [wallets, setWallets] = useState([]);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState("");
  const [funding, setFunding] = useState(false);
  const [fundNotice, setFundNotice] = useState("");
  const [walletUserId, setWalletUserId] = useState("");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletNote, setWalletNote] = useState("");
  const [walletTx, setWalletTx] = useState([]);
  const [walletTxLoading, setWalletTxLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const overview = await getAdminOverview();
        if (!active) return;
        setData(overview);
      } catch (requestError) {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.status === 404) {
          setError("Admin overview endpoint not found (404). Restart the backend server so /api/v1/admin/overview is available.");
        } else {
          setError(requestError.message ?? "Failed to load admin payments");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadWalletTx() {
      setWalletTxLoading(true);
      try {
        const rows = await listWalletTransactions(200);
        if (!active) return;
        setWalletTx(rows);
      } catch {
        if (!active) return;
        setWalletTx([]);
      } finally {
        if (active) setWalletTxLoading(false);
      }
    }
    loadWalletTx();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadWallets() {
      setWalletLoading(true);
      setWalletError("");
      try {
        const rows = await listWallets();
        if (!active) return;
        setWallets(rows);
      } catch (requestError) {
        if (!active) return;
        setWalletError(requestError.message ?? "Failed to load wallets");
      } finally {
        if (active) setWalletLoading(false);
      }
    }
    loadWallets();
    return () => {
      active = false;
    };
  }, []);

  async function handleFundWallet(event) {
    event.preventDefault();
    const amount = Number(walletAmount);
    if (!walletUserId || !amount || amount <= 0) return;
    setFunding(true);
    setFundNotice("");
    setWalletError("");
    try {
      await fundWallet({
        userId: walletUserId,
        amount,
        note: walletNote.trim() || undefined
      });
      setFundNotice("Wallet funded.");
      setWalletAmount("");
      setWalletNote("");
      const rows = await listWallets();
      setWallets(rows);
      const tx = await listWalletTransactions(200);
      setWalletTx(tx);
    } catch (requestError) {
      setWalletError(requestError.message ?? "Failed to fund wallet");
    } finally {
      setFunding(false);
    }
  }

  const totalAmount = data?.payments?.totalAmount ?? 0;

  const homeownerHistory = useMemo(() => {
    const rows = data?.payments?.homeownerHistory ?? [];
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.userName, row.userEmail, row.plan, row.status].join(" ").toLowerCase().includes(term)
    );
  }, [data, query]);

  const estateHistory = useMemo(() => {
    const rows = data?.payments?.estateHistory ?? [];
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.userName, row.userEmail, row.plan, row.status].join(" ").toLowerCase().includes(term)
    );
  }, [data, query]);

  return (
    <AppShell title="Payments">
      {error ? (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Payments" value={loading ? "..." : formatCurrency(totalAmount)} />
        <MetricCard label="Homeowner Records" value={loading ? "..." : homeownerHistory.length} />
        <MetricCard label="Estate Records" value={loading ? "..." : estateHistory.length} />
        <MetricCard label="Last Updated" value={loading ? "..." : "now"} />
      </section>

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-bold sm:text-xl">Payment History</h2>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, plan, status..."
            className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading payments...</p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <PaymentsTable title="Homeowner Payments" rows={homeownerHistory} />
            <PaymentsTable title="Estate Payments" rows={estateHistory} />
          </div>
        )}
      </section>

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-bold sm:text-xl">Wallet Funding</h2>
          {fundNotice ? <span className="text-xs font-semibold text-emerald-600">{fundNotice}</span> : null}
        </div>
        {walletError ? (
          <div className="mb-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {walletError}
          </div>
        ) : null}
        <form onSubmit={handleFundWallet} className="grid gap-3 sm:grid-cols-[1.2fr_0.6fr_1fr_auto]">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Homeowner</span>
            <select
              value={walletUserId}
              onChange={(event) => setWalletUserId(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              required
            >
              <option value="">Select homeowner</option>
              {(data?.homeowners ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.fullName || row.email}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Amount (NGN)</span>
            <input
              value={walletAmount}
              onChange={(event) => setWalletAmount(event.target.value)}
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Note (optional)</span>
            <input
              value={walletNote}
              onChange={(event) => setWalletNote(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              placeholder="Funding top-up"
            />
          </label>
          <button
            type="submit"
            disabled={funding || !walletUserId || !walletAmount}
            className="mt-5 h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900 sm:mt-6"
          >
            {funding ? "Funding..." : "Fund Wallet"}
          </button>
        </form>

        <div className="mt-4">
          {walletLoading ? (
            <p className="text-sm text-slate-500">Loading wallets...</p>
          ) : wallets.length === 0 ? (
            <p className="text-sm text-slate-500">No wallets yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                    <th className="py-2 font-semibold">User</th>
                    <th className="py-2 font-semibold">Email</th>
                    <th className="py-2 font-semibold">Balance</th>
                    <th className="py-2 font-semibold">Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((row) => (
                    <tr key={row.userId} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 font-semibold">{row.userName || "-"}</td>
                      <td className="py-2">{row.userEmail || "-"}</td>
                      <td className="py-2">{formatCurrency(row.balance)}</td>
                      <td className="py-2">{row.currency || "NGN"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold sm:text-xl">Wallet Transactions</h2>
        </div>
        {walletTxLoading ? (
          <p className="text-sm text-slate-500">Loading transactions...</p>
        ) : walletTx.length === 0 ? (
          <p className="text-sm text-slate-500">No wallet transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                  <th className="py-2 font-semibold">User</th>
                  <th className="py-2 font-semibold">Email</th>
                  <th className="py-2 font-semibold">Type</th>
                  <th className="py-2 font-semibold">Amount</th>
                  <th className="py-2 font-semibold">Balance After</th>
                  <th className="py-2 font-semibold">Note</th>
                  <th className="py-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {walletTx.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 font-semibold">{row.userName || "-"}</td>
                    <td className="py-2">{row.userEmail || "-"}</td>
                    <td className="py-2">{row.type || "-"}</td>
                    <td className="py-2">{formatCurrency(row.amount)}</td>
                    <td className="py-2">{formatCurrency(row.balanceAfter)}</td>
                    <td className="py-2">{row.note || "-"}</td>
                    <td className="py-2">{formatTime(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function MetricCard({ label, value }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black">{value ?? 0}</p>
    </article>
  );
}

function PaymentsTable({ title, rows }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-950/30">
      <h3 className="mb-3 font-heading text-base font-bold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No records.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                <th className="py-2 font-semibold">User</th>
                <th className="py-2 font-semibold">Email</th>
                <th className="py-2 font-semibold">Plan</th>
                <th className="py-2 font-semibold">Status</th>
                <th className="py-2 font-semibold">Amount</th>
                <th className="py-2 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((row) => (
                <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 font-semibold">{row.userName || "-"}</td>
                  <td className="py-2">{row.userEmail || "-"}</td>
                  <td className="py-2">{row.plan || "-"}</td>
                  <td className="py-2">{row.status || "-"}</td>
                  <td className="py-2">{formatCurrency(row.amount)}</td>
                  <td className="py-2">{formatTime(row.startsAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `N${new Intl.NumberFormat("en-NG").format(amount)}`;
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}


