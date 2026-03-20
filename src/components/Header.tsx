import {
  CalendarRange,
  LayoutGrid,
  Square,
  Tags,
  TimerReset,
} from "lucide-react";
import { formatClock } from "../lib/time";
import { getTagTone } from "../lib/tagStyles";
import type { Tag, ViewMode } from "../types";

interface ActiveTimerSummary {
  taskName: string;
  elapsedSeconds: number;
  context: string;
}

interface HeaderProps {
  currentView: ViewMode;
  selectedTagIds: number[];
  tags: Tag[];
  activeTimer: ActiveTimerSummary | null;
  onToggleView: () => void;
  onOpenTags: () => void;
  onSelectTag: (tagId: number) => void;
  onResetFilters: () => void;
  onStopActiveTimer: () => void;
}

export function Header({
  currentView,
  selectedTagIds,
  tags,
  activeTimer,
  onToggleView,
  onOpenTags,
  onSelectTag,
  onResetFilters,
  onStopActiveTimer,
}: HeaderProps) {
  return (
    <header className="rounded-[1.75rem] border border-white/60 bg-white/75 p-4 shadow-card backdrop-blur sm:p-5">
      {activeTimer ? (
        <div className="mb-4 flex flex-col gap-3 rounded-[1.4rem] border border-mint/40 bg-gradient-to-r from-mint/30 via-white/95 to-gold/20 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
              <Square size={12} />
              Chrono actif
            </div>
            <div>
              <p className="text-base font-semibold text-ink sm:text-lg">
                {activeTimer.taskName}
              </p>
              <p className="text-xs text-ink/60 sm:text-sm">
                {activeTimer.context}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <p className="font-mono text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {formatClock(activeTimer.elapsedSeconds)}
            </p>
            <button
              type="button"
              onClick={onStopActiveTimer}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/90"
            >
              <Square size={16} />
              Arrêter le chrono actif
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-ink/45 sm:text-xs">
            Workspace temps
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="font-serif text-[2rem] leading-none text-ink sm:text-[2.4rem]">
              Suivi compact, actions directes
            </h1>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-ink/10 bg-white/75 px-3 py-1 text-xs font-semibold text-ink/55">
              {currentView === "grid" ? (
                <LayoutGrid size={14} />
              ) : (
                <CalendarRange size={14} />
              )}
              {currentView === "grid" ? "Mode grille" : "Mode calendrier"}
            </span>
          </div>
          <p className="max-w-xl text-sm leading-6 text-ink/68 sm:text-[15px]">
            Le chrono, les filtres et les changements de vue restent visibles,
            avec un en-tête plus bas pour libérer l’espace de travail.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onToggleView}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/90"
          >
            {currentView === "grid" ? (
              <CalendarRange size={18} />
            ) : (
              <LayoutGrid size={18} />
            )}
            {currentView === "grid" ? "Vue calendrier" : "Vue grille"}
          </button>
          <button
            type="button"
            onClick={onOpenTags}
            className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-ink/30"
          >
            <Tags size={18} />
            Gérer les tags
          </button>
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-ink/30"
          >
            <TimerReset size={18} />
            Réinitialiser les filtres
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
          Filtres
        </span>
        {tags.length === 0 ? (
          <p className="rounded-full bg-ink/5 px-4 py-2 text-sm text-ink/55">
            Aucun tag pour le moment.
          </p>
        ) : (
          tags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);
            const tone = getTagTone(tag.color);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onSelectTag(tag.id)}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-semibold transition",
                  selected ? tone.chipSelected : tone.chip,
                ].join(" ")}
              >
                {tag.name}
              </button>
            );
          })
        )}
      </div>
    </header>
  );
}
