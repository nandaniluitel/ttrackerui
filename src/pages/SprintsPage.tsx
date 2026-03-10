import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  fetchSprints,
  createSprint,
  updateSprint,
  deleteSprint,
  type Sprint,
} from "@/features/sprints/sprints.api";
import axios from "axios";

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

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { canManagePlanning } from "@/lib/rbac";

function isBacklog(s: Sprint) {
  return s.title?.toLowerCase() === "backlog";
}

export default function SprintsPage() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Sprint | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  const [deleteErrorOpen, setDeleteErrorOpen] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string>("");
  const canManage = canManagePlanning();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState(""); // "YYYY-MM-DD"
  const [endDate, setEndDate] = useState(""); // "YYYY-MM-DD"
  const [endTouched, setEndTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function addDays(dateStr: string, days: number) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);

    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSprints();
        if (!alive) return;
        setSprints(data);
      } catch (e: any) {
        if (!alive) return;
        const msg =
          e?.response?.data?.message ||
          (typeof e?.response?.data === "string" ? e.response.data : null) ||
          e?.message ||
          "Failed to load sprints.";
        setError(String(msg));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);
  function openEditSprint(s: Sprint) {
    setEditingSprint(s);
    setFormError(null);

    setTitle(s.title ?? "");
    setGoal(s.goal ?? "");
    setStartDate(s.startDate ?? "");
    setEndDate(s.endDate ?? "");

    // for edit, we don't want auto-overwrite endDate
    setEndTouched(true);

    setOpen(true);
  }

  const sorted = useMemo(() => {
    const copy = [...sprints];
    copy.sort((a, b) => {
      // Backlog first
      if (isBacklog(a) && !isBacklog(b)) return -1;
      if (!isBacklog(a) && isBacklog(b)) return 1;

      // Then by start date (nulls last)
      const ad = a.startDate ?? "9999-12-31";
      const bd = b.startDate ?? "9999-12-31";
      return ad.localeCompare(bd);
    });
    return copy;
  }, [sprints]);
  async function handleDeleteSprint() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteSprint(deleteTarget.id);

      const fresh = await fetchSprints();
      setSprints(fresh);

      setDeleteTarget(null); // close confirm dialog
    } catch (err: unknown) {
      // Default
      let msg = "Failed to delete sprint.";

      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data as any;

        const backendMsg =
          typeof data === "string"
            ? data
            : data?.message || data?.error || data?.detail || "";

        // If backend rejects because sprint has tickets
        const looksLikeHasTickets =
          (backendMsg || "").toLowerCase().includes("ticket") || status === 409; // many APIs use 409 Conflict for this

        if (looksLikeHasTickets) {
          msg =
            "Sprint cannot be deleted because it still has tickets assigned to it. Move those tickets to Backlog or another sprint, then try again.";
        } else if (backendMsg) {
          msg = backendMsg;
        }
        setDeleteTarget(null);
      }

      setDeleteErrorMsg(msg);
      setDeleteErrorOpen(true);
    } finally {
      setDeleting(false);
    }
  }
  function fmtJiraTime(iso?: string | null) {
    if (!iso) return { text: "—", title: "" };

    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { text: iso, title: iso };

    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    const title = d.toLocaleString();

    if (diffSec < 60) return { text: "just now", title };

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return { text: `${diffMin} min ago`, title };

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return { text: `${diffHr} hr ago`, title };

    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return { text: "Yesterday", title };
    if (diffDay < 7) return { text: `${diffDay} days ago`, title };

    const diffWk = Math.floor(diffDay / 7);
    if (diffWk < 5) return { text: `${diffWk} wk ago`, title };

    return { text: d.toLocaleDateString(), title };
  }

  function JiraTimeCell({ iso }: { iso?: string | null }) {
    const t = fmtJiraTime(iso);
    return <span title={t.title}>{t.text}</span>;
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Planning / Sprints
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Sprints</h1>
          <p className="text-sm text-muted-foreground">
            Manage sprints (Backlog is protected).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canManage ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingSprint(null);
                    setFormError(null);
                    setTitle("");
                    setGoal("");
                    setStartDate("");
                    setEndDate("");
                    setEndTouched(false);
                  }}
                >
                  Create Sprint
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingSprint
                      ? `Edit sprint: ${editingSprint.title}`
                      : "Create sprint"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      placeholder="Sprint 1"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Goal</label>
                    <Textarea
                      placeholder="What’s the main goal?"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start date</label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          const v = e.target.value;
                          setStartDate(v);

                          // auto set end date if user hasn't touched end date
                          if (!editingSprint && v && !endTouched) {
                            setEndDate(addDays(v, 14));
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">End date</label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndTouched(true);
                          setEndDate(e.target.value);
                        }}
                      />
                    </div>
                  </div>

                  {formError ? (
                    <div className="text-sm text-red-600">{formError}</div>
                  ) : null}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>

                    <Button
                      disabled={saving}
                      onClick={async () => {
                        if (!title.trim()) {
                          setFormError("Sprint name is required.");
                          return;
                        }

                        setFormError(null);
                        setSaving(true);

                        try {
                          if (editingSprint) {
                            await updateSprint(editingSprint.id, {
                              title: title.trim(),
                              goal: goal.trim() ? goal.trim() : null,
                              startDate: startDate || null,
                              endDate: endDate || null,
                            });
                          } else {
                            await createSprint({
                              title: title.trim(),
                              goal: goal.trim() ? goal.trim() : null,
                              startDate: startDate || null,
                              endDate: endDate || null,
                              status: "PLANNED",
                            });
                          }

                          const fresh = await fetchSprints();
                          setSprints(fresh);

                          setOpen(false);
                          setEditingSprint(null);
                        } catch (e: any) {
                          const msg =
                            e?.response?.data?.message ||
                            (typeof e?.response?.data === "string"
                              ? e.response.data
                              : null) ||
                            e?.message ||
                            "Failed to save sprint.";
                          setFormError(String(msg));
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      {saving
                        ? "Saving..."
                        : editingSprint
                        ? "Save changes"
                        : "Create"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button disabled title="Only Admin/Scrum Master can create sprints">
              Create Sprint
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold">Sprint List</h2>
          <p className="text-sm text-muted-foreground">
            Plan timeboxes and manage the backlog.
          </p>
        </div>

        {error ? (
          <div className="p-5 text-sm text-red-600">{error}</div>
        ) : loading ? (
          <div className="p-5 text-sm text-muted-foreground">
            Loading sprints…
          </div>
        ) : (
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
                    Start
                  </th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">
                    End
                  </th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">
                    Goal
                  </th>
                  <th className="px-5 py-3 w-[130px] font-medium text-muted-foreground">
                    Created
                  </th>
                  F
                  <th className="px-5 py-3 w-[130px] font-medium text-muted-foreground">
                    Updated
                  </th>
                  <th className="px-5 py-3 font-medium text-muted-foreground text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td
                      className="px-5 py-10 text-muted-foreground"
                      colSpan={8}
                    >
                      No sprints found.
                    </td>
                  </tr>
                ) : (
                  sorted.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-5 py-4 font-medium">{s.title}</td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {s.status ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {s.startDate ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {s.endDate ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {s.goal ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        <JiraTimeCell iso={(s as any).createdAt} />
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        <JiraTimeCell iso={(s as any).updatedAt} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditSprint(s)}
                            disabled={!canManage || isBacklog(s)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!canManage || isBacklog(s)}
                            onClick={() => setDeleteTarget(s)}
                            title={
                              !canManage
                                ? "Only Admin/Scrum Master can delete sprints"
                                : isBacklog(s)
                                ? "Backlog cannot be deleted"
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
            <AlertDialog
              open={!!deleteTarget}
              onOpenChange={(o) => !o && setDeleteTarget(null)}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete sprint?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {deleteTarget
                      ? `This will delete "${deleteTarget.title}". This action cannot be undone.`
                      : ""}
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteSprint}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
      <AlertDialog open={deleteErrorOpen} onOpenChange={setDeleteErrorOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Can’t delete sprint</AlertDialogTitle>
            <AlertDialogDescription>{deleteErrorMsg}</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDeleteErrorOpen(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
