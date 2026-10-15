import { useState } from 'react';
import {
  MessageSquare, Clock, CheckCircle, AlertTriangle, X, Send, type LucideIcon,
} from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { useAsync } from '@/hooks/useAsync';
import { getSupportTickets } from '@/services/supportTicketService';
import type { TicketPriority, TicketStatus, Ticket } from '@/types';
import { formatMonthDay } from '@/utils/format';

const priorityConfig: Record<TicketPriority, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#FF675D', bg: '#FFF1F0' },
  high: { label: 'High', color: '#F59E0B', bg: '#FFFBEB' },
  medium: { label: 'Medium', color: '#6C63FF', bg: '#F0EEFF' },
  low: { label: 'Low', color: '#8080A0', bg: '#F5F5FA' },
};

const statusConfig: Record<TicketStatus, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  open: { label: 'Open', color: '#FF675D', bg: '#FFF1F0', icon: AlertTriangle },
  'in-progress': { label: 'In Progress', color: '#F59E0B', bg: '#FFFBEB', icon: Clock },
  resolved: { label: 'Resolved', color: '#10B981', bg: '#ECFDF5', icon: CheckCircle },
  closed: { label: 'Closed', color: '#8080A0', bg: '#F5F5FA', icon: X },
};

export default function SupportTicketsPage() {
  const result = useAsync(getSupportTickets);
  return <AsyncBoundary result={result}>{tickets => <SupportTicketsView tickets={tickets} />}</AsyncBoundary>;
}

