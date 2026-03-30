import { useEffect, useMemo, useState } from "react";

import {
  fetchEpics,
  createEpic,
  type Epic,
  type EpicPriority,
} from "@/features/epics/epics.api";
import { fetchTickets, type Ticket } from "@/features/tickets/tickets.api";

import { Button } from "@/components/ui/button";
import { canManagePlanning } from "@/lib/rbac";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";

import {
  Ticket as TicketIcon,
  User,
  Layers,
  MoreHorizontal,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

function priorityCardStyle(priority: unknown) {
  const v = String(priority ?? "MEDIUM").toUpperCase();
  if (v === "CRITICAL")
    return {
      bg: "bg-gradient-to-br from-red-50 to-red-100",
      border: "border-red-200",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      accent: "bg-red-500",
      dot: "bg-red-400",
    };
  if (v === "HIGH")
    return {
      bg: "bg-gradient-to-br from-orange-50 to-orange-100",
      border: "border-orange-200",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      accent: "bg-orange-500",
      dot: "bg-orange-400",
    };
  if (v === "MEDIUM")
    return {
      bg: "bg-gradient-to-br from-amber-50 to-amber-100",
      border: "border-amber-200",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      accent: "bg-amber-500",
      dot: "bg-amber-400",
    };
  return {
    bg: "bg-gradient-to-br from-slate-50 to-slate-100",
    border: "border-slate-200",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
    accent: "bg-slate-400",
    dot: "bg-slate-300",
  };
}

function priorityBadgeStyle(priority: unknown) {
  const v = String(priority ?? "MEDIUM").toUpperCase();
  if (v === "CRITICAL") return "bg-red-100 text-red-700 border-red-200";
  if (v === "HIGH") return "bg-orange-100 text-orange-700 border-orange-200";
  if (v === "MEDIUM") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function statusTone(status: unknown) {
  const v = String(status ?? "").toUpperCase();
  if (v === "DONE") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (v === "IN_PROGRESS" || v === "INPROGRESS")
    return "bg-blue-100 text-blue-700 border-blue-200";
  if (v === "BACKLOG") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-violet-100 text-violet-700 border-violet-200";
}

function prettyStatus(status: unknown) {
  const v = String(status ?? "").toUpperCase();
  if (v === "IN_PROGRESS" || v === "INPROGRESS") return "In Progress";
  if (v === "DONE") return "Done";
  if (v === "BACKLOG") return "Backlog";
  if (v === "OPEN") return "Open";
  return String(status ?? "—");
}

function prettyTicketStatus(s: Ticket["status"]) {
  if (s === "BACKLOG") return "Backlog";
  if (s === "TODO") return "To Do";
  if (s === "IN_PROGRESS") return "In Progress";
  if (s === "IN_REVIEW") return "In Review";
  if (s === "DONE") return "Done";
  return s;
}

function ticketStatusTone(s: Ticket["status"]) {
  const v = String(s).toUpperCase();
  if (v === "DONE") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (v === "IN_PROGRESS" || v === "IN_REVIEW")
    return "bg-blue-100 text-blue-700 border-blue-200";
  if (v === "TODO") return "bg-violet-100 text-violet-700 border-violet-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

// ─── badges & avatar ──────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: EpicPriority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${priorityBadgeStyle(
        priority
      )}`}
    >
      {String(priority ?? "medium").toLowerCase()}
    </span>
  );
}

function StatusBadge({ status }: { status: unknown }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusTone(
        status
      )}`}
    >
      {prettyStatus(status)}
    </span>
  );
}

