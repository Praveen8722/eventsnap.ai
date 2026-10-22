import { useCallback, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { Download, TrendingUp, Users, Calendar, IndianRupee } from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAsync } from '@/hooks/useAsync';
import { getAnalyticsData } from '@/services/analyticsService';
import type { AnalyticsData, AnalyticsPeriod } from '@/types';
import { downloadCsv } from '@/utils/csv';
import { formatCount, formatInr, formatInrCompact } from '@/utils/format';

const periods: { value: AnalyticsPeriod; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const fetcher = useCallback(() => getAnalyticsData(period), [period]);
  const result = useAsync(fetcher);
  return <AsyncBoundary result={result}>{data => <AnalyticsView {...data} onPeriodChange={setPeriod} />}</AsyncBoundary>;
}

function exportAnalytics(data: AnalyticsData, periodLabel: string) {
  type Row = { section: string; item: string; value: string | number; extra?: string | number };
  const rows: Row[] = [
    { section: 'Summary', item: 'Period', value: periodLabel },
    { section: 'Summary', item: 'Platform health score', value: data.summary.healthScore },
    { section: 'Summary', item: 'Photographer retention after 12 months (%)', value: data.summary.retention12m ?? '' },
    { section: 'Summary', item: 'New photographers', value: data.summary.newPhotographers },
    { section: 'Summary', item: 'Bookings', value: data.summary.bookings },
    { section: 'Summary', item: 'Booking volume (INR)', value: data.summary.bookingVolume },
    ...data.eventTypeData.map(e => ({ section: 'Bookings by event type', item: e.type, value: e.count, extra: e.revenue })),
    ...data.geographicData.map(g => ({ section: 'Photographers by location', item: g.state, value: g.photographers, extra: g.revenue })),
    ...data.userGrowth.map(u => ({ section: 'Growth (cumulative)', item: u.month, value: u.photographers, extra: u.clients })),
    ...data.retentionData.map(r => ({ section: 'Retention (%)', item: r.month, value: r.rate })),
    ...data.radarData.map(m => ({ section: 'Platform health', item: m.metric, value: m.value })),
  ];
  downloadCsv('analytics', [
    { header: 'Section', value: (r: Row) => r.section },
    { header: 'Item', value: (r: Row) => r.item },
    { header: 'Value', value: (r: Row) => r.value },
    { header: 'Booking volume (INR) / clients', value: (r: Row) => r.extra ?? '' },
  ], rows);
}

