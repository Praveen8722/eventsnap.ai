import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Download, Eye, Calendar, X } from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { TableHead } from '@/components/ui/TableHead';
import { TablePagination } from '@/components/ui/TablePagination';
import { useAsync } from '@/hooks/useAsync';
import { usePagination } from '@/hooks/usePagination';
import { getBookings } from '@/services/bookingService';
import type { BookingStatus, Booking } from '@/types';
import { downloadCsv } from '@/utils/csv';
import { formatCount, formatDate, formatInrCompact, parseAmount } from '@/utils/format';

const statusConfig: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  inquiry: { label: 'Inquiry', color: '#0EA5E9', bg: '#F0F9FF' },
  confirmed: { label: 'Confirmed', color: '#6C63FF', bg: '#F0EEFF' },
  'in-progress': { label: 'In Progress', color: '#F59E0B', bg: '#FFFBEB' },
  delivered: { label: 'Delivered', color: '#10B981', bg: '#ECFDF5' },
  cancelled: { label: 'Cancelled', color: '#8080A0', bg: '#F5F5FA' },
};

export default function BookingsPage() {
  const result = useAsync(getBookings);
  return <AsyncBoundary result={result}>{bookings => <BookingsView bookings={bookings} />}</AsyncBoundary>;
}

function exportBookings(rows: Booking[]) {
  downloadCsv('bookings', [
    { header: 'Booking', value: b => b.reference },
    { header: 'Photographer', value: b => b.photographer },
    { header: 'Client', value: b => b.client },
    { header: 'Event type', value: b => b.eventType },
    { header: 'Event date', value: b => b.eventDate },
    { header: 'Package', value: b => b.package },
    { header: 'Price (INR)', value: b => parseAmount(b.amount) },
    { header: 'Paid (INR)', value: b => parseAmount(b.paid) },
    { header: 'Balance (INR)', value: b => parseAmount(b.balance) },
    { header: 'Status', value: b => b.stage },
    { header: 'Source', value: b => b.source },
    { header: 'Location', value: b => b.location },
    { header: 'Created', value: b => b.createdAt },
  ], rows);
}

function BookingsView({ bookings }: { bookings: Booking[] }) {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [selected, setSelected] = useState<Booking | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings.filter(b => {
      const matchSearch = !query || [b.reference, b.client, b.photographer, b.eventType, b.package, b.location].some(v => v.toLowerCase().includes(query));
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [bookings, search, statusFilter]);
  const pagination = usePagination(filtered, `${search}|${statusFilter}`);

  const counts: Record<string, number> = { all: bookings.length };
  bookings.forEach(b => { counts[b.status] = (counts[b.status] || 0) + 1; });
  const totalPaid = bookings.reduce((sum, b) => sum + parseAmount(b.paid), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Booking Management"
        description={`${formatCount(bookings.length)} total bookings across the platform`}
        actions={
          <Button onClick={() => exportBookings(filtered)} disabled={filtered.length === 0}>
            <Download size={15} /> Export CSV
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Bookings', value: formatCount((counts.confirmed || 0) + (counts['in-progress'] || 0)), color: '#6C63FF', bg: '#F0EEFF' },
          { label: 'Delivered', value: formatCount(counts.delivered || 0), color: '#10B981', bg: '#ECFDF5' },
          { label: 'Open Inquiries', value: formatCount(counts.inquiry || 0), color: '#0EA5E9', bg: '#F0F9FF' },
          { label: 'Paid by Clients (all bookings)', value: formatInrCompact(totalPaid), color: '#FF675D', bg: '#FFF1F0' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-[#F0F0F8]">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[#8080A0] text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {(['all', 'inquiry', 'confirmed', 'in-progress', 'delivered', 'cancelled'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all ${
              statusFilter === s
                ? 'bg-[#6C63FF] text-white border-[#6C63FF]'
                : 'bg-white text-[#8080A0] border-[#F0F0F8] hover:border-[#6C63FF]/30 hover:text-[#1E1E1E]'
            }`}
          >
            {s === 'all' ? `All (${bookings.length})` : `${statusConfig[s].label} (${counts[s] || 0})`}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search booking ID, client, photographer..." />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#F0F0F8] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHead columns={['Booking', 'Client', 'Photographer', 'Event Type', 'Event Date', 'Package', 'Amount', 'Status', 'Actions']} />
            <tbody className="divide-y divide-[#F5F5FA]">
              {pagination.pageItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-[#A0A0C0] text-sm">
                    {bookings.length === 0 ? 'No bookings yet.' : 'No bookings match your search.'}
                  </td>
                </tr>
              )}
              {pagination.pageItems.map(b => {
                const sc = statusConfig[b.status];
                return (
                  <tr key={b.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-[#6C63FF] text-sm font-bold font-mono">{b.reference}</span>
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
                    <td className="px-5 py-3.5 text-[#4A4A6A] text-xs">{b.package || '—'}</td>
                    <td className="px-5 py-3.5 text-[#1E1E1E] text-sm font-bold">{b.amount}</td>
                    <td className="px-5 py-3.5">
                      <Badge color={sc.color} bg={sc.bg}>
                        {b.stage}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setSelected(b)}
                        aria-label={`View booking ${b.reference}`}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F6FA] text-[#8080A0] hover:text-[#6C63FF] transition-colors"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <TablePagination {...pagination} onPageChange={pagination.setPage} itemLabel="bookings" />
      </div>

      {selected && <BookingDetails booking={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function BookingDetails({ booking: b, onClose }: { booking: Booking; onClose: () => void }) {
  const rows: [string, string][] = [
    ['Photographer', b.photographer],
    ['Client', b.client],
    ['Client email', b.clientEmail || '—'],
    ['Client phone', b.clientPhone || '—'],
    ['Event', `${b.eventType} · ${formatDate(b.eventDate)}`],
    ['Package', b.package || '—'],
    ['Price', b.amount],
    ['Paid', b.paid],
    ['Balance', b.balance],
    ['Status', b.stage],
    ['Source', b.source === 'portfolio' ? 'Portfolio booking form' : 'Added by the photographer'],
    ['Created', formatDate(b.createdAt)],
  ];
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} role="dialog" aria-label={`Booking ${b.reference}`}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[#1E1E1E] font-bold text-lg">Booking {b.reference}</h2>
            <p className="text-[#8080A0] text-xs">Contact details are masked</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F5F6FA] text-[#8080A0]">
            <X size={16} />
          </button>
        </div>
        <dl className="divide-y divide-[#F5F5FA]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-2.5 gap-4">
              <dt className="text-[#8080A0] text-xs">{label}</dt>
              <dd className="text-[#1E1E1E] text-xs font-medium text-right">{value}</dd>
            </div>
          ))}
        </dl>
        {b.days.length > 0 && (
          <div className="mt-4">
            <p className="text-[#6060A0] text-xs font-semibold uppercase tracking-wider mb-2">Event days</p>
            <ul className="space-y-1.5">
              {b.days.map((day, i) => (
                <li key={i} className="flex items-center justify-between text-xs bg-[#F9F9FC] rounded-lg px-3 py-2">
                  <span className="text-[#1E1E1E] font-medium">{day.name}</span>
                  <span className="text-[#8080A0]">{formatDate(day.date)}{day.location ? ` · ${day.location}` : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
