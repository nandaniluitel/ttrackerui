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

import { Ticket as TicketIcon, User, ChevronRight } from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

function priorityTone(priority: unknown) {
  const v = String(priority ?? "MEDIUM").toUpperCase();
  if (v === "CRITICAL" || v === "HIGH")
    return "bg-red-100 text-red-700 border-red-200";
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
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${priorityTone(
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
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 ring-2 ring-white">
      U{userId}
    </div>
  );
}

// ─── Epic row ─────────────────────────────────────────────────────────────────

function EpicRow({
  epic,
  ticketCount,
  onClick,
}: {
  epic: Epic;
  ticketCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left rounded-xl border bg-white px-5 py-4 shadow-sm transition hover:shadow-md hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      <div className="flex items-center justify-between gap-4">
        {/* left: icon + title + description */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <TicketIcon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900">
              {epic.title}
            </div>
            {epic.description ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {epic.description}
              </p>
            ) : null}
          </div>
        </div>

        {/* right: badges + ticket count + avatar + chevron */}
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={(epic as any).status} />
          <PriorityBadge priority={epic.priority} />

          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">
            <TicketIcon className="h-3 w-3" />
            {ticketCount}
          </span>

          <Avatar userId={epic.assigneeUserId} />

          <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500 group-hover:translate-x-0.5" />
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

  // Drawer
  const [viewingEpic, setViewingEpic] = useState<Epic | null>(null);

  // Create dialog
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

  // Newest first
  const sortedEpics = useMemo(
    () => [...epics].sort((a, b) => b.id - a.id),
    [epics]
  );

  // Tickets for the viewed epic
  const epicTickets = useMemo(() => {
    if (!viewingEpic) return [];
    return tickets
      .filter((t) => t.epicId === viewingEpic.id)
      .sort((a, b) => a.id - b.id);
  }, [tickets, viewingEpic]);

  // Ticket count per epic
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
            click one to view its tickets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>

          {canManage ? (
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
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Epic description"
                      />
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
                          placeholder="optional"
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
            </>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Epic list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border bg-slate-100"
            />
          ))}
        </div>
      ) : sortedEpics.length === 0 ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground gap-2">
          <TicketIcon className="h-8 w-8 opacity-30" />
          <span>No epics yet. Create one to get started.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedEpics.map((epic) => (
            <EpicRow
              key={epic.id}
              epic={epic}
              ticketCount={ticketCountByEpicId.get(epic.id) ?? 0}
              onClick={() => setViewingEpic(epic)}
            />
          ))}
        </div>
      )}

      {/* Tickets drawer */}
      <Sheet
        open={!!viewingEpic}
        onOpenChange={(o) => !o && setViewingEpic(null)}
      >
        <SheetContent side="right" className="w-full sm:max-w-[540px] p-0">
          {viewingEpic ? (
            <div className="flex h-full flex-col">
              {/* Drawer header */}
              <div className="border-b px-6 py-5">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <StatusBadge status={(viewingEpic as any).status} />
                  <PriorityBadge priority={viewingEpic.priority} />
                </div>
                <h2 className="text-lg font-semibold leading-snug text-slate-900">
                  {viewingEpic.title}
                </h2>
                {viewingEpic.description ? (
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {viewingEpic.description}
                  </p>
                ) : null}

                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
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
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tickets
                </p>
                {epicTickets.length === 0 ? (
                  <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground gap-2">
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
              <div className="border-t px-6 py-4 flex justify-end">
                <Button variant="outline" onClick={() => setViewingEpic(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
