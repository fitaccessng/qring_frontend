import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BrandMark from "../../components/BrandMark";

const fadeInUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] }
};

const VISITS_STORAGE_KEY = "qring.visits.v1";

const PURPOSES = [
  { value: "delivery", label: "Delivery" },
  { value: "friend", label: "Friend" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" }
];

export default function RequestDemoPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const mode = params.get("mode") || "homeowner"; // "visitor" | "homeowner"

  const [doorName, setDoorName] = useState(params.get("door") || "Front Door");
  const doorId = useMemo(() => slugify(doorName || "door"), [doorName]);

  const visitorUrl = useMemo(() => buildVisitorUrl({ doorName }), [doorName]);
  const homeownerUrl = useMemo(() => buildHomeownerUrl({ doorName }), [doorName]);

  useEffect(() => {
    const next = new URLSearchParams(location.search);
    const desiredDoor = (doorName || "Front Door").trim();
    let changed = false;
    if (next.get("door") !== desiredDoor) {
      next.set("door", desiredDoor);
      changed = true;
    }
    if (next.get("mode") !== mode) {
      next.set("mode", mode);
      changed = true;
    }
    if (!changed) return;
    navigate({ search: `?${next.toString()}` }, { replace: true });
  }, [doorName, location.search, mode, navigate]);

  return (
    <div className="bg-white text-slate-900 selection:bg-[#3b82f6] selection:text-white font-sans antialiased">
      <Navbar doorName={doorName} />

      <main>
        <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-10">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-40 top-12 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.22),transparent_60%)] blur-2xl" />
            <div className="absolute -right-44 bottom-0 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.16),transparent_58%)] blur-2xl" />
            <div className="absolute inset-0 opacity-[0.20] [background-image:linear-gradient(to_right,rgba(15,23,42,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.10)_1px,transparent_1px)] [background-size:34px_34px]" />
          </div>

          <div className="mx-auto w-full max-w-7xl">
            <motion.div {...fadeInUp} className="mx-auto max-w-4xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-900">
                Visitor Management
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              </span>
              <h1 className="mt-6 text-4xl font-black italic uppercase tracking-tighter text-slate-900 sm:text-5xl md:text-6xl">
                Know who is at the door — without opening it.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg font-medium leading-relaxed text-slate-600">
                Visitor scans a door QR, takes a selfie, adds a quick reason. Homeowner gets notified and can open,
                call, or ignore.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {["Scan QR at door", "Selfie + reason", "Instant notification", "Open / Call / Ignore"].map((label) => (
                  <div
                    key={label}
                    className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 backdrop-blur"
                  >
                    {label}
                  </div>
                ))}
              </div>
            </motion.div>

            <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:items-start">
              <motion.div {...fadeInUp} className="lg:col-span-5">
                <HomeownerPanel
                  active={mode !== "visitor"}
                  doorName={doorName}
                  setDoorName={setDoorName}
                  doorId={doorId}
                  visitorUrl={visitorUrl}
                  homeownerUrl={homeownerUrl}
                />
              </motion.div>

              <motion.div {...fadeInUp} className="lg:col-span-7">
                <VisitorPanel active={mode === "visitor"} doorName={doorName} doorId={doorId} />
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-12 text-center text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500">
        {"\u00A9"} 2026 QRing. Door intelligence for real homes.
      </footer>
    </div>
  );
}

