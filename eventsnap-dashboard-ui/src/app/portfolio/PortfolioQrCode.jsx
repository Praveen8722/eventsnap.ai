"use client";

import { useMemo } from "react";
import { qrMatrix, qrPath, logoBox } from "@/lib/portfolioQr";

// A real, scannable QR code for `url`, drawn at `size` px in the same style
// as the original placeholder (dark modules, purple "ES" badge in the centre).
export function PortfolioQrCode({ url, size }) {
  const qr = useMemo(() => {
    const m = qrMatrix(url);
    if (!m) return null;
    const margin = 2; // + the card's own white padding = quiet zone
    return { d: qrPath(m, margin), ...logoBox(m, margin) };
  }, [url]);

  if (!qr) return <div style={{ width: size, height: size }} />;
  const { d, x, y, s, total } = qr;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`QR code for ${url}`}
      data-qr-url={url}
    >
      <rect width={total} height={total} fill="white" />
      <path d={d} fill="#1E1E1E" />
      <rect x={x - 0.5} y={y - 0.5} width={s + 1} height={s + 1} rx={(s + 1) / 5} fill="white" />
      <rect x={x} y={y} width={s} height={s} rx={s / 5} fill="#6C63FF" />
      <text
        x={total / 2}
        y={total / 2}
        dy="0.35em"
        textAnchor="middle"
        fill="white"
        fontSize={s * 0.45}
        fontWeight="bold"
        shapeRendering="auto"
      >
        ES
      </text>
    </svg>
  );
}
