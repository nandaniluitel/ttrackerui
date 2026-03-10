import { useEffect, useMemo, useState } from "react";

import {
  fetchSprints,
  createSprint,
  type Sprint,
} from "@/features/sprints/sprints.api";
import { fetchEpics, type Epic } from "@/features/epics/epics.api";
import {
  fetchTickets,
  updateTicketStatus,
  type Ticket,
} from "@/features/tickets/tickets.api";

import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Sheet, SheetContent } from "@/components/ui/sheet";

import { canManagePlanning } from "@/lib/rbac";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { GripVertical } from "lucide-react";

type BoardStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

type SprintOption = {
  key: string;
  title: string;
  sprintId: number | null;
};

const BOARD_COLUMNS: Array<{
  key: BoardStatus;
  title: string;
  headerClass: string;
}> = [
  { key: "TODO", title: "To Do", headerClass: "bg-slate-100 text-slate-800" },
  {
    key: "IN_PROGRESS",
    title: "In Progress",
    headerClass: "bg-blue-100 text-blue-800",
  },
  {
    key: "REVIEW",
    title: "Review",
    headerClass: "bg-amber-100 text-amber-800",
  },
  {
    key: "DONE",
    title: "Done",
    headerClass: "bg-emerald-100 text-emerald-800",
  },
];

function isBacklogSprint(s: Sprint) {
  return (s.title ?? "").toLowerCase() === "backlog";
}

function isDoneSprint(s: Sprint) {
  return String((s as any).status ?? "").toUpperCase() === "DONE";
}

function keyFromId(id: number) {
  return `TT-${id}`;
}

function normalizeTicketStatus(raw: unknown): BoardStatus {
  const value = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (value === "IN_PROGRESS" || value === "INPROGRESS") return "IN_PROGRESS";
  if (value === "REVIEW" || value === "IN_REVIEW") return "REVIEW";
  if (value === "DONE" || value === "COMPLETED" || value === "CLOSED")
    return "DONE";

  return "TODO";
}

// Board column -> backend ticket status
function backendStatusFromBoard(col: BoardStatus): Ticket["status"] {
  if (col === "REVIEW") return "IN_REVIEW";
  return col; // TODO | IN_PROGRESS | DONE
}

function prettyTicketStatus(s: Ticket["status"]) {
  if (s === "BACKLOG") return "Backlog";
  if (s === "TODO") return "To Do";
  if (s === "IN_PROGRESS") return "In Progress";
  if (s === "IN_REVIEW") return "In Review";
  if (s === "DONE") return "Done";
  return s;
}

