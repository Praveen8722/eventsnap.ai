import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Filter, MoreVertical, CheckCircle, Clock, MapPin, Star, Eye, Download, ChevronDown, X,
} from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { TableHead } from '@/components/ui/TableHead';
import { TablePagination } from '@/components/ui/TablePagination';
import { useAsync } from '@/hooks/useAsync';
import { usePagination } from '@/hooks/usePagination';
import { getPhotographers } from '@/services/photographerService';
import type { PhotographerStatus, Photographer } from '@/types';
import { downloadCsv } from '@/utils/csv';
import { formatDate, initials, parseAmount } from '@/utils/format';

const statusConfig = {
  active: { label: 'Active (30d)', color: '#10B981', bg: '#ECFDF5', icon: CheckCircle },
  inactive: { label: 'Inactive', color: '#8080A0', bg: '#F5F5FA', icon: Clock },
};

const planColors: Record<string, { color: string; bg: string }> = {
  Free: { color: '#6C63FF', bg: '#F0EEFF' },
};
const defaultPlanColor = { color: '#6060A0', bg: '#F0F0F8' };

export default function PhotographersPage() {
  const result = useAsync(getPhotographers);
  return <AsyncBoundary result={result}>{photographers => <PhotographersView photographers={photographers} />}</AsyncBoundary>;
}

function exportPhotographers(rows: Photographer[]) {
  downloadCsv('photographers', [
    { header: 'Photographer', value: p => p.name },
    { header: 'Owner', value: p => p.ownerName },
    { header: 'Email', value: p => p.email },
    { header: 'Phone', value: p => p.phone },
    { header: 'Location', value: p => p.location },
    { header: 'Plan', value: p => p.plan },
    { header: 'Status', value: p => statusConfig[p.status].label },
    { header: 'Last active', value: p => p.lastActive },
    { header: 'Bookings', value: p => p.bookings },
    { header: 'Booking volume (INR)', value: p => parseAmount(p.revenue) },
    { header: 'Clients', value: p => p.clients },
    { header: 'Event galleries', value: p => p.events },
    { header: 'Storage used', value: p => p.storage },
    { header: 'Rating', value: p => p.rating || '' },
    { header: 'Joined', value: p => p.joinDate },
  ], rows);
}

