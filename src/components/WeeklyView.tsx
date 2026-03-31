import { getTagTone } from "../lib/tagStyles";
import type { Tag, Task, TaskSession } from "../types";
import { formatHoursMinutes, toDateKey, weekDays } from "../lib/time";
import { summarizeWeek } from "../lib/weekly";

interface WeeklyViewProps {
  tasks: Task[];
  tags: Tag[];
  sessions: TaskSession[];
  anchorDate: string;
  selectedTagIds: string[];
  onMoveWeek: (direction: -1 | 1) => void;
}

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function WeeklyView({
  tasks,
  tags,
  sessions,
  anchorDate,
  selectedTagIds,
  onMoveWeek,
}: WeeklyViewProps) {
  const summary = summarizeWeek(
    tasks,
    sessions,
    anchorDate,
    selectedTagIds,
    tags,
  );
  const dayDates = weekDays(anchorDate);
  const currentDay = toDateKey(new Date());

  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/70 p-5 shadow-card backdrop-blur sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-ink/45">
            Rapport hebdomadaire
          </p>
          <h2 className="mt-2 font-serif text-3xl text-ink">
            Temps passé par tâche et par jour
          </h2>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onMoveWeek(-1)}
            className="rounded-full border border-ink/10 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink/30"
          >
            ← Semaine précédente
          </button>
          <button
            type="button"
            onClick={() => onMoveWeek(1)}
            className="rounded-full border border-ink/10 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink/30"
          >
            Semaine suivante →
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[900px] rounded-[1.5rem] border border-ink/8 bg-white/70 p-3">
          <div className="grid grid-cols-[220px_repeat(7,minmax(110px,1fr))_140px] gap-3 rounded-[1.25rem] bg-mist/55 p-3 text-sm font-semibold text-ink/65">
            <div>Tâche</div>
            {dayDates.map((date) => {
              const dateKey = toDateKey(date);
              return (
                <div
                  key={dateKey}
                  className={[
                    "rounded-2xl px-3 py-2 text-center",
                    dateKey === currentDay ? "bg-coral/15 text-ink" : "",
                  ].join(" ")}
                >
                  {dayFormatter.format(date)}
                </div>
              );
            })}
            <div className="text-right">Total</div>
          </div>

          {summary.tasks.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-ink/55">
              Aucune donnée pour cette semaine avec les filtres actifs.
            </div>
          ) : (
            summary.tasks.map((taskSummary) => {
              const task = tasks.find(
                (candidate) => candidate.id === taskSummary.taskId,
              );
              const taskTags = tags.filter((tag) =>
                task?.tagIds.includes(tag.id),
              );

              return (
                <div
                  key={taskSummary.taskId}
                  className="grid grid-cols-[220px_repeat(7,minmax(110px,1fr))_140px] gap-3 border-t border-ink/8 px-3 py-4"
                >
                  <div>
                    <p className="font-semibold text-ink">
                      {taskSummary.taskName}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {taskTags.map((tag) => (
                        <span
                          key={tag.id}
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${getTagTone(tag.color).badge}`}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  {summary.days.map((day) => (
                    <div
                      key={day}
                      className="rounded-2xl bg-mist/45 px-3 py-4 text-center font-medium text-ink/72"
                    >
                      {taskSummary.byDay[day] === 0
                        ? "—"
                        : formatHoursMinutes(taskSummary.byDay[day])}
                    </div>
                  ))}
                  <div className="flex items-center justify-end text-right font-semibold text-ink">
                    {formatHoursMinutes(taskSummary.totalSeconds)}
                  </div>
                </div>
              );
            })
          )}

          <div className="grid grid-cols-[220px_repeat(7,minmax(110px,1fr))_140px] gap-3 border-t border-ink/10 px-3 py-4">
            <div className="font-semibold text-ink">Totaux</div>
            {summary.days.map((day) => (
              <div
                key={day}
                className="rounded-2xl bg-ink px-3 py-4 text-center font-semibold text-white"
              >
                {summary.totalsByDay[day] === 0
                  ? "0m"
                  : formatHoursMinutes(summary.totalsByDay[day])}
              </div>
            ))}
            <div className="flex items-center justify-end text-right text-lg font-semibold text-ink">
              {summary.totalSeconds === 0
                ? "0m"
                : formatHoursMinutes(summary.totalSeconds)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