function Navbar({ doorName }) {
  return (
    <nav className="sticky top-0 z-[100] flex items-center justify-between border-b border-slate-200 bg-white/90 px-6 py-6 backdrop-blur-md md:px-12">
      <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] sm:h-9 sm:w-9">
          <BrandMark tone="light" className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </div>
        <span className="text-sm font-black uppercase tracking-tighter">QRing</span>
      </Link>

      <div className="hidden gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 md:flex">
        {["Security", "Pricing", "FAQ"].map((item) => (
          <a key={item} href={`/#${item.toLowerCase()}`} className="transition-colors hover:text-[#3b82f6]">
            {item}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 md:inline-flex">
          {doorName || "Door"}
        </span>
        <Link
          to="/request-demo?mode=homeowner"
          className="hidden rounded-full border border-slate-300 bg-white px-5 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 transition-colors hover:bg-slate-100 md:inline-flex"
        >
          Homeowner
        </Link>
        <Link
          to="/request-demo?mode=visitor"
          className="inline-flex rounded-full bg-[#2563eb] px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-[#1d4ed8]"
        >
          Visitor
        </Link>
      </div>
    </nav>
  );
}

function HomeownerPanel({ active, doorName, setDoorName, doorId, visitorUrl, homeownerUrl }) {
  const [toast, setToast] = useState(null);
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    setVisits(loadVisits().filter((visit) => visit.doorId === doorId));
  }, [doorId]);

  useEffect(() => {
    if (!("BroadcastChannel" in window)) return undefined;
    const channel = new BroadcastChannel("qring.visitor.v1");
    channel.onmessage = (event) => {
      const payload = event?.data;
      if (!payload || payload.type !== "visit_created") return;
      if (payload.visit?.doorId !== doorId) return;
      setVisits(loadVisits().filter((visit) => visit.doorId === doorId));
      setToast({ tone: "blue", title: "New visitor", body: `${payload.visit?.name || "Someone"} is at ${doorName}.` });
      maybeNotifyHomeowner(payload.visit);
    };
    return () => channel.close();
  }, [doorId, doorName]);

  useEffect(() => {
    const handler = (event) => {
      if (event.key !== VISITS_STORAGE_KEY) return;
      setVisits(loadVisits().filter((visit) => visit.doorId === doorId));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [doorId]);

  const pendingCount = useMemo(() => visits.filter((visit) => visit.status === "pending").length, [visits]);

  return (
    <div className="rounded-[3rem] border border-slate-200 bg-white/85 p-7 shadow-[0_40px_120px_rgba(2,6,23,0.10)] backdrop-blur sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Homeowner view</p>
          <h2 className="mt-3 text-2xl font-black italic uppercase tracking-tighter text-slate-900">Door inbox</h2>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
            Generate a door QR. When a visitor submits, you get their selfie + reason here.
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_14px_38px_rgba(2,6,23,0.18)]">
          <span className="text-xs font-black tracking-widest">{pendingCount ? `${pendingCount}` : "0"}</span>
        </div>
      </div>

      <div className="mt-7 space-y-4">
        <Input
          label="Door name"
          value={doorName}
          onChange={(value) => setDoorName(value)}
          placeholder="e.g. Front Door"
        />

        <div className="rounded-[2.5rem] border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">Door QR</p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
                Print this QR and place it at <span className="font-black">{doorName}</span>.
              </p>
            </div>
            <div className="hidden rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 sm:inline-flex">
              {doorId}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[240px,1fr] sm:items-center">
            <div className="relative overflow-hidden rounded-[2.2rem] border border-slate-200 bg-white p-4 shadow-[0_22px_70px_rgba(2,6,23,0.10)]">
              <div className="pointer-events-none absolute inset-0 opacity-[0.55] [background-image:radial-gradient(circle_at_35%_20%,rgba(37,99,235,0.16),transparent_60%),radial-gradient(circle_at_70%_75%,rgba(2,6,23,0.06),transparent_55%)]" />
              <div className="relative flex flex-col items-center gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <QrCanvas value={visitorUrl} />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Scan to notify</p>
                  <p className="mt-1 text-sm font-black uppercase tracking-tighter text-slate-900">{doorName}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <CopyRow label="Visitor link" value={visitorUrl} />
              <CopyRow label="Homeowner link" value={homeownerUrl} />
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    saveVisits([]);
                    setVisits([]);
                    setToast({ tone: "slate", title: "Cleared", body: "Visitor history cleared for this browser." });
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 transition-colors hover:bg-slate-100"
                >
                  Clear history
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const result = await requestNotificationPermission();
                    if (result === "granted") {
                      setToast({ tone: "emerald", title: "Notifications enabled", body: "Browser notifications are on." });
                      return;
                    }
                    setToast({ tone: "slate", title: "Notifications not enabled", body: "You can still see visits in the inbox." });
                  }}
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-slate-800"
                >
                  Enable alerts
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Incoming</p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                {active ? "Live updates work best with two tabs open (visitor + homeowner)." : "Open in homeowner mode to see updates."}
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">
              {visits.length} total
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {visits.length ? (
              visits
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((visit) => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    onUpdate={(next) => {
                      upsertVisit(next);
                      setVisits(loadVisits().filter((item) => item.doorId === doorId));
                    }}
                    onToast={setToast}
                  />
                ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600">
                No visitors yet. Scan the QR in visitor mode and submit a selfie.
              </div>
            )}
          </div>
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function VisitorPanel({ active, doorName, doorId }) {
  const [form, setForm] = useState({ name: "", phone: "", purpose: "delivery", message: "" });
  const [selfie, setSelfie] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busyCamera, setBusyCamera] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const canSubmit = useMemo(() => Boolean(form.name.trim() && selfie), [form.name, selfie]);

  useEffect(() => {
    return () => stopCamera(streamRef);
  }, []);

  async function startCamera() {
    setCameraError("");
    if (busyCamera) return;
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not supported in this browser.");
      return;
    }

    setBusyCamera(true);
    try {
      stopCamera(streamRef);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      const message = error?.name === "NotAllowedError" ? "Camera permission denied." : "Unable to start camera.";
      setCameraError(message);
    } finally {
      setBusyCamera(false);
    }
  }

  function takeSelfie() {
    setCameraError("");
    const video = videoRef.current;
    if (!video) return;
    if (!video.srcObject) {
      setCameraError("Enable camera first.");
      return;
    }
    if (!video.videoWidth || !video.videoHeight) {
      setCameraError("Camera not ready yet. Try again.");
      return;
    }

    const width = video.videoWidth || 720;
    const height = video.videoHeight || 720;
    const maxEdge = 720;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraError("Unable to capture image.");
      return;
    }
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    setSelfie(canvas.toDataURL("image/jpeg", 0.78));
    stopCamera(streamRef);
  }

  function submit() {
    setSubmitError("");
    if (!canSubmit) {
      setSubmitError("Add your name and take a selfie before submitting.");
      return;
    }

    const visit = {
      id: cryptoRandomId(),
      doorId,
      doorName,
      createdAt: Date.now(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      purpose: form.purpose,
      message: form.message.trim(),
      imageDataUrl: selfie,
      status: "pending"
    };

    upsertVisit(visit);
    try {
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel("qring.visitor.v1");
        channel.postMessage({ type: "visit_created", visit });
        channel.close();
      }
    } catch {
      // ignore
    }

    setSubmitted(true);
  }

  return (
    <div className="relative">
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,0.22),transparent_58%),radial-gradient(circle_at_75%_70%,rgba(59,130,246,0.12),transparent_55%)] blur-2xl" />
      <div className="rounded-[3rem] border border-slate-200 bg-white p-8 shadow-[0_45px_140px_rgba(2,6,23,0.12)] sm:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Visitor view</p>
            <h2 className="mt-3 text-2xl font-black italic uppercase tracking-tighter text-slate-900 sm:text-3xl">
              {doorName}
            </h2>
            <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-slate-600">
              Take a quick selfie so the homeowner can confirm who is at the door.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-slate-700">
            {active ? "Live" : "Preview"}
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
          </div>
        </div>

        {submitted ? (
          <div className="mt-10 rounded-[2.5rem] border border-emerald-200 bg-emerald-50 p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Sent</p>
            <p className="mt-3 text-sm font-medium leading-relaxed text-emerald-800">
              Homeowner notified. Please wait — they can open, call, or ignore.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setSelfie("");
                  setSubmitError("");
                  setCameraError("");
                  setForm((prev) => ({ ...prev, message: "" }));
                }}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-slate-800"
              >
                Send another
              </button>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-8 py-4 text-xs font-black uppercase tracking-widest text-emerald-800 transition hover:bg-emerald-100"
              >
                Back Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-10 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Your name"
                value={form.name}
                onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
                placeholder="e.g. Emeka"
              />
              <Input
                label="Phone (optional)"
                value={form.phone}
                onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                required={false}
                placeholder="+234..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Reason (optional)"
                value={form.purpose}
                onChange={(value) => setForm((prev) => ({ ...prev, purpose: value }))}
                options={PURPOSES}
              />
              <Input
                label="Short message (optional)"
                value={form.message}
                onChange={(value) => setForm((prev) => ({ ...prev, message: value }))}
                required={false}
                placeholder="e.g. Package delivery"
              />
            </div>

            <div className="rounded-[2.5rem] border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">Selfie</p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
                    The homeowner will only see this photo + your message.
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">
                  Required
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:items-start">
                <div className="relative overflow-hidden rounded-[2.2rem] border border-slate-200 bg-white shadow-[0_22px_70px_rgba(2,6,23,0.10)]">
                  {selfie ? (
                    <img alt="Selfie preview" src={selfie} className="h-[260px] w-full object-cover" />
                  ) : (
                    <div className="h-[260px] w-full bg-[radial-gradient(circle_at_35%_20%,rgba(37,99,235,0.10),transparent_60%),linear-gradient(135deg,rgba(2,6,23,0.03),rgba(2,6,23,0.00))] p-4">
                      <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)]">
                          <span className="text-xs font-black tracking-widest">CAM</span>
                        </div>
                        <p className="mt-4 text-sm font-black uppercase tracking-tighter text-slate-900">Camera preview</p>
                        <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600">
                          Tap “Enable camera” then “Take selfie”.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="overflow-hidden rounded-[2.2rem] border border-slate-200 bg-white">
                    <video ref={videoRef} playsInline muted className="h-[260px] w-full bg-slate-900 object-cover" />
                  </div>

                  {cameraError ? (
                    <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                      {cameraError} If you are on http (not https), camera may be blocked.
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={busyCamera}
                      className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Enable camera
                    </button>
                    <button
                      type="button"
                      onClick={takeSelfie}
                      className="inline-flex flex-1 items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-[0_18px_60px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-700"
                    >
                      Take selfie
                    </button>
                  </div>

                  {selfie ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelfie("");
                        setCameraError("");
                        setSubmitError("");
                      }}
                      className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-900 transition-colors hover:bg-slate-100"
                    >
                      Retake
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {submitError ? (
              <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                {submitError}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Notify homeowner
              </button>
              <Link
                to="/request-demo?mode=homeowner"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-900 transition-colors hover:bg-slate-100"
              >
                Switch to homeowner
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VisitCard({ visit, onUpdate, onToast }) {
  const purposeLabel = PURPOSES.find((item) => item.value === visit.purpose)?.label || "Visitor";
  const when = new Date(visit.createdAt);
  const whenLabel = `${when.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${when.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  })}`;

  const statusTone =
    visit.status === "opened"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : visit.status === "ignored"
        ? "bg-slate-100 text-slate-700 border-slate-200"
        : "bg-blue-50 text-blue-900 border-blue-200";

  return (
    <div className="overflow-hidden rounded-[2.2rem] border border-slate-200 bg-white shadow-[0_16px_60px_rgba(2,6,23,0.08)]">
      <div className="grid gap-4 p-4 sm:grid-cols-[108px,1fr] sm:items-center sm:p-5">
        <div className="relative h-[108px] w-[108px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {visit.imageDataUrl ? (
            <img alt={`${visit.name} selfie`} src={visit.imageDataUrl} className="h-full w-full object-cover" />
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black uppercase tracking-tighter text-slate-900">{visit.name}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{whenLabel}</p>
            </div>
            <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${statusTone}`}>
              {visit.status}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">
              {purposeLabel}
            </span>
            {visit.message ? (
              <span className="max-w-full truncate rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">
                {visit.message}
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                onUpdate({ ...visit, status: "opened" });
                onToast?.({ tone: "emerald", title: "Door action", body: "Open door requested (demo)." });
              }}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-700"
            >
              Open door
            </button>
            <a
              href={visit.phone ? `tel:${visit.phone}` : undefined}
              onClick={(event) => {
                if (visit.phone) return;
                event.preventDefault();
                onToast?.({ tone: "slate", title: "No phone", body: "Visitor did not attach a phone number." });
              }}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 transition-colors hover:bg-slate-100"
            >
              Call
            </a>
            <button
              type="button"
              onClick={() => {
                onUpdate({ ...visit, status: "ignored" });
                onToast?.({ tone: "slate", title: "Ignored", body: "Marked as ignored." });
              }}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 transition-colors hover:bg-slate-100"
            >
              Ignore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => onClose?.(), 3500);
    return () => clearTimeout(id);
  }, [toast, onClose]);

  const tone =
    toast?.tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : toast?.tone === "blue"
        ? "border-blue-200 bg-blue-50 text-blue-900"
        : "border-slate-200 bg-white text-slate-900";

  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed bottom-6 left-1/2 z-[120] w-[min(520px,calc(100vw-2rem))] -translate-x-1/2"
        >
          <div className={`rounded-[1.6rem] border px-5 py-4 shadow-[0_24px_80px_rgba(2,6,23,0.16)] ${tone}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em]">{toast.title}</p>
                <p className="mt-2 text-sm font-medium leading-relaxed opacity-90">{toast.body}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 hover:bg-white"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Input({ label, placeholder, type = "text", value, onChange, required = true }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-700">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium outline-none transition focus:border-slate-400"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium outline-none transition focus:border-slate-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function QrCanvas({ value }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function run() {
      setError("");
      if (!canvasRef.current) return;
      try {
        await QRCode.toCanvas(canvasRef.current, value, {
          margin: 1,
          width: 210,
          color: { dark: "#0f172a", light: "#ffffff" },
          errorCorrectionLevel: "M"
        });
      } catch {
        if (!mounted) return;
        setError("QR unavailable");
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} className="block" aria-label="QR code" />
      {error ? <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{error}</p> : null}
    </div>
  );
}

function CopyRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xs font-bold text-slate-900">{value}</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1300);
            } catch {
              setCopied(false);
            }
          }}
          className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 transition-colors hover:bg-slate-100"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function loadVisits() {
  try {
    const raw = localStorage.getItem(VISITS_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(Boolean);
  } catch {
    return [];
  }
}

