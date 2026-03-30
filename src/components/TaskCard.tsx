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
        // Base layout
        "group relative flex items-center overflow-hidden rounded-[1.75rem] border transition-[transform,opacity,box-shadow,border-color] duration-200 ease-out transform-gpu",

        // Mobile list layout (compact row)
        "gap-3 px-3 py-2 border-b border-ink/8 sm:gap-4 sm:min-h-[220px] sm:p-5 sm:flex-col sm:border-b-0 sm:rounded-[1.75rem]",

        // Active state
        isActive
          ? "sm:animate-pulseGlow sm:border-mint/50 sm:bg-gradient-to-br sm:from-mint/30 sm:via-white sm:to-gold/25 bg-white/90"
          : "sm:border-white/70 sm:bg-white/80 sm:hover:-translate-y-1 sm:hover:border-ink/10 bg-white/80",

        // Dragging state
        isDragging && !isOverlay ? "opacity-0" : "opacity-100",

        // Overlay state
        isOverlay ? "z-30 rotate-1 shadow-2xl ring-1 ring-ink/10" : "",
      ].join(" ")}
    >
      {/* Gradient bar - mobile list view */}
      <div className="sm:absolute sm:inset-x-0 sm:top-0 sm:h-1 sm:bg-gradient-to-r sm:from-coral sm:via-gold sm:to-mint h-1 bg-gradient-to-r from-coral via-gold to-mint rounded-t-lg" />

      {/* Drag handle - unified for mobile and desktop */}
      <button
        type="button"
        data-card-control="drag-handle"
        className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 inline-flex items-center justify-center rounded-full border border-ink/10 bg-white/80 text-ink/55 transition hover:border-ink/30 hover:text-ink touch-none"
        aria-label={`Réorganiser ${task.name}`}
        tabIndex={isDragging && !isOverlay ? -1 : undefined}
        {...dragHandleProps}
      >
        <GripVertical size={14} className="sm:w-4 sm:h-4" />
      </button>

      {/* Task info zone - middle */}
      <div className="flex-1 min-w-0">
        {/* Desktop version - hidden on mobile */}
        <div className="hidden sm:flex sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-2 sm:space-y-3 flex-1">
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
              <h3 className="break-words overflow-hidden text-[1.65rem] font-semibold leading-tight text-ink">
                {task.name}
              </h3>
              {task.comment ? (
                <p className="mt-1.5 break-words overflow-hidden text-sm leading-6 text-ink/62">
                  {task.comment}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex gap-3 flex-shrink-0">
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
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white/80 text-ink/55 transition hover:border-ink/30 hover:text-ink disabled:pointer-events-none"
              aria-label={`Modifier ${task.name}`}
            >
              <Pencil size={16} />
            </button>
          </div>
        </div>

        {/* Mobile version - compact row */}
        <div className="sm:hidden flex flex-col flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-ink truncate">
              {task.name}
            </h3>
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide flex-shrink-0",
                isActive ? "bg-mint/35 text-ink" : "bg-ink/5 text-ink/50",
              ].join(" ")}
            >
              {isActive ? <Square size={10} /> : <Play size={10} />}
            </span>
          </div>
          <p className="text-[11px] text-ink/60 truncate">
            {taskTags.length === 0
              ? "Sans tag"
              : taskTags.map((t) => t.name).join(", ")}
          </p>
        </div>
      </div>

      {/* Time display - mobile right side */}
      <p className="sm:hidden text-base font-mono font-semibold text-ink">
        {formatClock(liveSeconds)}
      </p>

      {/* Mobile action icons - right side */}
      <div className="sm:hidden flex gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (isTimerToggleLocked || isDragInteractionActive) return;
            onToggleTimer(task.id);
          }}
          data-card-control="timer"
          disabled={isDragging && !isOverlay}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink/60 hover:text-ink hover:bg-ink/5 transition disabled:pointer-events-none"
          aria-label={`Basculer le chrono pour ${task.name}`}
        >
          {isActive ? <Square size={14} /> : <Play size={14} />}
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
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink/60 hover:text-ink hover:bg-ink/5 transition disabled:pointer-events-none"
          aria-label={`Modifier ${task.name}`}
        >
          <Pencil size={14} />
        </button>
      </div>

      {/* Desktop card content - below the header row */}
      <div className="hidden sm:flex sm:w-full sm:flex-1 sm:flex-col sm:items-start sm:justify-between sm:text-left sm:mt-3">
        <div className="min-w-0 space-y-3 w-full">
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
            <p className="text-[2.7rem] font-mono font-semibold leading-none tracking-tight text-ink">
              {formatClock(liveSeconds)}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {taskTags.length === 0 ? (
                <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink/45">
                  Sans tag
                </span>
              ) : (
                taskTags.map((tag) => (
                  <span
                    key={tag.id}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getTagTone(tag.color).badge}`}
                  >
                    {tag.name}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 w-full">
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
            className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full border border-ink/10 bg-white/85 px-4 py-2 text-sm font-semibold text-ink/65 transition hover:border-ink/30 hover:text-ink disabled:pointer-events-none"
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
            className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full border border-ink/10 bg-white/85 px-4 py-2 text-sm font-semibold text-ink/65 transition hover:border-ink/30 hover:text-ink disabled:pointer-events-none"
          >
            <History size={14} />
            Historique
          </button>
        </div>
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
