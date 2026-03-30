import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";

import {
  fetchTickets,
  createTicket,
  updateTicket,
  updateTicketStatus,
  type Ticket,
} from "@/features/tickets/tickets.api";
import { fetchSprints, type Sprint } from "@/features/sprints/sprints.api";
import { fetchEpics, type Epic } from "@/features/epics/epics.api";
import { fetchUsers, type User } from "@/features/users/users.api";

function keyFromId(id: number) {
  return `TT-${id}`;
}

function prettyStatus(s: string) {
  if (s === "BACKLOG") return "Backlog";
  if (s === "TODO") return "To Do";
  if (s === "IN_PROGRESS") return "In Progress";
  if (s === "IN_REVIEW") return "In Review";
  if (s === "DONE") return "Done";
  return s;
}

function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "blue" | "green" | "red" | "amber";
  children: React.ReactNode;
}) {
  const toneClass: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    red: "bg-red-100 text-red-700 border-red-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: Ticket["status"] }) {
  const label = prettyStatus(status);
  const tone =
    status === "DONE"
      ? "green"
      : status === "IN_PROGRESS" || status === "IN_REVIEW"
      ? "blue"
      : "neutral";
  return <Badge tone={tone}>{label}</Badge>;
}

function PriorityBadge({ priority }: { priority: Ticket["priority"] }) {
  const tone =
    priority === "CRITICAL" || priority === "HIGH"
      ? "red"
      : priority === "MEDIUM"
      ? "amber"
      : "neutral";
  return <Badge tone={tone}>{priority}</Badge>;
}

