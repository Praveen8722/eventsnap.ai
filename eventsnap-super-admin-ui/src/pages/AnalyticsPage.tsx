import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { Download, TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAsync } from '@/hooks/useAsync';
import { getAnalyticsData } from '@/services/analyticsService';
import type { AnalyticsData } from '@/types';

const periods = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'Last Year', 'All Time'];

export default function AnalyticsPage() {
  const result = useAsync(getAnalyticsData);
  return <AsyncBoundary result={result}>{data => <AnalyticsView {...data} />}</AsyncBoundary>;
}

function AnalyticsView({ userGrowth, geographicData, eventTypeData, retentionData, radarData }: AnalyticsData) {
  const [selectedPeriod, setSelectedPeriod] = useState('Last 30 days');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Reports"
        description="Platform-wide performance metrics and insights"
        actions={
          <>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 bg-white border border-[#E8E8F0] rounded-xl text-[#4A4A6A] text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/30"
            >
              {periods.map(p => <option key={p}>{p}</option>)}
            </select>
            <Button>
              <Download size={15} /> Export
            </Button>
          </>
        }
      />

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Platform Health Score', value: '87/100', sub: '+3 from last period', icon: TrendingUp, color: '#6C63FF' },
          { label: 'User Retention (12m)', value: '57%', sub: 'Industry avg: 42%', icon: Users, color: '#10B981' },
          { label: 'Avg. Bookings/Photographer', value: '5.8', sub: '+1.2 this quarter', icon: Calendar, color: '#F59E0B' },
          { label: 'Revenue per Photographer', value: '$65', sub: 'Avg. monthly ARPU', icon: DollarSign, color: '#FF675D' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-[#F0F0F8]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${s.color}20` }}>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div className="text-[#1E1E1E] text-xl font-bold">{s.value}</div>
            <div className="text-[#8080A0] text-xs mt-0.5">{s.label}</div>
            <div className="text-[10px] mt-1.5 text-[#10B981] font-semibold">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* User Growth Chart + Radar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 border border-[#F0F0F8]">
          <div className="mb-5">
            <h2 className="text-[#1E1E1E] font-semibold">User Growth Trend</h2>
            <p className="text-[#8080A0] text-xs mt-0.5">Photographers and clients over time</p>
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
            <p className="text-[#8080A0] text-xs mt-0.5">Distribution across event categories</p>
          </div>
          <div className="space-y-3">
            {eventTypeData.map(e => (
              <div key={e.type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#4A4A6A] text-xs font-medium">{e.type}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[#8080A0] text-xs">{e.count.toLocaleString()} bookings</span>
                    <span className="text-[#1E1E1E] text-xs font-bold">${(e.revenue / 1000).toFixed(0)}K</span>
                  </div>
                </div>
                <div className="h-1.5 bg-[#F5F5FA] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.round(e.count / 9840 * 100)}%`, background: e.color }}
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
              <YAxis tick={{ fontSize: 11, fill: '#A0A0C0' }} axisLine={false} tickLine={false} domain={[40, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: '#1A1233', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }} formatter={(v: number) => [`${v}%`, 'Retention']} />
              <Line type="monotone" dataKey="rate" stroke="#6C63FF" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-between mt-3 px-1">
            <div className="text-center">
              <div className="text-[#1E1E1E] text-sm font-bold">91%</div>
              <div className="text-[#A0A0C0] text-[10px]">Month 2</div>
            </div>
            <div className="text-center">
              <div className="text-[#1E1E1E] text-sm font-bold">71%</div>
              <div className="text-[#A0A0C0] text-[10px]">Month 6</div>
            </div>
            <div className="text-center">
              <div className="text-[#1E1E1E] text-sm font-bold">57%</div>
              <div className="text-[#A0A0C0] text-[10px]">Month 12</div>
            </div>
          </div>
        </div>
      </div>

      {/* Geographic breakdown */}
      <div className="bg-white rounded-2xl border border-[#F0F0F8] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F0F0F8]">
          <h2 className="text-[#1E1E1E] font-semibold">Geographic Distribution</h2>
          <p className="text-[#8080A0] text-xs mt-0.5">Top states by photographer count</p>
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
