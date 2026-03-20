import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useRef } from "react";
import {
  Clock3,
  GripVertical,
  History,
  Pencil,
  Play,
  Square,
} from "lucide-react";
import { getTagTone } from "../lib/tagStyles";
import type { Tag, Task } from "../types";
import { formatClock } from "../lib/time";

interface TaskCardProps {
  task: Task;
  taskTags: Tag[];
  isActive: boolean;
  liveSeconds: number;
  onToggleTimer: (taskId: number) => void;
  onEdit: (task: Task) => void;
  onOpenManualTime: (task: Task) => void;
  onOpenHistory: (task: Task) => void;
}

interface TaskCardSurfaceProps extends TaskCardProps {
  dragHandleProps?: ComponentPropsWithoutRef<"button">;
  isDragging?: boolean;
  isOverlay?: boolean;
  setNodeRef?: (node: HTMLElement | null) => void;
}

function TaskCardSurface({
  task,
  taskTags,
  isActive,
  liveSeconds,
  onToggleTimer,
  onEdit,
  onOpenManualTime,
  onOpenHistory,
  dragHandleProps,
  isDragging = false,
  isOverlay = false,
  setNodeRef,
}: TaskCardSurfaceProps) {
  return (
    <article
      ref={setNodeRef}
      data-testid={`task-card-${task.id}`}
      className={[
        "group relative flex min-h-[196px] flex-col overflow-hidden rounded-[2rem] border p-4 shadow-card transition-[transform,opacity,box-shadow,border-color] duration-200 ease-out sm:min-h-[250px] sm:p-6",
        isActive
          ? "animate-pulseGlow border-mint/50 bg-gradient-to-br from-mint/30 via-white to-gold/25"
          : "border-white/70 bg-white/80 hover:-translate-y-1 hover:border-ink/10",
        isDragging && !isOverlay ? "opacity-0" : "opacity-100",
        isOverlay
          ? "z-30 rotate-1 shadow-2xl ring-1 ring-ink/10 cursor-grabbing"
          : "",
        "transform-gpu",
      ].join(" ")}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-coral via-gold to-mint" />
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white/80 text-ink/55 transition hover:border-ink/30 hover:text-ink"
          aria-label={`Réorganiser ${task.name}`}
          tabIndex={isDragging && !isOverlay ? -1 : undefined}
          {...dragHandleProps}
        >
          <GripVertical size={16} />
        </button>

        <button
          type="button"
          onClick={() => onEdit(task)}
          disabled={isDragging && !isOverlay}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white/80 text-ink/55 transition hover:border-ink/30 hover:text-ink disabled:pointer-events-none"
          aria-label={`Modifier ${task.name}`}
        >
          <Pencil size={16} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onToggleTimer(task.id)}
        disabled={isDragging && !isOverlay}
        aria-label={`Basculer le chrono pour ${task.name}`}
        className="mt-3 flex w-full flex-1 flex-col items-start justify-between text-left disabled:pointer-events-none sm:mt-4"
      >
        <div className="min-w-0 space-y-2.5 sm:space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] sm:gap-2 sm:px-3 sm:text-xs sm:tracking-[0.18em]",
                isActive ? "bg-mint/35 text-ink" : "bg-ink/5 text-ink/50",
              ].join(" ")}
            >
              {isActive ? <Square size={12} /> : <Play size={12} />}
              {isActive ? "Actif" : "Prêt"}
            </span>
          </div>

          <div className="min-w-0">
            <h3 className="break-words overflow-hidden text-[1.45rem] font-semibold leading-tight text-ink [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] sm:block sm:overflow-visible sm:text-[1.9rem] sm:[-webkit-line-clamp:unset]">
              {task.name}
            </h3>
            {task.comment ? (
              <p className="mt-1.5 break-words overflow-hidden text-[13px] leading-5 text-ink/62 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] sm:mt-2 sm:block sm:overflow-visible sm:text-sm sm:leading-6 sm:[-webkit-line-clamp:unset]">
                {task.comment}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 w-full space-y-3 sm:mt-6 sm:space-y-4">
          <p className="font-mono text-[1.95rem] font-semibold leading-none tracking-tight text-ink sm:text-5xl">
            {formatClock(liveSeconds)}
          </p>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {taskTags.length === 0 ? (
              <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-medium text-ink/45 sm:px-3 sm:text-xs">
                Sans tag
              </span>
            ) : (
              taskTags.map((tag) => (
                <span
                  key={tag.id}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold sm:px-3 sm:text-xs ${getTagTone(tag.color).badge}`}
                >
                  {tag.name}
                </span>
              ))
            )}
          </div>
        </div>
      </button>

      <div className="mt-3 flex flex-wrap gap-2 sm:mt-4 sm:gap-3">
        <button
          type="button"
          onClick={() => onOpenManualTime(task)}
          disabled={isDragging && !isOverlay}
          className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full border border-ink/10 bg-white/85 px-3 py-2 text-[13px] font-semibold text-ink/65 transition hover:border-ink/30 hover:text-ink disabled:pointer-events-none sm:px-4 sm:text-sm"
        >
          <Clock3 size={16} />
          Temps manuel
        </button>
        <button
          type="button"
          onClick={() => onOpenHistory(task)}
          disabled={isDragging && !isOverlay}
          className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full border border-ink/10 bg-white/85 px-3 py-2 text-[13px] font-semibold text-ink/65 transition hover:border-ink/30 hover:text-ink disabled:pointer-events-none sm:px-4 sm:text-sm"
        >
          <History size={16} />
          Historique
        </button>
      </div>
    </article>
  );
}

export function TaskCard({
  task,
  taskTags,
  isActive,
  liveSeconds,
  onToggleTimer,
  onEdit,
  onOpenManualTime,
  onOpenHistory,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  });
  const articleRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!articleRef.current) {
      return;
    }

    articleRef.current.style.transform =
      CSS.Transform.toString(transform) ?? "";
    articleRef.current.style.transition = transition ?? "";
  }, [transform, transition]);

  const handleSetNodeRef = (node: HTMLElement | null) => {
    articleRef.current = node;
    setNodeRef(node);
  };

  return (
    <TaskCardSurface
      task={task}
      taskTags={taskTags}
      isActive={isActive}
      liveSeconds={liveSeconds}
      onToggleTimer={onToggleTimer}
      onEdit={onEdit}
      onOpenManualTime={onOpenManualTime}
      onOpenHistory={onOpenHistory}
      dragHandleProps={{ ...attributes, ...listeners }}
      isDragging={isDragging}
      setNodeRef={handleSetNodeRef}
    />
  );
}

export function TaskCardOverlay(props: TaskCardProps) {
  return <TaskCardSurface {...props} isOverlay />;
}
