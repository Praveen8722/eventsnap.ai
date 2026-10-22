import { useEffect, useMemo, useState } from 'react';
import {
  MessageSquare, Clock, CheckCircle, AlertTriangle, X, Send, Plus, type LucideIcon,
} from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { useAsync } from '@/hooks/useAsync';
import {
  addTicketMessage, createSupportTicket, getSupportMeta, getSupportTicket, getSupportTickets, updateSupportTicket,
} from '@/services/supportTicketService';
import type { NewTicket, SupportMeta, Ticket, TicketDetail, TicketPriority, TicketStatus, TicketUpdate } from '@/types';
import { formatDateTime, formatMonthDay, initials } from '@/utils/format';
import { omit } from '@/utils/omit';

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

const UNASSIGNED = 'Unassigned';
const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong. Please try again.');
const loadSupport = () => Promise.all([getSupportTickets(), getSupportMeta()]);
const selectClass = 'px-2 py-1.5 bg-[#F5F6FA] border border-[#E8E8F0] rounded-lg text-xs text-[#4A4A6A] focus:outline-none disabled:opacity-60';

export default function SupportTicketsPage() {
  const result = useAsync(loadSupport);
  return (
    <AsyncBoundary result={result}>
      {([tickets, meta]) => <SupportTicketsView initialTickets={tickets} meta={meta} />}
    </AsyncBoundary>
  );
}

const isOpen = (t: Ticket) => t.status === 'open' || t.status === 'in-progress';

