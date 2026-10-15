import { useState } from 'react';
import {
  DollarSign, TrendingUp, Clock, RefreshCcw, Download, CheckCircle, XCircle,
  AlertCircle, type LucideIcon,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { TableHead } from '@/components/ui/TableHead';
import { useAsync } from '@/hooks/useAsync';
import { getPaymentsData } from '@/services/paymentService';
import type { TransactionStatus, PaymentsData } from '@/types';
import { formatDate } from '@/utils/format';

const statusConfig: Record<TransactionStatus, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  completed: { label: 'Completed', color: '#10B981', bg: '#ECFDF5', icon: CheckCircle },
  pending: { label: 'Pending', color: '#F59E0B', bg: '#FFFBEB', icon: Clock },
  failed: { label: 'Failed', color: '#FF675D', bg: '#FFF1F0', icon: XCircle },
  refunded: { label: 'Refunded', color: '#8080A0', bg: '#F5F5FA', icon: RefreshCcw },
};

const typeColors = {
  subscription: { color: '#6C63FF', bg: '#F0EEFF' },
  commission: { color: '#10B981', bg: '#ECFDF5' },
  refund: { color: '#FF675D', bg: '#FFF1F0' },
};

export default function PaymentsPage() {
  const result = useAsync(getPaymentsData);
  return <AsyncBoundary result={result}>{data => <PaymentsView {...data} />}</AsyncBoundary>;
}

function PaymentsView({ monthlyRevenue, transactions }: PaymentsData) {
  const [activeTab, setActiveTab] = useState<'transactions' | 'pending' | 'refunds'>('transactions');
  const [search, setSearch] = useState('');

  const filtered = transactions.filter(t => {
    const matchSearch = t.photographer.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    if (activeTab === 'pending') return matchSearch && t.status === 'pending';
    if (activeTab === 'refunds') return matchSearch && (t.status === 'refunded' || t.type === 'refund');
    return matchSearch;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payments & Revenue"
        description="Platform financial overview and transaction history"
        actions={
          <Button>
            <Download size={15} /> Export Report
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Monthly Revenue', value: '$318K', change: '+7.8%', icon: DollarSign, color: '#6C63FF', bg: '#F0EEFF' },
          { label: 'Subscription MRR', value: '$180K', change: '+4.2%', icon: TrendingUp, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Pending Payments', value: '$184K', change: '47 overdue', icon: Clock, color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Refunds (MTD)', value: '$12.4K', change: '8 processed', icon: RefreshCcw, color: '#FF675D', bg: '#FFF1F0' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-[#F0F0F8]">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <AlertCircle size={13} className="text-[#C0C0D0]" />
            </div>
            <div className="text-[#1E1E1E] text-xl font-bold">{s.value}</div>
            <div className="text-[#8080A0] text-xs mt-0.5">{s.label}</div>
            <div className="text-[10px] mt-1.5 font-semibold text-[#10B981]">{s.change}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl p-6 border border-[#F0F0F8]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[#1E1E1E] font-semibold">Revenue Breakdown</h2>
            <p className="text-[#8080A0] text-xs mt-0.5">Platform commission vs. subscription revenue</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyRevenue} margin={{ top: 5, right: 5, bottom: 0, left: 5 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F8" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#A0A0C0' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#A0A0C0' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip contentStyle={{ background: '#1A1233', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }} formatter={(v: number) => `$${v.toLocaleString()}`} />
            <Bar dataKey="platform" name="Platform Revenue" fill="#6C63FF" radius={[4, 4, 0, 0]} />
            <Bar dataKey="subscriptions" name="Subscriptions" fill="#FF675D" radius={[4, 4, 0, 0]} opacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-6 mt-3 justify-center">
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-[#6C63FF]" /><span className="text-xs text-[#6060A0]">Platform Revenue</span></div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-[#FF675D] opacity-70" /><span className="text-xs text-[#6060A0]">Subscriptions</span></div>
        </div>
      </div>

      {/* Transaction tabs */}
      <div className="flex items-center gap-1 bg-white border border-[#F0F0F8] rounded-xl p-1 w-fit">
        {([
          { key: 'transactions', label: 'All Transactions' },
          { key: 'pending', label: 'Pending (3)' },
          { key: 'refunds', label: 'Refunds' },
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

      <SearchInput value={search} onChange={setSearch} placeholder="Search transactions..." className="max-w-sm" />

      {/* Transactions table */}
      <div className="bg-white rounded-2xl border border-[#F0F0F8] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHead columns={['Transaction ID', 'Photographer', 'Description', 'Type', 'Amount', 'Method', 'Status', 'Date']} />
            <tbody className="divide-y divide-[#F5F5FA]">
              {filtered.map(t => {
                const sc = statusConfig[t.status];
                const tc = typeColors[t.type];
                const StatusIcon = sc.icon;
                return (
                  <tr key={t.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-[#6C63FF] text-xs font-bold font-mono">{t.id}</span>
                    </td>
                    <td className="px-5 py-3.5 text-[#1E1E1E] text-sm font-medium max-w-[180px]">
                      <div className="truncate">{t.photographer}</div>
                    </td>
                    <td className="px-5 py-3.5 text-[#6060A0] text-xs max-w-[200px]">
                      <div className="truncate">{t.description}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge color={tc.color} bg={tc.bg} className="capitalize">
                        {t.type}
                      </Badge>
                    </td>
                    <td className={`px-5 py-3.5 text-sm font-bold ${t.amount.startsWith('-') ? 'text-[#FF675D]' : 'text-[#10B981]'}`}>
                      {t.amount}
                    </td>
                    <td className="px-5 py-3.5 text-[#6060A0] text-xs">{t.method}</td>
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
        <div className="px-6 py-3.5 border-t border-[#F0F0F8] flex items-center justify-between">
          <span className="text-[#8080A0] text-xs">Showing {filtered.length} transactions</span>
        </div>
      </div>
    </div>
  );
}
