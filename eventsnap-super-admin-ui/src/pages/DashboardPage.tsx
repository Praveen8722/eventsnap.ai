import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Camera, Users, Calendar, IndianRupee, Package, AlertCircle, TrendingUp, TrendingDown, Minus,
  ArrowRight, Activity, Clock, CheckCircle, XCircle, type LucideIcon,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart,
  Pie, Cell,
} from 'recharts';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { ROUTES, type AdminRoute } from '@/config/routes';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardData } from '@/services/dashboardService';
import type { AccessArea, DashboardData, DashboardStats } from '@/types';
import { formatChange, formatCount, formatInr, formatInrCompact, initials } from '@/utils/format';

interface StatCard {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'flat';
  icon: LucideIcon;
  color: string;
  bg: string;
  path: AdminRoute;
  area: AccessArea;
}

function buildStatCards({ photographers, activePhotographers, bookings, bookingVolume, events, outstanding }: DashboardStats): StatCard[] {
  const growth = (n: number): StatCard['trend'] => (n > 0 ? 'up' : 'flat');
  return [
    {
      label: 'Total Photographers',
      value: formatCount(photographers.total),
      change: `+${formatCount(photographers.newThisMonth)} this month`,
      trend: growth(photographers.newThisMonth),
      icon: Camera, color: '#6C63FF', bg: '#F0EEFF', path: ROUTES.photographers, area: 'photographers',
    },
    {
      label: `Active Photographers (${activePhotographers.windowDays}d)`,
      value: formatCount(activePhotographers.value),
      change: `${activePhotographers.total ? Math.round((activePhotographers.value / activePhotographers.total) * 100) : 0}% of all photographers`,
      trend: 'flat',
      icon: Users, color: '#10B981', bg: '#ECFDF5', path: ROUTES.photographers, area: 'photographers',
    },
    {
      label: 'Total Bookings',
      value: formatCount(bookings.total),
      change: `+${formatCount(bookings.newThisMonth)} this month`,
      trend: growth(bookings.newThisMonth),
      icon: Calendar, color: '#F59E0B', bg: '#FFFBEB', path: ROUTES.bookings, area: 'bookings',
    },
    {
      label: 'Booking Volume (this month)',
      value: formatInrCompact(bookingVolume.thisMonth),
      change: formatChange(bookingVolume.changePercent, `${formatInrCompact(bookingVolume.total)} all time`),
      trend: bookingVolume.changePercent === null ? 'flat' : bookingVolume.changePercent >= 0 ? 'up' : 'down',
      icon: IndianRupee, color: '#6C63FF', bg: '#F0EEFF', path: ROUTES.payments, area: 'payments',
    },
    {
      label: 'Event Galleries',
      value: formatCount(events.total),
      change: `+${formatCount(events.newThisMonth)} this month`,
      trend: growth(events.newThisMonth),
      icon: Package, color: '#8B5CF6', bg: '#F5F3FF', path: ROUTES.gallery, area: 'gallery',
    },
    {
      label: 'Balances Due to Photographers',
      value: formatInrCompact(outstanding.amount),
      change: `${formatCount(outstanding.bookings)} booking${outstanding.bookings === 1 ? '' : 's'} with a balance`,
      trend: outstanding.amount > 0 ? 'down' : 'flat',
      icon: AlertCircle, color: '#FF675D', bg: '#FFF1F0', path: ROUTES.payments, area: 'payments',
    },
  ];
}

const trendColor = { up: 'text-[#10B981]', down: 'text-[#FF675D]', flat: 'text-[#8080A0]' };
const TrendIcon = { up: TrendingUp, down: TrendingDown, flat: Minus };

const activityColors = { info: '#6C63FF', success: '#10B981', warning: '#F59E0B', error: '#FF675D' };
const activityIcons = {
  info: Activity,
  success: CheckCircle,
  warning: Clock,
  error: XCircle,
};

export default function DashboardPage() {
  const result = useAsync(getDashboardData);
  return <AsyncBoundary result={result}>{data => <DashboardView {...data} />}</AsyncBoundary>;
}

