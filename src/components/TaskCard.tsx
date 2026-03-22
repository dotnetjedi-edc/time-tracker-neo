import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  ComponentPropsWithoutRef,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
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
  onToggleTimer: (taskId: string) => void | Promise<void>;
  onEdit: (task: Task) => void;
  onOpenManualTime: (task: Task) => void;
  onOpenHistory: (task: Task) => void;
  isTimerToggleLocked?: boolean;
  isDragInteractionActive?: boolean;
}

interface TaskCardSurfaceProps extends TaskCardProps {
  dragHandleProps?: ComponentPropsWithoutRef<"button">;
  isDragging?: boolean;
  isOverlay?: boolean;
  onPointerCancel?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp?: (event: ReactPointerEvent<HTMLElement>) => void;
  setNodeRef?: (node: HTMLElement | null) => void;
}

function TaskCardSurface({
  task,
  taskTags,
  isActive,
  isTimerToggleLocked = false,
  liveSeconds,
  onToggleTimer,
  onEdit,
  onOpenManualTime,
  onOpenHistory,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  dragHandleProps,
  isDragging = false,
  isOverlay = false,
  setNodeRef,
  isDragInteractionActive = false,
}: TaskCardSurfaceProps) {
  const handleCardClick = (event: ReactMouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;

    if (target.closest("[data-card-control]")) {
      return;
    }

    if (isDragging || isTimerToggleLocked || isDragInteractionActive) {
      return;
    }

    onToggleTimer(task.id);
  };

  return (
    <article
      ref={setNodeRef}
      data-testid={isOverlay ? undefined : `task-card-${task.id}`}
      onClick={handleCardClick}
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={[
        "group relative flex min-h-[176px] flex-col overflow-hidden rounded-[1.75rem] border p-3.5 shadow-card transition-[transform,opacity,box-shadow,border-color] duration-200 ease-out sm:min-h-[220px] sm:p-5",
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
          data-card-control="drag-handle"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white/80 text-ink/55 transition hover:border-ink/30 hover:text-ink"
          aria-label={`Réorganiser ${task.name}`}
          tabIndex={isDragging && !isOverlay ? -1 : undefined}
          {...dragHandleProps}
        >
          <GripVertical size={15} />
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(task);
          }}
          data-card-control="secondary"
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          disabled={isDragging && !isOverlay}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-white/80 text-ink/55 transition hover:border-ink/30 hover:text-ink disabled:pointer-events-none sm:h-10 sm:w-10"
          aria-label={`Modifier ${task.name}`}
        >
          <Pencil size={16} />
        </button>
      </div>

      <button
        type="button"
        disabled={isDragging && !isOverlay}
        aria-label={`Basculer le chrono pour ${task.name}`}
        className="mt-3 flex w-full flex-1 flex-col items-start justify-between text-left disabled:pointer-events-none sm:mt-4"
      >
        <div className="min-w-0 space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] sm:gap-2 sm:px-3 sm:text-xs sm:tracking-[0.18em]",
                isActive ? "bg-mint/35 text-ink" : "bg-ink/5 text-ink/50",
              ].join(" ")}
            >
              {isActive ? <Square size={12} /> : <Play size={12} />}
              {isActive ? "Actif" : "Prêt"}
            </span>
          </div>

          <div className="min-w-0">
            <h3 className="break-words overflow-hidden text-[1.15rem] font-semibold leading-tight text-ink [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] sm:block sm:overflow-visible sm:text-[1.65rem] sm:[-webkit-line-clamp:unset]">
              {task.name}
            </h3>
            {task.comment ? (
              <p className="mt-1 break-words overflow-hidden text-[12px] leading-4 text-ink/62 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] sm:mt-1.5 sm:block sm:overflow-visible sm:text-sm sm:leading-6 sm:[-webkit-line-clamp:unset]">
                {task.comment}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 w-full space-y-2.5 sm:mt-5 sm:space-y-4">
          <p className="font-mono text-[1.8rem] font-semibold leading-none tracking-tight text-ink sm:text-[2.7rem]">
            {formatClock(liveSeconds)}
          </p>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {taskTags.length === 0 ? (
              <span className="rounded-full bg-ink/5 px-2 py-1 text-[10px] font-medium text-ink/45 sm:px-3 sm:text-xs">
                Sans tag
              </span>
            ) : (
              taskTags.map((tag) => (
                <span
                  key={tag.id}
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold sm:px-3 sm:text-xs ${getTagTone(tag.color).badge}`}
                >
                  {tag.name}
                </span>
              ))
            )}
          </div>
        </div>
      </button>

      <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenManualTime(task);
          }}
          data-card-control="secondary"
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          disabled={isDragging && !isOverlay}
          className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-ink/10 bg-white/85 px-2.5 py-1.5 text-[12px] font-semibold text-ink/65 transition hover:border-ink/30 hover:text-ink disabled:pointer-events-none sm:min-h-10 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
        >
          <Clock3 size={14} />
          Temps manuel
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenHistory(task);
          }}
          data-card-control="secondary"
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          disabled={isDragging && !isOverlay}
          className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-ink/10 bg-white/85 px-2.5 py-1.5 text-[12px] font-semibold text-ink/65 transition hover:border-ink/30 hover:text-ink disabled:pointer-events-none sm:min-h-10 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
        >
          <History size={14} />
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
  isTimerToggleLocked = false,
  isDragInteractionActive = false,
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
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);

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

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    suppressClickRef.current = false;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!pointerStartRef.current) {
      return;
    }

    const deltaX = Math.abs(event.clientX - pointerStartRef.current.x);
    const deltaY = Math.abs(event.clientY - pointerStartRef.current.y);

    if (deltaX > 6 || deltaY > 6) {
      suppressClickRef.current = true;
    }
  };

  const handlePointerEnd = () => {
    pointerStartRef.current = null;

    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const handleToggleTimer = (taskId: string) => {
    if (suppressClickRef.current) {
      return;
    }

    onToggleTimer(taskId);
  };

  return (
    <TaskCardSurface
      task={task}
      taskTags={taskTags}
      isActive={isActive}
      isTimerToggleLocked={isTimerToggleLocked}
      liveSeconds={liveSeconds}
      onToggleTimer={handleToggleTimer}
      onEdit={onEdit}
      onOpenManualTime={onOpenManualTime}
      onOpenHistory={onOpenHistory}
      isDragInteractionActive={isDragInteractionActive}
      dragHandleProps={{ ...attributes, ...listeners }}
      isDragging={isDragging}
      setNodeRef={handleSetNodeRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    />
  );
}

export function TaskCardOverlay(props: TaskCardProps) {
  return <TaskCardSurface {...props} isOverlay />;
}
