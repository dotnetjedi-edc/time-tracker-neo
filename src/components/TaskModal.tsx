import { useEffect, useState } from "react";
import { getTagTone } from "../lib/tagStyles";
import type { Tag, Task, TaskDraft } from "../types";

interface TaskModalProps {
  mode: "create" | "edit";
  task: Task | null;
  tags: Tag[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (draft: TaskDraft) => void;
  onDelete?: () => void;
}

const emptyDraft: TaskDraft = {
  name: "",
  comment: "",
  tagIds: [],
};

export function TaskModal({
  mode,
  task,
  tags,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: TaskModalProps) {
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDraft(
      task
        ? { name: task.name, comment: task.comment ?? "", tagIds: task.tagIds }
        : { ...emptyDraft },
    );
  }, [isOpen, task]);

  if (!isOpen) {
    return null;
  }

  const title = mode === "create" ? "Nouvelle tâche" : "Modifier la tâche";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-2xl max-h-[90vh] rounded-[2rem] bg-white shadow-card flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 border-b border-ink/10 px-6 py-4 sm:py-5 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/45">
                Tâche
              </p>
              <h2 className="mt-2 font-serif text-3xl text-ink">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/60 transition hover:border-ink/30 hover:text-ink flex-shrink-0"
            >
              Fermer
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
          <div className="space-y-6">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Nom</span>
              <input
                aria-label="Nom de la tâche"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-ink/10 bg-mist/60 px-4 py-3 text-base text-ink outline-none transition focus:border-coral"
                placeholder="Ex. Écriture, Admin, Lecture"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">
                Commentaire
              </span>
              <textarea
                aria-label="Commentaire de la tâche"
                value={draft.comment}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    comment: event.target.value,
                  }))
                }
                rows={4}
                className="w-full rounded-2xl border border-ink/10 bg-mist/60 px-4 py-3 text-base text-ink outline-none transition focus:border-coral"
                placeholder="Contexte, objectif, précision utile"
              />
            </label>

            <div className="space-y-3">
              <span className="text-sm font-semibold text-ink">Tags</span>
              <div className="flex flex-wrap gap-3">
                {tags.length === 0 ? (
                  <p className="text-sm text-ink/55">
                    Créez un tag depuis le panneau dédié pour l’assigner.
                  </p>
                ) : (
                  tags.map((tag) => {
                    const selected = draft.tagIds.includes(tag.id);
                    const tone = getTagTone(tag.color);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            tagIds: selected
                              ? current.tagIds.filter(
                                  (tagId) => tagId !== tag.id,
                                )
                              : [...current.tagIds, tag.id],
                          }))
                        }
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
            </div>

            {/* Bottom padding to avoid keyboard covering content */}
            <div className="h-4 sm:h-0" />
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="flex-shrink-0 border-t border-ink/10 px-6 py-4 sm:py-5 bg-white sticky bottom-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {mode === "edit" && onDelete ? (
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Supprimer la tâche
                </button>
              ) : null}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink/60 transition hover:border-ink/30 hover:text-ink"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  onSave(draft);
                  onClose();
                }}
                className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
              >
                {mode === "create" ? "Créer la tâche" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