function TicketStatusBadge({ status }: { status: Ticket["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${ticketStatusTone(
        status
      )}`}
    >
      {prettyTicketStatus(status)}
    </span>
  );
}

function Avatar({ userId }: { userId: number | null | undefined }) {
  if (userId == null) return null;
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 ring-2 ring-white shadow">
      U{userId}
    </div>
  );
}

// ─── Epic card (grid item) ────────────────────────────────────────────────────

function EpicCard({
  epic,
  ticketCount,
  onClick,
}: {
  epic: Epic;
  ticketCount: number;
  onClick: () => void;
}) {
  const style = priorityCardStyle(epic.priority);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full text-left rounded-2xl border ${style.bg} ${style.border} shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 overflow-hidden`}
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full ${style.accent}`} />

      <div className="flex flex-col gap-3 p-5">
        {/* Top row: icon + menu dots */}
        <div className="flex items-start justify-between">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.iconBg} ${style.iconColor} shadow-sm`}
          >
            <Layers className="h-5 w-5" />
          </div>
          <MoreHorizontal className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Title */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
            {epic.title}
          </h3>
          {epic.description ? (
            <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 leading-relaxed">
              {epic.description}
            </p>
          ) : null}
        </div>

        {/* Divider */}
        <div className="h-px bg-black/5" />

        {/* Bottom row: status + priority badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={(epic as any).status} />
          <PriorityBadge priority={epic.priority} />
        </div>

        {/* Footer: ticket count + assignee */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <TicketIcon className="h-3.5 w-3.5" />
            <span className="font-medium">{ticketCount}</span>
            <span>{ticketCount === 1 ? "ticket" : "tickets"}</span>
          </span>

          {epic.assigneeUserId != null ? (
            <Avatar userId={epic.assigneeUserId} />
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <User className="h-3 w-3" />
              Unassigned
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Ticket row in drawer ─────────────────────────────────────────────────────

function TicketRow({ ticket }: { ticket: Ticket }) {
  return (
    <div className="rounded-lg border bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground shrink-0">
              TT-{ticket.id}
            </span>
            <span className="truncate text-sm font-medium text-slate-900">
              {ticket.title}
            </span>
          </div>
          {ticket.description ? (
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {ticket.description}
            </p>
          ) : null}
        </div>
        <TicketStatusBadge status={ticket.status} />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EpicsBoardPage() {
  const canManage = canManagePlanning();

  const [epics, setEpics] = useState<Epic[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewingEpic, setViewingEpic] = useState<Epic | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<EpicPriority>("MEDIUM");
  const [assigneeUserId, setAssigneeUserId] = useState<string>("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [epicData, ticketData] = await Promise.all([
        fetchEpics(),
        fetchTickets(),
      ]);
      setEpics(epicData);
      setTickets(ticketData);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (typeof e?.response?.data === "string" ? e.response.data : null) ||
        e?.message ||
        "Failed to load epics.";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sortedEpics = useMemo(
    () => [...epics].sort((a, b) => b.id - a.id),
    [epics]
  );

  const epicTickets = useMemo(() => {
    if (!viewingEpic) return [];
    return tickets
      .filter((t) => t.epicId === viewingEpic.id)
      .sort((a, b) => a.id - b.id);
  }, [tickets, viewingEpic]);

  const ticketCountByEpicId = useMemo(() => {
    const m = new Map<number, number>();
    for (const t of tickets) {
      if (t.epicId != null) m.set(t.epicId, (m.get(t.epicId) ?? 0) + 1);
    }
    return m;
  }, [tickets]);

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
            {sortedEpics.length} {sortedEpics.length === 1 ? "epic" : "epics"} —
            click a card to view its tickets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>

          {canManage && (
            <>
              <Button
                onClick={() => {
                  setFormError(null);
                  setTitle("");
                  setDescription("");
                  setPriority("MEDIUM");
                  setAssigneeUserId("");
                  setOpen(true);
                }}
              >
                + New Epic
              </Button>

              {open && (
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                      <DialogTitle>Create epic</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Title</label>
                        <Input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Epic title"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Description
                        </label>
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Epic description"
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Priority
                          </label>
                          <Select
                            value={priority}
                            onValueChange={(v) =>
                              setPriority(v as EpicPriority)
                            }
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
                            placeholder="optional"
                            value={assigneeUserId}
                            onChange={(e) => setAssigneeUserId(e.target.value)}
                          />
                        </div>
                      </div>

                      {formError && (
                        <div className="text-sm text-red-600">{formError}</div>
                      )}

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setOpen(false)}
                          disabled={saving}
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

                            const assignee =
                              assigneeUserId.trim() === ""
                                ? null
                                : Number(assigneeUserId);

                            if (
                              assignee !== null &&
                              (Number.isNaN(assignee) || assignee <= 0)
                            ) {
                              setFormError(
                                "Assignee must be a positive number (or blank)."
                              );
                              return;
                            }

                            setFormError(null);
                            setSaving(true);

                            try {
                              await createEpic({
                                title: title.trim(),
                                description: description.trim(),
                                priority,
                                assigneeUserId: assignee,
                              });

                              const fresh = await fetchEpics();
                              setEpics(fresh);
                              setOpen(false);
                            } catch (e: any) {
                              const msg =
                                e?.response?.data?.message ||
                                (typeof e?.response?.data === "string"
                                  ? e.response.data
                                  : null) ||
                                e?.message ||
                                "Failed to create epic.";
                              setFormError(String(msg));
                            } finally {
                              setSaving(false);
                            }
                          }}
                        >
                          {saving ? "Creating..." : "Create"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Epic grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl border bg-slate-100"
            />
          ))}
        </div>
      ) : sortedEpics.length === 0 ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground gap-2">
          <Layers className="h-8 w-8 opacity-30" />
          <span>No epics yet. Create one to get started.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedEpics.map((epic) => (
            <EpicCard
              key={epic.id}
              epic={epic}
              ticketCount={ticketCountByEpicId.get(epic.id) ?? 0}
              onClick={() => setViewingEpic(epic)}
            />
          ))}
        </div>
      )}

      {/* Tickets drawer — only mounted when an epic is selected */}
      {viewingEpic && (
        <Sheet
          open={!!viewingEpic}
          onOpenChange={(o) => !o && setViewingEpic(null)}
        >
          <SheetContent side="right" className="w-full sm:max-w-[540px] p-0">
            <div className="flex h-full flex-col">
              {/* Drawer header tinted by priority */}
              <div
                className={`border-b px-6 py-5 ${
                  priorityCardStyle(viewingEpic.priority).bg
                }`}
              >
                {/* Top accent */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    priorityCardStyle(viewingEpic.priority).accent
                  }`}
                />

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <StatusBadge status={(viewingEpic as any).status} />
                  <PriorityBadge priority={viewingEpic.priority} />
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      priorityCardStyle(viewingEpic.priority).iconBg
                    } ${priorityCardStyle(viewingEpic.priority).iconColor}`}
                  >
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold leading-snug text-slate-900">
                      {viewingEpic.title}
                    </h2>
                    {viewingEpic.description && (
                      <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                        {viewingEpic.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {viewingEpic.assigneeUserId != null
                      ? `User #${viewingEpic.assigneeUserId}`
                      : "Unassigned"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <TicketIcon className="h-3 w-3" />
                    {epicTickets.length}{" "}
                    {epicTickets.length === 1 ? "ticket" : "tickets"}
                  </span>
                </div>
              </div>

              {/* Ticket list */}
              <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tickets
                </p>
                {epicTickets.length === 0 ? (
                  <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed bg-white text-sm text-muted-foreground gap-2">
                    <TicketIcon className="h-6 w-6 opacity-30" />
                    <span>No tickets linked to this epic.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {epicTickets.map((ticket) => (
                      <TicketRow key={ticket.id} ticket={ticket} />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t px-6 py-4 flex justify-end bg-white">
                <Button variant="outline" onClick={() => setViewingEpic(null)}>
                  Close
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
