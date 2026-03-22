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
  selectedTagIds: string[];
  tags: Tag[];
  activeTimer: ActiveTimerSummary | null;
  onToggleView: () => void;
  onOpenTags: () => void;
  onSelectTag: (tagId: string) => void;
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
  const activeLabel = activeTimer?.taskName ?? "Aucun chrono actif";
  const activeContext =
    activeTimer?.context ??
    "Le bandeau reste stable tant qu’aucun chrono n’est lancé.";

  return (
    <header className="rounded-[1.5rem] border border-white/60 bg-white/75 px-3 py-3 shadow-card backdrop-blur sm:px-4 sm:py-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-h-[78px] overflow-hidden rounded-[1.25rem] border border-mint/35 bg-gradient-to-r from-mint/25 via-white/90 to-gold/20 px-3 py-2.5">
          <div className="flex h-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-ink px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                <Square size={10} />
                {activeTimer ? "Chrono actif" : "Chrono inactif"}
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-ink sm:mt-2 sm:text-base">
                {activeLabel}
              </p>
              <p className="truncate text-xs text-ink/60">{activeContext}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:gap-1.5">
              <p className="font-mono text-lg font-semibold tracking-tight text-ink sm:text-2xl">
                {activeTimer
                  ? formatClock(activeTimer.elapsedSeconds)
                  : "--:--:--"}
              </p>
              <button
                type="button"
                onClick={onStopActiveTimer}
                disabled={!activeTimer}
                aria-label="Arrêter le chrono actif"
                className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/25 sm:py-2"
              >
                <Square size={14} />
                <span className="hidden sm:inline">
                  Arrêter le chrono actif
                </span>
                <span className="sm:hidden">Stop</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <button
            type="button"
            onClick={onToggleView}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-2 text-xs font-semibold text-white transition hover:bg-ink/90 sm:px-4 sm:text-sm"
          >
            {currentView === "grid" ? (
              <CalendarRange size={16} />
            ) : (
              <LayoutGrid size={16} />
            )}
            {currentView === "grid" ? "Vue calendrier" : "Vue grille"}
          </button>
          <button
            type="button"
            onClick={onOpenTags}
            className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-ink/30 sm:px-4 sm:text-sm"
          >
            <Tags size={16} />
            Gérer les tags
          </button>
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-ink/30 sm:px-4 sm:text-sm"
          >
            <TimerReset size={16} />
            Réinitialiser les filtres
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/45">
          Filtres
        </span>
        {tags.length === 0 ? (
          <p className="rounded-full bg-ink/5 px-3 py-1.5 text-xs text-ink/55 sm:text-sm">
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
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-sm",
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
