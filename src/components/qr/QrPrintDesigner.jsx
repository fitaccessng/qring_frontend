import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

const SHAPE_OPTIONS = [
  { value: "bell", label: "Bell" },
  { value: "house", label: "House" },
  { value: "car", label: "Car" },
  { value: "gate", label: "Gate" },
  { value: "circle", label: "Circle" },
  { value: "rectangle", label: "Rectangle" },
  { value: "custom", label: "Custom SVG" }
];

const FONT_OPTIONS = [
  "Arial",
  "Georgia",
  "Trebuchet MS",
  "Times New Roman",
  "Courier New",
  "Verdana"
];

const PRINT_PRESETS = {
  a4: { label: "A4", widthMm: 210, heightMm: 297 },
  a5: { label: "A5", widthMm: 148, heightMm: 210 },
  sticker: { label: "Sticker", widthMm: 100, heightMm: 100 },
  card: { label: "Card", widthMm: 85.6, heightMm: 54 }
};

const EXPORT_FORMATS = ["PDF", "PNG", "SVG"];

const DEFAULT_DESIGN = {
  shapeTemplate: "bell",
  topText: "Scan to Call Owner",
  topTextStyle: {
    font: "Trebuchet MS",
    size: 44,
    color: "#0f172a",
    align: "center"
  },
  qrStyle: {
    size: 52,
    color: "#0f172a",
    background: "#ffffff",
    padding: 20,
    margin: 40,
    errorCorrection: "M"
  },
  branding: {
    logo: null,
    label: ""
  },
  exportFormat: "PDF"
};

