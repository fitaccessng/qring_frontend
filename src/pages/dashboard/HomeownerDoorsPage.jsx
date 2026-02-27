import { useEffect, useRef, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { env } from "../../config/env";
import { createHomeownerDoor, generateDoorQr, getHomeownerContext, getHomeownerDoors } from "../../services/homeownerService";
import QrPrintDesigner from "../../components/qr/QrPrintDesigner";

export default function HomeownerDoorsPage() {
  const [doors, setDoors] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyDoorId, setBusyDoorId] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedDoorId, setSelectedDoorId] = useState("");
  const [newDoorName, setNewDoorName] = useState("");
  const [creatingDoor, setCreatingDoor] = useState(false);
  const [activeDoorId, setActiveDoorId] = useState("");
  const [selectedQrId, setSelectedQrId] = useState("");
  const [managedByEstate, setManagedByEstate] = useState(false);
  const [estateName, setEstateName] = useState("");
  const [contextLoading, setContextLoading] = useState(true);
  const detailsSectionRef = useRef(null);

  const planDoorLimitReached = Boolean(
    subscription &&
      Number(subscription.maxDoors ?? 0) > 0 &&
      Number(subscription.usedDoors ?? 0) >= Number(subscription.maxDoors ?? 0)
  );
  const planQrLimitReached = Boolean(
    subscription &&
      Number(subscription.maxQrCodes ?? 0) > 0 &&
      Number(subscription.usedQrCodes ?? 0) >= Number(subscription.maxQrCodes ?? 0)
  );

  async function loadDoors() {
    setLoading(true);
    setError("");
    try {
      const data = await getHomeownerDoors();
      const fetchedDoors = data?.doors ?? [];
      setDoors(fetchedDoors);
      setSubscription(data?.subscription ?? null);
      if (data?.subscription?.managedByEstate) {
        setManagedByEstate(true);
        setEstateName(data?.subscription?.estateName || "");
      }
      if (!selectedDoorId && fetchedDoors.length > 0) {
        setSelectedDoorId(fetchedDoors[0].id);
      }
      if (!activeDoorId && fetchedDoors.length > 0) {
        setActiveDoorId(fetchedDoors[0].id);
      }
    } catch (requestError) {
      setError(requestError.message ?? "Failed to load doors");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDoors();
  }, []);

  useEffect(() => {
    let active = true;
    async function loadContext() {
      try {
        const data = await getHomeownerContext();
        if (!active) return;
        setManagedByEstate(Boolean(data?.managedByEstate));
        setEstateName(data?.estateName || "");
      } catch {
        if (!active) return;
        const rawUser = localStorage.getItem("qring_user");
        let fallbackManaged = false;
        try {
          const user = rawUser ? JSON.parse(rawUser) : null;
          fallbackManaged =
            typeof user?.email === "string" && user.email.toLowerCase().endsWith("@estate.useqring.online");
        } catch {
          fallbackManaged = false;
        }
        setManagedByEstate(fallbackManaged);
        setEstateName("");
      } finally {
        if (active) setContextLoading(false);
      }
    }
    loadContext();
    return () => {
      active = false;
    };
  }, []);

  async function handleCreateDoorAndQr(event) {
    event.preventDefault();
    if (planDoorLimitReached || planQrLimitReached) {
      setError(
        planDoorLimitReached
          ? `Door limit reached (${subscription?.maxDoors ?? 0}) for your ${subscription?.plan ?? "current"} plan.`
          : `QR limit reached (${subscription?.maxQrCodes ?? 0}) for your ${subscription?.plan ?? "current"} plan.`
      );
      return;
    }
    setCreatingDoor(true);
    setError("");
    setNotice("");

    try {
      const created = await createHomeownerDoor({
        name: newDoorName,
        generateQr: true,
        mode: "direct",
        plan: "single"
      });

      if (created?.door) {
        setDoors((prev) => [created.door, ...prev]);
        setSelectedDoorId(created.door.id);
        setActiveDoorId(created.door.id);
        if (created?.qr?.qr_id) setSelectedQrId(created.qr.qr_id);
        setNewDoorName("");
      }

      setSubscription((prev) =>
        prev
          ? {
              ...prev,
              usedDoors: (prev.usedDoors ?? 0) + 1,
              remainingDoors: Math.max((prev.remainingDoors ?? 0) - 1, 0),
              usedQrCodes: (prev.usedQrCodes ?? 0) + (created?.qr ? 1 : 0),
              remainingQrCodes: Math.max((prev.remainingQrCodes ?? 0) - (created?.qr ? 1 : 0), 0)
            }
          : prev
      );

      if (created?.qr?.qr_id) {
        const fullUrl = toScanUrl(created.qr.qr_id);
        try {
          await navigator.clipboard.writeText(fullUrl);
          setNotice(`Door created and QR copied: ${fullUrl}`);
        } catch {
          setNotice(`Door created with QR: ${fullUrl}`);
        }
      } else {
        setNotice("Door created successfully.");
      }
    } catch (requestError) {
      setError(requestError.message ?? "Failed to create door");
    } finally {
      setCreatingDoor(false);
    }
  }

  async function handleGenerateQr(doorId) {
    setBusyDoorId(doorId);
    setError("");
    setNotice("");

    try {
      const created = await generateDoorQr(doorId, { mode: "direct", plan: "single" });
      if (created?.qr_id) {
        const newQr = created.qr_id;
        setDoors((prev) =>
          prev.map((door) =>
            door.id === doorId
              ? { ...door, qr: Array.from(new Set([...(door.qr ?? []), newQr])) }
              : door
          )
        );
        setActiveDoorId(doorId);
        setSelectedQrId(newQr);
        setSubscription((prev) =>
          prev
            ? {
                ...prev,
                usedQrCodes: (prev.usedQrCodes ?? 0) + 1,
                remainingQrCodes: Math.max((prev.remainingQrCodes ?? 0) - 1, 0)
              }
            : prev
        );
        const fullUrl = toScanUrl(newQr);
        try {
          await navigator.clipboard.writeText(fullUrl);
          setNotice(`QR created and copied: ${fullUrl}`);
        } catch {
          setNotice(`QR created: ${fullUrl}`);
        }
      }
    } catch (requestError) {
      setError(requestError.message ?? "Failed to generate QR");
    } finally {
      setBusyDoorId("");
    }
  }

  const activeDoor = doors.find((door) => String(door.id) === String(activeDoorId)) ?? null;
  const selectedPreview =
    activeDoor && selectedQrId
      ? {
          qrId: selectedQrId,
          doorName: activeDoor.name,
          homeName: activeDoor.homeName,
          scanUrl: toScanUrl(selectedQrId)
        }
      : null;

  return (
    <AppShell title="Doors">
      {error ? (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {notice}
        </div>
      ) : null}
      {managedByEstate ? (
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          Door and QR creation are managed by your estate{estateName ? ` (${estateName})` : ""}.
        </div>
      ) : null}

      {subscription ? (
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subscription</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Plan: {subscription.plan} ({subscription.status})
              </p>
            </div>
            <div className="text-right text-xs text-slate-600 dark:text-slate-300">
              <p>Doors: {subscription.usedDoors}/{subscription.maxDoors}</p>
              <p>QR Codes: {subscription.usedQrCodes}/{subscription.maxQrCodes}</p>
            </div>
          </div>
          {subscription.overDoorLimit ? (
            <p className="mt-3 rounded-lg bg-warning/15 px-3 py-2 text-xs font-medium text-warning">
              You are above your plan door limit. Upgrade your subscription.
            </p>
          ) : null}
        </section>
      ) : null}

      {!contextLoading && !managedByEstate ? (
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
          <h2 className="font-heading text-lg font-bold sm:text-xl">Create Door</h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Enter a new door name and create it with a QR code.
          </p>
          <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleCreateDoorAndQr}>
            <input
              type="text"
              value={newDoorName}
              onChange={(event) => setNewDoorName(event.target.value)}
              placeholder="e.g. Front Gate"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-brand-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
              required
            />
            <button
              type="submit"
              disabled={creatingDoor || planDoorLimitReached || planQrLimitReached}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {creatingDoor ? "Creating..." : "Create Door + QR"}
            </button>
          </form>
        </section>
      ) : null}

      {/* <section className="mb-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
        <h2 className="font-heading text-lg font-bold sm:text-xl">Create QR Code For Door</h2>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Select a door and generate a QR code. The scan link will be copied automatically.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <select
            value={selectedDoorId}
            onChange={(event) => setSelectedDoorId(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-brand-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
          >
            {doors.map((door) => (
              <option key={door.id} value={door.id}>
                {door.name} ({door.homeName})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedDoorId || busyDoorId === selectedDoorId || (subscription?.remainingQrCodes ?? 1) <= 0}
            onClick={handleGenerateFromSection}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            {busyDoorId === selectedDoorId ? "Generating..." : "Generate QR"}
          </button>
        </div>
      </section> */}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 sm:p-5 text-sm text-slate-500 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
          Loading doors...
        </div>
      ) : doors.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 sm:p-5 text-sm text-slate-500 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
          No doors configured yet.
        </div>
      ) : (
        <section>
          <h2 className="mb-3 font-heading text-lg font-bold sm:text-xl">Doors Created</h2>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
            {doors.map((door) => (
              <article
                key={door.id}
                className="rounded-2xl border border-slate-200 bg-white/90 p-4 sm:p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/80"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-lg font-bold">{door.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">{door.homeName}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      door.state === "Online" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                    }`}
                  >
                    {door.state}
                  </span>
                </div>

                <p className="mt-4 text-xs uppercase tracking-wide text-slate-500">Linked QR Codes</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {door.qr?.length ? (
                    door.qr.map((qrId) => (
                      <span
                        key={`${door.id}-${qrId}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <img
                          src={buildQrImageUrl(toScanUrl(qrId), 40)}
                          alt={`QR ${qrId}`}
                          className="h-5 w-5 rounded"
                        />
                        <span>{qrId}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No QR linked</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveDoorId(door.id);
                    setSelectedQrId(door.qr?.[0] ?? "");
                    setTimeout(() => {
                      detailsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 0);
                  }}
                  className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
                >
                  View Door
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeDoor ? (
        <section ref={detailsSectionRef} className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-bold sm:text-xl">Door Details & QR Print</h2>
            <button
              type="button"
              onClick={() => {
                setActiveDoorId("");
                setSelectedQrId("");
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold dark:border-slate-700"
            >
              Close
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Door: {activeDoor.name} | QR: {selectedQrId || "None selected"}
          </p>

          <div className="mt-4 grid gap-4">
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                QR Codes Created
              </label>
              <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                {activeDoor.qr?.length ? (
                  activeDoor.qr.map((qrId) => (
                    <button
                      key={`${activeDoor.id}-pick-${qrId}`}
                      type="button"
                      onClick={() => setSelectedQrId(qrId)}
                      className={`flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs font-semibold transition ${
                        selectedQrId === qrId
                          ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                      }`}
                    >
                      <img
                        src={buildQrImageUrl(toScanUrl(qrId), 40)}
                        alt={`QR ${qrId}`}
                        className="h-8 w-8 rounded"
                      />
                      <span className="truncate">{qrId}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No QR codes for this door yet.</p>
                )}
              </div>
            </div>

            <QrPrintDesigner key={activeDoor.id} preview={selectedPreview} defaultLabel={activeDoor.homeName || ""} />
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

function buildQrImageUrl(value, size = 240) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
}

function toScanUrl(qrId) {
  const base = (env.publicAppUrl || window.location.origin || "").replace(/\/+$/, "");
  return `${base}/scan/${qrId}`;
}
