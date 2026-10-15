import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'className'> {
  value: string;
  onChange: (value: string) => void;
  /** Classes for the wrapper; controls width and flex behaviour. */
  className?: string;
}

export function SearchInput({ value, onChange, className = 'flex-1 max-w-sm', ...props }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A0C0]" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E8E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/30 focus:border-[#6C63FF] text-[#1E1E1E]"
        {...props}
      />
    </div>
  );
}
