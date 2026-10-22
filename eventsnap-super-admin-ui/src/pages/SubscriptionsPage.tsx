import { Check, Users, IndianRupee, TrendingUp, Info } from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { TableHead } from '@/components/ui/TableHead';
import { useAsync } from '@/hooks/useAsync';
import { getSubscriptionsData } from '@/services/subscriptionService';
import type { SubscriptionsData } from '@/types';
import { formatCount, formatDate, formatInr } from '@/utils/format';

const statusConfig = {
  active: { label: 'Active', color: '#10B981', bg: '#ECFDF5' },
  trial: { label: 'Trial', color: '#6C63FF', bg: '#F0EEFF' },
  past_due: { label: 'Past Due', color: '#FF675D', bg: '#FFF1F0' },
};

export default function SubscriptionsPage() {
  const result = useAsync(getSubscriptionsData);
  return <AsyncBoundary result={result}>{data => <SubscriptionsView {...data} />}</AsyncBoundary>;
}

function SubscriptionsView({ billing, plans, recentSubscribers }: SubscriptionsData) {
  const totalMRR = plans.reduce((sum, p) => sum + p.mrr, 0);
  const totalSubscribers = plans.reduce((sum, p) => sum + p.subscribers, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Subscription & Plans" description="Platform subscription tiers and who is on them" />

      {!billing.enabled && (
        <div className="flex items-start gap-3 px-5 py-4 bg-[#F0EEFF] border border-[#DCD9FF] rounded-2xl">
          <Info size={18} className="text-[#6C63FF] flex-shrink-0 mt-0.5" />
          <p className="text-[#4A4A6A] text-sm">
            <span className="font-semibold text-[#1E1E1E]">{billing.message}</span>{' '}
            Paid plans, pricing and billing dates will appear here once billing is added to EventSnap.
          </p>
        </div>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Subscribers', value: formatCount(totalSubscribers), icon: Users, color: '#6C63FF', bg: '#F0EEFF' },
          { label: 'Monthly Recurring Revenue', value: formatInr(totalMRR), icon: IndianRupee, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Avg. Revenue per User', value: formatInr(totalSubscribers ? totalMRR / totalSubscribers : 0), icon: TrendingUp, color: '#FF675D', bg: '#FFF1F0' },
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

      {/* Plan cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#1E1E1E] font-semibold">Active Plans</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border overflow-hidden relative ${plan.popular ? 'border-[#6C63FF] shadow-lg shadow-[#6C63FF]/15' : 'border-[#F0F0F8]'}`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ background: plan.color }} />
                      <span className="text-[#1E1E1E] font-bold">{plan.name}</span>
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-bold text-[#1E1E1E]">{formatInr(plan.price)}</span>
                      <span className="text-[#8080A0] text-sm mb-1">/mo</span>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-[#F9F9FC] rounded-xl">
                  <div>
                    <div className="text-[#1E1E1E] text-sm font-bold">{formatCount(plan.subscribers)}</div>
                    <div className="text-[#A0A0C0] text-[10px]">subscribers</div>
                  </div>
                  <div>
                    <div className="text-[#1E1E1E] text-sm font-bold">{formatInr(plan.mrr)}</div>
                    <div className="text-[#A0A0C0] text-[10px]">MRR</div>
                  </div>
                  <div>
                    <div className="text-[#10B981] text-sm font-bold">{plan.growth}</div>
                    <div className="text-[#A0A0C0] text-[10px]">growth</div>
                  </div>
                  <div>
                    <div className="text-[#1E1E1E] text-sm font-bold">{plan.limits.storage}</div>
                    <div className="text-[#A0A0C0] text-[10px]">storage</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${plan.color}20` }}>
                        <Check size={10} style={{ color: plan.color }} />
                      </div>
                      <span className="text-[#4A4A6A] text-xs">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent subscribers table */}
      <div className="bg-white rounded-2xl border border-[#F0F0F8] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F0F0F8]">
          <h2 className="text-[#1E1E1E] font-semibold">Recent Subscribers</h2>
        </div>
        <table className="w-full">
          <TableHead columns={['Photographer', 'Plan', 'Amount', 'Status', 'Since', 'Next Billing']} cellClassName="px-5 py-3" />
          <tbody className="divide-y divide-[#F5F5FA]">
            {recentSubscribers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[#A0A0C0] text-sm">No photographers have signed up yet.</td>
              </tr>
            )}
            {recentSubscribers.map(s => {
              const sc = statusConfig[s.status];
              const plan = plans.find(p => p.name === s.plan);
              return (
                <tr key={s.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-5 py-3.5">
                    <div className="text-[#1E1E1E] text-sm font-medium">{s.name}</div>
                    <div className="text-[#A0A0C0] text-xs">{s.email}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge color={plan?.color ?? '#6060A0'} bg={plan?.bg ?? '#F0F0F8'}>{s.plan}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-[#1E1E1E] text-sm font-bold">{s.amount}/mo</td>
                  <td className="px-5 py-3.5">
                    <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-[#8080A0] text-xs">{formatDate(s.since)}</td>
                  <td className="px-5 py-3.5 text-[#8080A0] text-xs">{s.nextBilling ? formatDate(s.nextBilling) : 'No billing'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
