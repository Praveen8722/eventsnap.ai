import { useState } from 'react';
import {
  Filter, MoreVertical, CheckCircle, XCircle, Clock, MapPin, Star, Eye, Ban,
  CheckSquare, Download, Plus, ChevronDown,
} from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { TableHead } from '@/components/ui/TableHead';
import { TablePagination } from '@/components/ui/TablePagination';
import { useAsync } from '@/hooks/useAsync';
import { getPhotographers } from '@/services/photographerService';
import type { PhotographerStatus, Photographer } from '@/types';
import { formatDate } from '@/utils/format';

const statusConfig = {
  active: { label: 'Active', color: '#10B981', bg: '#ECFDF5', icon: CheckCircle },
  pending: { label: 'Pending Approval', color: '#F59E0B', bg: '#FFFBEB', icon: Clock },
  suspended: { label: 'Suspended', color: '#FF675D', bg: '#FFF1F0', icon: XCircle },
};

const planColors = {
  Starter: { color: '#6060A0', bg: '#F0F0F8' },
  Professional: { color: '#6C63FF', bg: '#F0EEFF' },
  Studio: { color: '#FF675D', bg: '#FFF1F0' },
};

export default function PhotographersPage() {
  const result = useAsync(getPhotographers);
  return <AsyncBoundary result={result}>{photographers => <PhotographersView photographers={photographers} />}</AsyncBoundary>;
}

function PhotographersView({ photographers }: { photographers: Photographer[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PhotographerStatus | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = photographers.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchPlan = planFilter === 'all' || p.plan === planFilter;
    return matchSearch && matchStatus && matchPlan;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const counts = {
    all: photographers.length,
    active: photographers.filter(p => p.status === 'active').length,
    pending: photographers.filter(p => p.status === 'pending').length,
    suspended: photographers.filter(p => p.status === 'suspended').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        title="Photographer Management"
        description={<>{photographers.length} photographers registered on the platform</>}
        actions={
          <>
            <Button>
              <Download size={15} />
              Export
            </Button>
            <Button variant="primary">
              <Plus size={15} />
              Add Photographer
            </Button>
          </>
        }
      />

      {/* Status Tabs */}
      <div className="flex items-center gap-1 bg-white border border-[#F0F0F8] rounded-2xl p-1.5 w-fit">
        {(['all', 'active', 'pending', 'suspended'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
              statusFilter === s
                ? 'bg-[#6C63FF] text-white shadow-sm'
                : 'text-[#8080A0] hover:text-[#1E1E1E] hover:bg-[#F5F6FA]'
            }`}
          >
            {s === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />}
            {s.charAt(0).toUpperCase() + s.slice(1)}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === s ? 'bg-white/20 text-white' : 'bg-[#F0F0F8] text-[#6060A0]'}`}>
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, location..." />
        <div className="relative">
          <button
            onClick={() => setShowFilters(s => !s)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E8E8F0] rounded-xl text-[#4A4A6A] text-sm font-medium hover:bg-[#F5F6FA] transition-colors"
          >
            <Filter size={15} />
            Filters
            <ChevronDown size={13} />
          </button>
          {showFilters && (
            <div className="absolute top-12 left-0 bg-white rounded-2xl shadow-xl border border-[#E8E8F0] p-4 w-52 z-10">
              <p className="text-[#4A4A6A] text-xs font-semibold mb-2">Plan</p>
              {['all', 'Starter', 'Professional', 'Studio'].map(plan => (
                <button
                  key={plan}
                  onClick={() => { setPlanFilter(plan); setShowFilters(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${planFilter === plan ? 'bg-[#6C63FF]/10 text-[#6C63FF] font-semibold' : 'text-[#4A4A6A] hover:bg-[#F5F6FA]'}`}
                >
                  {plan === 'all' ? 'All Plans' : plan}
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[#6C63FF]/10 rounded-xl">
            <span className="text-[#6C63FF] text-sm font-semibold">{selectedIds.size} selected</span>
            <button className="text-[#FF675D] text-xs font-medium hover:underline">Suspend</button>
            <button className="text-[#10B981] text-xs font-medium hover:underline">Approve</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#F0F0F8] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHead
              columns={['Photographer', 'Location', 'Plan', 'Status', 'Bookings', 'Revenue', 'Rating', 'Joined', 'Actions']}
              cellClassName="px-4 py-3.5"
              leading={
                <th className="px-5 py-3.5 text-left">
                  <input
                    type="checkbox"
                    aria-label="Select all photographers"
                    className="rounded accent-[#6C63FF]"
                    onChange={e => setSelectedIds(e.target.checked ? new Set(filtered.map(p => p.id)) : new Set())}
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                  />
                </th>
              }
            />
            <tbody className="divide-y divide-[#F5F5FA]">
              {filtered.map(p => {
                const sc = statusConfig[p.status];
                const pc = planColors[p.plan];
                const StatusIcon = sc.icon;
                return (
                  <tr key={p.id} className={`hover:bg-[#FAFAFA] transition-colors ${selectedIds.has(p.id) ? 'bg-[#F0EEFF]' : ''}`}>
                    <td className="px-5 py-3.5">
                      <input type="checkbox" className="rounded accent-[#6C63FF]" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#FF675D] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {p.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <div className="text-[#1E1E1E] text-sm font-semibold">{p.name}</div>
                          <div className="text-[#A0A0C0] text-xs">{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-[#6060A0] text-xs">
                        <MapPin size={11} />
                        {p.location}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge color={pc.color} bg={pc.bg}>
                        {p.plan}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit" style={{ background: sc.bg }}>
                        <StatusIcon size={11} style={{ color: sc.color }} />
                        <span className="text-[11px] font-semibold" style={{ color: sc.color }}>{sc.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[#1E1E1E] text-sm font-medium">{p.bookings}</td>
                    <td className="px-4 py-3.5 text-[#1E1E1E] text-sm font-semibold">{p.revenue}</td>
                    <td className="px-4 py-3.5">
                      {p.rating > 0 ? (
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-[#F59E0B] fill-[#F59E0B]" />
                          <span className="text-[#1E1E1E] text-sm font-medium">{p.rating}</span>
                        </div>
                      ) : (
                        <span className="text-[#C0C0D0] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[#8080A0] text-xs">{formatDate(p.joinDate)}</td>
                    <td className="px-4 py-3.5">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F6FA] text-[#8080A0] hover:text-[#1E1E1E] transition-colors"
                        >
                          <MoreVertical size={15} />
                        </button>
                        {openMenu === p.id && (
                          <div className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-[#E8E8F0] py-1 w-44 z-10">
                            <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#4A4A6A] hover:bg-[#F5F6FA]"><Eye size={14} /> View Details</button>
                            {p.status === 'pending' && <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#10B981] hover:bg-[#ECFDF5]"><CheckSquare size={14} /> Approve</button>}
                            {p.status === 'active' && <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#FF675D] hover:bg-[#FFF1F0]"><Ban size={14} /> Suspend</button>}
                            {p.status === 'suspended' && <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#10B981] hover:bg-[#ECFDF5]"><CheckCircle size={14} /> Reactivate</button>}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <TablePagination shown={filtered.length} total={photographers.length} itemLabel="photographers" pageCount={12} />
      </div>
    </div>
  );
}