function SupportTicketsView({ tickets }: { tickets: Ticket[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');

  const filtered = tickets.filter(t => {
    const matchSearch = t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.requester.toLowerCase().includes(search.toLowerCase()) ||
      t.id.includes(search);
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts: Record<string, number> = { all: tickets.length };
  tickets.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Support Tickets"
        description={
          <>
            <span className="text-[#FF675D] font-semibold">{(counts.open || 0) + (counts['in-progress'] || 0)} open tickets</span>
            {' '}— {counts.critical || 0} critical priority
          </>
        }
      />

      {/* Priority alerts */}
      {tickets.some(t => t.priority === 'critical' && (t.status === 'open' || t.status === 'in-progress')) && (
        <div className="flex items-center gap-3 px-5 py-4 bg-[#FFF1F0] border border-[#FFD8D6] rounded-2xl">
          <AlertTriangle size={18} className="text-[#FF675D] flex-shrink-0" />
          <div>
            <p className="text-[#FF675D] text-sm font-semibold">2 critical tickets require immediate attention</p>
            <p className="text-[#FF675D]/70 text-xs mt-0.5">Gallery upload failures and payment processing issues are actively impacting photographers</p>
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="flex items-center gap-1 bg-white border border-[#F0F0F8] rounded-xl p-1 w-fit">
        {(['all', 'open', 'in-progress', 'resolved', 'closed'] as const).map(s => {
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${statusFilter === s ? 'bg-[#6C63FF] text-white' : 'text-[#8080A0] hover:text-[#1E1E1E]'}`}
            >
              {s === 'all' ? `All (${tickets.length})` : `${statusConfig[s].label} (${counts[s] || 0})`}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search tickets..." />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Ticket list */}
        <div className="xl:col-span-2 space-y-2">
          {filtered.map(ticket => {
            const sc = statusConfig[ticket.status];
            const pc = priorityConfig[ticket.priority];
            const StatusIcon = sc.icon;
            const isSelected = selectedTicket?.id === ticket.id;
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(isSelected ? null : ticket)}
                className={`bg-white rounded-2xl p-4 border cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-[#6C63FF] shadow-md shadow-[#6C63FF]/10' : 'border-[#F0F0F8]'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: sc.bg }}>
                    <StatusIcon size={15} style={{ color: sc.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#6C63FF] text-xs font-bold font-mono">{ticket.id}</span>
                          <Badge size="sm" color={pc.color} bg={pc.bg}>{pc.label}</Badge>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F5F5FA] text-[#6060A0]">{ticket.category}</span>
                        </div>
                        <p className="text-[#1E1E1E] text-sm font-semibold mt-0.5">{ticket.subject}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: sc.bg }}>
                          <span className="text-[11px] font-semibold" style={{ color: sc.color }}>{sc.label}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[#8080A0] text-xs">{ticket.requester}</span>
                      <span className="text-[#C0C0D0] text-xs">·</span>
                      <span className="text-[#8080A0] text-xs">{ticket.assignedTo === 'Unassigned' ? <span className="text-[#FF675D]">Unassigned</span> : ticket.assignedTo}</span>
                      <span className="text-[#C0C0D0] text-xs">·</span>
                      <div className="flex items-center gap-1 text-[#A0A0C0] text-xs">
                        <MessageSquare size={11} />
                        {ticket.messages}
                      </div>
                      <span className="text-[#C0C0D0] text-xs">·</span>
                      <span className="text-[#A0A0C0] text-xs">{formatMonthDay(ticket.updated)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Ticket detail panel */}
        <div className="bg-white rounded-2xl border border-[#F0F0F8] overflow-hidden h-fit">
          {selectedTicket ? (
            <div className="flex flex-col h-full">
              <div className="px-5 py-4 border-b border-[#F0F0F8]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#6C63FF] text-sm font-bold">{selectedTicket.id}</span>
                  <button onClick={() => setSelectedTicket(null)} className="text-[#A0A0C0] hover:text-[#1E1E1E]"><X size={15} /></button>
                </div>
                <p className="text-[#1E1E1E] text-sm font-semibold leading-snug">{selectedTicket.subject}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge color={priorityConfig[selectedTicket.priority].color} bg={priorityConfig[selectedTicket.priority].bg}>
                    {priorityConfig[selectedTicket.priority].label}
                  </Badge>
                  <Badge color={statusConfig[selectedTicket.status].color} bg={statusConfig[selectedTicket.status].bg}>
                    {statusConfig[selectedTicket.status].label}
                  </Badge>
                </div>
              </div>

              <div className="px-5 py-4 border-b border-[#F0F0F8] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[#8080A0] text-xs">Requester</span>
                  <span className="text-[#1E1E1E] text-xs font-medium">{selectedTicket.requester}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8080A0] text-xs">Assigned To</span>
                  <span className="text-[#1E1E1E] text-xs font-medium">{selectedTicket.assignedTo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8080A0] text-xs">Category</span>
                  <span className="text-[#1E1E1E] text-xs font-medium">{selectedTicket.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8080A0] text-xs">Created</span>
                  <span className="text-[#1E1E1E] text-xs font-medium">{new Date(selectedTicket.created).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Sample conversation */}
              <div className="px-5 py-4 flex-1 space-y-3">
                <p className="text-[#6060A0] text-xs font-semibold uppercase tracking-wider">Conversation</p>
                <div className="bg-[#F9F9FC] rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#FF675D] text-white text-[9px] font-bold flex items-center justify-center">
                      {selectedTicket.requester.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                    <span className="text-[#4A4A6A] text-xs font-semibold">{selectedTicket.requester.split(' ')[0]}</span>
                    <span className="text-[#C0C0D0] text-[10px]">{new Date(selectedTicket.created).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[#4A4A6A] text-xs leading-relaxed">Hi, I encountered an issue with {selectedTicket.subject.toLowerCase()}. This is affecting my workflow and I need urgent assistance.</p>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-[#F0F0F8]">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm bg-[#F9F9FC] border border-[#E8E8F0] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/30 text-[#1E1E1E] placeholder:text-[#A0A0C0]"
                />
                <div className="flex items-center justify-between mt-2">
                  <select className="px-2 py-1.5 bg-[#F5F6FA] border border-[#E8E8F0] rounded-lg text-xs text-[#4A4A6A] focus:outline-none">
                    <option>Update Status...</option>
                    <option>Mark Resolved</option>
                    <option>Close Ticket</option>
                    <option>Escalate</option>
                  </select>
                  <button className="flex items-center gap-1.5 px-4 py-1.5 bg-[#6C63FF] text-white rounded-lg text-xs font-semibold hover:bg-[#5B52EE] transition-colors">
                    <Send size={12} /> Send
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-[#F0EEFF] flex items-center justify-center mb-4">
                <MessageSquare size={22} className="text-[#6C63FF]" />
              </div>
              <p className="text-[#1E1E1E] text-sm font-semibold">Select a ticket</p>
              <p className="text-[#A0A0C0] text-xs mt-1">Click any ticket to view details and reply</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
