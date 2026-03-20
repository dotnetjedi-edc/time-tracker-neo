import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragOverEvent,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useEffect, useRef, useState } from "react";
import type { Tag, Task } from "../types";
import { TaskCard, TaskCardOverlay } from "./TaskCard";

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
  onReorder: (taskIds: number[]) => void;
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
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dragOverlayWidth, setDragOverlayWidth] = useState<number | null>(null);
  const [orderedTaskIds, setOrderedTaskIds] = useState<number[]>(() =>
    tasks.map((task) => task.id),
  );
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (draggedTaskId !== null) {
      return;
    }

    setOrderedTaskIds(tasks.map((task) => task.id));
  }, [draggedTaskId, tasks]);

  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const orderedTasks = orderedTaskIds
    .map((taskId) => tasksById.get(taskId))
    .filter((task): task is Task => task !== undefined);

  const draggedTask =
    draggedTaskId === null ? null : (tasksById.get(draggedTaskId) ?? null);

  useEffect(() => {
    if (!overlayRef.current) {
      return;
    }

    overlayRef.current.style.width = dragOverlayWidth
      ? `${dragOverlayWidth}px`
      : "";
  }, [dragOverlayWidth]);

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedTaskId(Number(event.active.id));
    setDragOverlayWidth(event.active.rect.current.initial?.width ?? null);
    setOrderedTaskIds(tasks.map((task) => task.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!event.over) {
      return;
    }

    const activeId = Number(event.active.id);
    const overId = Number(event.over.id);

    if (activeId === overId) {
      return;
    }

    setOrderedTaskIds((currentTaskIds) => {
      const activeIndex = currentTaskIds.indexOf(activeId);
      const overIndex = currentTaskIds.indexOf(overId);

      if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
        return currentTaskIds;
      }

      return arrayMove(currentTaskIds, activeIndex, overIndex);
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const initialTaskIds = tasks.map((task) => task.id);

    if (!event.over) {
      setDraggedTaskId(null);
      setDragOverlayWidth(null);
      setOrderedTaskIds(initialTaskIds);
      return;
    }

    const finalTaskIds = orderedTaskIds;
    const hasOrderChanged = finalTaskIds.some(
      (taskId, index) => taskId !== initialTaskIds[index],
    );

    if (hasOrderChanged) {
      onReorder(finalTaskIds);
    }

    setDraggedTaskId(null);
    setDragOverlayWidth(null);
    setOrderedTaskIds(finalTaskIds);
  };

  const handleDragCancel = () => {
    setDraggedTaskId(null);
    setDragOverlayWidth(null);
    setOrderedTaskIds(tasks.map((task) => task.id));
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
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={orderedTaskIds} strategy={rectSortingStrategy}>
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {orderedTasks.map((task) => (
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
      <DragOverlay>
        {draggedTask ? (
          <div
            ref={overlayRef}
            className="pointer-events-none max-w-[calc(100vw-2rem)]"
          >
            <TaskCardOverlay
              task={draggedTask}
              taskTags={tags.filter((tag) =>
                draggedTask.tagIds.includes(tag.id),
              )}
              isActive={activeTaskId === draggedTask.id}
              liveSeconds={
                liveTotals[draggedTask.id] ?? draggedTask.totalTimeSeconds
              }
              onToggleTimer={onToggleTimer}
              onEdit={onEditTask}
              onOpenManualTime={onOpenManualTime}
              onOpenHistory={onOpenHistory}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
