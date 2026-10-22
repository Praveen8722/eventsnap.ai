import { useMemo, useState } from 'react';
import {
  IndianRupee, TrendingUp, Clock, Download, CheckCircle, Info, Building2, type LucideIcon,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { TableHead } from '@/components/ui/TableHead';
import { TablePagination } from '@/components/ui/TablePagination';
import { useAsync } from '@/hooks/useAsync';
import { usePagination } from '@/hooks/usePagination';
import { getPaymentsData } from '@/services/paymentService';
import type { TransactionStatus, PaymentsData, Transaction } from '@/types';
import { downloadCsv } from '@/utils/csv';
import { formatChange, formatCount, formatDate, formatInr, formatInrCompact, parseAmount } from '@/utils/format';

const statusConfig: Record<TransactionStatus, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  completed: { label: 'Recorded', color: '#10B981', bg: '#ECFDF5', icon: CheckCircle },
  pending: { label: 'Due', color: '#F59E0B', bg: '#FFFBEB', icon: Clock },
};

const typeConfig: Record<Transaction['type'], { label: string; color: string; bg: string }> = {
  advance: { label: 'Advance', color: '#6C63FF', bg: '#F0EEFF' },
  payment: { label: 'Payment', color: '#10B981', bg: '#ECFDF5' },
  balance: { label: 'Balance due', color: '#F59E0B', bg: '#FFFBEB' },
};

export default function PaymentsPage() {
  const result = useAsync(getPaymentsData);
  return <AsyncBoundary result={result}>{data => <PaymentsView {...data} />}</AsyncBoundary>;
}

function exportTransactions(rows: Transaction[]) {
  downloadCsv('booking-payments', [
    { header: 'Date', value: t => t.date },
    { header: 'Booking', value: t => t.reference },
    { header: 'Photographer', value: t => t.photographer },
    { header: 'Client', value: t => t.client },
    { header: 'Type', value: t => typeConfig[t.type].label },
    { header: 'Amount (INR)', value: t => parseAmount(t.amount) },
    { header: 'Status', value: t => statusConfig[t.status].label },
    { header: 'Description', value: t => t.description },
  ], rows);
}

