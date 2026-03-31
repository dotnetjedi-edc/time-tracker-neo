import { useEffect, useMemo, useRef, useState } from "react";
import type { SessionDraft, Task, TaskSession } from "../types";
import {
  formatDateTime,
  formatHourMinute,
  toDateInputValue,
  toIsoFromDateAndTimeParts,
  toTimeParts,
} from "../lib/time";
import { TimeDialPicker } from "./TimeDialPicker";

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

type PickerTarget = "start" | "end";
type PickerMode = "hour" | "minute";

interface ManualFieldDraft {
  date: string;
  hour: number | null;
  minute: number | null;
}

interface ManualSessionDraft {
  start: ManualFieldDraft;
  end: ManualFieldDraft;
}

const createEmptyFieldDraft = (): ManualFieldDraft => ({
  date: toDateInputValue(new Date().toISOString()),
  hour: null,
  minute: null,
});

const createEmptyManualDraft = (): ManualSessionDraft => ({
  start: createEmptyFieldDraft(),
  end: createEmptyFieldDraft(),
});

const draftFromSession = (session: TaskSession): ManualSessionDraft => {
  const start = toTimeParts(session.startedAt);
  const end = toTimeParts(session.endedAt ?? session.startedAt);

  return {
    start: {
      date: toDateInputValue(session.startedAt),
      hour: start.hour,
      minute: start.minute,
    },
    end: {
      date: toDateInputValue(session.endedAt ?? session.startedAt),
      hour: end.hour,
      minute: end.minute,
    },
  };
};

const isCompleteField = (field: ManualFieldDraft): boolean =>
  field.date !== "" && field.hour !== null && field.minute !== null;