function saveVisits(visits) {
  try {
    localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(visits));
  } catch {
    // ignore
  }
}

function upsertVisit(visit) {
  const all = loadVisits();
  const index = all.findIndex((item) => item.id === visit.id);
  const next = index >= 0 ? all.map((item) => (item.id === visit.id ? visit : item)) : [visit, ...all];
  saveVisits(next.slice(0, 40));
}

function buildVisitorUrl({ doorName }) {
  const url = new URL(window.location.href);
  url.pathname = "/request-demo";
  url.searchParams.set("mode", "visitor");
  url.searchParams.set("door", (doorName || "Front Door").trim());
  return url.toString();
}

function buildHomeownerUrl({ doorName }) {
  const url = new URL(window.location.href);
  url.pathname = "/request-demo";
  url.searchParams.set("mode", "homeowner");
  url.searchParams.set("door", (doorName || "Front Door").trim());
  return url.toString();
}

function slugify(input) {
  return (
    String(input || "")
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "door"
  );
}

function cryptoRandomId() {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function stopCamera(streamRef) {
  const stream = streamRef.current;
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
  streamRef.current = null;
}

async function requestNotificationPermission() {
  try {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

function maybeNotifyHomeowner(visit) {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const title = "Someone is at the door";
    const body = `${visit?.name || "Visitor"} • ${visit?.doorName || "Door"}`;
    // eslint-disable-next-line no-new
    new Notification(title, { body });
  } catch {
    // ignore
  }
}
