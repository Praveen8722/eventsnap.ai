import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface BadgeProps {
  children: ReactNode;
  color: string;
  bg: string;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZES = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-[11px]',
};

export function Badge({ children, color, bg, size = 'md', className }: BadgeProps) {
  return (
    <span className={cn('rounded-full font-semibold', SIZES[size], className)} style={{ background: bg, color }}>
      {children}
    </span>
  );
}
