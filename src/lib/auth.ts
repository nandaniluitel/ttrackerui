export type UserRole = "USER" | "ADMIN" | "SCRUM_MASTER";

const TOKEN_KEY = "ttracker_token";
const ROLE_KEY = "ttracker_role";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getRole(): UserRole | null {
  const r = localStorage.getItem(ROLE_KEY);
  if (r === "USER" || r === "ADMIN" || r === "SCRUM_MASTER") return r;
  return null;
}

export function setRole(role: UserRole) {
  localStorage.setItem(ROLE_KEY, role);
}

export function clearRole() {
  localStorage.removeItem(ROLE_KEY);
}

export function logout() {
  clearToken();
  clearRole();
}

type JwtPayload = {
  exp?: number;
};

function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );

    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);

  if (!payload?.exp) return true;

  return payload.exp * 1000 <= Date.now();
}

export function getTokenRemainingTime(token: string): number {
  const payload = decodeJwt(token);

  if (!payload?.exp) return 0;

  return payload.exp * 1000 - Date.now();
}