function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function priorityTone(priority: unknown) {
  const value = String(priority ?? "MEDIUM").toUpperCase();
  if (value === "CRITICAL" || value === "HIGH")
    return "bg-red-50 text-red-700 border-red-200";
  if (value === "MEDIUM") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function PriorityBadge({ priority }: { priority: Ticket["priority"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${priorityTone(
        priority
      )}`}
    >
      {String(priority ?? "medium").toLowerCase()}
    </span>
  );
}

function StatusBadge({ status }: { status: Ticket["status"] }) {
  const v = String(status).toUpperCase();
  const tone =
    v === "DONE"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : v === "IN_PROGRESS" || v === "IN_REVIEW"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${tone}`}
    >
      {prettyTicketStatus(status)}
    </span>
  );
}

function Column({
  title,
  count,
  headerClass,
  isOver,
  setRef,
  children,
}: {
  title: string;
  count: number;
  headerClass: string;
  isOver: boolean;
  setRef: (node: HTMLElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-[260px] flex-1">
      <div
        ref={setRef}
        className={`rounded-xl border bg-white shadow-sm ${
          isOver ? "ring-2 ring-slate-300" : ""
        }`}
      >
        <div
          className={`flex items-center justify-between rounded-t-xl px-4 py-3 ${headerClass}`}
        >
          <div className="font-medium">{title}</div>
          <div className="rounded-md bg-white/80 px-2 py-0.5 text-xs font-semibold">
            {count}
          </div>
        </div>

        <div className="min-h-[360px] p-3">
          <div className="space-y-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function TicketCard({
  ticket,
  epicTitle,
  sprintTitle,
  onOpen,
  dragHandleProps,
  showHandle = true,
}: {
  ticket: Ticket;
  epicTitle?: string;
  sprintTitle?: string;
  onOpen?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  showHandle?: boolean;
}) {
  return (
    <div
      className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {showHandle ? (
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white text-muted-foreground hover:bg-muted/30 cursor-grab"
              onPointerDown={(e) => e.stopPropagation()}
              {...dragHandleProps}
              title="Drag"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : null}

          <div className="text-xs font-semibold text-muted-foreground">
            {keyFromId(ticket.id)}
          </div>
        </div>

        <PriorityBadge priority={ticket.priority} />
      </div>

      <div className="mt-2 text-sm font-medium leading-snug">
        {ticket.title}
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <div>
          <span className="font-semibold">Epic:</span>{" "}
          {epicTitle ?? (ticket.epicId ? `Epic #${ticket.epicId}` : "—")}
        </div>
        <div>
          <span className="font-semibold">Sprint:</span>{" "}
          {sprintTitle ??
            (ticket.sprintId ? `Sprint #${ticket.sprintId}` : "—")}
        </div>
      </div>
    </div>
  );
}

function DraggableTicketCard({
  ticket,
  epicTitle,
  sprintTitle,
  onOpen,
}: {
  ticket: Ticket;
  epicTitle?: string;
  sprintTitle?: string;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `ticket:${ticket.id}`,
      data: { ticketId: ticket.id },
    });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : "transform 200ms ease",
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TicketCard
        ticket={ticket}
        epicTitle={epicTitle}
        sprintTitle={sprintTitle}
        onOpen={onOpen}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function DroppableStatusColumn({
  colKey,
  title,
  count,
  headerClass,
  children,
}: {
  colKey: BoardStatus;
  title: string;
  count: number;
  headerClass: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col:${colKey}`,
    data: { boardStatus: colKey },
  });

  return (
    <Column
      title={title}
      count={count}
      headerClass={headerClass}
      isOver={isOver}
      setRef={setNodeRef}
    >
      {children}
    </Column>
  );
}

export default function BoardPage() {
  const canManage = canManagePlanning();

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedSprintKey, setSelectedSprintKey] = useState<string>("backlog");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [moveError, setMoveError] = useState<string | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);

  // View drawer
  const [viewing, setViewing] = useState<Ticket | null>(null);

  // Create Sprint dialog state
  const [newSprintOpen, setNewSprintOpen] = useState(false);
  const [newSprintTitle, setNewSprintTitle] = useState("");
  const [newSprintGoal, setNewSprintGoal] = useState("");
  const [newSprintStart, setNewSprintStart] = useState("");
  const [newSprintEnd, setNewSprintEnd] = useState("");
  const [newSprintEndTouched, setNewSprintEndTouched] = useState(false);
  const [newSprintSaving, setNewSprintSaving] = useState(false);
  const [newSprintError, setNewSprintError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [sprintData, epicData, ticketData] = await Promise.all([
        fetchSprints(),
        fetchEpics(),
        fetchTickets(),
      ]);
      setSprints(sprintData);
      setEpics(epicData);
      setTickets(ticketData);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (typeof e?.response?.data === "string" ? e.response.data : null) ||
        e?.message ||
        "Failed to load board data.";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const backlogSprintId = useMemo(() => {
    const backlog = sprints.find(isBacklogSprint);
    return backlog?.id ?? null;
  }, [sprints]);

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

  const sprintOptions = useMemo<SprintOption[]>(() => {
    const backlog = sprints.find(isBacklogSprint);

    const activeSprints = sprints
      .filter((s) => !isBacklogSprint(s))
      .filter((s) => !isDoneSprint(s))
      .sort((a, b) =>
        (a.startDate ?? "9999-12-31").localeCompare(b.startDate ?? "9999-12-31")
      );

    return [
      { key: "backlog", title: backlog?.title ?? "Backlog", sprintId: null },
      ...activeSprints.map((s) => ({
        key: String(s.id),
        title: s.title,
        sprintId: s.id,
      })),
    ];
  }, [sprints]);

  useEffect(() => {
    if (!sprintOptions.some((s) => s.key === selectedSprintKey)) {
      setSelectedSprintKey(sprintOptions[0]?.key ?? "backlog");
    }
  }, [sprintOptions, selectedSprintKey]);

  const selectedSprint =
    sprintOptions.find((s) => s.key === selectedSprintKey) ?? sprintOptions[0];

  const filteredTickets = useMemo(() => {
    if (!selectedSprint) return [];

    if (selectedSprint.key === "backlog") {
      return tickets.filter(
        (t) =>
          (backlogSprintId != null && t.sprintId === backlogSprintId) ||
          t.sprintId == null
      );
    }

    return tickets.filter((t) => t.sprintId === selectedSprint.sprintId);
  }, [tickets, selectedSprint, backlogSprintId]);

  const ticketsByStatus = useMemo(() => {
    const map = new Map<BoardStatus, Ticket[]>();
    for (const column of BOARD_COLUMNS) map.set(column.key, []);

    for (const ticket of filteredTickets) {
      const status = normalizeTicketStatus(ticket.status);
      map.get(status)?.push(ticket);
    }

    for (const [key, list] of map.entries()) {
      list.sort((a, b) => a.id - b.id);
      map.set(key, list);
    }

    return map;
  }, [filteredTickets]);

  const activeTicket = useMemo(() => {
    if (activeTicketId == null) return null;
    return tickets.find((t) => t.id === activeTicketId) ?? null;
  }, [tickets, activeTicketId]);

  function handleDragStart(event: DragStartEvent) {
    const ticketId = (event.active.data.current as any)?.ticketId as
      | number
      | undefined;
    if (ticketId) setActiveTicketId(ticketId);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTicketId(null);

    const ticketId = (event.active.data.current as any)?.ticketId as
      | number
      | undefined;
    if (!ticketId) return;

    const over = event.over;
    if (!over) return;

    if (!String(over.id).startsWith("col:")) return;

    const targetBoardStatus = (over.data.current as any)?.boardStatus as
      | BoardStatus
      | undefined;
    if (!targetBoardStatus) return;

    const current = tickets.find((t) => t.id === ticketId);
    if (!current) return;

    const currentBoardStatus = normalizeTicketStatus(current.status);
    if (currentBoardStatus === targetBoardStatus) return;

    const prevStatus = current.status;
    const nextBackendStatus = backendStatusFromBoard(targetBoardStatus);

    setMoveError(null);
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, status: nextBackendStatus } : t
      )
    );

    try {
      await updateTicketStatus(ticketId, nextBackendStatus);
    } catch (e: any) {
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: prevStatus } : t))
      );

      const msg =
        e?.response?.data?.message ||
        (typeof e?.response?.data === "string" ? e.response.data : null) ||
        e?.message ||
        "Failed to update ticket status.";
      setMoveError(String(msg));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            Sprint Board
          </h1>

          <Select
            value={selectedSprintKey}
            onValueChange={setSelectedSprintKey}
          >
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Select sprint" />
            </SelectTrigger>
            <SelectContent>
              {sprintOptions.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>

          {canManage ? (
            <>
              <Button
                onClick={() => {
                  setNewSprintError(null);
                  setNewSprintTitle("");
                  setNewSprintGoal("");
                  setNewSprintStart("");
                  setNewSprintEnd("");
                  setNewSprintEndTouched(false);
                  setNewSprintOpen(true);
                }}
              >
                + New Sprint
              </Button>

              <Dialog open={newSprintOpen} onOpenChange={setNewSprintOpen}>
                <DialogContent className="sm:max-w-[560px]">
                  <DialogHeader>
                    <DialogTitle>Create sprint</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        placeholder="Sprint 1"
                        value={newSprintTitle}
                        onChange={(e) => setNewSprintTitle(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Goal</label>
                      <Textarea
                        placeholder="What’s the main goal?"
                        value={newSprintGoal}
                        onChange={(e) => setNewSprintGoal(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Start date
                        </label>
                        <Input
                          type="date"
                          value={newSprintStart}
                          onChange={(e) => {
                            const v = e.target.value;
                            setNewSprintStart(v);
                            if (v && !newSprintEndTouched) {
                              setNewSprintEnd(addDays(v, 14));
                            }
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">End date</label>
                        <Input
                          type="date"
                          value={newSprintEnd}
                          onChange={(e) => {
                            setNewSprintEndTouched(true);
                            setNewSprintEnd(e.target.value);
                          }}
                        />
                      </div>
                    </div>

                    {newSprintError ? (
                      <div className="text-sm text-red-600">
                        {newSprintError}
                      </div>
                    ) : null}

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setNewSprintOpen(false)}
                        disabled={newSprintSaving}
                      >
                        Cancel
                      </Button>

                      <Button
                        disabled={newSprintSaving}
                        onClick={async () => {
                          if (!newSprintTitle.trim()) {
                            setNewSprintError("Sprint name is required.");
                            return;
                          }

                          setNewSprintError(null);
                          setNewSprintSaving(true);

                          try {
                            const created = await createSprint({
                              title: newSprintTitle.trim(),
                              goal: newSprintGoal.trim()
                                ? newSprintGoal.trim()
                                : null,
                              startDate: newSprintStart || null,
                              endDate: newSprintEnd || null,
                              status: "PLANNED",
                            });

                            const fresh = await fetchSprints();
                            setSprints(fresh);

                            if ((created as any)?.id != null) {
                              setSelectedSprintKey(String((created as any).id));
                            }

                            setNewSprintOpen(false);
                          } catch (e: any) {
                            const msg =
                              e?.response?.data?.message ||
                              (typeof e?.response?.data === "string"
                                ? e.response.data
                                : null) ||
                              e?.message ||
                              "Failed to create sprint.";
                            setNewSprintError(String(msg));
                          } finally {
                            setNewSprintSaving(false);
                          }
                        }}
                      >
                        {newSprintSaving ? "Creating..." : "Create"}
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

      {moveError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {moveError}
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {BOARD_COLUMNS.map((column) => {
            const list = ticketsByStatus.get(column.key) ?? [];

            return (
              <DroppableStatusColumn
                key={column.key}
                colKey={column.key}
                title={column.title}
                count={list.length}
                headerClass={column.headerClass}
              >
                {list.length === 0 ? (
                  <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                    Drop tickets here
                  </div>
                ) : (
                  list.map((ticket) => (
                    <DraggableTicketCard
                      key={ticket.id}
                      ticket={ticket}
                      epicTitle={
                        ticket.epicId
                          ? epicTitleById.get(ticket.epicId) ??
                            `Epic #${ticket.epicId}`
                          : undefined
                      }
                      sprintTitle={
                        ticket.sprintId
                          ? sprintTitleById.get(ticket.sprintId) ??
                            `Sprint #${ticket.sprintId}`
                          : selectedSprint?.key === "backlog"
                          ? "Backlog"
                          : undefined
                      }
                      onOpen={() => setViewing(ticket)}
                    />
                  ))
                )}
              </DroppableStatusColumn>
            );
          })}
        </div>

        <DragOverlay>
          {activeTicket ? (
            <div className="min-w-[260px]">
              <TicketCard
                ticket={activeTicket}
                epicTitle={
                  activeTicket.epicId
                    ? epicTitleById.get(activeTicket.epicId) ??
                      `Epic #${activeTicket.epicId}`
                    : undefined
                }
                sprintTitle={
                  activeTicket.sprintId
                    ? sprintTitleById.get(activeTicket.sprintId) ??
                      `Sprint #${activeTicket.sprintId}`
                    : "Backlog"
                }
                showHandle={false}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* View Drawer */}
      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[520px] p-0">
          {viewing ? (
            <div className="flex h-full flex-col">
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
                  <span className="inline-flex rounded-md border bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                    SP: {viewing.storyPoints ?? "—"}
                  </span>
                </div>
              </div>

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
                        ? `User #${viewing.assigneeUserId}`
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
                        : "Backlog"}
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

              <div className="border-t px-6 py-4 flex items-center justify-end">
                <Button variant="outline" onClick={() => setViewing(null)}>
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
