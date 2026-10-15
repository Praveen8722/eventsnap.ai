import { useState } from 'react';
import { HardDrive, Image, Trash2, Eye, AlertTriangle } from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { TableHead } from '@/components/ui/TableHead';
import { useAsync } from '@/hooks/useAsync';
import { getGalleryStorageData } from '@/services/galleryService';
import type { GalleryStorageData } from '@/types';
import { formatDate } from '@/utils/format';

const statusConfig = {
  ok: { label: 'Healthy', color: '#10B981', bg: '#ECFDF5' },
  warning: { label: 'Near Limit', color: '#F59E0B', bg: '#FFFBEB' },
  exceeded: { label: 'Limit Exceeded', color: '#FF675D', bg: '#FFF1F0' },
};

const planBadge: Record<string, { color: string; bg: string }> = {
  Studio: { color: '#FF675D', bg: '#FFF1F0' },
  Professional: { color: '#6C63FF', bg: '#F0EEFF' },
  Starter: { color: '#6060A0', bg: '#F5F5FA' },
};

export default function GalleryStoragePage() {
  const result = useAsync(getGalleryStorageData);
  return <AsyncBoundary result={result}>{data => <GalleryStorageView {...data} />}</AsyncBoundary>;
}

function GalleryStorageView({ storageOverview, galleryUsers }: GalleryStorageData) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'warning' | 'exceeded'>('all');

  const usedPercent = Math.round(storageOverview.totalUsed / storageOverview.totalAllocated * 100);

  const filtered = galleryUsers.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gallery & Storage Management"
        description="Monitor platform storage usage across all photographers"
      />

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Allocated', value: `${(storageOverview.totalAllocated / 1024).toFixed(1)} TB`, icon: HardDrive, color: '#6C63FF', bg: '#F0EEFF' },
          { label: 'Total Used', value: `${(storageOverview.totalUsed / 1024).toFixed(1)} TB`, icon: HardDrive, color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Total Files', value: storageOverview.totalFiles.toLocaleString(), icon: Image, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Avg/Photographer', value: `${storageOverview.avgPerPhotographer} GB`, icon: HardDrive, color: '#8080C0', bg: '#F5F5FA' },
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
            <p className="text-[#8080A0] text-xs mt-0.5">{storageOverview.totalUsed.toLocaleString()} GB used of {storageOverview.totalAllocated.toLocaleString()} GB total</p>
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
              width: `${usedPercent}%`,
              background: 'linear-gradient(90deg, #6C63FF, #FF675D)',
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-[#A0A0C0]">0 GB</span>
          <span className="text-xs text-[#A0A0C0]">{(storageOverview.totalAllocated / 1024).toFixed(0)} TB capacity</span>
        </div>

        {/* Storage by plan */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-[#F5F5FA]">
          {[
            { plan: 'Starter (412×10GB)', used: '1,240 GB', limit: '4,120 GB', color: '#8080C0', pct: 30 },
            { plan: 'Professional (638×50GB)', used: '4,180 GB', limit: '31,900 GB', color: '#6C63FF', pct: 13 },
            { plan: 'Studio (153×200GB)', used: '3,001 GB', limit: '30,600 GB', color: '#FF675D', pct: 10 },
          ].map(s => (
            <div key={s.plan} className="text-center">
              <div className="text-[#1E1E1E] text-sm font-bold">{s.used}</div>
              <div className="text-[#A0A0C0] text-[10px] mb-2">{s.plan}</div>
              <div className="h-1.5 bg-[#F5F5FA] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
              </div>
            </div>
          ))}
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
        {filtered.some(u => u.status === 'exceeded') && (
          <div className="px-6 py-3 bg-[#FFF1F0] border-b border-[#FFD8D6] flex items-center gap-2">
            <AlertTriangle size={15} className="text-[#FF675D]" />
            <span className="text-[#FF675D] text-sm font-medium">{filtered.filter(u => u.status === 'exceeded').length} photographers are over their storage limit</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHead columns={['Photographer', 'Plan', 'Storage Used', 'Galleries', 'Files', 'Last Upload', 'Status', 'Actions']} />
            <tbody className="divide-y divide-[#F5F5FA]">
              {filtered.map(u => {
                const sc = statusConfig[u.status];
                const pct = Math.min(Math.round(u.usedGB / u.limitGB * 100), 100);
                return (
                  <tr key={u.id} className={`hover:bg-[#FAFAFA] transition-colors ${u.status === 'exceeded' ? 'bg-[#FFFAFAFA]' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="text-[#1E1E1E] text-sm font-semibold">{u.name}</div>
                      <div className="text-[#A0A0C0] text-xs">{u.id}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge {...(planBadge[u.plan] ?? planBadge.Starter)}>{u.plan}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-[#1E1E1E] text-xs font-bold mb-1.5">{u.usedGB} / {u.limitGB} GB</div>
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
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F0EEFF] text-[#8080A0] hover:text-[#6C63FF] transition-colors"><Eye size={13} /></button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#FFF1F0] text-[#8080A0] hover:text-[#FF675D] transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
