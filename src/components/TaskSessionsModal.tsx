import { useEffect, useMemo, useState } from "react";
import type { SessionDraft, Task, TaskSession } from "../types";
import {
  formatDateTime,
  fromDateTimeLocalInputValue,
  toDateTimeLocalInputValue,
} from "../lib/time";

interface TaskSessionsModalProps {
  task: Task | null;
  sessions: TaskSession[];
  activeSessionId: string | null;
  isOpen: boolean;
  initialView: "manual" | "history";
  onClose: () => void;
  onCreate: (taskId: string, draft: SessionDraft) => void | Promise<void>;
  onUpdate: (sessionId: string, draft: SessionDraft) => void | Promise<void>;
  onDelete: (sessionId: string) => void | Promise<void>;
}

const emptyDraft: SessionDraft = {
  startTime: "",
  endTime: "",
};

export function TaskSessionsModal({
  task,
  sessions,
  activeSessionId,
  isOpen,
  initialView,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: TaskSessionsModalProps) {
  const [view, setView] = useState<"manual" | "history">(initialView);
  const [draft, setDraft] = useState<SessionDraft>(emptyDraft);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setView(initialView);
    setDraft(emptyDraft);
    setEditingSessionId(null);
  }, [initialView, isOpen]);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (left, right) =>
          new Date(right.startedAt).getTime() -
          new Date(left.startedAt).getTime(),
      ),
    [sessions],
  );

  if (!isOpen || !task) {
    return null;
  }

  const isValidDraft =
    draft.startTime !== "" &&
    draft.endTime !== "" &&
    new Date(draft.endTime).getTime() > new Date(draft.startTime).getTime();

  const submitDraft = () => {
    if (!isValidDraft) {
      return;
    }

    const payload = {
      startTime: fromDateTimeLocalInputValue(draft.startTime),
      endTime: fromDateTimeLocalInputValue(draft.endTime),
    };

    if (editingSessionId !== null) {
      onUpdate(editingSessionId, payload);
    } else {
      onCreate(task.id, payload);
    }

    setDraft(emptyDraft);
    setEditingSessionId(null);
    setView("history");
  };

  const beginEdit = (session: TaskSession) => {
    setEditingSessionId(session.id);
    setView("manual");
    setDraft({
      startTime: toDateTimeLocalInputValue(session.startedAt),
      endTime: toDateTimeLocalInputValue(session.endedAt ?? session.startedAt),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Temps et historique pour ${task.name}`}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-white shadow-card lg:max-w-5xl">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 border-b border-ink/10 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45 sm:text-sm">
                Sessions
              </p>
              <h2 className="mt-1 truncate font-serif text-xl text-ink sm:mt-2 sm:text-3xl">
                {task.name}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setView("manual")}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-sm",
                  view === "manual"
                    ? "bg-ink text-white"
                    : "border border-ink/10 text-ink/65 hover:border-ink/30 hover:text-ink",
                ].join(" ")}
              >
                Temps manuel
              </button>
              <button
                type="button"
                onClick={() => setView("history")}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-sm",
                  view === "history"
                    ? "bg-ink text-white"
                    : "border border-ink/10 text-ink/65 hover:border-ink/30 hover:text-ink",
                ].join(" ")}
              >
                Historique
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/60 transition hover:border-ink/30 hover:text-ink sm:px-4 sm:py-2 sm:text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:grid lg:grid-cols-[320px_1fr]">
          <aside
            className={[
              "border-b border-ink/10 bg-mist/35 p-4 sm:p-6 lg:border-b-0 lg:border-r lg:p-8",
              view !== "manual" ? "hidden lg:block" : "",
            ].join(" ")}
          >
            <div className="space-y-4 sm:space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-ink">
                  {editingSessionId === null
                    ? "Ajouter du temps"
                    : "Modifier la session"}
                </h3>
                <p className="mt-1 text-sm text-ink/60">
                  Les sessions qui traversent minuit restent affectées au jour
                  de début.
                </p>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink">Début</span>
                <input
                  aria-label="Début de session"
                  type="datetime-local"
                  value={draft.startTime}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      startTime: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-coral"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink">Fin</span>
                <input
                  aria-label="Fin de session"
                  type="datetime-local"
                  value={draft.endTime}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      endTime: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-coral"
                />
              </label>

              {!isValidDraft &&
              draft.startTime !== "" &&
              draft.endTime !== "" ? (
                <p className="text-sm font-medium text-red-600">
                  La fin doit être strictement après le début.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={submitDraft}
                  disabled={!isValidDraft}
                  className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/30"
                >
                  {editingSessionId === null
                    ? "Ajouter la session"
                    : "Enregistrer la session"}
                </button>

                {editingSessionId !== null ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSessionId(null);
                      setDraft(emptyDraft);
                    }}
                    className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink/60 transition hover:border-ink/30 hover:text-ink"
                  >
                    Annuler l’édition
                  </button>
                ) : null}
              </div>
            </div>
          </aside>

          <section
            className={[
              "overflow-y-auto p-4 sm:p-6 lg:p-8",
              view !== "history" ? "hidden lg:block" : "",
            ].join(" ")}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-ink">
                  Historique des sessions
                </h3>
                <p className="mt-1 text-sm text-ink/60">
                  {sortedSessions.length === 0
                    ? "Aucune session pour cette tâche pour le moment."
                    : `${sortedSessions.length} session${sortedSessions.length > 1 ? "s" : ""} enregistrée${sortedSessions.length > 1 ? "s" : ""}.`}
                </p>
              </div>
            </div>

            <div className="space-y-4 pb-4 sm:pb-0">
              {sortedSessions.map((session) => {
                const durationSeconds = session.segments.reduce(
                  (sum, segment) => sum + segment.durationSeconds,
                  0,
                );
                const isActiveSession = activeSessionId === session.id;

                return (
                  <article
                    key={session.id}
                    className="rounded-[1.75rem] border border-ink/10 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                            {session.origin === "manual" ? "Manuel" : "Chrono"}
                          </span>
                          {isActiveSession ? (
                            <span className="rounded-full bg-mint/35 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink">
                              Active
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-base font-semibold text-ink">
                          {formatDateTime(session.startedAt)}
                          {session.endedAt
                            ? ` → ${formatDateTime(session.endedAt)}`
                            : " → En cours"}
                        </p>
                        <p className="mt-1 text-sm text-ink/60">
                          {Math.floor(durationSeconds / 3600)}h{" "}
                          {(Math.floor(durationSeconds / 60) % 60)
                            .toString()
                            .padStart(2, "0")}
                          m
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => beginEdit(session)}
                          disabled={isActiveSession}
                          className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/65 transition hover:border-ink/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(session.id)}
                          disabled={isActiveSession}
                          className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-5 xl:grid-cols-2">
                      <div>
                        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink/45">
                          Segments
                        </h4>
                        <div className="mt-3 space-y-2">
                          {session.segments.length === 0 ? (
                            <p className="text-sm text-ink/55">
                              Aucun segment finalisé.
                            </p>
                          ) : (
                            session.segments.map((segment) => (
                              <div
                                key={segment.id}
                                className="rounded-2xl bg-mist/45 px-4 py-3 text-sm text-ink/70"
                              >
                                <p>{formatDateTime(segment.startTime)}</p>
                                <p>{formatDateTime(segment.endTime)}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink/45">
                          Audit
                        </h4>
                        <div className="mt-3 space-y-2">
                          {session.auditEvents.map((event) => (
                            <div
                              key={event.id}
                              className="rounded-2xl bg-mist/45 px-4 py-3 text-sm text-ink/70"
                            >
                              <p className="font-semibold text-ink">
                                {formatDateTime(event.at)}
                              </p>
                              <p className="mt-1">{event.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Bottom padding to avoid keyboard covering content */}
            <div className="h-4 sm:h-0" />
          </section>
        </div>
      </div>
    </div>
  );
}
