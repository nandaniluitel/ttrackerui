import { api } from "@/lib/api";

export type Profile = {
  id: number;
  name: string;
  email: string;
  role: string;
  profileImageUrl?: string | null;
};

export async function fetchProfile() {
  const res = await api.get<Profile>("/profile");
  return res.data;
}
