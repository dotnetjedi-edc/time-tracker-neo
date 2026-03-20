import { useEffect, useMemo, useState } from "react";
import type { Task, TaskDraft } from "./types";
import { Header } from "./components/Header";
import { TaskGrid } from "./components/TaskGrid";
import { TaskModal } from "./components/TaskModal";
import { TaskSessionsModal } from "./components/TaskSessionsModal";
import { TagsModal } from "./components/TagsModal";
import { WeeklyView } from "./components/WeeklyView";
import { differenceInSeconds, formatDateTime } from "./lib/time";
import { useTimeTrackerStore } from "./store/useTimeTrackerStore";

export default function App() {
  const tasks = useTimeTrackerStore((state) => state.tasks);
  const tags = useTimeTrackerStore((state) => state.tags);
  const sessions = useTimeTrackerStore((state) => state.sessions);
  const activeTimer = useTimeTrackerStore((state) => state.activeTimer);
  const selectedTagIds = useTimeTrackerStore((state) => state.selectedTagIds);
  const currentView = useTimeTrackerStore((state) => state.currentView);
  const reportAnchor = useTimeTrackerStore((state) => state.reportAnchor);
  const addTask = useTimeTrackerStore((state) => state.addTask);
  const updateTask = useTimeTrackerStore((state) => state.updateTask);
  const deleteTask = useTimeTrackerStore((state) => state.deleteTask);
  const setTaskOrder = useTimeTrackerStore((state) => state.setTaskOrder);
  const toggleTimer = useTimeTrackerStore((state) => state.toggleTimer);
  const addManualSession = useTimeTrackerStore((state) => state.addManualSession);
  const updateSession = useTimeTrackerStore((state) => state.updateSession);
  const deleteSession = useTimeTrackerStore((state) => state.deleteSession);
  const addTag = useTimeTrackerStore((state) => state.addTag);
  const updateTag = useTimeTrackerStore((state) => state.updateTag);
  const deleteTag = useTimeTrackerStore((state) => state.deleteTag);
  const stopTimer = useTimeTrackerStore((state) => state.stopTimer);
  const setSelectedTagIds = useTimeTrackerStore(
    (state) => state.setSelectedTagIds,
  );
  const setCurrentView = useTimeTrackerStore((state) => state.setCurrentView);
  const moveReportWeek = useTimeTrackerStore((state) => state.moveReportWeek);
  const resetFilters = useTimeTrackerStore((state) => state.resetFilters);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [tagsModalOpen, setTagsModalOpen] = useState(false);
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sessionTask, setSessionTask] = useState<Task | null>(null);
  const [sessionsModalView, setSessionsModalView] = useState<"manual" | "history">("manual");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const filteredTasks = useMemo(() => {
    const ordered = [...tasks].sort(
      (left, right) => left.position - right.position,
    );
    if (selectedTagIds.length === 0) {
      return ordered;
    }

    return ordered.filter((task) =>
      selectedTagIds.every((tagId) => task.tagIds.includes(tagId)),
    );
  }, [selectedTagIds, tasks]);

  const liveTotals = useMemo(() => {
    return Object.fromEntries(
      tasks.map((task) => {
        if (activeTimer?.taskId !== task.id) {
          return [task.id, task.totalTimeSeconds];
        }

        return [
          task.id,
          task.totalTimeSeconds +
            differenceInSeconds(
              activeTimer.segmentStartTime,
              new Date(now).toISOString(),
            ),
        ];
      }),
    );
  }, [activeTimer, now, tasks]);

  const activeTask = useMemo(
    () =>
      activeTimer
        ? tasks.find((task) => task.id === activeTimer.taskId) ?? null
        : null,
    [activeTimer, tasks],
  );

  const activeTimerSession = useMemo(
    () =>
      activeTimer
        ? sessions.find((session) => session.id === activeTimer.sessionId) ?? null
        : null,
    [activeTimer, sessions],
  );

  const activeTimerSummary = useMemo(() => {
    if (!activeTimer) {
      return null;
    }

    const sessionEvent = activeTimerSession?.auditEvents
      .slice()
      .reverse()
      .find((event) => event.at === activeTimer.updatedAt);

    const contextLabel =
      sessionEvent?.type === "resumed"
        ? "Relancé à"
        : sessionEvent?.type === "started"
          ? "Démarré à"
          : "Actif depuis";

    return {
      taskName: activeTask?.name ?? "Tâche active",
      elapsedSeconds: differenceInSeconds(
        activeTimer.segmentStartTime,
        new Date(now).toISOString(),
      ),
      context: `${contextLabel} ${formatDateTime(activeTimer.updatedAt)}`,
    };
  }, [activeTask, activeTimer, activeTimerSession, now]);

  const handleSaveTask = (draft: TaskDraft) => {
    if (editingTask) {
      updateTask(editingTask.id, draft);
      return;
    }

    addTask(draft);
  };

  const toggleSelectedTag = (tagId: number) => {
    setSelectedTagIds(
      selectedTagIds.includes(tagId)
        ? selectedTagIds.filter((currentTagId) => currentTagId !== tagId)
        : [...selectedTagIds, tagId],
    );
  };

  const openSessionsModal = (task: Task, view: "manual" | "history") => {
    setSessionTask(task);
    setSessionsModalView(view);
    setSessionsModalOpen(true);
  };

  const taskSessions = sessionTask
    ? sessions.filter((session) => session.taskId === sessionTask.id)
    : [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,136,91,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(110,214,181,0.2),_transparent_25%),linear-gradient(180deg,_#f7f0e5_0%,_#f2f4f7_100%)] text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-[1700px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Header
          currentView={currentView}
          selectedTagIds={selectedTagIds}
          tags={tags}
          activeTimer={activeTimerSummary}
          onToggleView={() =>
            setCurrentView(currentView === "grid" ? "week" : "grid")
          }
          onOpenTags={() => setTagsModalOpen(true)}
          onSelectTag={toggleSelectedTag}
          onResetFilters={resetFilters}
          onStopActiveTimer={() => stopTimer(new Date().toISOString())}
        />

        <main className="space-y-8">
          {currentView === "grid" ? (
            <TaskGrid
              tasks={filteredTasks}
              tags={tags}
              activeTaskId={activeTimer?.taskId ?? null}
              liveTotals={liveTotals}
              onToggleTimer={toggleTimer}
              onEditTask={(task) => {
                setEditingTask(task);
                setTaskModalOpen(true);
              }}
              onOpenManualTime={(task) => openSessionsModal(task, "manual")}
              onOpenHistory={(task) => openSessionsModal(task, "history")}
              onAddTask={() => {
                setEditingTask(null);
                setTaskModalOpen(true);
              }}
              onReorder={setTaskOrder}
            />
          ) : (
            <WeeklyView
              tasks={tasks}
              tags={tags}
              sessions={sessions}
              anchorDate={reportAnchor}
              selectedTagIds={selectedTagIds}
              onMoveWeek={moveReportWeek}
            />
          )}
        </main>
      </div>

      <TaskModal
        mode={editingTask ? "edit" : "create"}
        task={editingTask}
        tags={tags}
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={
          editingTask
            ? () => {
                deleteTask(editingTask.id);
                setTaskModalOpen(false);
                setEditingTask(null);
              }
            : undefined
        }
      />

      <TagsModal
        isOpen={tagsModalOpen}
        tags={tags}
        onClose={() => setTagsModalOpen(false)}
        onCreate={addTag}
        onUpdate={(tagId, name, color) => updateTag(tagId, { name, color })}
        onDelete={deleteTag}
      />

      <TaskSessionsModal
        task={sessionTask}
        sessions={taskSessions}
        activeSessionId={activeTimer?.sessionId ?? null}
        isOpen={sessionsModalOpen}
        initialView={sessionsModalView}
        onClose={() => {
          setSessionsModalOpen(false);
          setSessionTask(null);
        }}
        onCreate={addManualSession}
        onUpdate={updateSession}
        onDelete={deleteSession}
      />
    </div>
  );
}