function PaymentsView({ summary, monthlyRevenue, transactions }: PaymentsData) {
  const [activeTab, setActiveTab] = useState<'transactions' | 'pending'>('transactions');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter(t => {
      const matchSearch = !query || [t.photographer, t.client, t.reference, t.description].some(v => v.toLowerCase().includes(query));
      if (activeTab === 'pending') return matchSearch && t.status === 'pending';
      return matchSearch && t.status === 'completed';
    });
  }, [transactions, search, activeTab]);
  const pagination = usePagination(filtered, `${search}|${activeTab}`);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payments & Revenue"
        description="Booking payments photographers recorded from their clients, and EventSnap's own income"
        actions={
          <Button onClick={() => exportTransactions(filtered)} disabled={filtered.length === 0}>
            <Download size={15} /> Export Report
          </Button>
        }
      />

      {!summary.billingEnabled && (
        <div className="flex items-start gap-3 px-5 py-4 bg-[#F0EEFF] border border-[#DCD9FF] rounded-2xl">
          <Info size={18} className="text-[#6C63FF] flex-shrink-0 mt-0.5" />
          <p className="text-[#4A4A6A] text-sm">
            <span className="font-semibold text-[#1E1E1E]">{summary.billingMessage}</span>{' '}
            Booking volume below is money photographers received from their own clients. It is not EventSnap income.
          </p>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'EventSnap Income',
            value: formatInr(summary.platformIncome),
            change: summary.billingEnabled ? 'This month' : 'No billing set up yet',
            icon: Building2, color: '#6C63FF', bg: '#F0EEFF',
          },
          {
            label: 'Booking Volume (this month)',
            value: formatInrCompact(summary.volumeThisMonth),
            change: formatChange(summary.volumeChangePercent, `${formatCount(summary.paymentsThisMonth)} payments this month`),
            icon: IndianRupee, color: '#10B981', bg: '#ECFDF5',
          },
          {
            label: 'Booking Volume (all time)',
            value: formatInrCompact(summary.volumeTotal),
            change: 'Recorded by photographers',
            icon: TrendingUp, color: '#8B5CF6', bg: '#F5F3FF',
          },
          {
            label: 'Balances Due from Clients',
            value: formatInrCompact(summary.outstandingAmount),
            change: `${formatCount(summary.outstandingBookings)} booking${summary.outstandingBookings === 1 ? '' : 's'}`,
            icon: Clock, color: '#F59E0B', bg: '#FFFBEB',
          },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-[#F0F0F8]">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
            </div>
            <div className="text-[#1E1E1E] text-xl font-bold">{s.value}</div>
            <div className="text-[#8080A0] text-xs mt-0.5">{s.label}</div>
            <div className="text-[10px] mt-1.5 font-semibold text-[#8080A0]">{s.change}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl p-6 border border-[#F0F0F8]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[#1E1E1E] font-semibold">Revenue Breakdown</h2>
            <p className="text-[#8080A0] text-xs mt-0.5">Booking volume vs. EventSnap income, last 12 months</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyRevenue} margin={{ top: 5, right: 5, bottom: 0, left: 5 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F8" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#A0A0C0' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#A0A0C0' }} axisLine={false} tickLine={false} tickFormatter={v => formatInrCompact(v)} />
            <Tooltip contentStyle={{ background: '#1A1233', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }} formatter={(v: number) => formatInr(v)} />
            <Bar dataKey="bookingVolume" name="Booking volume" fill="#6C63FF" radius={[4, 4, 0, 0]} />
            <Bar dataKey="platformIncome" name="EventSnap income" fill="#FF675D" radius={[4, 4, 0, 0]} opacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-6 mt-3 justify-center">
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-[#6C63FF]" /><span className="text-xs text-[#6060A0]">Booking volume</span></div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-[#FF675D] opacity-70" /><span className="text-xs text-[#6060A0]">EventSnap income</span></div>
        </div>
      </div>

      {/* Transaction tabs */}
      <div className="flex items-center gap-1 bg-white border border-[#F0F0F8] rounded-xl p-1 w-fit">
        {([
          { key: 'transactions', label: 'Recorded Payments' },
          { key: 'pending', label: `Balances Due (${summary.outstandingBookings})` },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === t.key ? 'bg-[#6C63FF] text-white' : 'text-[#8080A0] hover:text-[#1E1E1E]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search photographer, client, booking..." className="max-w-sm" />

      {/* Transactions table */}
      <div className="bg-white rounded-2xl border border-[#F0F0F8] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHead columns={['Booking', 'Photographer', 'Client', 'Description', 'Type', 'Amount', 'Status', 'Date']} />
            <tbody className="divide-y divide-[#F5F5FA]">
              {pagination.pageItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-[#A0A0C0] text-sm">
                    {activeTab === 'pending' ? 'No balances due.' : 'No payments recorded yet.'}
                  </td>
                </tr>
              )}
              {pagination.pageItems.map(t => {
                const sc = statusConfig[t.status];
                const tc = typeConfig[t.type];
                const StatusIcon = sc.icon;
                return (
                  <tr key={t.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-[#6C63FF] text-xs font-bold font-mono">{t.reference}</span>
                    </td>
                    <td className="px-5 py-3.5 text-[#1E1E1E] text-sm font-medium max-w-[180px]">
                      <div className="truncate">{t.photographer}</div>
                    </td>
                    <td className="px-5 py-3.5 text-[#4A4A6A] text-xs max-w-[160px]">
                      <div className="truncate">{t.client}</div>
                    </td>
                    <td className="px-5 py-3.5 text-[#6060A0] text-xs max-w-[200px]">
                      <div className="truncate">{t.description}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge color={tc.color} bg={tc.bg}>
                        {tc.label}
                      </Badge>
                    </td>
                    <td className={`px-5 py-3.5 text-sm font-bold ${t.status === 'pending' ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
                      {t.amount}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full" style={{ background: sc.bg }}>
                        <StatusIcon size={11} style={{ color: sc.color }} />
                        <span className="text-[11px] font-semibold" style={{ color: sc.color }}>{sc.label}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[#8080A0] text-xs">
                      {formatDate(t.date)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <TablePagination {...pagination} onPageChange={pagination.setPage} itemLabel={activeTab === 'pending' ? 'balances' : 'payments'} />
      </div>
    </div>
  );
}
