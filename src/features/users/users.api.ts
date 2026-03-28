import { api } from "@/lib/api";

export type UserRole = "USER" | "ADMIN" | "SCRUM_MASTER";

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  profileImageUrl?: string | null;
};

export async function fetchUsers() {
  const res = await api.get<User[]>("/users");
  return res.data;
}

export async function changeUserRole(id: number, role: UserRole) {
  const res = await api.patch<User>(`/users/${id}/role`, { role });
  return res.data;
}
