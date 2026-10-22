import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { AccessArea } from '@/types';

/** Shows the page only to roles that can open `area`; the API enforces the same rule. */
export function RequireAccess({ area, children }: { area: AccessArea; children: ReactNode }) {
  const { can } = useAuth();
  if (can(area)) return <>{children}</>;
  return (
    <div className="flex flex-col items-center justify-center text-center py-24" role="alert">
      <div className="w-12 h-12 rounded-2xl bg-[#FFF1F0] flex items-center justify-center mb-4">
        <ShieldAlert size={22} className="text-[#FF675D]" />
      </div>
      <h2 className="text-[#1E1E1E] text-lg font-bold mb-1">No access</h2>
      <p className="text-[#8080A0] text-sm max-w-md">Your admin role can&apos;t open this page. Ask a Super Admin if you need access.</p>
    </div>
  );
}
