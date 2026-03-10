import { useEffect, useState } from "react";
import {
  fetchEpics,
  createEpic,
  updateEpic,
  deleteEpic,
  type Epic,
  type EpicPriority,
  type EpicStatus,
} from "@/features/epics/epics.api";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { canManagePlanning } from "@/lib/rbac";

function StatusPill({ status }: { status: EpicStatus }) {
  const tone =
    status === "DONE"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  const label = status === "DONE" ? "Done" : "Open";

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${tone}`}
    >
      {label}
    </span>
  );
}

function PriorityPill({ priority }: { priority: EpicPriority }) {
  const tone =
    priority === "CRITICAL" || priority === "HIGH"
      ? "bg-red-100 text-red-700 border-red-200"
      : priority === "MEDIUM"
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${tone}`}
    >
      {priority}
    </span>
  );
}

export default function EpicsPage() {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // create/edit dialog
  const [open, setOpen] = useState(false);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<EpicStatus>("OPEN");
  const [priority, setPriority] = useState<EpicPriority>("MEDIUM");
  const [assigneeUserId, setAssigneeUserId] = useState<string>(""); // optional
  const [formError, setFormError] = useState<string | null>(null);

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Epic | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canManage = canManagePlanning();

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchEpics();
        if (!alive) return;

        setEpics(data);
      } catch (e: any) {
        if (!alive) return;
        const msg =
          e?.response?.data?.message ||
          (typeof e?.response?.data === "string" ? e.response.data : null) ||
          e?.message ||
          "Failed to load epics.";
        setError(String(msg));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  function openEditEpic(e: Epic) {
    setEditingEpic(e);
    setFormError(null);

    setTitle(e.title ?? "");
    setDescription(e.description ?? "");
    setPriority(e.priority ?? "MEDIUM");
    setAssigneeUserId(e.assigneeUserId == null ? "" : String(e.assigneeUserId));

    setOpen(true);
  }

  async function handleDeleteEpic() {
    if (!deleteTarget) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteEpic(deleteTarget.id);
      const fresh = await fetchEpics();
      setEpics(fresh);
      setDeleteTarget(null);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (typeof e?.response?.data === "string" ? e.response.data : null) ||
        e?.message ||
        "Failed to delete epic.";
      setDeleteError(String(msg));
    } finally {
      setDeleting(false);
    }
  }

  if (loading)
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Planning / Epics
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Epics</h1>
          <p className="text-sm text-muted-foreground">
            Name, status, priority, assignee and description.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canManage ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingEpic(null);
                    setFormError(null);

                    setTitle("");
                    setDescription("");
                    setStatus("OPEN");
                    setPriority("MEDIUM");
                    setAssigneeUserId("");
                  }}
                >
                  Create Epic
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingEpic
                      ? `Edit epic: ${editingEpic.title}`
                      : "Create epic"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      placeholder="Epic name"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="What is this epic about?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={status}
                      onValueChange={(v) => setStatus(v as EpicStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="DONE">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priority</label>
                      <Select
                        value={priority}
                        onValueChange={(v) => setPriority(v as EpicPriority)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Assignee User ID
                      </label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="optional (blank = Unassigned)"
                        value={assigneeUserId}
                        onChange={(e) => setAssigneeUserId(e.target.value)}
                      />
                    </div>
                  </div>

                  {formError ? (
                    <div className="text-sm text-red-600">{formError}</div>
                  ) : null}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setOpen(false);
                        setEditingEpic(null);
                        setFormError(null);
                      }}
                    >
                      Cancel
                    </Button>

                    <Button
                      disabled={saving}
                      onClick={async () => {
                        if (!title.trim()) {
                          setFormError("Epic name is required.");
                          return;
                        }
                        if (!description.trim()) {
                          setFormError("Epic description is required.");
                          return;
                        }

                        // assignee optional: blank => null
                        const assignee =
                          assigneeUserId.trim() === ""
                            ? null
                            : Number(assigneeUserId);

                        if (
                          assignee !== null &&
                          (Number.isNaN(assignee) || assignee <= 0)
                        ) {
                          setFormError(
                            "Assignee User ID must be a positive number (or blank)."
                          );
                          return;
                        }

                        setFormError(null);
                        setSaving(true);

                        try {
                          if (editingEpic) {
                            await updateEpic(editingEpic.id, {
                              title: title.trim(),
                              description: description.trim(),
                              priority,
                              assigneeUserId: assignee,
                              status,
                            });
                          } else {
                            await createEpic({
                              title: title.trim(),
                              description: description.trim(),
                              priority,
                              assigneeUserId: assignee,
                            });
                          }

                          const fresh = await fetchEpics();
                          setEpics(fresh);

                          setOpen(false);
                          setEditingEpic(null);
                        } catch (e: any) {
                          const msg =
                            e?.response?.data?.message ||
                            (typeof e?.response?.data === "string"
                              ? e.response.data
                              : null) ||
                            e?.message ||
                            "Failed to save epic.";
                          setFormError(String(msg));
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      {saving
                        ? "Saving..."
                        : editingEpic
                        ? "Save changes"
                        : "Create"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button disabled title="Only Admin/Scrum Master can create epics">
              Create Epic
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold">Epic List</h2>
          <p className="text-sm text-muted-foreground">
            Manage epics for planning and reporting.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr className="border-b">
                <th className="px-5 py-3 font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-5 py-3 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-3 font-medium text-muted-foreground">
                  Priority
                </th>
                <th className="px-5 py-3 font-medium text-muted-foreground">
                  Assignee
                </th>
                <th className="px-5 py-3 font-medium text-muted-foreground">
                  Description
                </th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {epics.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-muted-foreground" colSpan={6}>
                    No epics found.
                  </td>
                </tr>
              ) : (
                epics.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-5 py-4 font-medium">{e.title}</td>
                    <td className="px-5 py-4">
                      <StatusPill status={e.status} />
                    </td>
                    <td className="px-5 py-4">
                      <PriorityPill priority={e.priority} />
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {e.assigneeUserId == null
                        ? "Unassigned"
                        : `User #${e.assigneeUserId}`}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {e.description ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditEpic(e)}
                          disabled={!canManage}
                          title={
                            !canManage
                              ? "Only Admin/Scrum Master can edit epics"
                              : "Edit"
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!canManage}
                          onClick={() => setDeleteTarget(e)}
                          title={
                            !canManage
                              ? "Only Admin/Scrum Master can delete epics"
                              : "Delete"
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Delete confirm */}
          {canManage ? (
            <AlertDialog
              open={!!deleteTarget}
              onOpenChange={(o) => !o && setDeleteTarget(null)}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete epic?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {deleteTarget
                      ? `This will delete "${deleteTarget.title}". This action cannot be undone.`
                      : ""}
                  </AlertDialogDescription>
                  {deleteError ? (
                    <div className="text-sm text-red-600">{deleteError}</div>
                  ) : null}
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteEpic}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>
    </div>
  );
}
