import type { ReactNode } from "react";
import { PURPLE } from "./theme";

export function SectionLabel({
  children,
  color = PURPLE,
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full mb-4"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {children}
    </span>
  );
}
