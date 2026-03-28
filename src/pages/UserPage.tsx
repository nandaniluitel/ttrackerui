import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  fetchUsers,
  changeUserRole,
  type User,
} from "@/features/users/users.api";

function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "blue" | "green";
  children: React.ReactNode;
}) {
  const toneClass: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const tone = role === "ADMIN" ? "blue" : "neutral";
  return <Badge tone={tone}>{role}</Badge>;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const data = await fetchUsers();
        if (!alive) return;
        setUsers(data);
      } catch (e: any) {
        if (!alive) return;
        setError(
          e?.response?.data?.message || e?.message || "Failed to load users."
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function handleChangeRole(id: number, role: string) {
    setUpdatingId(id);
    setError(null);

    try {
      await changeUserRole(id, role);
      const fresh = await fetchUsers();
      setUsers(fresh);
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to update role."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Admin / Users</p>
        <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">Manage users and roles.</p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold">User List</h2>
        </div>

        {error ? (
          <div className="p-5 text-sm text-red-600">{error}</div>
        ) : loading ? (
          <div className="p-5 text-sm text-muted-foreground">
            Loading users…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr className="border-b">
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-muted-foreground"
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-5 py-4">{u.id}</td>
                      <td className="px-5 py-4">{u.name}</td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {u.email}
                      </td>

                      <td className="px-5 py-4">
                        <RoleBadge role={u.role} />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Select
                          value={u.role}
                          onValueChange={(v) => handleChangeRole(u.id, v)}
                          disabled={updatingId === u.id}
                        >
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">USER</SelectItem>
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