function DashboardView({ stats, revenueData, subscriptionData, topPhotographers, recentActivity }: DashboardData) {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [revenueView, setRevenueView] = useState<'revenue' | 'bookings'>('revenue');
  const statCards = buildStatCards(stats);
  const totalOnPlans = subscriptionData.reduce((sum, plan) => sum + plan.value, 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          const Trend = TrendIcon[card.trend];
          const linked = can(card.area);
          return (
            <button
              key={card.label}
              onClick={() => linked && navigate(card.path)}
              disabled={!linked}
              className="disabled:cursor-default bg-white rounded-2xl p-4 border border-[#F0F0F8] hover:shadow-md hover:shadow-[#6C63FF]/10 hover:-translate-y-0.5 transition-all text-left group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                  <Icon size={18} style={{ color: card.color }} />
                </div>
                <Trend size={14} className={`${trendColor[card.trend]} mt-1`} />
              </div>
              <div className="text-[#1E1E1E] text-xl font-bold leading-tight">{card.value}</div>
              <div className="text-[#6060A0] text-[10px] mt-0.5 font-medium">{card.label}</div>
              <div className={`text-[10px] mt-1.5 font-semibold ${trendColor[card.trend]}`}>
                {card.change}
              </div>
            </button>
          );
        })}
      </div>

      {/* Revenue Chart + Subscription Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 border border-[#F0F0F8]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[#1E1E1E] font-semibold text-base">Platform Performance</h2>
              <p className="text-[#8080A0] text-xs mt-0.5">Last 12 months · booking volume is what photographers recorded from clients</p>
            </div>
            <div className="flex items-center gap-1 bg-[#F5F6FA] rounded-xl p-1">
              {(['revenue', 'bookings'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setRevenueView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                    revenueView === v ? 'bg-white text-[#6C63FF] shadow-sm' : 'text-[#8080A0] hover:text-[#1E1E1E]'
                  }`}
                >
                  {v === 'revenue' ? 'Booking volume' : 'Bookings'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF675D" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF675D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F8" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#A0A0C0' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#A0A0C0' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => (revenueView === 'revenue' ? formatInrCompact(v) : formatCount(v))}
              />
              <Tooltip
                contentStyle={{ background: '#1A1233', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12 }}
                formatter={(val: number) => (revenueView === 'revenue' ? [formatInr(val), 'Booking volume'] : [formatCount(val), 'Bookings'])}
              />
              <Area
                type="monotone"
                dataKey={revenueView}
                stroke={revenueView === 'revenue' ? '#6C63FF' : '#FF675D'}
                strokeWidth={2.5}
                fill={`url(#color${revenueView === 'revenue' ? 'Revenue' : 'Bookings'})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#F0F0F8]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[#1E1E1E] font-semibold text-base">Subscription Plans</h2>
              <p className="text-[#8080A0] text-xs mt-0.5">{formatCount(totalOnPlans)} photographers · no paid plans yet</p>
            </div>
            {can('subscriptions') && (
              <button onClick={() => navigate(ROUTES.subscriptions)} className="text-[#6C63FF] text-xs font-semibold hover:underline flex items-center gap-1">
                View <ArrowRight size={12} />
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={subscriptionData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" paddingAngle={3}>
                {subscriptionData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1A1233', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {subscriptionData.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="text-[#4A4A6A] text-xs">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#1E1E1E] text-xs font-semibold">{item.value}</span>
                  <span className="text-[#A0A0C0] text-[10px]">({totalOnPlans ? Math.round((item.value / totalOnPlans) * 100) : 0}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Photographers + Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-[#F0F0F8] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F0F0F8] flex items-center justify-between">
            <div>
              <h2 className="text-[#1E1E1E] font-semibold text-base">Top Performers</h2>
              <p className="text-[#8080A0] text-xs mt-0.5">Highest booking volume photographers</p>
            </div>
            {can('photographers') && (
              <button onClick={() => navigate(ROUTES.photographers)} className="text-[#6C63FF] text-xs font-semibold hover:underline flex items-center gap-1">
                All photographers <ArrowRight size={12} />
              </button>
            )}
          </div>
          <div className="divide-y divide-[#F5F5FA]">
            {topPhotographers.length === 0 && (
              <p className="px-6 py-10 text-center text-[#A0A0C0] text-sm">No bookings recorded yet.</p>
            )}
            {topPhotographers.map((p, i) => (
              <div key={p.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-[#FAFAFA] transition-colors">
                <div className="w-7 h-7 rounded-lg bg-[#6C63FF]/10 text-[#6C63FF] text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#FF675D] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {initials(p.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[#1E1E1E] text-sm font-semibold truncate">{p.name}</div>
                  <div className="text-[#8080A0] text-xs">{p.location || 'Location not set'}</div>
                </div>
                <div className="text-center hidden sm:block">
                  <div className="text-[#1E1E1E] text-sm font-semibold">{p.bookings}</div>
                  <div className="text-[#A0A0C0] text-[10px]">bookings</div>
                </div>
                <div className="text-center hidden md:block">
                  <div className="text-[#1E1E1E] text-sm font-semibold">{p.revenue}</div>
                  <div className="text-[#A0A0C0] text-[10px]">booking volume</div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold flex-shrink-0 bg-[#6C63FF]/15 text-[#6C63FF]">
                  {p.plan}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-[#F0F0F8] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F0F0F8]">
            <h2 className="text-[#1E1E1E] font-semibold text-base">Recent Activity</h2>
            <p className="text-[#8080A0] text-xs mt-0.5">Platform events feed</p>
          </div>
          <div className="divide-y divide-[#F5F5FA]">
            {recentActivity.length === 0 && (
              <p className="px-5 py-10 text-center text-[#A0A0C0] text-sm">No platform activity yet.</p>
            )}
            {recentActivity.map((event, i) => {
              const color = activityColors[event.status as keyof typeof activityColors];
              const Icon = activityIcons[event.status as keyof typeof activityIcons];
              return (
                <div key={i} className="px-5 py-3.5 flex items-start gap-3 hover:bg-[#FAFAFA] transition-colors">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${color}20` }}>
                    <Icon size={12} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1E1E1E] text-xs leading-snug">{event.message}</p>
                    <p className="text-[#A0A0C0] text-[10px] mt-1">{event.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {can('activityLogs') && (
            <div className="px-5 py-3 border-t border-[#F0F0F8]">
              <button onClick={() => navigate(ROUTES.activityLogs)} className="text-[#6C63FF] text-xs font-semibold hover:underline flex items-center gap-1">
                Admin audit log <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