function PhotographersView({ photographers }: { photographers: Photographer[] }) {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter] = useState<PhotographerStatus | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Photographer | null>(null);

  const plans = useMemo(() => [...new Set(photographers.map(p => p.plan))], [photographers]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return photographers.filter(p => {
      const matchSearch = !query || [p.name, p.ownerName, p.email, p.location, p.phone].some(v => v.toLowerCase().includes(query));
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchPlan = planFilter === 'all' || p.plan === planFilter;
      return matchSearch && matchStatus && matchPlan;
    });
  }, [photographers, search, statusFilter, planFilter]);
  const pagination = usePagination(filtered, `${search}|${statusFilter}|${planFilter}`);

  const counts = {
    all: photographers.length,
    active: photographers.filter(p => p.status === 'active').length,
    inactive: photographers.filter(p => p.status === 'inactive').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        title="Photographer Management"
        description={<>{photographers.length} photographers registered on the platform</>}
        actions={
          <Button onClick={() => exportPhotographers(filtered)} disabled={filtered.length === 0}>
            <Download size={15} />
            Export
          </Button>
        }
      />

      {/* Status Tabs */}
      <div className="flex items-center gap-1 bg-white border border-[#F0F0F8] rounded-2xl p-1.5 w-fit">
        {(['all', 'active', 'inactive'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
              statusFilter === s
                ? 'bg-[#6C63FF] text-white shadow-sm'
                : 'text-[#8080A0] hover:text-[#1E1E1E] hover:bg-[#F5F6FA]'
            }`}
            title={s === 'active' ? 'Used EventSnap in the last 30 days' : undefined}
          >
            {s === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />}
            {s === 'all' ? 'All' : statusConfig[s].label}
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
            {planFilter === 'all' ? 'Filters' : `Plan: ${planFilter}`}
            <ChevronDown size={13} />
          </button>
          {showFilters && (
            <div className="absolute top-12 left-0 bg-white rounded-2xl shadow-xl border border-[#E8E8F0] p-4 w-52 z-10">
              <p className="text-[#4A4A6A] text-xs font-semibold mb-2">Plan</p>
              {['all', ...plans].map(plan => (
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#F0F0F8] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHead
              columns={['Photographer', 'Location', 'Plan', 'Status', 'Bookings', 'Booking Volume', 'Rating', 'Joined', 'Actions']}
              cellClassName="px-4 py-3.5"
            />
            <tbody className="divide-y divide-[#F5F5FA]">
              {pagination.pageItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-[#A0A0C0] text-sm">
                    {photographers.length === 0 ? 'No photographers have signed up yet.' : 'No photographers match your search.'}
                  </td>
                </tr>
              )}
              {pagination.pageItems.map(p => {
                const sc = statusConfig[p.status];
                const pc = planColors[p.plan] ?? defaultPlanColor;
                const StatusIcon = sc.icon;
                return (
                  <tr key={p.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#FF675D] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {initials(p.name)}
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
                        {p.location || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge color={pc.color} bg={pc.bg}>
                        {p.plan}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit" style={{ background: sc.bg }} title={p.lastActive ? `Last active ${formatDate(p.lastActive)}` : undefined}>
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
                          aria-label={`Actions for ${p.name}`}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F6FA] text-[#8080A0] hover:text-[#1E1E1E] transition-colors"
                        >
                          <MoreVertical size={15} />
                        </button>
                        {openMenu === p.id && (
                          <div className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-[#E8E8F0] py-1 w-44 z-10">
                            <button
                              onClick={() => { setSelected(p); setOpenMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#4A4A6A] hover:bg-[#F5F6FA]"
                            >
                              <Eye size={14} /> View Details
                            </button>
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
        <TablePagination {...pagination} onPageChange={pagination.setPage} itemLabel="photographers" />
      </div>

      {selected && <PhotographerDetails photographer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function PhotographerDetails({ photographer: p, onClose }: { photographer: Photographer; onClose: () => void }) {
  const rows: [string, string | number][] = [
    ['Owner', p.ownerName || '—'],
    ['Email', p.email],
    ['Phone', p.phone || '—'],
    ['Location', p.location || '—'],
    ['Specialty', p.specialty || '—'],
    ['Plan', p.plan],
    ['Joined', formatDate(p.joinDate)],
    ['Last active', formatDate(p.lastActive)],
    ['Bookings', p.bookings],
    ['Clients', p.clients],
    ['Booking volume', p.revenue],
    ['Event galleries', p.events],
    ['Storage used', p.storage],
    ['Rating', p.rating > 0 ? `${p.rating} / 5` : '—'],
    ['Portfolio', p.portfolioSlug ? `/${p.portfolioSlug}${p.portfolioPublished ? '' : ' (unpublished)'}` : 'Not created'],
  ];
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()} role="dialog" aria-label={`${p.name} details`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#FF675D] flex items-center justify-center text-white text-sm font-bold">
              {initials(p.name)}
            </div>
            <div>
              <h2 className="text-[#1E1E1E] font-bold text-lg leading-tight">{p.name}</h2>
              <p className="text-[#8080A0] text-xs">{statusConfig[p.status].label}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F5F6FA] text-[#8080A0]">
            <X size={16} />
          </button>
        </div>
        <dl className="divide-y divide-[#F5F5FA]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-2.5 gap-4">
              <dt className="text-[#8080A0] text-xs">{label}</dt>
              <dd className="text-[#1E1E1E] text-xs font-medium text-right break-all">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[#A0A0C0] text-[11px] mt-4">
          Read-only view of the platform. Accounts are managed by photographers in EventSnap.
        </p>
      </div>
    </div>
  );
}
