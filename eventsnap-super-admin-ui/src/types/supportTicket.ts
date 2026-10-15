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
