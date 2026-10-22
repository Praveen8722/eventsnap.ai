export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed';

export interface Ticket {
  id: string;
  subject: string;
  requester: string;
  requesterType: 'photographer' | 'client';
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string;
  created: string;
  updated: string;
  messages: number;
}

export interface TicketMessage {
  id: string;
  /** "requester": logged by an admin on the requester's behalf. */
  from: 'admin' | 'requester';
  author: string;
  body: string;
  at: string;
}

export interface TicketDetail extends Ticket {
  thread: TicketMessage[];
}

export interface SupportMeta {
  assignees: { id: string; name: string; role: string }[];
  categories: string[];
}

export interface NewTicket {
  subject: string;
  requester: string;
  requesterType: Ticket['requesterType'];
  category: string;
  priority: TicketPriority;
  message: string;
  assignedTo?: string;
}

export type TicketUpdate = Partial<Pick<Ticket, 'status' | 'priority' | 'assignedTo'>>;
