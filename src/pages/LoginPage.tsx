import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { setRole, setToken, type UserRole } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import { getToken } from "@/lib/auth";

type LoginResponse = { token: string };

type JwtPayload = {
  role?: UserRole;
};

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });

      const token = res.data.token;
      setToken(token);

      const payload = jwtDecode<JwtPayload>(token);
      if (payload.role) {
        setRole(payload.role);
        nav("/");
      } else {
        // still allow login; we'll fix claim name next
        nav("/");
        setError(
          "Logged in, but could not find role in JWT payload (claim might not be named 'role')."
        );
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Login failed (check backend + credentials).";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }
  if (getToken()) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border p-6"
      >
        <h1 className="text-xl font-semibold">Login</h1>

        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <Button className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
