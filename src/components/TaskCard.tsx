import { useSortable } from "@dnd-kit/sortable";
import { Clock3, GripVertical, History, Pencil, Play, Square } from "lucide-react";
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
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: task.id,
  });

  return (
    <article
      ref={setNodeRef}
      data-testid={`task-card-${task.id}`}
      className={[
        "group relative flex min-h-[230px] flex-col overflow-hidden rounded-[2rem] border p-5 shadow-card transition sm:min-h-[250px] sm:p-6",
        isActive
          ? "animate-pulseGlow border-mint/50 bg-gradient-to-br from-mint/30 via-white to-gold/25"
          : "border-white/70 bg-white/80 hover:-translate-y-1 hover:border-ink/10",
        isDragging ? "opacity-80" : "opacity-100",
      ].join(" ")}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-coral via-gold to-mint" />
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          className="rounded-full border border-ink/10 bg-white/80 p-2 text-ink/55 transition hover:border-ink/30 hover:text-ink"
          aria-label={`Réorganiser ${task.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>

        <button
          type="button"
          onClick={() => onEdit(task)}
          className="rounded-full border border-ink/10 bg-white/80 p-2 text-ink/55 transition hover:border-ink/30 hover:text-ink"
          aria-label={`Modifier ${task.name}`}
        >
          <Pencil size={16} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onToggleTimer(task.id)}
        aria-label={`Basculer le chrono pour ${task.name}`}
        className="mt-4 flex flex-1 flex-col items-start justify-between text-left"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={[
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                isActive ? "bg-mint/35 text-ink" : "bg-ink/5 text-ink/50",
              ].join(" ")}
            >
              {isActive ? <Square size={12} /> : <Play size={12} />}
              {isActive ? "Actif" : "Prêt"}
            </span>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-ink sm:text-[1.9rem]">
              {task.name}
            </h3>
            {task.comment ? (
              <p className="mt-2 text-sm leading-6 text-ink/62">
                {task.comment}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 w-full space-y-4">
          <p className="font-mono text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            {formatClock(liveSeconds)}
          </p>

          <div className="flex flex-wrap gap-2">
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
      </button>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onOpenManualTime(task)}
          className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/85 px-4 py-2 text-sm font-semibold text-ink/65 transition hover:border-ink/30 hover:text-ink"
        >
          <Clock3 size={16} />
          Temps manuel
        </button>
        <button
          type="button"
          onClick={() => onOpenHistory(task)}
          className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/85 px-4 py-2 text-sm font-semibold text-ink/65 transition hover:border-ink/30 hover:text-ink"
        >
          <History size={16} />
          Historique
        </button>
      </div>
    </article>
  );
}
