import {
  ClerkLoaded,
  ClerkLoading,
  SignIn,
  SignedIn,
  SignedOut,
  useAuth,
} from "@clerk/clerk-react";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import type { Task, TaskDraft } from "./types";
import { Header } from "./components/Header";
import { TaskGrid } from "./components/TaskGrid";
import { TaskModal } from "./components/TaskModal";
import { TaskSessionsModal } from "./components/TaskSessionsModal";
import { TagsModal } from "./components/TagsModal";
import { WeeklyView } from "./components/WeeklyView";
import { createTimeTrackerApiClient } from "./lib/api";
import { differenceInSeconds, formatDateTime } from "./lib/time";
import { useTimeTrackerStore } from "./store/useTimeTrackerStore";

function AuthenticatedWorkspace() {
  const { getToken, isLoaded, userId } = useAuth();
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
  const addManualSession = useTimeTrackerStore(
    (state) => state.addManualSession,
  );
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
  const initialize = useTimeTrackerStore((state) => state.initialize);
  const reloadWorkspace = useTimeTrackerStore((state) => state.reloadWorkspace);
  const clearWorkspace = useTimeTrackerStore((state) => state.clearWorkspace);
  const dismissError = useTimeTrackerStore((state) => state.dismissError);
  const isLoading = useTimeTrackerStore((state) => state.isLoading);
  const isInitialized = useTimeTrackerStore((state) => state.isInitialized);
  const lastError = useTimeTrackerStore((state) => state.lastError);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [tagsModalOpen, setTagsModalOpen] = useState(false);
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sessionTask, setSessionTask] = useState<Task | null>(null);
  const [sessionsModalView, setSessionsModalView] = useState<
    "manual" | "history"
  >("manual");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const initializeWorkspace = useEffectEvent(async () => {
    await initialize(createTimeTrackerApiClient(getToken));
  });

  useEffect(() => {
    if (!isLoaded || !userId) {
      return;
    }

    void initializeWorkspace();

    return () => {
      clearWorkspace();
    };
  }, [clearWorkspace, isLoaded, userId]);

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

  const liveTotals = useMemo<Record<string, number>>(() => {
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
        ? (tasks.find((task) => task.id === activeTimer.taskId) ?? null)
        : null,
    [activeTimer, tasks],
  );

  const activeTimerSession = useMemo(
    () =>
      activeTimer
        ? (sessions.find((session) => session.id === activeTimer.sessionId) ??
          null)
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
      void updateTask(editingTask.id, draft);
      return;
    }

    void addTask(draft);
  };

  const toggleSelectedTag = (tagId: string) => {
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

  if (isLoading && !isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(255,136,91,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(110,214,181,0.2),_transparent_25%),linear-gradient(180deg,_#f7f0e5_0%,_#f2f4f7_100%)] px-6 text-ink">
        <div className="rounded-[2rem] border border-white/60 bg-white/80 px-8 py-10 text-center shadow-card backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/45">
            Synchronisation
          </p>
          <h1 className="mt-3 font-serif text-3xl text-ink">
            Chargement de votre espace
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            Les tâches, tags, sessions et le chrono actif sont chargés depuis
            l’API.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,136,91,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(110,214,181,0.2),_transparent_25%),linear-gradient(180deg,_#f7f0e5_0%,_#f2f4f7_100%)] text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-[1700px] flex-col gap-5 px-3 py-4 sm:gap-6 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
        {lastError ? (
          <div className="rounded-[1.25rem] border border-red-200 bg-white/90 px-4 py-3 text-sm text-red-700 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>{lastError}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void reloadWorkspace()}
                  className="rounded-full border border-red-200 px-4 py-2 font-semibold text-red-700 transition hover:bg-red-50"
                >
                  Réessayer
                </button>
                <button
                  type="button"
                  onClick={dismissError}
                  className="rounded-full border border-ink/10 px-4 py-2 font-semibold text-ink/65 transition hover:border-ink/30 hover:text-ink"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        ) : null}

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
          onStopActiveTimer={() => void stopTimer(new Date().toISOString())}
        />

        <main className="space-y-6">
          {currentView === "grid" ? (
            <TaskGrid
              tasks={filteredTasks}
              tags={tags}
              activeTaskId={activeTimer?.taskId ?? null}
              liveTotals={liveTotals}
              onToggleTimer={(taskId) => void toggleTimer(taskId)}
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
              onReorder={(taskIds) => void setTaskOrder(taskIds)}
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
                void deleteTask(editingTask.id);
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
        onCreate={(name, color) => void addTag(name, color)}
        onUpdate={(tagId, name, color) =>
          void updateTag(tagId, { name, color })
        }
        onDelete={(tagId) => void deleteTag(tagId)}
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
        onCreate={(taskId, draft) => void addManualSession(taskId, draft)}
        onUpdate={(sessionId, draft) => void updateSession(sessionId, draft)}
        onDelete={(sessionId) => void deleteSession(sessionId)}
      />
    </div>
  );
}

function SignedOutScreen() {
  const clearWorkspace = useTimeTrackerStore((state) => state.clearWorkspace);

  useEffect(() => {
    clearWorkspace();
  }, [clearWorkspace]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(255,136,91,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(110,214,181,0.2),_transparent_25%),linear-gradient(180deg,_#f7f0e5_0%,_#f2f4f7_100%)] px-4 py-10 text-ink">
      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/60 bg-white/82 shadow-card backdrop-blur lg:grid lg:grid-cols-[1.1fr_0.9fr]">
        <section className="border-b border-ink/8 px-6 py-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-ink/45">
            Time Tracker
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-ink sm:text-5xl">
            Suivi de temps synchronisé, sans friction.
          </h1>
          <p className="mt-4 max-w-xl text-base text-ink/65 sm:text-lg">
            Connectez-vous pour récupérer vos tâches, vos tags, votre historique
            de sessions et votre chrono actif depuis l’API sécurisée.
          </p>
        </section>
        <section className="bg-mist/35 px-6 py-8 lg:px-10 lg:py-12">
          <SignIn routing="hash" />
        </section>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ClerkLoading>
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(255,136,91,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(110,214,181,0.2),_transparent_25%),linear-gradient(180deg,_#f7f0e5_0%,_#f2f4f7_100%)] px-6 text-ink">
          <p className="rounded-full border border-white/60 bg-white/80 px-5 py-3 text-sm font-semibold shadow-card backdrop-blur">
            Initialisation de l’authentification…
          </p>
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <SignedIn>
          <AuthenticatedWorkspace />
        </SignedIn>
        <SignedOut>
          <SignedOutScreen />
        </SignedOut>
      </ClerkLoaded>
    </>
  );
}
