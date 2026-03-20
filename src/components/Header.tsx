import { CalendarRange, LayoutGrid, Tags, TimerReset } from "lucide-react";
import { getTagTone } from "../lib/tagStyles";
import type { Tag, ViewMode } from "../types";

interface HeaderProps {
  currentView: ViewMode;
  selectedTagIds: number[];
  tags: Tag[];
  onToggleView: () => void;
  onOpenTags: () => void;
  onSelectTag: (tagId: number) => void;
  onResetFilters: () => void;
}

export function Header({
  currentView,
  selectedTagIds,
  tags,
  onToggleView,
  onOpenTags,
  onSelectTag,
  onResetFilters,
}: HeaderProps) {
  return (
    <header className="rounded-[2rem] border border-white/60 bg-white/70 p-6 shadow-card backdrop-blur xl:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-ink/45">
            Time Tracker MVP
          </p>
          <h1 className="font-serif text-4xl text-ink sm:text-5xl">
            Suivi de temps clair et tactile
          </h1>
          <p className="text-base leading-7 text-ink/70 sm:text-lg">
            Un seul chrono actif, de gros boutons réorganisables, un filtre par
            tags et un rapport hebdomadaire lisible sur tablette, mobile et
            desktop.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onToggleView}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
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
            className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink/30"
          >
            <Tags size={18} />
            Gérer les tags
          </button>
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink/30"
          >
            <TimerReset size={18} />
            Réinitialiser les filtres
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {tags.length === 0 ? (
          <p className="rounded-full bg-ink/5 px-4 py-2 text-sm text-ink/55">
            Aucun tag pour le moment. Ajoutez-en pour filtrer vos tâches et vos
            rapports.
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
