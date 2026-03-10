import { api } from "@/lib/api";

export type SprintStatus = "PLANNED" | "ACTIVE" | "CLOSED";

export type Sprint = {
  id: number;
  title: string; // e.g. "Backlog", "Sprint 1"
  goal?: string | null;
  startDate?: string | null; // DATE from backend -> "YYYY-MM-DD"
  endDate?: string | null; // "YYYY-MM-DD"
  status?: SprintStatus | null;

  createdByUserId?: number | null;
  editedByUserId?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateSprintInput = {
  title: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: SprintStatus | null;
};

export type UpdateSprintInput = Partial<CreateSprintInput>;

export async function fetchSprints() {
  const res = await api.get<Sprint[]>("/sprints");
  return res.data;
}

export async function createSprint(body: CreateSprintInput) {
  const res = await api.post<Sprint>("/sprints", body);
  return res.data;
}

export async function updateSprint(id: number, body: UpdateSprintInput) {
  const res = await api.patch<Sprint>(`/sprints/${id}`, body);
  return res.data;
}

export async function deleteSprint(id: number) {
  await api.delete(`/sprints/${id}`);
}