const toSessionDraft = (draft: ManualSessionDraft): SessionDraft | null => {
  if (!isCompleteField(draft.start) || !isCompleteField(draft.end)) {
    return null;
  }

  return {
    startTime: toIsoFromDateAndTimeParts(
      draft.start.date,
      draft.start.hour,
      draft.start.minute,
    ),
    endTime: toIsoFromDateAndTimeParts(
      draft.end.date,
      draft.end.hour,
      draft.end.minute,
    ),
  };
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
  const [draft, setDraft] = useState<ManualSessionDraft>(
    createEmptyManualDraft,
  );
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pickerMode, setPickerMode] = useState<PickerMode>("hour");
  const activePickerContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setView(initialView);
    setDraft(createEmptyManualDraft());
    setEditingSessionId(null);
    setPickerTarget(null);
    setPickerMode("hour");
  }, [initialView, isOpen]);

  useEffect(() => {
    if (pickerTarget === null) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const container = activePickerContainerRef.current;
      if (!container) {
        return;
      }

      if (!container.contains(event.target as Node)) {
        setPickerTarget(null);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPickerTarget(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [pickerTarget]);

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

  const sessionDraft = toSessionDraft(draft);
  const isValidDraft =
    sessionDraft !== null &&
    new Date(sessionDraft.endTime).getTime() >
      new Date(sessionDraft.startTime).getTime();

  const activeField = pickerTarget === null ? null : draft[pickerTarget];
  const pickerHour = activeField?.hour ?? 9;
  const pickerMinute = activeField?.minute ?? 0;

  const updateField = (
    target: PickerTarget,
    updater: (current: ManualFieldDraft) => ManualFieldDraft,
  ) => {
    setDraft((current) => ({
      ...current,
      [target]: updater(current[target]),
    }));
  };

  const submitDraft = () => {
    if (!isValidDraft || !sessionDraft) {
      return;
    }

    if (editingSessionId !== null) {
      onUpdate(editingSessionId, sessionDraft);
    } else {
      onCreate(task.id, sessionDraft);
    }

    setDraft(createEmptyManualDraft());
    setEditingSessionId(null);
    setView("history");
    setPickerTarget(null);
    setPickerMode("hour");
  };

  const beginEdit = (session: TaskSession) => {
    setEditingSessionId(session.id);
    setView("manual");
    setDraft(draftFromSession(session));
    setPickerTarget(null);
    setPickerMode("hour");
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
                onClick={() => {
                  setView("manual");
                }}
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
                onClick={() => {
                  setView("history");
                  setPickerTarget(null);
                }}
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
                  Choisissez la date puis l’heure rapidement avec le cadran 24h.
                </p>
              </div>

              {(
                [
                  ["start", "Début", "Date de début", "Heure de début"],
                  ["end", "Fin", "Date de fin", "Heure de fin"],
                ] as const
              ).map(([target, title, dateLabel, timeLabel]) => {
                const field = draft[target];
                const isActive = pickerTarget === target;

                return (
                  <div
                    key={target}
                    className={[
                      "space-y-3 rounded-[1.5rem] border px-4 py-4 transition",
                      isActive
                        ? "border-coral bg-coral/5"
                        : "border-ink/10 bg-white/75",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-ink">
                        {title}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPickerTarget(target);
                          setPickerMode("hour");
                        }}
                        className="rounded-full border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/65 transition hover:border-ink/30 hover:text-ink"
                      >
                        {isActive ? "Cadran actif" : "Ouvrir le cadran"}
                      </button>
                    </div>

                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-ink/70">
                        {dateLabel}
                      </span>
                      <input
                        aria-label={dateLabel}
                        type="date"
                        value={field.date}
                        onChange={(event) =>
                          updateField(target, (current) => ({
                            ...current,
                            date: event.target.value,
                          }))
                        }
                        onFocus={() => {
                          setPickerTarget(null);
                        }}
                        className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-coral"
                      />
                    </label>

                    <div
                      ref={isActive ? activePickerContainerRef : null}
                      className="relative"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          aria-label={timeLabel}
                          onClick={() => {
                            setPickerTarget(target);
                            setPickerMode("hour");
                          }}
                          className="min-w-[8rem] flex-1 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-left font-mono text-2xl font-semibold text-ink transition hover:border-ink/30"
                        >
                          {field.hour === null || field.minute === null
                            ? "--:--"
                            : formatHourMinute(field.hour, field.minute)}
                        </button>
                        <span className="text-sm font-semibold uppercase tracking-[0.14em] text-ink/35">
                          24h
                        </span>
                        <div className="ml-auto flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPickerTarget(target);
                              setPickerMode("hour");
                            }}
                            className={[
                              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                              isActive && pickerMode === "hour"
                                ? "bg-ink text-white"
                                : "border border-ink/10 text-ink/65 hover:border-ink/30 hover:text-ink",
                            ].join(" ")}
                          >
                            Heure
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPickerTarget(target);
                              setPickerMode("minute");
                            }}
                            className={[
                              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                              isActive && pickerMode === "minute"
                                ? "bg-ink text-white"
                                : "border border-ink/10 text-ink/65 hover:border-ink/30 hover:text-ink",
                            ].join(" ")}
                          >
                            Minute
                          </button>
                        </div>
                      </div>

                      {isActive ? (
                        <div className="absolute left-0 right-0 top-full z-20 mt-3 lg:left-[calc(100%+0.75rem)] lg:right-auto lg:top-1/2 lg:mt-0 lg:w-[19rem] lg:-translate-y-1/2">
                          <TimeDialPicker
                            label={
                              target === "start"
                                ? "Sélecteur de temps du début"
                                : "Sélecteur de temps de fin"
                            }
                            hour={pickerHour}
                            minute={pickerMinute}
                            mode={pickerMode}
                            compact
                            onModeChange={setPickerMode}
                            onHourChange={(hour) =>
                              updateField(target, (current) => ({
                                ...current,
                                hour,
                                minute: current.minute ?? 0,
                              }))
                            }
                            onMinuteChange={(minute) =>
                              updateField(target, (current) => ({
                                ...current,
                                hour: current.hour ?? 9,
                                minute,
                              }))
                            }
                            onConfirm={() => {
                              setPickerTarget(null);
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {!isValidDraft && sessionDraft !== null ? (
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
                      setDraft(createEmptyManualDraft());
                      setPickerTarget(null);
                      setPickerMode("hour");
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
