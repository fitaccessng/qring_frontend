import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import { env } from "../../config/env";
import {
  addEstateDoor,
  createEstateSharedQr,
  getEstateOverview,
  updateEstateDoorAdminProfile
} from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";

function qrImageUrl(value, size = 140) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
}

export default function EstateDoorsPage() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
    homeownerId: "",
    name: ""
  });

  async function load() {
    const data = await getEstateOverview();
    setOverview(data);
    if (!form.estateId && data?.estates?.length) {
      setForm((prev) => ({ ...prev, estateId: data.estates[0].id }));
    }
  }

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message ?? "Failed to load door data"));
  }, []);

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  const homesByEstate = useMemo(
    () => (overview?.homes ?? []).filter((home) => !form.estateId || home.estateId === form.estateId),
    [overview, form.estateId]
  );
  const homeownerOptions = useMemo(() => {
    const byHomeowner = new Map();
    homesByEstate.forEach((home) => {
      if (!home?.homeownerId) return;
      if (!byHomeowner.has(home.homeownerId)) {
        byHomeowner.set(home.homeownerId, {
          homeownerId: home.homeownerId,
          homeownerName: home.homeownerName || "Homeowner",
          homeownerEmail: home.homeownerEmail || "",
          homeId: home.id,
          homeName: home.name || "Home",
        });
      }
    });
    return Array.from(byHomeowner.values());
  }, [homesByEstate]);
  const hasHomeownersInEstate = homeownerOptions.length > 0;

  useEffect(() => {
    if (homeownerOptions.length === 0) return;
    const hasSelected = homeownerOptions.some((row) => row.homeownerId === form.homeownerId);
    if (hasSelected) return;
    setForm((prev) => ({ ...prev, homeownerId: homeownerOptions[0].homeownerId }));
  }, [form.homeownerId, homeownerOptions]);

  const doors = useMemo(() => overview?.doors ?? [], [overview]);
  const selectedEstate = useMemo(
    () => (overview?.estates ?? []).find((item) => item.id === form.estateId) ?? null,
    [overview, form.estateId]
  );
  const selectedEstateHomeIds = useMemo(() => new Set(homesByEstate.map((home) => home.id)), [homesByEstate]);
  const selectedEstateDoors = useMemo(
    () => doors.filter((door) => !form.estateId || selectedEstateHomeIds.has(door.homeId)),
    [doors, form.estateId, selectedEstateHomeIds]
  );

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setCreatedQr(null);
    try {
      const selectedHomeowner = homeownerOptions.find((row) => row.homeownerId === form.homeownerId);
      if (!selectedHomeowner?.homeId) {
        throw new Error("Select a homeowner linked to a home before creating a door.");
      }
      const data = await addEstateDoor({
        estateId: form.estateId,
        homeId: selectedHomeowner.homeId,
        name: form.name,
        generateQr: true,
        mode: "direct",
        plan: "single"
      });
      if (data?.qr?.qrId) {
        setCreatedQr({
          qrId: data.qr.qrId,
          scanUrl: toScanUrl(data.qr.qrId),
          doorName: data?.door?.name ?? form.name
        });
      }
      if (data?.door?.id) {
        setOverview((prev) => {
          if (!prev) return prev;
          const home = (prev.homes ?? []).find((row) => String(row.id) === String(selectedHomeowner.homeId));
          const nextDoor = {
            id: data.door.id,
            name: data.door.name ?? form.name,
            homeId: selectedHomeowner.homeId,
            homeName: home?.name || "",
            homeownerId: home?.homeownerId || "",
            homeownerName: home?.homeownerName || "",
            homeownerEmail: home?.homeownerEmail || "",
            loginLink: `${getPublicBaseUrl()}/login`,
            state: data?.door?.state || "Online",
            qr: data?.qr?.qrId ? [data.qr.qrId] : []
          };
          return {
            ...prev,
            doors: [nextDoor, ...(prev.doors ?? []).filter((row) => row.id !== nextDoor.id)]
          };
        });
      }
      showSuccess("Door created successfully.");
      setForm((prev) => ({
        ...prev,
        name: ""
      }));
      load().catch(() => {});
    } catch (requestError) {
      setError(requestError.message ?? "Failed to create door");
    } finally {
      setBusy(false);
    }
  }

  async function generateSharedQr() {
    if (!form.estateId) return;
    setError("");
    try {
      const data = await createEstateSharedQr(form.estateId);
      setSharedQr({
        ...data,
        fullScanUrl: toPublicUrl(data.scanUrl)
      });
      showSuccess("Estate shared QR generated. Visitors can pick a door after scanning.");
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
    try {
      const payload = {
        doorName: adminForm.doorName || undefined,
        homeownerName: adminForm.homeownerName || undefined,
        homeownerEmail: adminForm.homeownerEmail || undefined,
        newPassword: adminForm.newPassword || undefined
      };
      await updateEstateDoorAdminProfile(editingDoorId, payload);
      showSuccess("Door admin profile updated successfully.");
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
    const scanUrl = toScanUrl(qrId);
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
      showSuccess(`Login details copied for ${door.name}.`);
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
      <div className="mx-auto max-w-7xl space-y-6">

        <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 text-white dark:bg-indigo-600">
          <div className="relative z-10">
            <h2 style={{color: "white"}} className="text-2xl font-bold tracking-tight">Estate Doors</h2>
            <p className="mt-2 text-sm text-slate-200 dark:text-indigo-100">Create doors for existing homeowners. Each door gets a QR code automatically.</p>
          </div>
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
        <div>
          <h2 className="font-heading text-lg font-bold sm:text-xl text-slate-900 dark:text-white">Create Door</h2>
          <p className="mt-1 text-sm text-slate-500">
            Flow: create homeowner, assign homeowner to a home, then create a door for that home.
          </p>
        </div>
        {!hasHomeownersInEstate ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-200">
            No homeowner record is available for this estate yet. Create homeowner in{" "}
            <Link to="/dashboard/estate/invites" className="font-semibold underline">
              Create / Invite Homeowners
            </Link>
            {" "}and then add or confirm a home in{" "}
            <Link to="/dashboard/estate/homes" className="font-semibold underline">
              Multi-Home
            </Link>
            .
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
          <Select
            label="Estate"
            value={form.estateId}
            onChange={(value) => setForm((prev) => ({ ...prev, estateId: value }))}
            options={(overview?.estates ?? []).map((item) => ({ value: item.id, label: item.name }))}
          />
          <Select
            label="Homeowner"
            value={form.homeownerId}
            onChange={(value) => setForm((prev) => ({ ...prev, homeownerId: value }))}
            options={homeownerOptions.map((item) => ({
              value: item.homeownerId,
              label: `${item.homeownerName} (${item.homeName})`
            }))}
          />

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Door Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
              required
            />
          </label>

          <button
            type="submit"
            disabled={busy || !hasHomeownersInEstate}
            className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            {busy ? "Saving..." : "Create Door"}
          </button>
        </form>
      </section>

      {createdQr ? (
        <section className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90">
          <h3 className="font-heading text-base font-bold">Generated QR</h3>
          <p className="text-xs text-slate-500">{createdQr.doorName}</p>
          <div className="mt-3 inline-flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <img src={qrImageUrl(createdQr.scanUrl, 180)} alt={createdQr.qrId} className="h-44 w-44 rounded bg-white p-2" />
            <p className="mt-2 text-xs font-semibold">{createdQr.qrId}</p>
          </div>
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-base font-bold">Estate Shared Entry QR</h3>
            <p className="text-xs text-slate-500">One QR for the estate. Visitors scan, pick a configured door, then request access.</p>
          </div>
          <button
            type="button"
            onClick={generateSharedQr}
            disabled={!selectedEstateDoors.length}
            className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-all active:scale-95 dark:bg-white dark:text-slate-900"
          >
            Generate Shared QR
          </button>
        </div>
        {!selectedEstateDoors.length ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-200">
            {selectedEstate?.name || "This estate"} does not have any doors yet. Estate QR works after you create at least one homeowner-linked home and one door.
          </div>
        ) : null}
        {sharedQr ? (
          <div className="mt-3 inline-flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <img src={qrImageUrl(sharedQr.fullScanUrl, 180)} alt={sharedQr.qrId} className="h-44 w-44 rounded bg-white p-2" />
            <p className="mt-2 text-xs font-semibold">{sharedQr.qrId}</p>
            <p className="text-[11px] text-slate-500">{sharedQr.fullScanUrl}</p>
            <button
              type="button"
              onClick={printSharedEstateQr}
              className="mt-3 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-all active:scale-95 dark:bg-white dark:text-slate-900"
            >
              Print Shared Estate QR
            </button>
          </div>
        ) : null}
      </section>

      <section>
        <h3 className="mb-3 font-heading text-lg font-bold">Doors Created</h3>
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {doors.map((door) => {
            const firstQr = door.qr?.[0];
            const loginLink = `${door.loginLink}?email=${encodeURIComponent(door.homeownerEmail || "")}`;
            return (
              <article key={door.id} className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-heading text-lg font-bold">{door.name}</p>
                    <p className="text-xs text-slate-500">{door.homeName} | {door.state}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditDoor(door)}
                    className="rounded-2xl border border-slate-300 px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 dark:border-slate-700"
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
                    className="rounded-2xl border border-slate-300 px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 dark:border-slate-700"
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
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold transition-all active:scale-95 dark:border-slate-700 dark:bg-slate-800"
                    >
                      Print {qrId}
                    </button>
                  )) : (
                    <span className="text-xs text-slate-500">No QR yet</span>
                  )}
                  {firstQr ? (
                    <img
                      src={qrImageUrl(toScanUrl(firstQr), 64)}
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
        <section className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-heading text-lg font-bold">Door Admin Profile</h3>
            <button
              type="button"
              onClick={() => setEditingDoorId("")}
              className="rounded-2xl border border-slate-300 px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 dark:border-slate-700"
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
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Homeowner Name</span>
              <input
                value={adminForm.homeownerName}
                onChange={(event) => setAdminForm((prev) => ({ ...prev, homeownerName: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Homeowner Email</span>
              <input
                type="email"
                value={adminForm.homeownerEmail}
                onChange={(event) => setAdminForm((prev) => ({ ...prev, homeownerEmail: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Change Password</span>
              <input
                type="password"
                value={adminForm.newPassword}
                onChange={(event) => setAdminForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                placeholder="Leave empty to keep current password"
              />
            </label>
            <button
              type="submit"
              disabled={editingBusy}
              className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {editingBusy ? "Updating..." : "Update Admin Profile"}
            </button>
          </form>
        </section>
      ) : null}
      </div>
    </AppShell>
  );
}

function getPublicBaseUrl() {
  return (env.publicAppUrl || window.location.origin || "").replace(/\/+$/, "");
}

function toScanUrl(qrId) {
  return `${getPublicBaseUrl()}/scan/${qrId}`;
}

function toPublicUrl(path) {
  if (!path) return getPublicBaseUrl();
  if (/^https?:\/\//i.test(path)) return path;
  return `${getPublicBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
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



