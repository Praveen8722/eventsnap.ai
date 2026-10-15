import { useState } from 'react';
import { Check, Users, DollarSign, TrendingUp, Edit3, Plus } from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { TableHead } from '@/components/ui/TableHead';
import { useAsync } from '@/hooks/useAsync';
import { getSubscriptionsData } from '@/services/subscriptionService';
import type { SubscriptionsData } from '@/types';
import { formatDate } from '@/utils/format';

const statusConfig = {
  active: { label: 'Active', color: '#10B981', bg: '#ECFDF5' },
  trial: { label: 'Trial', color: '#6C63FF', bg: '#F0EEFF' },
  past_due: { label: 'Past Due', color: '#FF675D', bg: '#FFF1F0' },
};

export default function SubscriptionsPage() {
  const result = useAsync(getSubscriptionsData);
  return <AsyncBoundary result={result}>{data => <SubscriptionsView {...data} />}</AsyncBoundary>;
}

function SubscriptionsView({ plans, recentSubscribers }: SubscriptionsData) {
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const totalMRR = plans.reduce((sum, p) => sum + p.mrr, 0);
  const totalSubscribers = plans.reduce((sum, p) => sum + p.subscribers, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription & Plans"
        description="Manage platform subscription tiers and pricing"
        actions={
          <Button variant="primary">
            <Plus size={15} /> Create Plan
          </Button>
        }
      />

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Subscribers', value: totalSubscribers.toLocaleString(), icon: Users, color: '#6C63FF', bg: '#F0EEFF' },
          { label: 'Monthly Recurring Revenue', value: `$${(totalMRR / 1000).toFixed(1)}K`, icon: DollarSign, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Avg. Revenue per User', value: `$${Math.round(totalMRR / totalSubscribers)}`, icon: TrendingUp, color: '#FF675D', bg: '#FFF1F0' },
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
          <div className="flex items-center gap-2 bg-white border border-[#F0F0F8] rounded-xl p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${billingCycle === 'monthly' ? 'bg-[#6C63FF] text-white' : 'text-[#8080A0]'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${billingCycle === 'annual' ? 'bg-[#6C63FF] text-white' : 'text-[#8080A0]'}`}
            >
              Annual
              <span className={`text-[9px] px-1 rounded-sm ${billingCycle === 'annual' ? 'bg-white/20' : 'bg-[#10B981]/20 text-[#10B981]'}`}>-16%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border overflow-hidden relative ${plan.popular ? 'border-[#6C63FF] shadow-lg shadow-[#6C63FF]/15' : 'border-[#F0F0F8]'}`}
            >
              {plan.popular && (
                <div className="bg-[#6C63FF] text-white text-[10px] font-bold px-3 py-1 text-center tracking-widest uppercase">
                  Most Popular
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ background: plan.color }} />
                      <span className="text-[#1E1E1E] font-bold">{plan.name}</span>
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-bold text-[#1E1E1E]">
                        ${billingCycle === 'monthly' ? plan.price : Math.round(plan.annualPrice / 12)}
                      </span>
                      <span className="text-[#8080A0] text-sm mb-1">/mo</span>
                    </div>
                    {billingCycle === 'annual' && (
                      <div className="text-[10px] text-[#10B981] font-semibold">Billed as ${plan.annualPrice}/yr</div>
                    )}
                  </div>
                  <button
                    onClick={() => setEditingPlan(editingPlan === plan.id ? null : plan.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F6FA] text-[#8080A0] hover:text-[#6C63FF] transition-colors"
                  >
                    <Edit3 size={15} />
                  </button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-[#F9F9FC] rounded-xl">
                  <div>
                    <div className="text-[#1E1E1E] text-sm font-bold">{plan.subscribers}</div>
                    <div className="text-[#A0A0C0] text-[10px]">subscribers</div>
                  </div>
                  <div>
                    <div className="text-[#1E1E1E] text-sm font-bold">${(plan.mrr / 1000).toFixed(1)}K</div>
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

                <button
                  className="w-full mt-4 py-2 rounded-xl text-sm font-semibold transition-all border"
                  style={{
                    background: plan.popular ? plan.color : 'transparent',
                    color: plan.popular ? 'white' : plan.color,
                    borderColor: plan.color,
                  }}
                >
                  {editingPlan === plan.id ? 'Save Changes' : 'Edit Plan'}
                </button>
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
            {recentSubscribers.map((s, i) => {
              const sc = statusConfig[s.status];
              const plan = plans.find(p => p.name === s.plan)!;
              return (
                <tr key={i} className="hover:bg-[#FAFAFA]">
                  <td className="px-5 py-3.5">
                    <div className="text-[#1E1E1E] text-sm font-medium">{s.name}</div>
                    <div className="text-[#A0A0C0] text-xs">{s.email}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge color={plan.color} bg={plan.bg}>{s.plan}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-[#1E1E1E] text-sm font-bold">{s.amount}/mo</td>
                  <td className="px-5 py-3.5">
                    <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-[#8080A0] text-xs">{formatDate(s.since)}</td>
                  <td className="px-5 py-3.5 text-[#8080A0] text-xs">{formatDate(s.nextBilling)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
