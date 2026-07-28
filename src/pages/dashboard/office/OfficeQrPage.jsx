import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, Copy, RefreshCw, QrCode, ShieldCheck, BadgeCheck } from "lucide-react";
import { useApiQuery } from "../../../hooks/useApi";
import { endpoints } from "../../../services/endpoints";
import { generateOfficeQr, getOfficeOverview } from "../../../services/officeService";
import { env } from "../../../config/env";
import QrPrintDesigner from "../../../components/qr/QrPrintDesigner";
import { OfficeEmptyState, OfficeErrorBanner, OfficeLoadingState } from "../../../components/office/OfficeStates";
import { showError, showSuccess } from "../../../utils/flash";

function toPublicScanUrl(scanUrl) {
  const base = String(env.publicAppUrl || window.location.origin || "").replace(/\/+$/, "");
  const path = String(scanUrl || "").trim();
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function OfficeQrPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const { data, isLoading, isError, error, refetch } = useApiQuery({
    queryKey: ["office", "overview"],
    url: endpoints.office.overview,
    queryFn: async () => getOfficeOverview(),
    refetchInterval: 30000
  });

  const office = data?.office ?? null;
  const scanUrl = useMemo(() => toPublicScanUrl(office?.scanUrl || ""), [office?.scanUrl]);
  const qrPreview = useMemo(() => {
    if (!office || !scanUrl) return null;
    return {
      qrId: office.qrId || "office-qr",
      doorName: `${office.companyName || "Office"} QR`,
      homeName: office.officeAddress || "Reception",
      scanUrl
    };
  }, [office, scanUrl]);

  useEffect(() => {
    let cancelled = false;

    async function renderQr() {
      if (!scanUrl) {
        setQrDataUrl("");
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(scanUrl, {
          width: 520,
          margin: 1,
          errorCorrectionLevel: "M",
          color: {
            dark: "#0f172a",
            light: "#ffffff"
          }
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setQrDataUrl("");
      }
    }

    void renderQr();
    return () => {
      cancelled = true;
    };
  }, [scanUrl]);

  async function handleGenerateQr() {
    setIsGenerating(true);
    try {
      await generateOfficeQr();
      await refetch();
      showSuccess("Office QR generated.");
    } catch (err) {
      showError(err?.message || "Unable to generate the office QR.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopyScanUrl() {
    if (!scanUrl) return;
    try {
      await navigator.clipboard.writeText(scanUrl);
      showSuccess("Scan link copied.");
    } catch {
      showError("Unable to copy scan link.");
    }
  }

  function handleBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/"; 
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <OfficeLoadingState />
      </div>
    );
  }

  if (!office) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center p-6">
        <div className="max-w-md w-full mx-auto">
          {isError ? (
            <OfficeErrorBanner message={error?.message || "Unable to load the office QR."} onRetry={() => refetch()} />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] text-center">
              <OfficeEmptyState
                title="No office profile found"
                description="Create an office profile first, then generate its scan QR."
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fafafa] min-h-screen font-sans text-slate-900 antialiased pb-28">
      
      {/* HEADER SECTION */}
      <header className="w-full bg-white/70 border-b border-slate-100 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-semibold text-base text-slate-950 tracking-tight">Office Entry QR</h1>
              <p className="text-[11px] text-slate-400 font-medium">
                {office.companyName || "Manage Link"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleGenerateQr()}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs px-4 py-2.5 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isGenerating ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <QrCode className="h-3.5 w-3.5" />
            )}
            <span>{office.qrId ? "Remake" : "Generate"}</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT STAGE */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {isError && <OfficeErrorBanner message={error?.message || "Unable to load latest update."} onRetry={() => refetch()} />}

        {/* BENTO BLOCK: CURRENT CODE & PREVIEW */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-50">
            <div>
              <h3 className="font-semibold text-sm text-slate-950 tracking-tight">Current Target Portal</h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {office.qrId ? "Live reception configuration target" : "No active code generated"}
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => void handleCopyScanUrl()}
              disabled={!scanUrl}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/60 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              <Copy className="h-3.5 w-3.5 text-slate-500" />
              <span>Copy Live Link</span>
            </button>
          </div>

          {/* Interactive QR Render Box */}
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/50 p-6 min-h-[300px]">
            {qrDataUrl ? (
              <div className="relative group bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/50 flex flex-col items-center">
                <img
                  src={qrDataUrl}
                  alt={`${office.companyName || "Office"} QR code`}
                  className="aspect-square w-full max-w-[220px]"
                />
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-3">
                  Scan to Sign-In
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6">
                <QrCode className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-500">
                  Generate the office QR to preview it here.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* BENTO BLOCK: PRINT DESIGNER CONTAINER */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <div className="mb-5">
            <h3 className="font-semibold text-sm text-slate-950 tracking-tight">Printable Canvas Designer</h3>
            <p className="text-[11px] text-slate-400 font-medium">Customize, preview, and print physical office assets.</p>
          </div>
          
          {qrPreview ? (
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <QrPrintDesigner preview={qrPreview} defaultLabel={office.companyName || "Office"} />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <p className="text-xs font-semibold text-slate-400">
                Generate the office QR first to unlock the printable designer.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}