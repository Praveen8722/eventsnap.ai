import { useMemo, useState } from 'react';
import {
  Activity, Download, LogIn, Settings, ShieldCheck, CreditCard, Camera, Headphones,
  type LucideIcon,
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
import { getActivityLogs } from '@/services/activityLogService';
import type { LogCategory, AuditLog } from '@/types';
import { downloadCsv } from '@/utils/csv';
import { formatDateTime } from '@/utils/format';

const categoryConfig: Record<LogCategory, { color: string; bg: string; icon: LucideIcon }> = {
  auth: { color: '#6C63FF', bg: '#F0EEFF', icon: LogIn },
  photographers: { color: '#10B981', bg: '#ECFDF5', icon: Camera },
  payments: { color: '#F59E0B', bg: '#FFFBEB', icon: CreditCard },
  settings: { color: '#8B5CF6', bg: '#F5F3FF', icon: Settings },
  admin: { color: '#0EA5E9', bg: '#F0F9FF', icon: ShieldCheck },
  support: { color: '#EC4899', bg: '#FDF2F8', icon: Headphones },
  system: { color: '#8080A0', bg: '#F5F5FA', icon: Activity },
};

const statusConfig = {
  success: { color: '#10B981', bg: '#ECFDF5', label: 'Success' },
  failure: { color: '#FF675D', bg: '#FFF1F0', label: 'Failed' },
  warning: { color: '#F59E0B', bg: '#FFFBEB', label: 'Warning' },
};

export default function ActivityLogsPage() {
  const result = useAsync(getActivityLogs);
  return <AsyncBoundary result={result}>{logs => <ActivityLogsView logs={logs} />}</AsyncBoundary>;
}

function exportLogs(rows: AuditLog[]) {
  downloadCsv('audit-log', [
    { header: 'Timestamp', value: l => l.timestamp },
    { header: 'ID', value: l => l.id },
    { header: 'Actor', value: l => l.actor },
    { header: 'Role', value: l => l.actorRole },
    { header: 'Action', value: l => l.action },
    { header: 'Category', value: l => l.category },
    { header: 'Target', value: l => l.target },
    { header: 'IP address', value: l => l.ipAddress },
    { header: 'Status', value: l => l.status },
    { header: 'Details', value: l => l.details },
  ], rows);
}

function ActivityLogsView({ logs }: { logs: AuditLog[] }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<LogCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failure' | 'warning'>('all');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter(log => {
      const matchSearch = !query || [log.action, log.actor, log.target, log.details, log.ipAddress].some(v => v.toLowerCase().includes(query));
      const matchCategory = categoryFilter === 'all' || log.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || log.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [logs, search, categoryFilter, statusFilter]);
  const pagination = usePagination(filtered, `${search}|${categoryFilter}|${statusFilter}`, 50);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Activity / Audit Logs"
        description="Audit trail of admin panel sign-ins and actions"
        actions={
          <Button onClick={() => exportLogs(filtered)} disabled={filtered.length === 0}>
            <Download size={15} /> Export Logs
          </Button>
        }
      />

      {/* Summary chips */}
      <div className="flex items-center gap-3 flex-wrap">
        {[
          { label: 'Total Events', value: logs.length, color: '#6C63FF' },
          { label: 'Failures', value: logs.filter(l => l.status === 'failure').length, color: '#FF675D' },
          { label: 'Warnings', value: logs.filter(l => l.status === 'warning').length, color: '#F59E0B' },
          { label: 'Unique Actors', value: new Set(logs.map(l => l.actor)).size, color: '#10B981' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-[#F0F0F8]">
            <span className="text-sm font-bold" style={{ color: s.color }}>{s.value}</span>
            <span className="text-[#8080A0] text-xs">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search actions, actors, targets..." />

        {/* Category filter */}
        <div className="flex items-center gap-1 bg-white border border-[#F0F0F8] rounded-xl p-1 flex-wrap">
          <button onClick={() => setCategoryFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${categoryFilter === 'all' ? 'bg-[#6C63FF] text-white' : 'text-[#8080A0]'}`}>All</button>
          {(Object.keys(categoryConfig) as LogCategory[]).map(cat => {
            const cfg = categoryConfig[cat];
            const Icon = cfg.icon;
            return (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${categoryFilter === cat ? 'text-white' : 'text-[#8080A0] hover:text-[#1E1E1E]'}`}
                style={categoryFilter === cat ? { background: cfg.color } : {}}>
                <Icon size={11} />
                {cat}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 bg-white border border-[#F0F0F8] rounded-xl p-1">
          {(['all', 'success', 'failure', 'warning'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${statusFilter === s ? 'bg-[#6C63FF] text-white' : 'text-[#8080A0]'}`}>
              {s === 'all' ? 'All Status' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Log table */}
      <div className="bg-white rounded-2xl border border-[#F0F0F8] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHead columns={['Timestamp', 'Actor', 'Action', 'Category', 'Target', 'IP Address', 'Status', 'Details']} />
            <tbody className="divide-y divide-[#F5F5FA]">
              {pagination.pageItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-[#A0A0C0] text-sm">No log entries match.</td>
                </tr>
              )}
              {pagination.pageItems.map(log => {
                const cc = categoryConfig[log.category] ?? categoryConfig.system;
                const sc = statusConfig[log.status];
                const CatIcon = cc.icon;
                return (
                  <tr key={log.id} className={`hover:bg-[#FAFAFA] transition-colors ${log.status === 'failure' ? 'bg-[#FFFAFA]' : log.status === 'warning' ? 'bg-[#FFFDF5]' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="text-[#4A4A6A] text-xs font-medium font-mono">
                        {formatDateTime(log.timestamp)}
                      </div>
                      <div className="text-[#A0A0C0] text-[10px]">{log.id}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-[#1E1E1E] text-xs font-semibold">{log.actor}</div>
                      <div className="text-[#A0A0C0] text-[10px]">{log.actorRole}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[#1E1E1E] text-xs font-bold tracking-wide font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit" style={{ background: cc.bg }}>
                        <CatIcon size={11} style={{ color: cc.color }} />
                        <span className="text-[11px] font-semibold capitalize" style={{ color: cc.color }}>{log.category}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[#4A4A6A] text-xs max-w-[140px]">
                      <div className="truncate">{log.target}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[#6060A0] text-xs font-mono">{log.ipAddress}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-[#8080A0] text-xs max-w-[220px]">
                      <div className="truncate" title={log.details}>{log.details}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <TablePagination {...pagination} onPageChange={pagination.setPage} itemLabel="log entries" />
      </div>
    </div>
  );
}
