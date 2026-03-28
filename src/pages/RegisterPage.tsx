import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { logger } from "@/lib/logger";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FieldErrors = { name?: string; email?: string; password?: string };

export default function RegisterPage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const result = registerSchema.safeParse({ name, email, password });
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setFieldErrors({
        name: flat.name?.[0],
        email: flat.email?.[0],
        password: flat.password?.[0],
      });
      logger.warn("[RegisterPage] Validation failed", flat);
      return;
    }

    setLoading(true);
    logger.info(`[RegisterPage] Register attempt for email=${email}`);

    try {
      await api.post("/auth/register", result.data);
      logger.info(
        "[RegisterPage] Registration successful, redirecting to login"
      );
      nav("/login");
    } catch (err: any) {
      const backendFields = err?.response?.data?.fields;
      if (backendFields) {
        setFieldErrors(backendFields);
        logger.warn("[RegisterPage] Backend validation errors", backendFields);
        return;
      }

      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Registration failed.";

      logger.error(
        `[RegisterPage] Register failed — status=${err?.response?.status}`,
        err
      );
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }

  if (getToken()) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        noValidate
        className="w-full max-w-sm space-y-4 rounded-lg border p-6"
      >
        <h1 className="text-xl font-semibold">Register</h1>

        <div className="space-y-1">
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            aria-invalid={!!fieldErrors.name}
          />
          {fieldErrors.name && (
            <p className="text-xs text-red-500">{fieldErrors.name}</p>
          )}
        </div>

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
            autoComplete="new-password"
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
