import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Status = "loading" | "ok" | "error";

export default function HealthPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<string>("/health")
      .then((res) => {
        setMessage(res.data);
        setStatus("ok");
      })
      .catch(() => {
        setMessage("Could not reach backend.");
        setStatus("error");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border p-6 space-y-3">
        <h1 className="text-xl font-semibold">Backend Health</h1>

        {status === "loading" && (
          <p className="text-sm text-muted-foreground">Checking...</p>
        )}

        {status === "ok" && (
          <p className="text-sm text-green-600">✅ {message}</p>
        )}

        {status === "error" && (
          <p className="text-sm text-red-600">❌ {message}</p>
        )}
      </div>
    </div>
  );
}