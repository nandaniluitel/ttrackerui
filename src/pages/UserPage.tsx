import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  fetchUsers,
  changeUserRole,
  type User,
  type UserRole,
} from "@/features/users/users.api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ROLES: UserRole[] = ["USER", "ADMIN", "SCRUM_MASTER"];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("USER");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchUsers();
        if (!alive) return;
        setUsers(data);
      } catch (e: any) {
        if (!alive) return;
        const msg =
          e?.response?.data?.message ||
          (typeof e?.response?.data === "string" ? e.response.data : null) ||
          e?.message ||
          "Failed to load users.";
        setError(String(msg));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function openEditUser(u: User) {
    setEditingUser(u);
    setSelectedRole(u.role);
    setFormError(null);
  }

  const currentUserRole = localStorage.getItem("ttracker_role");
  const isAdmin = currentUserRole === "ADMIN";
  async function handleChangeRole() {
    if (!editingUser) return;
    setSaving(true);
    try {
      const updated = await changeUserRole(editingUser.id, selectedRole);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to change role.";
      setFormError(String(msg));
    } finally {
      setSaving(false);
    }
  }
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Admin / Users
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage users and their roles.
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="text-base font-semibold">User List</h2>
            <p className="text-sm text-muted-foreground">
              View and manage all registered users.
            </p>
          </div>

          {error ? (
            <div className="p-5 text-sm text-red-600">{error}</div>
          ) : loading ? (
            <div className="p-5 text-sm text-muted-foreground">
              Loading users…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr className="border-b">
                    <th className="px-5 py-3 font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="px-5 py-3 font-medium text-muted-foreground text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td
                        className="px-5 py-10 text-muted-foreground"
                        colSpan={4}
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
                        <td className="px-5 py-4 font-medium">{u.name}</td>
                        <td className="px-5 py-4 text-muted-foreground">
                          {u.email}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditUser(u)}
                          >
                            Change Role
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Change Role Dialog */}
        <Dialog
          open={!!editingUser}
          onOpenChange={(o) => !o && setEditingUser(null)}
        >
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Change role for {editingUser?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {formError && (
                <div className="text-sm text-red-600">{formError}</div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button disabled={saving} onClick={handleChangeRole}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
}
