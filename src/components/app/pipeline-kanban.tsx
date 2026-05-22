import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Link } from "@tanstack/react-router";

import { Pill } from "@/components/brand/brand";
import { searchStageEnum, type SearchStage } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export type KanbanCandidateLink = {
  id: string;
  candidate_id: string;
  stage: string;
  candidate?: {
    full_name?: string | null;
    current_title?: string | null;
    city?: string | null;
  } | null;
};

const STAGES = searchStageEnum.options;
const STAGE_LABELS: Record<SearchStage, string> = {
  intake: "Intake",
  sourcing: "Sourcing",
  assessments: "Assessments",
  interviews: "Interviews",
  finalists: "Finalists",
  presented: "Presented",
  placed: "Placed",
};

function Card({ link }: { link: KanbanCandidateLink }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: link.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "group cursor-grab touch-none select-none rounded-xl border border-foreground/10 bg-card p-3 shadow-sm transition active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="h-8 w-8 shrink-0 rounded-full bg-[color:var(--gold)]/20" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {link.candidate?.full_name ?? "Candidate"}
          </div>
          <div className="truncate text-[11px] text-foreground/55">
            {link.candidate?.current_title ?? "—"}
          </div>
          {link.candidate?.city && (
            <div className="mt-1 text-[10px] uppercase tracking-[.14em] text-foreground/40">
              {link.candidate.city}
            </div>
          )}
        </div>
      </div>
      <Link
        to="/candidates/$candidateId"
        params={{ candidateId: link.candidate_id }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="mt-2 block text-[10px] font-semibold uppercase tracking-[.16em] text-[color:var(--gold-deep)] opacity-0 transition group-hover:opacity-100"
      >
        Open profile →
      </Link>
    </div>
  );
}

function Column({
  stage,
  links,
}: {
  stage: SearchStage;
  links: KanbanCandidateLink[];
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `col:${stage}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[260px] shrink-0 flex-col rounded-2xl border border-foreground/10 bg-[color:var(--soft)] transition",
        isOver && "border-[color:var(--gold)]/60 bg-[color:var(--gold)]/[0.06]",
      )}
    >
      <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
        <div className="text-xs font-bold uppercase tracking-[.14em] text-foreground/55">
          {STAGE_LABELS[stage]}
        </div>
        <Pill tone="soft">{links.length}</Pill>
      </div>
      <div className="flex flex-col gap-2 p-3 min-h-[120px]">
        {links.length === 0 && (
          <div className="rounded-lg border border-dashed border-foreground/15 px-3 py-6 text-center text-[11px] text-foreground/40">
            Drop a candidate here
          </div>
        )}
        {links.map((l) => (
          <Card key={l.id} link={l} />
        ))}
      </div>
    </div>
  );
}

export function PipelineKanban({
  links,
  onStageChange,
}: {
  links: KanbanCandidateLink[];
  onStageChange: (linkId: string, stage: SearchStage) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const [active, setActive] = useState<KanbanCandidateLink | null>(null);

  const byStage = useMemo(() => {
    const m: Record<SearchStage, KanbanCandidateLink[]> = {
      intake: [],
      sourcing: [],
      assessments: [],
      interviews: [],
      finalists: [],
      presented: [],
      placed: [],
    };
    for (const l of links) {
      const s = (STAGES as readonly string[]).includes(l.stage)
        ? (l.stage as SearchStage)
        : "sourcing";
      m[s].push(l);
    }
    return m;
  }, [links]);

  function handleDragStart(e: DragStartEvent) {
    const l = links.find((x) => x.id === e.active.id);
    if (l) setActive(l);
  }
  function handleDragEnd(e: DragEndEvent) {
    setActive(null);
    const overId = e.over?.id;
    if (!overId || typeof overId !== "string") return;
    if (!overId.startsWith("col:")) return;
    const stage = overId.slice(4) as SearchStage;
    const link = links.find((x) => x.id === e.active.id);
    if (!link || link.stage === stage) return;
    onStageChange(link.id, stage);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-3">
        {STAGES.map((s) => (
          <Column key={s} stage={s} links={byStage[s]} />
        ))}
      </div>
      <DragOverlay>{active ? <Card link={active} /> : null}</DragOverlay>
    </DndContext>
  );
}
