import { useEffect, useMemo, useState } from "react";
import AppShell from "../../layouts/AppShell";
import {
  addEstateDoor,
  createEstateSharedQr,
  getEstateOverview,
  provisionEstateDoor,
  updateEstateDoorAdminProfile
} from "../../services/estateService";

function qrImageUrl(value, size = 140) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
}

export default function EstateDoorsPage() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [provisionMode, setProvisionMode] = useState(false);
  const [createdQr, setCreatedQr] = useState(null);
  const [sharedQr, setSharedQr] = useState(null);
  const [editingDoorId, setEditingDoorId] = useState("");
  const [editingBusy, setEditingBusy] = useState(false);
  const [adminForm, setAdminForm] = useState({
    doorName: "",
    homeownerName: "",
    homeownerEmail: "",
    newPassword: ""
  });
  const [form, setForm] = useState({
    estateId: "",
    homeId: "",
    name: "",
    homeName: "",
    homeownerFullName: "",
    homeownerUsername: "",
    homeownerPassword: ""
  });

  async function load() {
    const data = await getEstateOverview();
    setOverview(data);
    if (!form.estateId && data?.estates?.length) {
      setForm((prev) => ({ ...prev, estateId: data.estates[0].id }));
    }
    if (!form.homeId && data?.homes?.length) {
      setForm((prev) => ({ ...prev, homeId: data.homes[0].id }));
    }
  }

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message ?? "Failed to load door data"));
  }, []);

  const homesByEstate = useMemo(
    () => (overview?.homes ?? []).filter((home) => !form.estateId || home.estateId === form.estateId),
    [overview, form.estateId]
  );

  const doors = useMemo(() => overview?.doors ?? [], [overview]);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    setCreatedQr(null);
    try {
      if (provisionMode) {
        const data = await provisionEstateDoor({
          estateId: form.estateId,
          homeName: form.homeName,
          doorName: form.name,
          homeownerFullName: form.homeownerFullName,
          homeownerUsername: form.homeownerUsername,
          homeownerPassword: form.homeownerPassword
        });
        if (data?.qr?.qrId) {
          setCreatedQr({
            qrId: data.qr.qrId,
            scanUrl: `${window.location.origin}/scan/${data.qr.qrId}`,
            doorName: data?.door?.name ?? form.name
          });
        }
        setNotice(`Door created and linked to ${data?.homeowner?.username ?? "homeowner"}.`);
      } else {
        const data = await addEstateDoor({
          estateId: form.estateId,
          homeId: form.homeId,
          name: form.name,
          generateQr: true,
          mode: "direct",
          plan: "single"
        });
        if (data?.qr?.qrId) {
          setCreatedQr({
            qrId: data.qr.qrId,
            scanUrl: `${window.location.origin}/scan/${data.qr.qrId}`,
            doorName: data?.door?.name ?? form.name
          });
        }
        setNotice("Door created successfully.");
      }
      setForm((prev) => ({
        ...prev,
        name: "",
        homeName: "",
        homeownerFullName: "",
        homeownerUsername: "",
        homeownerPassword: ""
      }));
      await load();
    } catch (requestError) {
      setError(requestError.message ?? "Failed to create door");
    } finally {
      setBusy(false);
    }
  }

  async function generateSharedQr() {
    if (!form.estateId) return;
    setError("");
    setNotice("");
    try {
      const data = await createEstateSharedQr(form.estateId);
      setSharedQr({
        ...data,
        fullScanUrl: `${window.location.origin}${data.scanUrl}`
      });
      setNotice("Estate shared QR generated. Visitors can pick a door after scanning.");
      await load();
    } catch (requestError) {
      setError(requestError.message ?? "Failed to generate estate shared QR");
    }
  }

  async function saveAdminProfile(event) {
    event.preventDefault();
    if (!editingDoorId) return;
    setEditingBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        doorName: adminForm.doorName || undefined,
        homeownerName: adminForm.homeownerName || undefined,
        homeownerEmail: adminForm.homeownerEmail || undefined,
        newPassword: adminForm.newPassword || undefined
      };
      await updateEstateDoorAdminProfile(editingDoorId, payload);
      setNotice("Door admin profile updated successfully.");
      setEditingDoorId("");
      setAdminForm({ doorName: "", homeownerName: "", homeownerEmail: "", newPassword: "" });
      await load();
    } catch (requestError) {
      setError(requestError.message ?? "Failed to update door admin profile");
    } finally {
      setEditingBusy(false);
    }
  }

  function startEditDoor(door) {
    setEditingDoorId(door.id);
    setAdminForm({
      doorName: door.name ?? "",
      homeownerName: door.homeownerName ?? "",
      homeownerEmail: door.homeownerEmail ?? "",
      newPassword: ""
    });
  }

  function printDoorQr(door, qrId) {
    const scanUrl = `${window.location.origin}/scan/${qrId}`;
    const html = `
      <html>
        <head>
          <title>Print Door QR</title>
          <style>
            body{font-family:Arial,sans-serif;padding:24px}
            .card{width:340px;border:1px solid #cbd5e1;border-radius:16px;padding:16px}
            .title{font-size:14px;font-weight:700;text-align:center;margin-bottom:8px}
            .meta{font-size:12px;color:#475569;text-align:center;margin-bottom:8px}
            .qr{display:block;width:280px;height:280px;margin:0 auto;background:#fff;padding:8px;border-radius:10px}
            .url{font-size:10px;color:#64748b;text-align:center;margin-top:8px;word-break:break-all}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="title">${door.name}</div>
            <div class="meta">${door.homeName || ""}</div>
            <img class="qr" src="${qrImageUrl(scanUrl, 280)}" alt="QR" />
            <div class="url">${scanUrl}</div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;
    const printWindow = window.open("", "_blank", "width=720,height=860");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  async function copyLoginDetails(door) {
    const loginLink = `${door.loginLink}?email=${encodeURIComponent(door.homeownerEmail || "")}`;
    const payload = `Homeowner: ${door.homeownerName || "N/A"}\nEmail: ${door.homeownerEmail || "N/A"}\nLogin: ${loginLink}`;
    try {
      await navigator.clipboard.writeText(payload);
      setNotice(`Login details copied for ${door.name}.`);
      setError("");
    } catch {
      setError("Unable to copy login details. Please copy manually.");
    }
  }

  function printSharedEstateQr() {
    if (!sharedQr) return;
    const estateName =
      (overview?.estates ?? []).find((item) => item.id === form.estateId)?.name ?? "Estate Entry";
    const qrSrc = qrImageUrl(sharedQr.fullScanUrl, 300);

    const html = `
      <html>
        <head>
          <title>Print Shared Estate QR</title>
          <style>
            body{font-family:Inter,Arial,sans-serif;padding:24px;background:#fff;color:#0f172a}
            .card{width:380px;border:1px solid #cbd5e1;border-radius:18px;padding:18px}
            .brand{display:flex;align-items:center;gap:10px;margin-bottom:8px}
            .logo{width:30px;height:30px;border-radius:9px;background:#0f172a;color:#fff;display:grid;place-items:center;font-weight:800}
            .name{font-size:18px;font-weight:800}
            .subtitle{font-size:12px;color:#475569;margin-bottom:10px}
            .title{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#334155;text-align:center;margin:8px 0}
            .qr{display:block;width:320px;height:320px;margin:0 auto;background:#fff;padding:10px;border-radius:12px;border:1px solid #e2e8f0}
            .steps{margin-top:10px;font-size:11px;color:#475569;line-height:1.5}
            .url{font-size:10px;color:#64748b;text-align:center;margin-top:8px;word-break:break-all}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">
              <div class="logo">Q</div>
              <div>
                <div class="name">Qring</div>
                <div class="subtitle">${estateName}</div>
              </div>
            </div>
            <div class="title">Shared Estate Access QR</div>
            <img class="qr" src="${qrSrc}" alt="Shared Estate QR" />
            <div class="steps">
              1. Visitor scans this QR<br/>
              2. Selects door from list<br/>
              3. Sends request to specific homeowner
            </div>
            <div class="url">${sharedQr.fullScanUrl}</div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=760,height=900");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <AppShell title="Estate Doors">
      {error ? <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{notice}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold sm:text-xl">Create Door</h2>
            <p className="mt-1 text-sm text-slate-500">Create doors and provision homeowner login in one flow.</p>
          </div>
          <button
            type="button"
            onClick={() => setProvisionMode((prev) => !prev)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-700"
          >
            {provisionMode ? "Use Existing Homeowner" : "Provision New Homeowner Login"}
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
          <Select
            label="Estate"
            value={form.estateId}
            onChange={(value) => setForm((prev) => ({ ...prev, estateId: value }))}
            options={(overview?.estates ?? []).map((item) => ({ value: item.id, label: item.name }))}
          />
          {!provisionMode ? (
            <Select
              label="Home"
              value={form.homeId}
              onChange={(value) => setForm((prev) => ({ ...prev, homeId: value }))}
              options={homesByEstate.map((item) => ({
                value: item.id,
                label: `${item.name} (${item.homeownerName || "No homeowner"})`
              }))}
            />
          ) : (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Home Name</span>
              <input
                value={form.homeName}
                onChange={(event) => setForm((prev) => ({ ...prev, homeName: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Door Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              required
            />
          </label>

          {provisionMode ? (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Homeowner Full Name</span>
                <input
                  value={form.homeownerFullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, homeownerFullName: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Username</span>
                <input
                  value={form.homeownerUsername}
                  onChange={(event) => setForm((prev) => ({ ...prev, homeownerUsername: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Password</span>
                <input
                  type="password"
                  value={form.homeownerPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, homeownerPassword: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  required
                />
              </label>
            </>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            {busy ? "Saving..." : "Create Door"}
          </button>
        </form>
      </section>

      {createdQr ? (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
          <h3 className="font-heading text-base font-bold">Generated QR</h3>
          <p className="text-xs text-slate-500">{createdQr.doorName}</p>
          <div className="mt-3 inline-flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <img src={qrImageUrl(createdQr.scanUrl, 180)} alt={createdQr.qrId} className="h-44 w-44 rounded bg-white p-2" />
            <p className="mt-2 text-xs font-semibold">{createdQr.qrId}</p>
          </div>
        </section>
      ) : null}

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-base font-bold">Estate Shared Entry QR</h3>
            <p className="text-xs text-slate-500">One QR for the estate. Visitors scan, pick door, then request access.</p>
          </div>
          <button
            type="button"
            onClick={generateSharedQr}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-900"
          >
            Generate Shared QR
          </button>
        </div>
        {sharedQr ? (
          <div className="mt-3 inline-flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <img src={qrImageUrl(sharedQr.fullScanUrl, 180)} alt={sharedQr.qrId} className="h-44 w-44 rounded bg-white p-2" />
            <p className="mt-2 text-xs font-semibold">{sharedQr.qrId}</p>
            <p className="text-[11px] text-slate-500">{sharedQr.fullScanUrl}</p>
            <button
              type="button"
              onClick={printSharedEstateQr}
              className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-900"
            >
              Print Shared Estate QR
            </button>
          </div>
        ) : null}
      </section>

      <section className="mt-4">
        <h3 className="mb-3 font-heading text-lg font-bold">Doors Created</h3>
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {doors.map((door) => {
            const firstQr = door.qr?.[0];
            const loginLink = `${door.loginLink}?email=${encodeURIComponent(door.homeownerEmail || "")}`;
            return (
              <article key={door.id} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-heading text-lg font-bold">{door.name}</p>
                    <p className="text-xs text-slate-500">{door.homeName} | {door.state}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditDoor(door)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold dark:border-slate-700"
                  >
                    Admin Profile
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">Homeowner: {door.homeownerName || "N/A"}</p>
                <p className="text-xs text-slate-500">Email: {door.homeownerEmail || "N/A"}</p>
                <a href={loginLink} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-brand-600 dark:text-brand-300">
                  Estate Homeowner Login Link
                </a>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => copyLoginDetails(door)}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold dark:border-slate-700"
                  >
                    Copy Login Details
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {door.qr?.length ? door.qr.map((qrId) => (
                    <button
                      key={`${door.id}-${qrId}`}
                      type="button"
                      onClick={() => printDoorQr(door, qrId)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                    >
                      Print {qrId}
                    </button>
                  )) : (
                    <span className="text-xs text-slate-500">No QR yet</span>
                  )}
                  {firstQr ? (
                    <img
                      src={qrImageUrl(`${window.location.origin}/scan/${firstQr}`, 64)}
                      alt={firstQr}
                      className="h-12 w-12 rounded border border-slate-200 bg-white p-1 dark:border-slate-700"
                    />
                  ) : null}
                </div>
              </article>
            );
          })}
          {doors.length === 0 ? <p className="text-sm text-slate-500">No doors created yet.</p> : null}
        </div>
      </section>

      {editingDoorId ? (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold">Door Admin Profile</h3>
            <button
              type="button"
              onClick={() => setEditingDoorId("")}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold dark:border-slate-700"
            >
              Close
            </button>
          </div>
          <form onSubmit={saveAdminProfile} className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Door Name</span>
              <input
                value={adminForm.doorName}
                onChange={(event) => setAdminForm((prev) => ({ ...prev, doorName: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Homeowner Name</span>
              <input
                value={adminForm.homeownerName}
                onChange={(event) => setAdminForm((prev) => ({ ...prev, homeownerName: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Homeowner Email</span>
              <input
                type="email"
                value={adminForm.homeownerEmail}
                onChange={(event) => setAdminForm((prev) => ({ ...prev, homeownerEmail: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Change Password</span>
              <input
                type="password"
                value={adminForm.newPassword}
                onChange={(event) => setAdminForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                placeholder="Leave empty to keep current password"
              />
            </label>
            <button
              type="submit"
              disabled={editingBusy}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {editingBusy ? "Updating..." : "Update Admin Profile"}
            </button>
          </form>
        </section>
      ) : null}
    </AppShell>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        required
      >
        {options.length === 0 ? <option value="">No options available</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
