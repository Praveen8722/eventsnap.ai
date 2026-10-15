import { useState } from 'react';
import { Download, Eye, MoreVertical, Calendar } from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { TableHead } from '@/components/ui/TableHead';
import { TablePagination } from '@/components/ui/TablePagination';
import { useAsync } from '@/hooks/useAsync';
import { getBookings } from '@/services/bookingService';
import type { BookingStatus, Booking } from '@/types';
import { formatDate } from '@/utils/format';

const statusConfig: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmed', color: '#6C63FF', bg: '#F0EEFF' },
  'in-progress': { label: 'In Progress', color: '#F59E0B', bg: '#FFFBEB' },
  delivered: { label: 'Delivered', color: '#10B981', bg: '#ECFDF5' },
  cancelled: { label: 'Cancelled', color: '#8080A0', bg: '#F5F5FA' },
  refunded: { label: 'Refunded', color: '#FF675D', bg: '#FFF1F0' },
};

export default function BookingsPage() {
  const result = useAsync(getBookings);
  return <AsyncBoundary result={result}>{bookings => <BookingsView bookings={bookings} />}</AsyncBoundary>;
}

function BookingsView({ bookings }: { bookings: Booking[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = bookings.filter(b => {
    const matchSearch =
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.client.toLowerCase().includes(search.toLowerCase()) ||
      b.photographer.toLowerCase().includes(search.toLowerCase()) ||
      b.eventType.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts: Record<string, number> = { all: bookings.length };
  bookings.forEach(b => { counts[b.status] = (counts[b.status] || 0) + 1; });
  const totalRevenue = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'refunded')
    .reduce((sum, b) => sum + parseInt(b.amount.replace(/[^0-9]/g, '')), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Booking Management"
        description="28,543 total bookings across the platform"
        actions={
          <Button>
            <Download size={15} /> Export CSV
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Bookings', value: (counts.confirmed || 0) + (counts['in-progress'] || 0), color: '#6C63FF', bg: '#F0EEFF' },
          { label: 'Delivered', value: counts.delivered || 0, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Cancelled', value: counts.cancelled || 0, color: '#8080A0', bg: '#F5F5FA' },
          { label: 'Revenue (shown)', value: `$${(totalRevenue / 1000).toFixed(1)}K`, color: '#FF675D', bg: '#FFF1F0' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-[#F0F0F8]">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[#8080A0] text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {(['all', 'confirmed', 'in-progress', 'delivered', 'cancelled', 'refunded'] as const).map(s => {
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all ${
                statusFilter === s
                  ? 'bg-[#6C63FF] text-white border-[#6C63FF]'
                  : 'bg-white text-[#8080A0] border-[#F0F0F8] hover:border-[#6C63FF]/30 hover:text-[#1E1E1E]'
              }`}
            >
              {s === 'all' ? `All (${bookings.length})` : `${s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')} (${counts[s] || 0})`}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search booking ID, client, photographer..." />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#F0F0F8] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHead columns={['Booking ID', 'Client', 'Photographer', 'Event Type', 'Event Date', 'Package', 'Amount', 'Status', 'Actions']} />
            <tbody className="divide-y divide-[#F5F5FA]">
              {filtered.map(b => {
                const sc = statusConfig[b.status];
                return (
                  <tr key={b.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-[#6C63FF] text-sm font-bold font-mono">{b.id}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-[#1E1E1E] text-sm font-medium">{b.client}</div>
                      <div className="text-[#A0A0C0] text-xs">{b.location}</div>
                    </td>
                    <td className="px-5 py-3.5 text-[#4A4A6A] text-xs max-w-[160px]">
                      <div className="truncate">{b.photographer}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 bg-[#F5F6FA] text-[#6060A0] rounded-lg text-xs font-medium">{b.eventType}</span>
                    </td>
                    <td className="px-5 py-3.5 text-[#4A4A6A] text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDate(b.eventDate)}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[#4A4A6A] text-xs">{b.package}</td>
                    <td className="px-5 py-3.5 text-[#1E1E1E] text-sm font-bold">{b.amount}</td>
                    <td className="px-5 py-3.5">
                      <Badge color={sc.color} bg={sc.bg}>
                        {sc.label}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === b.id ? null : b.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F6FA] text-[#8080A0] transition-colors"
                        >
                          <MoreVertical size={15} />
                        </button>
                        {openMenu === b.id && (
                          <div className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-[#E8E8F0] py-1 w-40 z-10">
                            <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#4A4A6A] hover:bg-[#F5F6FA]"><Eye size={14} /> View Details</button>
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
        <TablePagination shown={filtered.length} total={bookings.length} itemLabel="bookings" pageCount={238} />
      </div>
    </div>
  );
}
