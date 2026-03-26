import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getToken, setRole, setToken, type UserRole } from "@/lib/auth";

type RegisterResponse = {
  token: string;
};

type JwtPayload = {
  role?: UserRole;
};

export default function RegisterPage() {
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
      const res = await api.post<RegisterResponse>("/auth/register", {
        email,
        password,
      });

      const token = res.data.token;
      setToken(token);

      const payload = jwtDecode<JwtPayload>(token);
      if (payload.role) {
        setRole(payload.role);
      }

      nav("/");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Registration failed.";
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
        <h1 className="text-xl font-semibold">Register</h1>

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
          autoComplete="new-password"
        />

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <Button className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>

        <p className="text-sm text-center text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
