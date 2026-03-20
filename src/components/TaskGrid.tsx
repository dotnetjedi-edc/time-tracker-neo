import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { Tag, Task } from "../types";
import { TaskCard } from "./TaskCard";

interface TaskGridProps {
  tasks: Task[];
  tags: Tag[];
  activeTaskId: number | null;
  liveTotals: Record<number, number>;
  onToggleTimer: (taskId: number) => void;
  onEditTask: (task: Task) => void;
  onOpenManualTime: (task: Task) => void;
  onOpenHistory: (task: Task) => void;
  onAddTask: () => void;
  onReorder: (activeTaskId: number, overTaskId: number) => void;
}

export function TaskGrid({
  tasks,
  tags,
  activeTaskId,
  liveTotals,
  onToggleTimer,
  onEditTask,
  onOpenManualTime,
  onOpenHistory,
  onAddTask,
  onReorder,
}: TaskGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over) {
      return;
    }

    onReorder(Number(event.active.id), Number(event.over.id));
  };

  if (tasks.length === 0) {
    return (
      <section className="rounded-[2rem] border border-dashed border-ink/15 bg-white/60 p-8 text-center shadow-card backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-ink/45">
          Premier démarrage
        </p>
        <h2 className="mt-3 font-serif text-3xl text-ink">
          Commencez avec votre première tâche
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-ink/65">
          Le MVP démarre volontairement vide. Créez une tâche, ajoutez des tags
          si besoin puis lancez le chrono d’un simple tap.
        </p>
        <button
          type="button"
          onClick={onAddTask}
          className="mt-8 rounded-full bg-ink px-6 py-4 text-sm font-semibold text-white transition hover:bg-ink/90"
        >
          Nouvelle tâche
        </button>
      </section>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={rectSortingStrategy}
      >
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              taskTags={tags.filter((tag) => task.tagIds.includes(tag.id))}
              isActive={activeTaskId === task.id}
              liveSeconds={liveTotals[task.id] ?? task.totalTimeSeconds}
              onToggleTimer={onToggleTimer}
              onEdit={onEditTask}
              onOpenManualTime={onOpenManualTime}
              onOpenHistory={onOpenHistory}
            />
          ))}

          <button
            type="button"
            onClick={onAddTask}
            className="flex min-h-[230px] items-center justify-center rounded-[2rem] border border-dashed border-ink/20 bg-white/45 p-8 text-xl font-semibold text-ink/60 transition hover:border-ink/40 hover:bg-white/70 hover:text-ink sm:min-h-[250px]"
          >
            + Nouvelle tâche
          </button>
        </section>
      </SortableContext>
    </DndContext>
  );
}
