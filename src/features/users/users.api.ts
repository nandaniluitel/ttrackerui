import axios from "axios";

export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  profileImageUrl?: string;
};

export async function fetchUsers(): Promise<User[]> {
  const res = await axios.get("/users");
  return res.data;
}

export async function changeUserRole(id: number, role: string) {
  await axios.patch(`/users/${id}/role`, { role });
}