function SupportTicketsView({ initialTickets, meta }: { initialTickets: Ticket[]; meta: SupportMeta }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter(t => {
      const matchSearch = !query || [t.subject, t.requester, t.id, t.category, t.assignedTo].some(v => v.toLowerCase().includes(query));
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [tickets, search, statusFilter]);

  const counts: Record<string, number> = { all: tickets.length };
  tickets.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
  const openCount = tickets.filter(isOpen).length;
  const criticalOpen = tickets.filter(t => t.priority === 'critical' && isOpen(t));

  // Keeps the list in step with the ticket shown in the panel.
  const applyDetail = (detail: TicketDetail) => {
    const summary = omit(detail, 'thread');
    setTickets(prev => {
      const exists = prev.some(t => t.id === summary.id);
      return exists ? prev.map(t => (t.id === summary.id ? summary : t)) : [summary, ...prev];
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Support Tickets"
        description={
          <>
            <span className="text-[#FF675D] font-semibold">{openCount} open ticket{openCount === 1 ? '' : 's'}</span>
            {' '}— {criticalOpen.length} critical priority
          </>
        }
        actions={
          <Button variant="primary" onClick={() => setShowNew(true)}>
            <Plus size={15} /> New Ticket
          </Button>
        }
      />

      {/* Priority alerts */}
      {criticalOpen.length > 0 && (
        <div className="flex items-center gap-3 px-5 py-4 bg-[#FFF1F0] border border-[#FFD8D6] rounded-2xl">
          <AlertTriangle size={18} className="text-[#FF675D] flex-shrink-0" />
          <div>
            <p className="text-[#FF675D] text-sm font-semibold">
              {criticalOpen.length} critical ticket{criticalOpen.length === 1 ? ' requires' : 's require'} immediate attention
            </p>
            <p className="text-[#FF675D]/70 text-xs mt-0.5">{criticalOpen.slice(0, 3).map(t => `${t.id} ${t.subject}`).join(' · ')}</p>
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="flex items-center gap-1 bg-white border border-[#F0F0F8] rounded-xl p-1 w-fit">
        {(['all', 'open', 'in-progress', 'resolved', 'closed'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${statusFilter === s ? 'bg-[#6C63FF] text-white' : 'text-[#8080A0] hover:text-[#1E1E1E]'}`}
          >
            {s === 'all' ? `All (${tickets.length})` : `${statusConfig[s].label} (${counts[s] || 0})`}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search tickets..." />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Ticket list */}
        <div className="xl:col-span-2 space-y-2">
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl p-10 border border-[#F0F0F8] text-center text-[#A0A0C0] text-sm">
              {tickets.length === 0 ? 'No support tickets yet. Log a request with “New Ticket”.' : 'No tickets match your search.'}
            </div>
          )}
          {filtered.map(ticket => {
            const sc = statusConfig[ticket.status];
            const pc = priorityConfig[ticket.priority];
            const StatusIcon = sc.icon;
            const isSelected = selectedId === ticket.id;
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedId(isSelected ? null : ticket.id)}
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
                          {ticket.category && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F5F5FA] text-[#6060A0]">{ticket.category}</span>}
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
                      <span className="text-[#8080A0] text-xs">{ticket.assignedTo === UNASSIGNED ? <span className="text-[#FF675D]">Unassigned</span> : ticket.assignedTo}</span>
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
          {selectedId ? (
            <TicketPanel key={selectedId} id={selectedId} meta={meta} onChange={applyDetail} onClose={() => setSelectedId(null)} />
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

      {showNew && (
        <NewTicketModal
          meta={meta}
          onClose={() => setShowNew(false)}
          onCreated={detail => {
            applyDetail(detail);
            setShowNew(false);
            setStatusFilter('all');
            setSelectedId(detail.id);
          }}
        />
      )}
    </div>
  );
}

function TicketPanel({ id, meta, onChange, onClose }: {
  id: string;
  meta: SupportMeta;
  onChange: (detail: TicketDetail) => void;
  onClose: () => void;
}) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [from, setFrom] = useState<'admin' | 'requester'>('admin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getSupportTicket(id).then(
      detail => active && setTicket(detail),
      err => active && setLoadError(errorText(err)),
    );
    return () => {
      active = false;
    };
  }, [id]);

  const run = async (action: () => Promise<TicketDetail>) => {
    setBusy(true);
    setError('');
    try {
      const updated = await action();
      setTicket(updated);
      onChange(updated);
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const update = (change: TicketUpdate) => run(() => updateSupportTicket(id, change));
  const send = async () => {
    if (!replyText.trim()) return;
    if (await run(() => addTicketMessage(id, replyText.trim(), from))) setReplyText('');
  };

  if (loadError) return <p className="px-5 py-10 text-center text-[#FF675D] text-sm" role="alert">{loadError}</p>;
  if (!ticket) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Loading ticket">
        <div className="w-6 h-6 rounded-full border-2 border-[#6C63FF]/20 border-t-[#6C63FF] animate-spin" />
      </div>
    );
  }

  const assignees = meta.assignees.map(a => a.name);
  if (ticket.assignedTo !== UNASSIGNED && !assignees.includes(ticket.assignedTo)) assignees.push(ticket.assignedTo);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-[#F0F0F8]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#6C63FF] text-sm font-bold">{ticket.id}</span>
          <button onClick={onClose} aria-label="Close ticket" className="text-[#A0A0C0] hover:text-[#1E1E1E]"><X size={15} /></button>
        </div>
        <p className="text-[#1E1E1E] text-sm font-semibold leading-snug">{ticket.subject}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge color={priorityConfig[ticket.priority].color} bg={priorityConfig[ticket.priority].bg}>
            {priorityConfig[ticket.priority].label}
          </Badge>
          <Badge color={statusConfig[ticket.status].color} bg={statusConfig[ticket.status].bg}>
            {statusConfig[ticket.status].label}
          </Badge>
        </div>
      </div>

      <div className="px-5 py-4 border-b border-[#F0F0F8] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[#8080A0] text-xs">Requester</span>
          <span className="text-[#1E1E1E] text-xs font-medium">{ticket.requester} <span className="text-[#A0A0C0]">({ticket.requesterType})</span></span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#8080A0] text-xs">Assigned To</span>
          <select aria-label="Assignee" value={ticket.assignedTo} disabled={busy} onChange={e => update({ assignedTo: e.target.value })} className={selectClass}>
            <option value={UNASSIGNED}>Unassigned</option>
            {assignees.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#8080A0] text-xs">Priority</span>
          <select aria-label="Priority" value={ticket.priority} disabled={busy} onChange={e => update({ priority: e.target.value as TicketPriority })} className={selectClass}>
            {(Object.keys(priorityConfig) as TicketPriority[]).map(p => <option key={p} value={p}>{priorityConfig[p].label}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#8080A0] text-xs">Category</span>
          <span className="text-[#1E1E1E] text-xs font-medium">{ticket.category || '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#8080A0] text-xs">Created</span>
          <span className="text-[#1E1E1E] text-xs font-medium">{formatDateTime(ticket.created)}</span>
        </div>
      </div>

      <div className="px-5 py-4 flex-1 space-y-3 max-h-96 overflow-y-auto">
        <p className="text-[#6060A0] text-xs font-semibold uppercase tracking-wider">Conversation</p>
        {ticket.thread.length === 0 && <p className="text-[#A0A0C0] text-xs">No messages yet.</p>}
        {ticket.thread.map(message => (
          <div key={message.id} className={`rounded-xl p-3 ${message.from === 'admin' ? 'bg-[#F0EEFF]' : 'bg-[#F9F9FC]'}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#FF675D] text-white text-[9px] font-bold flex items-center justify-center">
                {initials(message.author)}
              </div>
              <span className="text-[#4A4A6A] text-xs font-semibold">{message.author}</span>
              <span className="text-[#C0C0D0] text-[10px]">{message.from === 'admin' ? 'Support team' : 'Requester'} · {formatDateTime(message.at)}</span>
            </div>
            <p className="text-[#4A4A6A] text-xs leading-relaxed whitespace-pre-wrap break-words">{message.body}</p>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-[#F0F0F8]">
        <div className="flex items-center gap-1 mb-2 bg-[#F5F6FA] rounded-lg p-0.5 w-fit">
          {(['admin', 'requester'] as const).map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setFrom(option)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${from === option ? 'bg-white text-[#6C63FF] shadow-sm' : 'text-[#8080A0]'}`}
            >
              {option === 'admin' ? 'Reply' : 'Log requester message'}
            </button>
          ))}
        </div>
        <textarea
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          placeholder={from === 'admin' ? 'Write a reply...' : `What ${ticket.requester} said (email, phone, chat)...`}
          rows={3}
          maxLength={5000}
          className="w-full px-3 py-2.5 text-sm bg-[#F9F9FC] border border-[#E8E8F0] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/30 text-[#1E1E1E] placeholder:text-[#A0A0C0]"
        />
        {error && <p role="alert" className="text-[#FF675D] text-xs mt-1">{error}</p>}
        <div className="flex items-center justify-between mt-2">
          <select
            aria-label="Update status"
            value=""
            disabled={busy}
            onChange={e => e.target.value && update({ status: e.target.value as TicketStatus })}
            className={selectClass}
          >
            <option value="">Update Status...</option>
            {(Object.keys(statusConfig) as TicketStatus[]).filter(s => s !== ticket.status).map(s => (
              <option key={s} value={s}>Mark {statusConfig[s].label}</option>
            ))}
          </select>
          <button
            onClick={send}
            disabled={busy || !replyText.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#6C63FF] text-white rounded-lg text-xs font-semibold hover:bg-[#5B52EE] transition-colors disabled:opacity-60"
          >
            <Send size={12} /> {busy ? 'Saving…' : from === 'admin' ? 'Send' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

const EMPTY_TICKET: NewTicket = { subject: '', requester: '', requesterType: 'photographer', category: 'Other', priority: 'medium', message: '' };

function NewTicketModal({ meta, onClose, onCreated }: { meta: SupportMeta; onClose: () => void; onCreated: (ticket: TicketDetail) => void }) {
  const [form, setForm] = useState<NewTicket>({ ...EMPTY_TICKET, category: meta.categories.includes('Other') ? 'Other' : meta.categories[0] ?? 'Other' });
  const [assignee, setAssignee] = useState(UNASSIGNED);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof NewTicket>(key: K, value: NewTicket[K]) => setForm(prev => ({ ...prev, [key]: value }));
  const field = 'w-full px-4 py-2.5 bg-[#F9F9FC] border border-[#E8E8F0] rounded-xl text-sm text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/30';
  const label = 'block text-[#4A4A6A] text-xs font-semibold uppercase tracking-wider mb-1.5';

  const submit = async () => {
    if (!form.subject.trim() || !form.requester.trim() || !form.message.trim()) {
      setError('Enter a subject, the requester and their message.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      onCreated(await createSupportTicket({ ...form, ...(assignee !== UNASSIGNED ? { assignedTo: assignee } : {}) }));
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" role="dialog" aria-label="New support ticket">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[#1E1E1E] font-bold text-lg">New Support Ticket</h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F5F6FA] text-[#8080A0]">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className={label} htmlFor="ticket-subject">Subject</label>
            <input id="ticket-subject" value={form.subject} maxLength={200} onChange={e => set('subject', e.target.value)} className={field} placeholder="Gallery link not opening for guests" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="ticket-requester">Requester</label>
              <input id="ticket-requester" value={form.requester} maxLength={120} onChange={e => set('requester', e.target.value)} className={field} placeholder="Name or business" />
            </div>
            <div>
              <label className={label} htmlFor="ticket-type">Requester type</label>
              <select id="ticket-type" value={form.requesterType} onChange={e => set('requesterType', e.target.value as NewTicket['requesterType'])} className={field}>
                <option value="photographer">Photographer</option>
                <option value="client">Client</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label} htmlFor="ticket-category">Category</label>
              <select id="ticket-category" value={form.category} onChange={e => set('category', e.target.value)} className={field}>
                {meta.categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="ticket-priority">Priority</label>
              <select id="ticket-priority" value={form.priority} onChange={e => set('priority', e.target.value as TicketPriority)} className={field}>
                {(Object.keys(priorityConfig) as TicketPriority[]).map(p => <option key={p} value={p}>{priorityConfig[p].label}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="ticket-assignee">Assign to</label>
              <select id="ticket-assignee" value={assignee} onChange={e => setAssignee(e.target.value)} className={field}>
                <option value={UNASSIGNED}>Unassigned</option>
                {meta.assignees.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={label} htmlFor="ticket-message">Their message</label>
            <textarea id="ticket-message" value={form.message} maxLength={5000} rows={4} onChange={e => set('message', e.target.value)} className={`${field} resize-none`} placeholder="What the requester reported" />
          </div>
        </div>
        {error && <p role="alert" className="mt-4 px-4 py-2.5 rounded-xl bg-[#FFF1F0] border border-[#FECACA] text-[#FF675D] text-xs">{error}</p>}
        <div className="flex items-center gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-[#E8E8F0] rounded-xl text-sm text-[#4A4A6A] font-medium hover:bg-[#F5F6FA]">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2.5 bg-[#6C63FF] text-white rounded-xl text-sm font-semibold hover:bg-[#5B52EE] disabled:opacity-60">
            {saving ? 'Creating…' : 'Create Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}
