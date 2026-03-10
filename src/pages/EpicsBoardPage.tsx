import { useEffect, useMemo, useState } from "react";

import {
  fetchEpics,
  createEpic,
  updateEpic,
  type Epic,
  type EpicPriority,
  type EpicStatus,
} from "@/features/epics/epics.api";

import { Button } from "@/components/ui/button";
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

type EpicBoardStatus = "OPEN" | "DONE";

const EPIC_COLUMNS: Array<{
  key: EpicBoardStatus;
  title: string;
  headerClass: string;
}> = [
  { key: "OPEN", title: "Open", headerClass: "bg-slate-100 text-slate-800" },
  {
    key: "DONE",
    title: "Done",
    headerClass: "bg-emerald-100 text-emerald-800",
  },
];

function normalizeEpicStatus(raw: unknown): EpicBoardStatus {
  const v = String(raw ?? "")
    .trim()
    .toUpperCase();
  return v === "DONE" ? "DONE" : "OPEN";
}

function priorityTone(priority: unknown) {
  const value = String(priority ?? "MEDIUM").toUpperCase();
  if (value === "CRITICAL" || value === "HIGH")
    return "bg-red-50 text-red-700 border-red-200";
  if (value === "MEDIUM") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function PriorityBadge({ priority }: { priority: EpicPriority }) {
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
    <div className="min-w-[320px] flex-1">
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

function EpicCard({ epic }: { epic: Epic }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="text-sm font-medium leading-snug">{epic.title}</div>

      <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
        {epic.description}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <PriorityBadge priority={epic.priority} />
        <div className="text-xs text-muted-foreground">
          {epic.assigneeUserId == null
            ? "Unassigned"
            : `User #${epic.assigneeUserId}`}
        </div>
      </div>
    </div>
  );
}

function DraggableEpicCard({ epic }: { epic: Epic }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `epic:${epic.id}`,
      data: { epicId: epic.id },
    });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : "transform 200ms ease",
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <EpicCard epic={epic} />
    </div>
  );
}

function DroppableEpicColumn({
  colKey,
  title,
  count,
  headerClass,
  children,
}: {
  colKey: EpicBoardStatus;
  title: string;
  count: number;
  headerClass: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `epic-col:${colKey}`,
    data: { epicStatus: colKey },
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

export default function EpicsBoardPage() {
  const canManage = canManagePlanning();

  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [moveError, setMoveError] = useState<string | null>(null);
  const [activeEpicId, setActiveEpicId] = useState<number | null>(null);

  // Create epic dialog
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<EpicPriority>("MEDIUM");
  const [assigneeUserId, setAssigneeUserId] = useState<string>(""); // optional

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEpics();
      setEpics(data);
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

  const epicsByStatus = useMemo(() => {
    const m = new Map<EpicBoardStatus, Epic[]>();
    EPIC_COLUMNS.forEach((c) => m.set(c.key, []));

    for (const e of epics) {
      const st = normalizeEpicStatus((e as any).status);
      m.get(st)!.push(e);
    }

    for (const [k, list] of m.entries()) {
      list.sort((a, b) => a.id - b.id);
      m.set(k, list);
    }
    return m;
  }, [epics]);

  const activeEpic = useMemo(() => {
    if (activeEpicId == null) return null;
    return epics.find((e) => e.id === activeEpicId) ?? null;
  }, [epics, activeEpicId]);

  function handleDragStart(event: DragStartEvent) {
    const epicId = (event.active.data.current as any)?.epicId as
      | number
      | undefined;
    if (epicId) setActiveEpicId(epicId);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveEpicId(null);

    const epicId = (event.active.data.current as any)?.epicId as
      | number
      | undefined;
    if (!epicId) return;

    const over = event.over;
    if (!over) return;

    if (!String(over.id).startsWith("epic-col:")) return;

    const target = (over.data.current as any)?.epicStatus as
      | EpicBoardStatus
      | undefined;
    if (!target) return;

    const current = epics.find((e) => e.id === epicId);
    if (!current) return;

    const currentStatus = normalizeEpicStatus((current as any).status);
    if (currentStatus === target) return;

    const prevStatus = (current as any).status as EpicStatus;

    // optimistic
    setMoveError(null);
    setEpics((prev) =>
      prev.map((e) => (e.id === epicId ? ({ ...e, status: target } as any) : e))
    );

    try {
      await updateEpic(epicId, { status: target });
    } catch (e: any) {
      // rollback
      setEpics((prev) =>
        prev.map((e) =>
          e.id === epicId ? ({ ...e, status: prevStatus } as any) : e
        )
      );

      const msg =
        e?.response?.data?.message ||
        (typeof e?.response?.data === "string" ? e.response.data : null) ||
        e?.message ||
        "Failed to update epic status.";
      setMoveError(String(msg));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Planning / Epics
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Epics Board</h1>
          <p className="text-sm text-muted-foreground">
            Columns = epic status (OPEN / DONE). Drag to change status.
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
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {EPIC_COLUMNS.map((col) => {
            const list = epicsByStatus.get(col.key) ?? [];
            return (
              <DroppableEpicColumn
                key={col.key}
                colKey={col.key}
                title={col.title}
                count={list.length}
                headerClass={col.headerClass}
              >
                {list.length === 0 ? (
                  <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                    Drop epics here
                  </div>
                ) : (
                  list.map((epic) => (
                    <DraggableEpicCard key={epic.id} epic={epic} />
                  ))
                )}
              </DroppableEpicColumn>
            );
          })}
        </div>

        <DragOverlay>
          {activeEpic ? (
            <div className="min-w-[320px]">
              <EpicCard epic={activeEpic} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
