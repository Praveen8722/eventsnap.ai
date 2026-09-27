import type { ReactNode } from "react";

export function OutlineBtn({
  children,
  onClick,
  dark = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  dark?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm border transition-all ${
        dark
          ? "border-white/25 text-white hover:bg-white/10"
          : "border-border text-foreground hover:bg-muted"
      } ${className}`}
    >
      {children}
    </button>
  );
}
