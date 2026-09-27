import type { ReactNode } from "react";
import { BRAND_GRADIENT } from "./theme";

export function PrimaryBtn({
  children,
  onClick,
  size = "md",
}: {
  children: ReactNode;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 font-semibold text-white rounded-xl transition-all hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5 ${sizes[size]}`}
      style={{ background: BRAND_GRADIENT }}
    >
      {children}
    </button>
  );
}
