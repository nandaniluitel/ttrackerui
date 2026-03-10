import { api } from "@/lib/api";
export type EpicPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type EpicStatus = "OPEN" | "DONE";
export type Epic = {
  id: number;
  title: string;
  description?: string | null;
  status: EpicStatus;
  priority: EpicPriority;
  assigneeUserId: number | null;

  createdByUserId?: number | null;
  editedByUserId?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateEpicInput = {
  title: string;
  description?: string | null;
  priority: EpicPriority;
  assigneeUserId: number | null;
};

export type UpdateEpicInput = {
  title?: string;
  description?: string;
  priority?: EpicPriority;
  assigneeUserId?: number | null;
  status?: EpicStatus; // ✅ add this
};

export async function fetchEpics() {
  const res = await api.get<Epic[]>("/epics");
  return res.data;
}

export async function createEpic(body: CreateEpicInput) {
  const res = await api.post<Epic>("/epics", body);
  return res.data;
}

export async function updateEpic(id: number, body: UpdateEpicInput) {
  const res = await api.patch<Epic>(`/epics/${id}`, body);
  return res.data;
}

export async function deleteEpic(id: number) {
  await api.delete(`/epics/${id}`);
}
