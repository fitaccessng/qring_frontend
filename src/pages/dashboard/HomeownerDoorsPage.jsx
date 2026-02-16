import { useEffect, useRef, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { createHomeownerDoor, generateDoorQr, getHomeownerContext, getHomeownerDoors } from "../../services/homeownerService";

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
  const [printOptions, setPrintOptions] = useState({
    size: "240",
    shape: "rounded"
  });
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
        const fullUrl = `${window.location.origin}/scan/${created.qr.qr_id}`;
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
        const fullUrl = `${window.location.origin}/scan/${newQr}`;
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

  async function handleGenerateFromSection() {
    if (!selectedDoorId) return;
    await handleGenerateQr(selectedDoorId);
  }

  const activeDoor = doors.find((door) => String(door.id) === String(activeDoorId)) ?? null;
  const selectedPreview =
    activeDoor && selectedQrId
      ? {
          qrId: selectedQrId,
          doorName: activeDoor.name,
          scanUrl: `${window.location.origin}/scan/${selectedQrId}`
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
                          src={buildQrImageUrl(`${window.location.origin}/scan/${qrId}`, 40)}
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

          <div className="mt-4 grid gap-4 lg:grid-cols-[300px_1fr]">
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
                        src={buildQrImageUrl(`${window.location.origin}/scan/${qrId}`, 40)}
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

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Print Size
                <select
                  value={printOptions.size}
                  onChange={(event) => setPrintOptions((prev) => ({ ...prev, size: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="180">Small (180px)</option>
                  <option value="240">Medium (240px)</option>
                  <option value="320">Large (320px)</option>
                  <option value="420">XL Poster (420px)</option>
                </select>
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Gen Z Shape
                <select
                  value={printOptions.shape}
                  onChange={(event) => setPrintOptions((prev) => ({ ...prev, shape: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="rounded">Rounded Card</option>
                  <option value="circle">Circle Sticker</option>
                  <option value="diamond">Diamond Tilt</option>
                  <option value="squircle">Squircle</option>
                  <option value="ticket">Ticket Cut</option>
                  <option value="home">Home Badge</option>
                  <option value="bell">Bell Badge</option>
                  <option value="star">Star Pop</option>
                </select>
              </label>

              <button
                type="button"
                disabled={!selectedPreview}
                onClick={() => printQrCard(selectedPreview, printOptions)}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
              >
                Print QR
              </button>
            </div>

            <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              {selectedPreview ? (
                <div className={`bg-white p-4 shadow-lg ${shapeClass(printOptions.shape)}`} style={{ width: `${Number(printOptions.size) + 40}px` }}>
                  <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {selectedPreview.doorName}
                  </div>
                  <img
                    src={buildQrImageUrl(selectedPreview.scanUrl, Number(printOptions.size))}
                    alt={`QR for ${selectedPreview.doorName}`}
                    className={`mx-auto bg-white p-2 ${shapeClass(printOptions.shape)}`}
                    style={{ width: `${Number(printOptions.size)}px`, height: `${Number(printOptions.size)}px` }}
                  />
                  <div className="mt-2 text-center text-[10px] font-medium text-slate-500">{selectedPreview.scanUrl}</div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Pick a QR code to preview and print.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

function buildQrImageUrl(value, size = 240) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
}

function shapeClass(shape) {
  if (shape === "circle") return "rounded-full";
  if (shape === "diamond") return "rotate-2 rounded-2xl";
  if (shape === "squircle") return "rounded-[32px]";
  if (shape === "ticket") return "rounded-[22px]";
  if (shape === "home") return "rounded-[18px]";
  if (shape === "bell") return "rounded-[24px]";
  if (shape === "star") return "rounded-[14px]";
  return "rounded-2xl";
}

function printQrCard(preview, options) {
  const size = Number(options.size || 240);
  const qrUrl = buildQrImageUrl(preview.scanUrl, size);

  const shapeStyle = {
    rounded: "border-radius:18px;",
    circle: "border-radius:9999px;",
    diamond: "border-radius:22px;transform:rotate(2deg);",
    squircle: "border-radius:32px;",
    ticket: "border-radius:22px;clip-path: polygon(6% 0,94% 0,100% 18%,100% 82%,94% 100%,6% 100%,0 82%,0 18%);",
    home: "clip-path: polygon(50% 0,100% 30%,100% 100%,0 100%,0 30%);border-radius:10px;",
    bell: "clip-path: polygon(20% 22%,30% 8%,70% 8%,80% 22%,86% 64%,74% 88%,26% 88%,14% 64%);border-radius:10px;",
    star: "clip-path: polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 92%,50% 70%,21% 92%,32% 57%,2% 35%,39% 35%);border-radius:8px;"
  }[options.shape] || "border-radius:18px;";

  const html = `
    <html>
      <head>
        <title>Print QR</title>
        <style>
          body{font-family:Inter,Arial,sans-serif;padding:24px;background:#fff;color:#111}
          .card{width:${size + 40}px;padding:16px;border:1px solid #e2e8f0;${shapeStyle}}
          .door{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;text-align:center;color:#334155;margin-bottom:8px}
          .qr{width:${size}px;height:${size}px;display:block;margin:0 auto;background:#fff;padding:8px;${shapeStyle}}
          .url{font-size:10px;color:#64748b;text-align:center;margin-top:8px;word-break:break-all}
        </style>
      </head>
      <body>
        <div class="card">
          <div class="door">${preview.doorName}</div>
          <img class="qr" src="${qrUrl}" alt="QR" />
          <div class="url">${preview.scanUrl}</div>
        </div>
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>`;

  const printWindow = window.open("", "_blank", "width=700,height=800");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
