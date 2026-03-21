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
  const [lockedToggleTaskId, setLockedToggleTaskId] = useState<number | null>(
    null,
  );
  const [orderedTaskIds, setOrderedTaskIds] = useState<number[]>(() =>
    tasks.map((task) => task.id),
  );
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const releaseToggleLockTimeoutRef = useRef<number | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const lastPointerYRef = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 0, tolerance: 5 },
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

  useEffect(() => {
    return () => {
      if (releaseToggleLockTimeoutRef.current !== null) {
        window.clearTimeout(releaseToggleLockTimeoutRef.current);
      }

      if (autoScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(autoScrollFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (draggedTaskId === null) {
      lastPointerYRef.current = null;
      document.documentElement.classList.remove("drag-scroll-lock");
      document.body.classList.remove("drag-scroll-lock");

      if (autoScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(autoScrollFrameRef.current);
        autoScrollFrameRef.current = null;
      }

      return;
    }

    document.documentElement.classList.add("drag-scroll-lock");
    document.body.classList.add("drag-scroll-lock");

    const updatePointerFromTouch = (event: TouchEvent) => {
      const touch = event.touches[0] ?? event.changedTouches[0];
      if (touch) {
        lastPointerYRef.current = touch.clientY;
      }
    };

    const updatePointerFromMouse = (event: PointerEvent) => {
      lastPointerYRef.current = event.clientY;
    };

    const autoScroll = () => {
      const pointerY = lastPointerYRef.current;

      if (pointerY !== null) {
        const edgeThreshold = 96;
        const maxStep = 22;
        const bottomDistance = window.innerHeight - pointerY;
        let scrollStep = 0;

        if (pointerY < edgeThreshold) {
          scrollStep = -Math.ceil(
            ((edgeThreshold - pointerY) / edgeThreshold) * maxStep,
          );
        } else if (bottomDistance < edgeThreshold) {
          scrollStep = Math.ceil(
            ((edgeThreshold - bottomDistance) / edgeThreshold) * maxStep,
          );
        }

        if (scrollStep !== 0) {
          window.scrollBy({ top: scrollStep, behavior: "auto" });
        }
      }

      autoScrollFrameRef.current = window.requestAnimationFrame(autoScroll);
    };

    window.addEventListener("touchmove", updatePointerFromTouch, {
      passive: true,
    });
    window.addEventListener("pointermove", updatePointerFromMouse, {
      passive: true,
    });
    autoScrollFrameRef.current = window.requestAnimationFrame(autoScroll);

    return () => {
      document.documentElement.classList.remove("drag-scroll-lock");
      document.body.classList.remove("drag-scroll-lock");
      window.removeEventListener("touchmove", updatePointerFromTouch);
      window.removeEventListener("pointermove", updatePointerFromMouse);

      if (autoScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(autoScrollFrameRef.current);
        autoScrollFrameRef.current = null;
      }
    };
  }, [draggedTaskId]);

  const scheduleToggleUnlock = (taskId: number | null) => {
    if (releaseToggleLockTimeoutRef.current !== null) {
      window.clearTimeout(releaseToggleLockTimeoutRef.current);
    }

    if (taskId === null) {
      setLockedToggleTaskId(null);
      return;
    }

    setLockedToggleTaskId(taskId);
    releaseToggleLockTimeoutRef.current = window.setTimeout(() => {
      setLockedToggleTaskId(null);
      releaseToggleLockTimeoutRef.current = null;
    }, 0);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = Number(event.active.id);

    if (releaseToggleLockTimeoutRef.current !== null) {
      window.clearTimeout(releaseToggleLockTimeoutRef.current);
      releaseToggleLockTimeoutRef.current = null;
    }

    setDraggedTaskId(activeId);
    setDragOverlayWidth(event.active.rect.current.initial?.width ?? null);
    setOrderedTaskIds(tasks.map((task) => task.id));
    setLockedToggleTaskId(activeId);
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
    const releasedTaskId = Number(event.active.id);
    const initialTaskIds = tasks.map((task) => task.id);

    if (!event.over) {
      setDraggedTaskId(null);
      setDragOverlayWidth(null);
      setOrderedTaskIds(initialTaskIds);
      scheduleToggleUnlock(releasedTaskId);
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
    scheduleToggleUnlock(releasedTaskId);
  };

  const handleDragCancel = () => {
    const releasedTaskId = draggedTaskId;

    setDraggedTaskId(null);
    setDragOverlayWidth(null);
    setOrderedTaskIds(tasks.map((task) => task.id));
    scheduleToggleUnlock(releasedTaskId);
  };

  if (tasks.length === 0) {
    return (
      <section className="rounded-[2rem] border border-dashed border-ink/15 bg-white/60 p-6 text-center shadow-card backdrop-blur sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink/45 sm:text-sm">
          Premier démarrage
        </p>
        <h2 className="mt-3 font-serif text-[1.75rem] text-ink sm:text-3xl">
          Commencez avec votre première tâche
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink/65 sm:text-base sm:leading-7">
          Le MVP démarre volontairement vide. Créez une tâche, ajoutez des tags
          si besoin puis lancez le chrono d’un simple tap.
        </p>
        <button
          type="button"
          onClick={onAddTask}
          className="mt-6 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 sm:mt-8 sm:px-6 sm:py-4"
        >
          Nouvelle tâche
        </button>
      </section>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      autoScroll={false}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={orderedTaskIds} strategy={rectSortingStrategy}>
        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
          {orderedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              taskTags={tags.filter((tag) => task.tagIds.includes(tag.id))}
              isActive={activeTaskId === task.id}
              isTimerToggleLocked={lockedToggleTaskId === task.id}
              liveSeconds={liveTotals[task.id] ?? task.totalTimeSeconds}
              onToggleTimer={onToggleTimer}
              onEdit={onEditTask}
              onOpenManualTime={onOpenManualTime}
              onOpenHistory={onOpenHistory}
              isDragInteractionActive={draggedTaskId !== null}
            />
          ))}

          <button
            type="button"
            onClick={onAddTask}
            className="flex min-h-[176px] items-center justify-center rounded-[1.75rem] border border-dashed border-ink/20 bg-white/45 p-4 text-base font-semibold text-ink/60 transition hover:border-ink/40 hover:bg-white/70 hover:text-ink sm:min-h-[220px] sm:p-6 sm:text-lg"
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
              isDragInteractionActive
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
