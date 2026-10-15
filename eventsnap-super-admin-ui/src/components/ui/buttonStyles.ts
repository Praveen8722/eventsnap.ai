import { cn } from '@/utils/cn';

export type ButtonVariant = 'primary' | 'secondary';

const BASE = 'flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-[#6C63FF] text-white font-semibold hover:bg-[#5B52EE] shadow-md shadow-[#6C63FF]/30',
  secondary: 'bg-white border border-[#E8E8F0] text-[#4A4A6A] font-medium hover:bg-[#F5F6FA]',
};

/** Button classes, for elements that must look like a button (e.g. router links). */
export function buttonClassName(variant: ButtonVariant = 'secondary', className?: string) {
  return cn(BASE, VARIANTS[variant], className);
}