export default function TicketsPage() {
  // data
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  // edit/view
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<Ticket | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [assignee, setAssignee] = useState<string>("all");
  const [sprint, setSprint] = useState<string>("all");
  const [epic, setEpic] = useState<string>("all");

  // lookups
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);

  // create/edit dialog state
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [storyPoints, setStoryPoints] = useState<string>("");
  const [assigneeUserId, setAssigneeUserId] = useState<string>("");

  // dropdown values
  const [epicId, setEpicId] = useState<string>("none"); // "none" => null
  const [sprintId, setSprintId] = useState<string>("backlog"); // "backlog" => null

  const [formPriority, setFormPriority] =
    useState<Ticket["priority"]>("MEDIUM");
  const [formError, setFormError] = useState<string | null>(null);

  // load tickets
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTickets();
        if (!alive) return;
        setTickets(data);
      } catch (e: any) {
        if (!alive) return;
        const msg =
          e?.response?.data?.message ||
          (typeof e?.response?.data === "string" ? e.response.data : null) ||
          e?.message ||
          "Failed to load tickets.";
        setError(String(msg));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // load lookups
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [sprintData, epicData, userData] = await Promise.all([
          fetchSprints(),
          fetchEpics(),
          fetchUsers(),
        ]);
        if (!alive) return;
        setSprints(sprintData);
        setEpics(epicData);
        setUsers(userData);
      } catch (e) {
        console.error("Failed to load lookups:", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function handleChangeStatus(id: number, nextStatus: Ticket["status"]) {
    setUpdatingStatusId(id);
    setError(null);

    try {
      await updateTicketStatus(id, nextStatus);
      const fresh = await fetchTickets();
      setTickets(fresh);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (typeof e?.response?.data === "string" ? e.response.data : null) ||
        e?.message ||
        "Failed to update status.";
      setError(String(msg));
    } finally {
      setUpdatingStatusId(null);
    }
  }

  const assigneeOptions = useMemo(() => {
    const set = new Set<number>();
    tickets.forEach((t) => {
      if (t.assigneeUserId) set.add(t.assigneeUserId);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [tickets]);

  const sprintOptions = useMemo(() => {
    const set = new Set<number>();
    tickets.forEach((t) => {
      if (t.sprintId) set.add(t.sprintId);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [tickets]);

  const epicOptions = useMemo(() => {
    const set = new Set<number>();
    tickets.forEach((t) => {
      if (t.epicId) set.add(t.epicId);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [tickets]);

  const sprintTitleById = useMemo(() => {
    const m = new Map<number, string>();
    sprints.forEach((s) => m.set(s.id, s.title));
    return m;
  }, [sprints]);

  const epicTitleById = useMemo(() => {
    const m = new Map<number, string>();
    epics.forEach((e) => m.set(e.id, e.title));
    return m;
  }, [epics]);
  const userNameById = useMemo(() => {
    const m = new Map<number, string>();
    users.forEach((u) => m.set(u.id, u.name));
    return m;
  }, [users]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return tickets.filter((t) => {
      const matchQ = !query || t.title.toLowerCase().includes(query);
      const matchStatus = status === "all" || t.status === status;
      const matchPriority = priority === "all" || t.priority === priority;

      const matchAssignee =
        assignee === "all"
          ? true
          : assignee === "unassigned"
          ? !t.assigneeUserId
          : String(t.assigneeUserId) === assignee;

      const matchSprint =
        sprint === "all"
          ? true
          : sprint === "none"
          ? !t.sprintId
          : String(t.sprintId) === sprint;

      const matchEpic =
        epic === "all"
          ? true
          : epic === "none"
          ? !t.epicId
          : String(t.epicId) === epic;

      return (
        matchQ &&
        matchStatus &&
        matchPriority &&
        matchAssignee &&
        matchSprint &&
        matchEpic
      );
    });
  }, [tickets, q, status, priority, assignee, sprint, epic]);

  function openCreateDialog() {
    setEditing(null);
    setFormError(null);

    setTitle("");
    setDescription("");
    setFormPriority("MEDIUM");
    setStoryPoints("");
    setAssigneeUserId("");

    // ✅ correct reset values
    setEpicId("none");
    setSprintId("backlog");

    setOpen(true);
  }

  function openEditDialog(t: Ticket) {
    setEditing(t);
    setFormError(null);

    setTitle(t.title ?? "");
    setDescription(t.description ?? "");
    setFormPriority(t.priority ?? "MEDIUM");
    setStoryPoints(t.storyPoints == null ? "" : String(t.storyPoints));
    setAssigneeUserId(t.assigneeUserId == null ? "" : String(t.assigneeUserId));

    setEpicId(t.epicId == null ? "none" : String(t.epicId));
    setSprintId(t.sprintId == null ? "backlog" : String(t.sprintId));

    setOpen(true);
  }

  // helper checks for "DONE" in lookups
  const editingSprintIsDone = useMemo(() => {
    if (!editing?.sprintId) return false;
    const s = sprints.find((x) => x.id === editing.sprintId);
    return String((s as any)?.status ?? "").toUpperCase() === "DONE";
  }, [editing, sprints]);

  const editingEpicIsDone = useMemo(() => {
    if (!editing?.epicId) return false;
    const e = epics.find((x) => x.id === editing.epicId);
    return String((e as any)?.status ?? "").toUpperCase() === "DONE";
  }, [editing, epics]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Issues / All Tickets
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Tickets</h1>
          <p className="text-sm text-muted-foreground">
            Jira-style issue list (Key, Summary, Status, Priority, Assignee).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline">Import</Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>Create</Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>
                  {editing ? `Edit ${keyFromId(editing.id)}` : "Create ticket"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="Short summary (like Jira)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Add details…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={formPriority}
                    onValueChange={(v) => setFormPriority(v as any)}
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

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Story Points</label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 3"
                      value={storyPoints}
                      onChange={(e) => setStoryPoints(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Assignee</label>
                    <Select
                      value={assigneeUserId || "none"}
                      onValueChange={(v) =>
                        setAssigneeUserId(v === "none" ? "" : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* EPIC dropdown: hide DONE, but if editing and epic is DONE, show it disabled */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Epic</label>
                    <Select value={epicId} onValueChange={setEpicId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select epic" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No epic</SelectItem>

                        {editing?.epicId && editingEpicIsDone ? (
                          <SelectItem value={String(editing.epicId)} disabled>
                            {(epicTitleById.get(editing.epicId) ??
                              `Epic #${editing.epicId}`) + " (Done)"}
                          </SelectItem>
                        ) : null}

                        {epics
                          .filter(
                            (e) =>
                              String((e as any).status ?? "").toUpperCase() !==
                              "DONE"
                          )
                          .map((e) => (
                            <SelectItem key={e.id} value={String(e.id)}>
                              {e.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* SPRINT dropdown: hide DONE + backlog, but if editing and sprint is DONE, show it disabled */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sprint</label>
                    <Select value={sprintId} onValueChange={setSprintId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sprint" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="backlog">Backlog</SelectItem>

                        {editing?.sprintId && editingSprintIsDone ? (
                          <SelectItem value={String(editing.sprintId)} disabled>
                            {(sprintTitleById.get(editing.sprintId) ??
                              `Sprint #${editing.sprintId}`) + " (Done)"}
                          </SelectItem>
                        ) : null}

                        {sprints
                          .filter((s) => s.title?.toLowerCase() !== "backlog")
                          .filter(
                            (s) =>
                              String((s as any).status ?? "").toUpperCase() !==
                              "DONE"
                          )
                          .map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formError ? (
                  <div className="text-sm text-red-600">{formError}</div>
                ) : null}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      setFormError(null);
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    disabled={saving}
                    onClick={async () => {
                      if (!title.trim()) {
                        setFormError("Title is required.");
                        return;
                      }
                      if (!description.trim()) {
                        setFormError("Description is required.");
                        return;
                      }

                      const sp =
                        storyPoints.trim() === "" ? null : Number(storyPoints);
                      if (sp !== null && (Number.isNaN(sp) || sp < 0)) {
                        setFormError("Story points must be a number ≥ 0.");
                        return;
                      }

                      const assignee =
                        assigneeUserId.trim() === ""
                          ? null
                          : Number(assigneeUserId);
                      if (
                        assignee !== null &&
                        (Number.isNaN(assignee) || assignee <= 0)
                      ) {
                        setFormError(
                          "Assignee User ID must be a positive number."
                        );
                        return;
                      }

                      // ✅ parse from dropdown values
                      const epic = epicId === "none" ? null : Number(epicId);
                      if (epic !== null && (Number.isNaN(epic) || epic <= 0)) {
                        setFormError("Invalid epic selection.");
                        return;
                      }

                      const sprint =
                        sprintId === "backlog" ? null : Number(sprintId);
                      if (
                        sprint !== null &&
                        (Number.isNaN(sprint) || sprint <= 0)
                      ) {
                        setFormError("Invalid sprint selection.");
                        return;
                      }

                      setFormError(null);
                      setSaving(true);

                      try {
                        if (editing) {
                          await updateTicket(editing.id, {
                            title: title.trim(),
                            description: description.trim(),
                            priority: formPriority,
                            storyPoints: sp,
                            assigneeUserId: assignee,
                            epicId: epic,
                            sprintId: sprint,
                          });
                        } else {
                          await createTicket({
                            title: title.trim(),
                            description: description.trim(),
                            priority: formPriority,
                            storyPoints: sp,
                            assigneeUserId: assignee,
                            epicId: epic,
                            sprintId: sprint,
                          });
                        }

                        const fresh = await fetchTickets();
                        setTickets(fresh);

                        setOpen(false);
                        setEditing(null);
                      } catch (e: any) {
                        const msg =
                          e?.response?.data?.message ||
                          (typeof e?.response?.data === "string"
                            ? e.response.data
                            : null) ||
                          e?.message ||
                          "Save failed.";
                        setFormError(String(msg));
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    {saving
                      ? "Saving..."
                      : editing
                      ? "Save changes"
                      : "Create ticket"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex-1">
          <Input
            placeholder="Search issues… (title)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full xl:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="BACKLOG">Backlog</SelectItem>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="IN_REVIEW">In Review</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-full xl:w-[180px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priority</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger className="w-full xl:w-[180px]">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {assigneeOptions.map((id) => (
                <SelectItem key={id} value={String(id)}>
                  {userNameById.get(id) ?? `User #${id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sprint} onValueChange={setSprint}>
            <SelectTrigger className="w-full xl:w-[180px]">
              <SelectValue placeholder="Sprint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sprints</SelectItem>
              <SelectItem value="none">No sprint</SelectItem>
              {sprintOptions.map((id) => (
                <SelectItem key={id} value={String(id)}>
                  {sprintTitleById.get(id) ?? `Sprint #${id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={epic} onValueChange={setEpic}>
            <SelectTrigger className="w-full xl:w-[180px]">
              <SelectValue placeholder="Epic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All epics</SelectItem>
              <SelectItem value="none">No epic</SelectItem>
              {epicOptions.map((id) => (
                <SelectItem key={id} value={String(id)}>
                  {epicTitleById.get(id) ?? `Epic #${id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => {
              setQ("");
              setStatus("all");
              setPriority("all");
              setAssignee("all");
              setSprint("all");
              setEpic("all");
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Issue List</h2>
            <p className="text-sm text-muted-foreground">Tickets overview.</p>
          </div>
          <Button variant="outline" size="sm">
            Columns
          </Button>
        </div>

        {error ? (
          <div className="p-5 text-sm text-red-600">{error}</div>
        ) : loading ? (
          <div className="p-5 text-sm text-muted-foreground">
            Loading tickets…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-muted/40 text-left">
                <tr className="border-b">
                  <th className="px-5 py-3 font-medium text-muted-foreground">
                    Key
                  </th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">
                    Summary
                  </th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">
                    Priority
                  </th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">
                    SP
                  </th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">
                    Assignee
                  </th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">
                    Sprint
                  </th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">
                    Epic
                  </th>
                  <th className="px-5 py-3 font-medium text-muted-foreground text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      className="px-5 py-10 text-muted-foreground"
                      colSpan={9}
                    >
                      No issues found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-5 py-4 font-medium">
                        {keyFromId(t.id)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium">{t.title}</div>
                        {t.description ? (
                          <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {t.description}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-5 py-4">
                        <Select
                          value={t.status}
                          onValueChange={(v) =>
                            handleChangeStatus(t.id, v as Ticket["status"])
                          }
                          disabled={updatingStatusId === t.id}
                        >
                          <SelectTrigger className="h-8 w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BACKLOG">Backlog</SelectItem>
                            <SelectItem value="TODO">To Do</SelectItem>
                            <SelectItem value="IN_PROGRESS">
                              In Progress
                            </SelectItem>
                            <SelectItem value="IN_REVIEW">In Review</SelectItem>
                            <SelectItem value="DONE">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      <td className="px-5 py-4">
                        <PriorityBadge priority={t.priority} />
                      </td>

                      <td className="px-5 py-4 text-muted-foreground">
                        {t.storyPoints ?? "—"}
                      </td>

                      <td className="px-5 py-4 text-muted-foreground">
                        {t.assigneeUserId
                          ? userNameById.get(t.assigneeUserId) ??
                            `User #${t.assigneeUserId}`
                          : "Unassigned"}
                      </td>

                      <td className="px-5 py-4 text-muted-foreground">
                        {t.sprintId
                          ? sprintTitleById.get(t.sprintId) ??
                            `Sprint #${t.sprintId}`
                          : "—"}
                      </td>

                      <td className="px-5 py-4 text-muted-foreground">
                        {t.epicId
                          ? epicTitleById.get(t.epicId) ?? `Epic #${t.epicId}`
                          : "—"}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewing(t)}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(t)}
                          >
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* View drawer */}
            <Sheet
              open={!!viewing}
              onOpenChange={(o) => !o && setViewing(null)}
            >
              <SheetContent
                side="right"
                className="w-full sm:max-w-[520px] p-0"
              >
                {viewing ? (
                  <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className="border-b px-6 py-4">
                      <div className="text-xs font-semibold text-muted-foreground">
                        {keyFromId(viewing.id)}
                      </div>
                      <div className="mt-1 text-lg font-semibold leading-snug">
                        {viewing.title}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge status={viewing.status} />
                        <PriorityBadge priority={viewing.priority} />
                        <Badge tone="neutral">
                          SP: {viewing.storyPoints ?? "—"}
                        </Badge>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">
                          DESCRIPTION
                        </div>
                        <div className="rounded-lg border p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                          {viewing.description || "No description."}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border p-3">
                          <div className="text-xs font-semibold text-muted-foreground">
                            ASSIGNEE
                          </div>
                          <div className="mt-1 text-sm">
                            {viewing.assigneeUserId
                              ? userNameById.get(viewing.assigneeUserId) ??
                                `User #${viewing.assigneeUserId}`
                              : "Unassigned"}
                          </div>
                        </div>

                        <div className="rounded-lg border p-3">
                          <div className="text-xs font-semibold text-muted-foreground">
                            SPRINT
                          </div>
                          <div className="mt-1 text-sm">
                            {viewing.sprintId
                              ? sprintTitleById.get(viewing.sprintId) ??
                                `Sprint #${viewing.sprintId}`
                              : "—"}
                          </div>
                        </div>

                        <div className="rounded-lg border p-3">
                          <div className="text-xs font-semibold text-muted-foreground">
                            EPIC
                          </div>
                          <div className="mt-1 text-sm">
                            {viewing.epicId
                              ? epicTitleById.get(viewing.epicId) ??
                                `Epic #${viewing.epicId}`
                              : "—"}
                          </div>
                        </div>

                        <div className="rounded-lg border p-3">
                          <div className="text-xs font-semibold text-muted-foreground">
                            UPDATED
                          </div>
                          <div className="mt-1 text-sm">
                            {viewing.updatedAt ?? "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t px-6 py-4 flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setViewing(null)}
                      >
                        Close
                      </Button>
                      <Button
                        onClick={() => {
                          setViewing(null);
                          openEditDialog(viewing);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ) : null}
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    </div>
  );
}
