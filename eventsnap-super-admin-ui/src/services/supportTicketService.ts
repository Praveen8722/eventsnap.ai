import type { NewTicket, SupportMeta, Ticket, TicketDetail, TicketMessage, TicketUpdate } from '@/types';
import { apiRequest } from './apiClient';

const ticketPath = (id: string) => `/support-tickets/${encodeURIComponent(id)}`;

export function getSupportTickets(): Promise<Ticket[]> {
  return apiRequest('/support-tickets');
}

export function getSupportMeta(): Promise<SupportMeta> {
  return apiRequest('/support-tickets/meta');
}

export function getSupportTicket(id: string): Promise<TicketDetail> {
  return apiRequest(ticketPath(id));
}

export function createSupportTicket(ticket: NewTicket): Promise<TicketDetail> {
  return apiRequest('/support-tickets', { method: 'POST', body: ticket });
}

export function updateSupportTicket(id: string, update: TicketUpdate): Promise<TicketDetail> {
  return apiRequest(ticketPath(id), { method: 'PATCH', body: update });
}

export function addTicketMessage(id: string, body: string, from: TicketMessage['from'] = 'admin'): Promise<TicketDetail> {
  return apiRequest(`${ticketPath(id)}/messages`, { method: 'POST', body: { body, from } });
}