function AnalyticsView({ onPeriodChange, ...data }: AnalyticsData & { onPeriodChange: (period: AnalyticsPeriod) => void }) {
  const { period, summary, userGrowth, geographicData, eventTypeData, retentionData, radarData } = data;
  const periodLabel = periods.find(p => p.value === period)?.label ?? period;
  const maxTypeCount = Math.max(...eventTypeData.map(e => e.count), 1);
  const retentionAt = (month: string) => retentionData.find(point => point.month === month)?.rate;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Reports"
        description="Platform-wide performance metrics and insights"
        actions={
          <>
            <select
              value={period}
              onChange={e => onPeriodChange(e.target.value as AnalyticsPeriod)}
              aria-label="Period"
              className="px-4 py-2 bg-white border border-[#E8E8F0] rounded-xl text-[#4A4A6A] text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/30"
            >
              {periods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <Button onClick={() => exportAnalytics(data, periodLabel)}>
              <Download size={15} /> Export
            </Button>
          </>
        }
      />

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Platform Health Score', value: `${summary.healthScore}/100`, sub: 'Average of the health dimensions', icon: TrendingUp, color: '#6C63FF' },
          {
            label: 'Photographer Retention (12m)',
            value: summary.retention12m === null ? '—' : `${summary.retention12m}%`,
            sub: summary.retention12m === null ? 'Needs photographers who joined 12+ months ago' : 'Still active 12 months after signup',
            icon: Users, color: '#10B981',
          },
          { label: 'Avg. Bookings/Photographer', value: String(summary.avgBookingsPerPhotographer), sub: `${formatCount(summary.bookings)} bookings · ${periodLabel.toLowerCase()}`, icon: Calendar, color: '#F59E0B' },
          { label: 'Booking Volume per Photographer', value: formatInrCompact(summary.volumePerPhotographer), sub: `${formatInrCompact(summary.bookingVolume)} total · ${periodLabel.toLowerCase()}`, icon: IndianRupee, color: '#FF675D' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-[#F0F0F8]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${s.color}20` }}>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div className="text-[#1E1E1E] text-xl font-bold">{s.value}</div>
            <div className="text-[#8080A0] text-xs mt-0.5">{s.label}</div>
            <div className="text-[10px] mt-1.5 text-[#8080A0] font-semibold">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* User Growth Chart + Radar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 border border-[#F0F0F8]">
          <div className="mb-5">
            <h2 className="text-[#1E1E1E] font-semibold">User Growth Trend</h2>
            <p className="text-[#8080A0] text-xs mt-0.5">Total photographers and clients, last 12 months</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={userGrowth}>
              <defs>
                <linearGradient id="gradPhoto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradClient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF675D" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#FF675D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F8" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#A0A0C0' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#A0A0C0' }} axisLine={false} tickLine={false} tickFormatter={v => v.toLocaleString()} />
              <Tooltip contentStyle={{ background: '#1A1233', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }} />
              <Area type="monotone" dataKey="photographers" name="Photographers" stroke="#6C63FF" strokeWidth={2.5} fill="url(#gradPhoto)" />
              <Area type="monotone" dataKey="clients" name="Clients" stroke="#FF675D" strokeWidth={2.5} fill="url(#gradClient)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-6 mt-3 justify-center">
            <div className="flex items-center gap-2"><div className="w-3 h-2 rounded-full bg-[#6C63FF]" /><span className="text-xs text-[#6060A0]">Photographers</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-2 rounded-full bg-[#FF675D]" /><span className="text-xs text-[#6060A0]">Clients</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#F0F0F8]">
          <div className="mb-4">
            <h2 className="text-[#1E1E1E] font-semibold">Platform Health</h2>
            <p className="text-[#8080A0] text-xs mt-0.5">Key performance dimensions</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#F0F0F8" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#A0A0C0' }} />
              <Radar name="Score" dataKey="value" stroke="#6C63FF" fill="#6C63FF" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Event Types + Retention */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-[#F0F0F8]">
          <div className="mb-5">
            <h2 className="text-[#1E1E1E] font-semibold">Bookings by Event Type</h2>
            <p className="text-[#8080A0] text-xs mt-0.5">Bookings created · {periodLabel.toLowerCase()}</p>
          </div>
          <div className="space-y-3">
            {eventTypeData.length === 0 && <p className="text-[#A0A0C0] text-sm py-6 text-center">No bookings in this period.</p>}
            {eventTypeData.map(e => (
              <div key={e.type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#4A4A6A] text-xs font-medium">{e.type}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[#8080A0] text-xs">{formatCount(e.count)} bookings</span>
                    <span className="text-[#1E1E1E] text-xs font-bold" title={`${formatInr(e.revenue)} paid by clients`}>{formatInrCompact(e.revenue)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-[#F5F5FA] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((e.count / maxTypeCount) * 100)}%`, background: e.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#F0F0F8]">
          <div className="mb-5">
            <h2 className="text-[#1E1E1E] font-semibold">12-Month Retention Curve</h2>
            <p className="text-[#8080A0] text-xs mt-0.5">Photographer retention after signup</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={retentionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F8" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#A0A0C0' }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 11, fill: '#A0A0C0' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: '#1A1233', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }} formatter={(v: number) => [`${v}%`, 'Retention']} />
              <Line type="monotone" dataKey="rate" stroke="#6C63FF" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          {retentionData.length === 0 && (
            <p className="text-[#A0A0C0] text-xs text-center mt-2">Shown once photographers have been signed up for a month or more.</p>
          )}
          <div className="flex items-center justify-between mt-3 px-1">
            {(['M2', 'M6', 'M12'] as const).map(month => (
              <div key={month} className="text-center">
                <div className="text-[#1E1E1E] text-sm font-bold">{retentionAt(month) === undefined ? '—' : `${retentionAt(month)}%`}</div>
                <div className="text-[#A0A0C0] text-[10px]">Month {month.slice(1)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Geographic breakdown */}
      <div className="bg-white rounded-2xl border border-[#F0F0F8] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F0F0F8]">
          <h2 className="text-[#1E1E1E] font-semibold">Geographic Distribution</h2>
          <p className="text-[#8080A0] text-xs mt-0.5">Top cities by photographer count (from portfolio locations)</p>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={geographicData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: '#A0A0C0' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="state" tick={{ fontSize: 11, fill: '#4A4A6A' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: '#1A1233', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }} />
              <Bar dataKey="photographers" name="Photographers" fill="#6C63FF" radius={[0, 4, 4, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
