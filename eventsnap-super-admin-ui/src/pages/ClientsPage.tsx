import { useState } from 'react';
import { Download, Eye, Mail, MoreVertical, Users, UserCheck, UserX } from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { TableHead } from '@/components/ui/TableHead';
import { TablePagination } from '@/components/ui/TablePagination';
import { useAsync } from '@/hooks/useAsync';
import { getClients } from '@/services/clientService';
import type { Client } from '@/types';
import { formatDate } from '@/utils/format';

export default function ClientsPage() {
  const result = useAsync(getClients);
  return <AsyncBoundary result={result}>{clients => <ClientsView clients={clients} />}</AsyncBoundary>;
}

function ClientsView({ clients }: { clients: Client[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.photographer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'active').length;
  const totalSpent = clients.reduce((sum, c) => sum + parseInt(c.totalSpent.replace(/[^0-9]/g, '')), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Client Management"
        description="All clients across the platform"
        actions={
          <Button>
            <Download size={15} /> Export
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Clients', value: totalClients.toLocaleString(), icon: Users, color: '#6C63FF', bg: '#F0EEFF' },
          { label: 'Active Clients', value: activeClients.toLocaleString(), icon: UserCheck, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Total Client Spend', value: `$${(totalSpent / 1000).toFixed(0)}K+`, icon: UserX, color: '#F59E0B', bg: '#FFFBEB' },
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
            <TableHead columns={['Client', 'Contact', 'Assigned Photographer', 'Bookings', 'Total Spent', 'Last Booking', 'Status', 'Actions']} />
            <tbody className="divide-y divide-[#F5F5FA]">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#10B981] to-[#6C63FF] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {c.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div className="text-[#1E1E1E] text-sm font-semibold">{c.name}</div>
                        <div className="text-[#A0A0C0] text-xs">{c.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-[#4A4A6A] text-xs">{c.email}</div>
                    <div className="text-[#A0A0C0] text-xs">{c.phone}</div>
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
                  <td className="px-5 py-3.5">
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F6FA] text-[#8080A0] transition-colors"
                      >
                        <MoreVertical size={15} />
                      </button>
                      {openMenu === c.id && (
                        <div className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-[#E8E8F0] py-1 w-40 z-10">
                          <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#4A4A6A] hover:bg-[#F5F6FA]"><Eye size={14} /> View Profile</button>
                          <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#4A4A6A] hover:bg-[#F5F6FA]"><Mail size={14} /> Send Email</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination shown={filtered.length} total={clients.length} itemLabel="clients" pageCount={98} />
      </div>
    </div>
  );
}
