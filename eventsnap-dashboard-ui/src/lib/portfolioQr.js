import QRCode from "qrcode";

// Real, scannable QR codes for a photographer's public portfolio.
//
// The encoded URL is the live public page on the site this dashboard is
// served from: <origin><basePath>/p/<slug>. That route renders the portfolio
// directly (next start / dev), and on the static GitHub Pages build
// not-found.jsx forwards it to /p/?slug=<slug> — so the same QR works in
// every deployment and never depends on a hard-coded domain.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Everything before the slug: <origin><basePath>/p/
export const publicPortfolioPrefix = () =>
  typeof window === "undefined" ? "" : `${window.location.origin}${BASE_PATH}/p/`;

export const publicPortfolioUrl = (slug) => {
  if (!slug || typeof window === "undefined") return "";
  return `${publicPortfolioPrefix()}${encodeURIComponent(slug)}`;
};

// URL shown under the QR code (same URL, without the protocol).
export const displayUrl = (url) => url.replace(/^https?:\/\//, "");

// High error correction so the "ES" badge drawn over the centre (the
// existing design) never stops the code from scanning.
export const qrMatrix = (url) => {
  if (!url) return null;
  const { modules } = QRCode.create(url, { errorCorrectionLevel: "H" });
  return { size: modules.size, dark: (r, c) => modules.get(r, c) === 1 };
};

// One SVG path of every dark module, in module units, offset by `margin`.
export const qrPath = (m, margin) => {
  let d = "";
  for (let r = 0; r < m.size; r++)
    for (let c = 0; c < m.size; c++)
      if (m.dark(r, c)) d += `M${c + margin} ${r + margin}h1v1h-1z`;
  return d;
};

// Centre badge geometry (module units) — ~17% of the code, like the design.
export const logoBox = (m, margin) => {
  const total = m.size + margin * 2;
  const s = Math.round(total * 0.17);
  return { x: (total - s) / 2, y: (total - s) / 2, s, total };
};

const DARK = "#1E1E1E";
const BRAND = "#6C63FF";

export const qrSvgString = (url, px, margin = 4) => {
  const m = qrMatrix(url);
  if (!m) return "";
  const { x, y, s, total } = logoBox(m, margin);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="#FFFFFF"/>` +
    `<path d="${qrPath(m, margin)}" fill="${DARK}"/>` +
    `<rect x="${x - 0.5}" y="${y - 0.5}" width="${s + 1}" height="${s + 1}" rx="${(s + 1) / 5}" fill="#FFFFFF"/>` +
    `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s / 5}" fill="${BRAND}"/>` +
    `<text x="${total / 2}" y="${total / 2}" dy="0.35em" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="${s * 0.45}" fill="#FFFFFF">ES</text>` +
    `</svg>`;
};

const saveBlob = (blob, fileName) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

const svgToPngBlob = (svg, px) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = px;
      canvas.getContext("2d").drawImage(img, 0, 0, px, px);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png");
    };
    img.onerror = () => reject(new Error("PNG export failed"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

// Minimal single-page vector PDF (no extra library): the QR modules as
// filled squares, the centre badge, and the URL printed underneath.
const pdfBlob = (url) => {
  const m = qrMatrix(url);
  const margin = 4;
  const { x, y, s, total } = logoBox(m, margin);
  const page = 420, qr = 300, unit = qr / total, ox = (page - qr) / 2, oy = 90;
  const Y = (row, h) => oy + qr - (row + h) * unit; // PDF origin is bottom-left
  let ops = `q 1 1 1 rg ${ox} ${oy} ${qr} ${qr} re f Q\n0.118 0.118 0.118 rg\n`;
  // Each row's runs of dark modules as one rectangle, all filled in a single
  // operation — viewers then paint one shape, with no hairline seams between
  // neighbouring modules (which can stop some zoom levels from scanning).
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (!m.dark(r, c)) continue;
      let run = 1;
      while (c + run < m.size && m.dark(r, c + run)) run++;
      ops += `${(ox + (c + margin) * unit).toFixed(3)} ${Y(r + margin, 1).toFixed(3)} ${(run * unit).toFixed(3)} ${unit.toFixed(3)} re\n`;
      c += run - 1;
    }
  }
  ops += "f\n";
  ops += `1 1 1 rg ${(ox + (x - 0.5) * unit).toFixed(2)} ${Y(y - 0.5, s + 1).toFixed(2)} ${((s + 1) * unit).toFixed(2)} ${((s + 1) * unit).toFixed(2)} re f\n`;
  ops += `0.424 0.388 1 rg ${(ox + x * unit).toFixed(2)} ${Y(y, s).toFixed(2)} ${(s * unit).toFixed(2)} ${(s * unit).toFixed(2)} re f\n`;
  const fs = s * unit * 0.45;
  ops += `BT 1 1 1 rg /F1 ${fs.toFixed(2)} Tf ${(page / 2 - fs * 0.72).toFixed(2)} ${(oy + qr / 2 - fs * 0.35).toFixed(2)} Td (ES) Tj ET\n`;
  const text = displayUrl(url).replace(/[\\()]/g, "\\$&");
  ops += `BT 0.4 0.4 0.4 rg /F2 11 Tf ${(page / 2 - text.length * 3).toFixed(2)} 60 Td (${text}) Tj ET\n`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page} ${page}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`,
    `<< /Length ${ops.length} >>\nstream\n${ops}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = objs.map((o, i) => {
    const at = out.length;
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
    return at;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` +
    offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("") +
    `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], { type: "application/pdf" });
};

// Download in the chosen format. `px` is the on-screen size; image
// downloads are rendered 4x larger so they print sharply.
export const downloadQr = async (url, { slug, format = "png", px = 200 }) => {
  if (!url) return;
  const fileName = `${slug || "portfolio"}-qr.${format}`;
  if (format === "svg") return saveBlob(new Blob([qrSvgString(url, px * 4)], { type: "image/svg+xml" }), fileName);
  if (format === "pdf") return saveBlob(pdfBlob(url), fileName);
  return saveBlob(await svgToPngBlob(qrSvgString(url, px * 4), px * 4), fileName);
};

// Native share sheet where available, else copy the link.
export const shareQrLink = async (url, title) => {
  if (!url) return;
  if (navigator.share) {
    try {
      await navigator.share({ title, text: `View ${title}'s photography portfolio`, url });
      return;
    } catch (e) {
      if (e?.name === "AbortError") return; // user closed the share sheet
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    alert("Portfolio link copied to clipboard");
  } catch {
    window.prompt("Copy your portfolio link:", url);
  }
};