export default function QrPrintDesigner({ preview, defaultLabel = "" }) {
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const [preset, setPreset] = useState("a5");
  const [busyExport, setBusyExport] = useState(false);
  const [qrMatrix, setQrMatrix] = useState(null);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    setDesign((prev) => ({
      ...prev,
      branding: { ...prev.branding, label: prev.branding.label || defaultLabel || "" }
    }));
  }, [defaultLabel]);

  useEffect(() => {
    if (!preview?.scanUrl) {
      setQrMatrix(null);
      return;
    }
    try {
      const result = QRCode.create(preview.scanUrl, {
        errorCorrectionLevel: design.qrStyle.errorCorrection,
        margin: 0
      });
      setQrMatrix(result.modules);
    } catch {
      setQrMatrix(null);
    }
  }, [preview?.scanUrl, design.qrStyle.errorCorrection]);

  const presetMeta = PRINT_PRESETS[preset];
  const canvasWidth = 1000;
  const canvasHeight = Math.round((canvasWidth * presetMeta.heightMm) / presetMeta.widthMm);

  const svgMarkup = useMemo(
    () =>
      buildDesignerSvg({
        design,
        preview,
        qrMatrix,
        width: canvasWidth,
        height: canvasHeight
      }),
    [design, preview, qrMatrix, canvasHeight]
  );

  async function handleFileAsDataUrl(file, onReady) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      onReady(value || null);
    };
    reader.readAsDataURL(file);
  }

  async function handleExport() {
    if (!preview?.scanUrl || !qrMatrix || busyExport) return;
    setExportError("");
    setBusyExport(true);
    try {
      const fileBase = `${slugify(preview?.doorName || "door")}-${slugify(preview?.qrId || "qr")}`;
      if (design.exportFormat === "SVG") {
        const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
        downloadBlob(svgBlob, `${fileBase}.svg`);
        return;
      }

      const renderResult = await renderSvgToCanvas(svgMarkup, presetMeta.widthMm, presetMeta.heightMm, 300);
      if (design.exportFormat === "PNG") {
        const blob = await canvasToBlob(renderResult.canvas, "image/png");
        downloadBlob(blob, `${fileBase}.png`);
        return;
      }

      const imageData = renderResult.canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        unit: "mm",
        format: [presetMeta.widthMm, presetMeta.heightMm],
        orientation: presetMeta.widthMm > presetMeta.heightMm ? "landscape" : "portrait"
      });
      pdf.addImage(imageData, "PNG", 0, 0, presetMeta.widthMm, presetMeta.heightMm, undefined, "FAST");
      pdf.save(`${fileBase}.pdf`);
    } catch (error) {
      setExportError(error?.message || "Export failed");
    } finally {
      setBusyExport(false);
    }
  }

  if (!preview) {
    return <p className="text-sm text-slate-500">Pick a QR code to preview and customize.</p>;
  }

  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr]">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
        <ControlLabel label="Shape Template">
          <select
            value={design.shapeTemplate}
            onChange={(event) => setDesign((prev) => ({ ...prev, shapeTemplate: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {SHAPE_OPTIONS.map((shape) => (
              <option key={shape.value} value={shape.value}>
                {shape.label}
              </option>
            ))}
          </select>
        </ControlLabel>

        {design.shapeTemplate === "custom" ? (
          <ControlLabel label="Custom SVG Upload">
            <input
              type="file"
              accept=".svg,image/svg+xml"
              className="mt-1 block w-full text-xs"
              onChange={(event) => handleFileAsDataUrl(event.target.files?.[0], (value) => setDesign((prev) => ({ ...prev, branding: { ...prev.branding, customSvg: value } })))}
            />
          </ControlLabel>
        ) : null}

        <ControlLabel label="Top Text">
          <input
            type="text"
            value={design.topText}
            onChange={(event) => setDesign((prev) => ({ ...prev, topText: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </ControlLabel>

        <div className="grid grid-cols-2 gap-2">
          <ControlLabel label="Font">
            <select
              value={design.topTextStyle.font}
              onChange={(event) =>
                setDesign((prev) => ({
                  ...prev,
                  topTextStyle: { ...prev.topTextStyle, font: event.target.value }
                }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </ControlLabel>
          <ControlLabel label={`Font Size (${design.topTextStyle.size}px)`}>
            <input
              type="range"
              min="24"
              max="84"
              value={design.topTextStyle.size}
              onChange={(event) =>
                setDesign((prev) => ({
                  ...prev,
                  topTextStyle: { ...prev.topTextStyle, size: Number(event.target.value) }
                }))
              }
              className="mt-3 w-full"
            />
          </ControlLabel>
          <ControlLabel label="Text Color">
            <input
              type="color"
              value={design.topTextStyle.color}
              onChange={(event) =>
                setDesign((prev) => ({
                  ...prev,
                  topTextStyle: { ...prev.topTextStyle, color: event.target.value }
                }))
              }
              className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-1 dark:border-slate-700 dark:bg-slate-900"
            />
          </ControlLabel>
          <ControlLabel label="Align">
            <select
              value={design.topTextStyle.align}
              onChange={(event) =>
                setDesign((prev) => ({
                  ...prev,
                  topTextStyle: { ...prev.topTextStyle, align: event.target.value }
                }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </ControlLabel>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <ControlLabel label={`QR Scale (${design.qrStyle.size}%)`}>
            <input
              type="range"
              min="28"
              max="76"
              value={design.qrStyle.size}
              onChange={(event) =>
                setDesign((prev) => ({
                  ...prev,
                  qrStyle: { ...prev.qrStyle, size: Number(event.target.value) }
                }))
              }
              className="mt-3 w-full"
            />
          </ControlLabel>
          <ControlLabel label="Error Correction">
            <select
              value={design.qrStyle.errorCorrection}
              onChange={(event) =>
                setDesign((prev) => ({
                  ...prev,
                  qrStyle: { ...prev.qrStyle, errorCorrection: event.target.value }
                }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="L">L</option>
              <option value="M">M</option>
              <option value="Q">Q</option>
              <option value="H">H</option>
            </select>
          </ControlLabel>
          <ControlLabel label="QR Color">
            <input
              type="color"
              value={design.qrStyle.color}
              onChange={(event) =>
                setDesign((prev) => ({
                  ...prev,
                  qrStyle: { ...prev.qrStyle, color: event.target.value }
                }))
              }
              className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-1 dark:border-slate-700 dark:bg-slate-900"
            />
          </ControlLabel>
          <ControlLabel label="Background">
            <input
              type="color"
              value={design.qrStyle.background}
              onChange={(event) =>
                setDesign((prev) => ({
                  ...prev,
                  qrStyle: { ...prev.qrStyle, background: event.target.value }
                }))
              }
              className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-1 dark:border-slate-700 dark:bg-slate-900"
            />
          </ControlLabel>
          <ControlLabel label={`Padding (${design.qrStyle.padding})`}>
            <input
              type="range"
              min="6"
              max="42"
              value={design.qrStyle.padding}
              onChange={(event) =>
                setDesign((prev) => ({
                  ...prev,
                  qrStyle: { ...prev.qrStyle, padding: Number(event.target.value) }
                }))
              }
              className="mt-3 w-full"
            />
          </ControlLabel>
          <ControlLabel label={`Margin (${design.qrStyle.margin})`}>
            <input
              type="range"
              min="16"
              max="100"
              value={design.qrStyle.margin}
              onChange={(event) =>
                setDesign((prev) => ({
                  ...prev,
                  qrStyle: { ...prev.qrStyle, margin: Number(event.target.value) }
                }))
              }
              className="mt-3 w-full"
            />
          </ControlLabel>
        </div>

        <ControlLabel label="Branding Label">
          <input
            type="text"
            value={design.branding.label || ""}
            onChange={(event) => setDesign((prev) => ({ ...prev, branding: { ...prev.branding, label: event.target.value } }))}
            placeholder="Estate / Home Name"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </ControlLabel>

        <ControlLabel label="Center Logo (optional)">
          <input
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-xs"
            onChange={(event) => handleFileAsDataUrl(event.target.files?.[0], (value) => setDesign((prev) => ({ ...prev, branding: { ...prev.branding, logo: value } })))}
          />
          {design.branding.logo ? (
            <button
              type="button"
              className="mt-2 rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
              onClick={() => setDesign((prev) => ({ ...prev, branding: { ...prev.branding, logo: null } }))}
            >
              Remove Logo
            </button>
          ) : null}
        </ControlLabel>

        <div className="grid grid-cols-2 gap-2">
          <ControlLabel label="Preview Size">
            <select
              value={preset}
              onChange={(event) => setPreset(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {Object.entries(PRINT_PRESETS).map(([value, item]) => (
                <option key={value} value={value}>
                  {item.label}
                </option>
              ))}
            </select>
          </ControlLabel>
          <ControlLabel label="Export Format">
            <select
              value={design.exportFormat}
              onChange={(event) => setDesign((prev) => ({ ...prev, exportFormat: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {EXPORT_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </ControlLabel>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={busyExport || !qrMatrix}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
        >
          {busyExport ? "Exporting..." : `Download ${design.exportFormat}`}
        </button>
        {exportError ? <p className="text-xs text-danger">{exportError}</p> : null}
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
          <span>Live Preview</span>
          <span>
            {presetMeta.label} ({presetMeta.widthMm}mm x {presetMeta.heightMm}mm)
          </span>
        </div>
        <div className="grid place-items-center rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
          <div
            className="w-full max-w-[600px]"
            style={{
              aspectRatio: `${presetMeta.widthMm} / ${presetMeta.heightMm}`
            }}
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
        </div>
      </div>
    </div>
  );
}

function ControlLabel({ label, children }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {label}
      {children}
    </label>
  );
}

function buildDesignerSvg({ design, preview, qrMatrix, width, height }) {
  const margin = Number(design.qrStyle.margin || 40);
  const innerWidth = width - margin * 2;
  const innerHeight = height - margin * 2;

  const topBlockHeight = design.topText ? design.topTextStyle.size * 1.4 + 20 : 0;
  const bottomBlockHeight = design.branding?.label ? 60 : 0;
  const availableHeight = Math.max(innerHeight - topBlockHeight - bottomBlockHeight, 80);
  const availableWidth = Math.max(innerWidth, 80);
  const qrSize = Math.max(120, Math.round(Math.min(availableWidth, availableHeight) * (design.qrStyle.size / 100)));
  const qrPadding = Number(design.qrStyle.padding || 20);
  const panelSize = qrSize + qrPadding * 2;
  const panelX = (width - panelSize) / 2;
  const panelY = margin + topBlockHeight + (availableHeight - qrSize) / 2 - qrPadding;

  const alignMap = {
    left: { x: margin + 14, anchor: "start" },
    center: { x: width / 2, anchor: "middle" },
    right: { x: width - margin - 14, anchor: "end" }
  };
  const alignMeta = alignMap[design.topTextStyle.align] || alignMap.center;
  const textY = margin + design.topTextStyle.size;
  const labelY = height - margin - 18;

  const clipPath = resolveShapeClipPath(design.shapeTemplate, width, height, margin);
  const borderPath = resolveShapeBorder(design.shapeTemplate, width, height, margin);

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
  <defs>
    <clipPath id="shapeClip">
      ${clipPath}
    </clipPath>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
  <g clip-path="url(#shapeClip)">
    <rect x="${margin}" y="${margin}" width="${innerWidth}" height="${innerHeight}" fill="${design.qrStyle.background}" />
    ${
      design.shapeTemplate === "custom" && design.branding.customSvg
        ? `<image href="${design.branding.customSvg}" x="${margin}" y="${margin}" width="${innerWidth}" height="${innerHeight}" preserveAspectRatio="xMidYMid slice" opacity="0.98" />`
        : ""
    }
    <rect x="${panelX}" y="${panelY}" width="${panelSize}" height="${panelSize}" rx="20" ry="20" fill="#ffffff" />
    ${renderQrModules(qrMatrix, panelX + qrPadding, panelY + qrPadding, qrSize, design.qrStyle.color)}
    ${
      design.branding.logo
        ? renderLogo(design.branding.logo, panelX + panelSize / 2, panelY + panelSize / 2, Math.round(qrSize * 0.22))
        : ""
    }
  </g>
  ${borderPath}
  ${
    design.topText
      ? `<text x="${alignMeta.x}" y="${textY}" text-anchor="${alignMeta.anchor}" fill="${design.topTextStyle.color}" font-family="${escapeXml(
          design.topTextStyle.font
        )}" font-size="${design.topTextStyle.size}" font-weight="700">${escapeXml(design.topText)}</text>`
      : ""
  }
  ${
    design.branding?.label
      ? `<text x="${width / 2}" y="${labelY}" text-anchor="middle" fill="#334155" font-family="Arial, sans-serif" font-size="32" font-weight="700">${escapeXml(
          design.branding.label
        )}</text>`
      : ""
  }
  <text x="${width / 2}" y="${height - 10}" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="16">${escapeXml(
    preview?.scanUrl || ""
  )}</text>
</svg>`;
}

function renderQrModules(matrix, x, y, size, color) {
  if (!matrix) return "";
  const count = matrix.size;
  const cell = size / count;
  const modules = [];
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (!matrix.get(row, col)) continue;
      modules.push(
        `<rect x="${(x + col * cell).toFixed(3)}" y="${(y + row * cell).toFixed(3)}" width="${cell.toFixed(
          3
        )}" height="${cell.toFixed(3)}" fill="${color}" />`
      );
    }
  }
  return modules.join("");
}

function renderLogo(href, centerX, centerY, size) {
  const boxX = centerX - size / 2 - 8;
  const boxY = centerY - size / 2 - 8;
  return `
<rect x="${boxX}" y="${boxY}" width="${size + 16}" height="${size + 16}" rx="12" fill="#ffffff" />
<image href="${href}" x="${centerX - size / 2}" y="${centerY - size / 2}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" />`;
}

function resolveShapeClipPath(shape, width, height, margin) {
  const x0 = margin;
  const y0 = margin;
  const x1 = width - margin;
  const y1 = height - margin;
  const cx = width / 2;
  const cy = height / 2;
  const w = x1 - x0;
  const h = y1 - y0;

  if (shape === "circle") {
    const r = Math.min(w, h) / 2;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" />`;
  }

  if (shape === "house") {
    return `<path d="M ${x0 + w * 0.13} ${y1} L ${x0 + w * 0.13} ${y0 + h * 0.34} L ${cx} ${y0} L ${x0 + w * 0.87} ${y0 + h * 0.34} L ${x0 + w * 0.87} ${y1} Z" />`;
  }

  if (shape === "bell") {
    return `<path d="M ${x0 + w * 0.28} ${y0 + h * 0.22} Q ${x0 + w * 0.32} ${y0 + h * 0.07} ${cx} ${y0 + h * 0.07} Q ${
      x0 + w * 0.68
    } ${y0 + h * 0.07} ${x0 + w * 0.72} ${y0 + h * 0.22} L ${x0 + w * 0.8} ${y0 + h * 0.74} Q ${x0 + w * 0.7} ${y1} ${cx} ${y1} Q ${
      x0 + w * 0.3
    } ${y1} ${x0 + w * 0.2} ${y0 + h * 0.74} Z" />`;
  }

  if (shape === "car") {
    return `<path d="M ${x0 + w * 0.12} ${y0 + h * 0.62} L ${x0 + w * 0.24} ${y0 + h * 0.34} L ${x0 + w * 0.76} ${
      y0 + h * 0.34
    } L ${x0 + w * 0.88} ${y0 + h * 0.62} L ${x0 + w * 0.92} ${y0 + h * 0.62} Q ${x1} ${y0 + h * 0.62} ${x1} ${y0 + h * 0.74} L ${x1} ${
      y0 + h * 0.85
    } Q ${x1} ${y1} ${x0 + w * 0.86} ${y1} L ${x0 + w * 0.14} ${y1} Q ${x0} ${y1} ${x0} ${y0 + h * 0.85} L ${x0} ${y0 + h * 0.74} Q ${
      x0
    } ${y0 + h * 0.62} ${x0 + w * 0.08} ${y0 + h * 0.62} Z" />`;
  }

  if (shape === "gate") {
    return `<path d="M ${x0 + w * 0.08} ${y1} L ${x0 + w * 0.08} ${y0 + h * 0.08} Q ${x0 + w * 0.08} ${y0} ${x0 + w * 0.16} ${y0} L ${
      x0 + w * 0.84
    } ${y0} Q ${x0 + w * 0.92} ${y0} ${x0 + w * 0.92} ${y0 + h * 0.08} L ${x0 + w * 0.92} ${y1} Z" />`;
  }

  return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="28" ry="28" />`;
}

function resolveShapeBorder(shape, width, height, margin) {
  if (shape === "custom") {
    return `<rect x="${margin}" y="${margin}" width="${width - margin * 2}" height="${height - margin * 2}" fill="none" stroke="#0f172a" stroke-width="5" rx="24" />`;
  }
  return `<g fill="none" stroke="#0f172a" stroke-width="5">${resolveShapeClipPath(shape, width, height, margin)}</g>`;
}

async function renderSvgToCanvas(svgMarkup, widthMm, heightMm, dpi) {
  const widthPx = Math.round((widthMm / 25.4) * dpi);
  const heightPx = Math.round((heightMm / 25.4) * dpi);
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;

  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, widthPx, heightPx);

  const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);

  try {
    const image = await loadImage(blobUrl);
    context.drawImage(image, 0, 0, widthPx, heightPx);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }

  return { canvas, widthPx, heightPx };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to render SVG"));
    img.src = src;
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas export failed"));
        return;
      }
      resolve(blob);
    }, type);
  });
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function escapeXml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
