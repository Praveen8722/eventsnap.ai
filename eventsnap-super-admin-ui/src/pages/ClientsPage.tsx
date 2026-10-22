import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Download, Users, UserCheck, IndianRupee } from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { TableHead } from '@/components/ui/TableHead';
import { TablePagination } from '@/components/ui/TablePagination';
import { useAsync } from '@/hooks/useAsync';
import { usePagination } from '@/hooks/usePagination';
import { getClients } from '@/services/clientService';
import type { Client } from '@/types';
import { downloadCsv } from '@/utils/csv';
import { formatCount, formatDate, formatInrCompact, initials, parseAmount } from '@/utils/format';

export default function ClientsPage() {
  const result = useAsync(getClients);
  return <AsyncBoundary result={result}>{clients => <ClientsView clients={clients} />}</AsyncBoundary>;
}

function exportClients(rows: Client[]) {
  downloadCsv('clients', [
    { header: 'Client ID', value: c => c.id },
    { header: 'Client', value: c => c.name },
    { header: 'Email (masked)', value: c => c.email },
    { header: 'Phone (masked)', value: c => c.phone },
    { header: 'Location', value: c => c.location },
    { header: 'Photographer', value: c => c.photographer },
    { header: 'Bookings', value: c => c.bookings },
    { header: 'Total paid (INR)', value: c => parseAmount(c.totalSpent) },
    { header: 'First booking', value: c => c.joinDate },
    { header: 'Last booking', value: c => c.lastBooking },
    { header: 'Status', value: c => c.status },
  ], rows);
}

function ClientsView({ clients }: { clients: Client[] }) {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return clients.filter(c => {
      const matchSearch = !query || [c.name, c.email, c.photographer, c.location, c.id].some(v => v.toLowerCase().includes(query));
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [clients, search, statusFilter]);
  const pagination = usePagination(filtered, `${search}|${statusFilter}`);

  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'active').length;
  const totalSpent = clients.reduce((sum, c) => sum + parseAmount(c.totalSpent), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Client Management"
        description="Photographers' clients, from their bookings · contact details are masked"
        actions={
          <Button onClick={() => exportClients(filtered)} disabled={filtered.length === 0}>
            <Download size={15} /> Export
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Clients', value: formatCount(totalClients), icon: Users, color: '#6C63FF', bg: '#F0EEFF' },
          { label: 'Clients With Open Bookings', value: formatCount(activeClients), icon: UserCheck, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Paid to Photographers', value: formatInrCompact(totalSpent), icon: IndianRupee, color: '#F59E0B', bg: '#FFFBEB' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-[#F0F0F8] flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
              <s.icon size={20} style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-[#1E1E1E] text-2xl font-bold">{s.value}</div>
              <div className="text-[#8080A0] text-xs mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search clients, email, photographer..." />
        <div className="flex items-center gap-1 bg-white border border-[#F0F0F8] rounded-xl p-1">
          {(['all', 'active', 'inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                statusFilter === s ? 'bg-[#6C63FF] text-white' : 'text-[#8080A0] hover:text-[#1E1E1E]'
              }`}
            >
              {s === 'all' ? `All (${clients.length})` : s === 'active' ? `Active (${activeClients})` : `Inactive (${clients.length - activeClients})`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#F0F0F8] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHead columns={['Client', 'Contact', 'Photographer', 'Bookings', 'Total Paid', 'Last Booking', 'Status']} />
            <tbody className="divide-y divide-[#F5F5FA]">
              {pagination.pageItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[#A0A0C0] text-sm">
                    {clients.length === 0 ? 'No clients yet — they appear when photographers add bookings.' : 'No clients match your search.'}
                  </td>
                </tr>
              )}
              {pagination.pageItems.map(c => (
                <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#10B981] to-[#6C63FF] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {initials(c.name)}
                      </div>
                      <div>
                        <div className="text-[#1E1E1E] text-sm font-semibold">{c.name}</div>
                        <div className="text-[#A0A0C0] text-xs">{c.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-[#4A4A6A] text-xs">{c.email || '—'}</div>
                    <div className="text-[#A0A0C0] text-xs">{c.phone || '—'}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-[#4A4A6A] text-xs max-w-[160px] truncate">{c.photographer}</div>
                  </td>
                  <td className="px-5 py-3.5 text-[#1E1E1E] text-sm font-semibold">{c.bookings}</td>
                  <td className="px-5 py-3.5 text-[#1E1E1E] text-sm font-bold">{c.totalSpent}</td>
                  <td className="px-5 py-3.5 text-[#8080A0] text-xs">{formatDate(c.lastBooking)}</td>
                  <td className="px-5 py-3.5">
                    <Badge {...(c.status === 'active' ? { color: '#10B981', bg: '#ECFDF5' } : { color: '#8080A0', bg: '#F5F5FA' })}>
                      {c.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination {...pagination} onPageChange={pagination.setPage} itemLabel="clients" />
      </div>
    </div>
  );
}
