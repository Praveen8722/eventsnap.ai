import { useMemo, useState } from 'react';
import { HardDrive, Image, AlertTriangle } from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { TableHead } from '@/components/ui/TableHead';
import { TablePagination } from '@/components/ui/TablePagination';
import { useAsync } from '@/hooks/useAsync';
import { usePagination } from '@/hooks/usePagination';
import { getGalleryStorageData } from '@/services/galleryService';
import type { GalleryStorageData } from '@/types';
import { formatBytes, formatCount, formatDate } from '@/utils/format';

const statusConfig = {
  ok: { label: 'Healthy', color: '#10B981', bg: '#ECFDF5' },
  warning: { label: 'Near Limit', color: '#F59E0B', bg: '#FFFBEB' },
  exceeded: { label: 'Limit Exceeded', color: '#FF675D', bg: '#FFF1F0' },
};

const planBadge: Record<string, { color: string; bg: string }> = {
  Free: { color: '#6C63FF', bg: '#F0EEFF' },
};
const defaultPlanBadge = { color: '#6060A0', bg: '#F5F5FA' };

export default function GalleryStoragePage() {
  const result = useAsync(getGalleryStorageData);
  return <AsyncBoundary result={result}>{data => <GalleryStorageView {...data} />}</AsyncBoundary>;
}

function GalleryStorageView({ storageOverview, galleryUsers }: GalleryStorageData) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'warning' | 'exceeded'>('all');

  const { totalUsedBytes, totalAllocatedBytes } = storageOverview;
  const usedPercent = totalAllocatedBytes ? Math.round((totalUsedBytes / totalAllocatedBytes) * 1000) / 10 : 0;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return galleryUsers.filter(u => {
      const matchSearch = !query || u.name.toLowerCase().includes(query);
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [galleryUsers, search, statusFilter]);
  const pagination = usePagination(filtered, `${search}|${statusFilter}`);
  const exceeded = galleryUsers.filter(u => u.status === 'exceeded').length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gallery & Storage Management"
        description={`Event gallery storage per photographer · ${storageOverview.quotaGB} GB each on the Free plan`}
      />

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Allocated', value: formatBytes(totalAllocatedBytes), icon: HardDrive, color: '#6C63FF', bg: '#F0EEFF' },
          { label: 'Total Used', value: formatBytes(totalUsedBytes), icon: HardDrive, color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Total Photos', value: formatCount(storageOverview.totalFiles), icon: Image, color: '#10B981', bg: '#ECFDF5' },
          {
            label: 'Avg/Photographer',
            value: formatBytes(storageOverview.photographers ? totalUsedBytes / storageOverview.photographers : 0),
            icon: HardDrive, color: '#8080C0', bg: '#F5F5FA',
          },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-[#F0F0F8] flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-[#1E1E1E] text-lg font-bold">{s.value}</div>
              <div className="text-[#8080A0] text-xs">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Platform storage bar */}
      <div className="bg-white rounded-2xl p-6 border border-[#F0F0F8]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[#1E1E1E] font-semibold">Platform Storage Utilization</h2>
            <p className="text-[#8080A0] text-xs mt-0.5">{formatBytes(totalUsedBytes)} used of {formatBytes(totalAllocatedBytes)} allocated ({formatCount(storageOverview.photographers)} photographers × {storageOverview.quotaGB} GB)</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#1E1E1E]">{usedPercent}%</div>
            <div className="text-[#8080A0] text-xs">utilized</div>
          </div>
        </div>
        <div className="h-4 bg-[#F5F5FA] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(usedPercent, 100)}%`,
              background: 'linear-gradient(90deg, #6C63FF, #FF675D)',
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-[#A0A0C0]">0 GB</span>
          <span className="text-xs text-[#A0A0C0]">{formatBytes(totalAllocatedBytes)} capacity</span>
        </div>

        {/* Storage by plan */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-[#F5F5FA]">
          <div className="text-center">
            <div className="text-[#1E1E1E] text-sm font-bold">{formatBytes(totalUsedBytes)}</div>
            <div className="text-[#A0A0C0] text-[10px] mb-2">Free ({formatCount(storageOverview.photographers)}×{storageOverview.quotaGB}GB)</div>
            <div className="h-1.5 bg-[#F5F5FA] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(usedPercent, 100)}%`, background: '#6C63FF' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search photographers..." />
        <div className="flex items-center gap-1 bg-white border border-[#F0F0F8] rounded-xl p-1">
          {(['all', 'ok', 'warning', 'exceeded'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${statusFilter === s ? 'bg-[#6C63FF] text-white' : 'text-[#8080A0] hover:text-[#1E1E1E]'}`}>
              {s === 'all' ? 'All' : statusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#F0F0F8] overflow-hidden">
        {exceeded > 0 && (
          <div className="px-6 py-3 bg-[#FFF1F0] border-b border-[#FFD8D6] flex items-center gap-2">
            <AlertTriangle size={15} className="text-[#FF675D]" />
            <span className="text-[#FF675D] text-sm font-medium">{exceeded} photographer{exceeded === 1 ? ' is' : 's are'} over the storage limit</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHead columns={['Photographer', 'Plan', 'Storage Used', 'Galleries', 'Photos', 'Last Upload', 'Status']} />
            <tbody className="divide-y divide-[#F5F5FA]">
              {pagination.pageItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[#A0A0C0] text-sm">
                    {galleryUsers.length === 0 ? 'No photographer has uploaded photos yet.' : 'No photographers match your search.'}
                  </td>
                </tr>
              )}
              {pagination.pageItems.map(u => {
                const sc = statusConfig[u.status];
                const pct = u.limitBytes ? Math.min(Math.round((u.usedBytes / u.limitBytes) * 100), 100) : 0;
                return (
                  <tr key={u.id} className={`hover:bg-[#FAFAFA] transition-colors ${u.status === 'exceeded' ? 'bg-[#FFFAFAFA]' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="text-[#1E1E1E] text-sm font-semibold">{u.name}</div>

                    </td>
                    <td className="px-5 py-3.5">
                      <Badge {...(planBadge[u.plan] ?? defaultPlanBadge)}>{u.plan}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-[#1E1E1E] text-xs font-bold mb-1.5">{formatBytes(u.usedBytes)} / {u.limitGB} GB</div>
                      <div className="w-32 h-1.5 bg-[#F5F5FA] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${pct}%`,
                          background: u.status === 'exceeded' ? '#FF675D' : u.status === 'warning' ? '#F59E0B' : '#6C63FF',
                        }} />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[#4A4A6A] text-sm font-medium">{u.galleries}</td>
                    <td className="px-5 py-3.5 text-[#4A4A6A] text-sm font-medium">{u.files.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-[#8080A0] text-xs">{formatDate(u.lastUpload)}</td>
                    <td className="px-5 py-3.5">
                      <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <TablePagination {...pagination} onPageChange={pagination.setPage} itemLabel="photographers" />
      </div>
    </div>
  );
}
