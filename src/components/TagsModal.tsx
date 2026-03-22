import { useState } from "react";
import { getTagTone, tagPalette } from "../lib/tagStyles";
import type { Tag } from "../types";

interface TagsModalProps {
  isOpen: boolean;
  tags: Tag[];
  onClose: () => void;
  onCreate: (name: string, color: string) => void | Promise<void>;
  onUpdate: (
    tagId: string,
    name: string,
    color: string,
  ) => void | Promise<void>;
  onDelete: (tagId: string) => void | Promise<void>;
}

const palette = [...tagPalette];

export function TagsModal({
  isOpen,
  tags,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: TagsModalProps) {
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(palette[0]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Gestion des tags"
    >
      <div className="w-full max-w-3xl rounded-[2rem] bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/45">
              Organisation
            </p>
            <h2 className="mt-2 font-serif text-3xl text-ink">
              Gestion des tags
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/60 transition hover:border-ink/30 hover:text-ink"
          >
            Fermer
          </button>
        </div>

        <section className="mt-8 rounded-[1.5rem] border border-ink/8 bg-mist/40 p-5">
          <h3 className="text-lg font-semibold text-ink">Créer un tag</h3>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
            <input
              aria-label="Nom du nouveau tag"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              className="min-w-0 flex-1 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-coral"
              placeholder="Ex. Client, Admin, Focus"
            />
            <div className="flex flex-wrap gap-2">
              {palette.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setDraftColor(color)}
                  className={[
                    "h-10 w-10 rounded-full border-2 transition",
                    getTagTone(color).swatch,
                    draftColor === color
                      ? "border-ink scale-110"
                      : "border-transparent",
                  ].join(" ")}
                  aria-label={`Choisir la couleur ${color}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                onCreate(draftName, draftColor);
                setDraftName("");
              }}
              className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
            >
              Ajouter
            </button>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          {tags.length === 0 ? (
            <p className="rounded-[1.5rem] border border-dashed border-ink/12 p-6 text-center text-sm text-ink/55">
              Aucun tag disponible.
            </p>
          ) : (
            tags.map((tag) => (
              <TagEditorRow
                key={tag.id}
                tag={tag}
                palette={palette}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}

interface TagEditorRowProps {
  tag: Tag;
  palette: string[];
  onUpdate: (
    tagId: string,
    name: string,
    color: string,
  ) => void | Promise<void>;
  onDelete: (tagId: string) => void | Promise<void>;
}

function TagEditorRow({ tag, palette, onUpdate, onDelete }: TagEditorRowProps) {
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);

  return (
    <div className="rounded-[1.5rem] border border-ink/8 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="min-w-0 flex-1 rounded-2xl border border-ink/10 bg-mist/40 px-4 py-3 text-base text-ink outline-none transition focus:border-coral"
          placeholder="Nom du tag"
          title="Nom du tag"
        />
        <div className="flex flex-wrap gap-2">
          {palette.map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => setColor(candidate)}
              className={[
                "h-9 w-9 rounded-full border-2 transition",
                getTagTone(candidate).swatch,
                color === candidate
                  ? "border-ink scale-110"
                  : "border-transparent",
              ].join(" ")}
              aria-label={`Couleur ${candidate}`}
            />
          ))}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onUpdate(tag.id, name, color)}
            className="rounded-full border border-ink/10 px-4 py-3 text-sm font-semibold text-ink transition hover:border-ink/30"
          >
            Enregistrer
          </button>
          <button
            type="button"
            onClick={() => onDelete(tag.id)}
            className="rounded-full border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
