import { getRole } from "@/lib/auth";

export function canManagePlanning(): boolean {
  const role = getRole();
  return role === "ADMIN" || role === "SCRUM_MASTER";
}
