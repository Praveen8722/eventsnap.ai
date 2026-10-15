import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface TableHeadProps {
  columns: string[];
  /** Optional cell rendered before the column headers (e.g. a select-all checkbox). */
  leading?: ReactNode;
  /** Padding classes for each header cell. */
  cellClassName?: string;
}

export function TableHead({ columns, leading, cellClassName = 'px-5 py-3.5' }: TableHeadProps) {
  return (
    <thead>
      <tr className="bg-[#FAFAFA] border-b border-[#F0F0F8]">
        {leading}
        {columns.map(column => (
          <th
            key={column}
            className={cn(
              cellClassName,
              'text-left text-[#6060A0] text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap',
            )}
          >
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}
