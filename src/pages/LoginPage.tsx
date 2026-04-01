import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getToken, setRole, setToken, type UserRole } from "@/lib/auth";
import { logger } from "@/lib/logger";

type LoginResponse = { token: string };
type JwtPayload = { role?: UserRole };

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FieldErrors = { email?: string; password?: string };

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // 1. Client-side validation
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setFieldErrors({
        email: flat.email?.[0],
        password: flat.password?.[0],
      });
      logger.warn("[LoginPage] Validation failed", flat);
      return;
    }

    setLoading(true);
    logger.info(`[LoginPage] Login attempt for email=${email}`);

    try {
      const res = await api.post<LoginResponse>("/auth/login", result.data);
      const token = res.data.token;

      if (!token) throw new Error("No token received from server");

      setToken(token);
      logger.info("[LoginPage] Token received and stored");

      const payload = jwtDecode<JwtPayload>(token);
      if (payload.role) {
        setRole(payload.role);
        logger.info(`[LoginPage] Login successful, role=${payload.role}`);
      } else {
        logger.warn("[LoginPage] No role found in JWT payload");
      }

      nav("/");
    } catch (err: any) {
      // Handle field-level errors from backend (@Valid)
      const backendFields = err?.response?.data?.fields;
      if (backendFields) {
        setFieldErrors(backendFields);
        logger.warn("[LoginPage] Backend validation errors", backendFields);
        return;
      }

      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Login failed. Please check your credentials.";

      logger.error(
        `[LoginPage] Login failed — status=${err?.response?.status}`,
        err
      );
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }

  if (getToken()) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <svg
        className="mb-4 w-full max-w-sm"
        viewBox="0 0 384 80"
        xmlns="http://www.w3.org/2000/svg"
      >
        <style>{`
    .logo-base { font-family: Arial, sans-serif; font-weight: 500; font-size: 36px; letter-spacing: -1px; }
    .logo-highlight { fill: #7c3aed; }
    .logo-dim { fill: #888; }
    .logo-rest { fill: #111; }
    .logo-sub { font-family: Arial, sans-serif; font-weight: 400; font-size: 10px; fill: #888; letter-spacing: 3.5px; }
  `}</style>
        <text x="192" y="42" textAnchor="middle" className="logo-base">
          <tspan className="logo-highlight">T</tspan>
          <tspan className="logo-rest">t</tspan>
          <tspan className="logo-rest">racker</tspan>
        </text>
        <text x="192" y="65" textAnchor="middle" className="logo-sub">
          ISSUE TRACKING
        </text>
      </svg>
      <form
        onSubmit={onSubmit}
        noValidate
        className="w-full max-w-sm space-y-4 rounded-lg border p-6 mb-30 "
      >
        <h1 className="text-xl font-semibold">Login</h1>

        <div className="space-y-1">
          <Input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={!!fieldErrors.email}
          />
          {fieldErrors.email && (
            <p className="text-xs text-red-500">{fieldErrors.email}</p>
          )}
        </div>

        <div className="space-y-1">
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            aria-invalid={!!fieldErrors.password}
          />
          {fieldErrors.password && (
            <p className="text-xs text-red-500">{fieldErrors.password}</p>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">
            {error}
          </div>
        )}

        <Button className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>

        <p className="text-sm text-center text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/register" className="underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
