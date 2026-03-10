import { api } from "@/lib/api";

export type TicketStatus =
  | "BACKLOG"
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "DONE";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Ticket = {
  id: number;
  title: string;
  description?: string | null;
  status: TicketStatus;
  priority: TicketPriority;

  storyPoints?: number | null;

  assigneeUserId?: number | null;
  epicId?: number | null;
  sprintId?: number | null;

  createdByUserId?: number | null;
  editedByUserId?: number | null;

  // backend uses Instant; frontend will receive ISO string
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchTickets() {
  const res = await api.get<Ticket[]>("/tickets");
  return res.data;
}
export type CreateTicketInput = {
  title: string;
  description: string;
  priority: TicketPriority;
  storyPoints?: number | null;
  assigneeUserId?: number | null;
  epicId?: number | null;
  sprintId?: number | null;
};

export async function createTicket(body: CreateTicketInput) {
  // POST /tickets expects: title, description, priority, storyPoints, assigneeUserId?, epicId?, sprintId?
  // If sprintId missing/null, backend sets Backlog sprint. :contentReference[oaicite:0]{index=0}
  const res = await api.post<Ticket>("/tickets", body);
  return res.data;
}
export async function updateTicketStatus(id: number, status: TicketStatus) {
  const res = await api.patch<Ticket>(`/tickets/${id}/status`, { status });
  return res.data;
}
export type UpdateTicketInput = {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  storyPoints?: number | null;
  assigneeUserId?: number | null;
  epicId?: number | null;
  sprintId?: number | null;
};

export async function updateTicket(id: number, body: UpdateTicketInput) {
  // non-status fields only (status has its own endpoint)
  const res = await api.patch<Ticket>(`/tickets/${id}`, body);
  return res.data;
}
