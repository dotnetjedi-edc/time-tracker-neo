const paletteMap = {
  "#ff885b": {
    badge: "bg-coral/20 text-ink",
    chip: "border-coral/30 bg-white/80 text-ink hover:border-coral/60",
    chipSelected: "border-coral bg-coral/20 text-ink",
    swatch: "bg-coral",
  },
  "#6ed6b5": {
    badge: "bg-mint/25 text-ink",
    chip: "border-mint/30 bg-white/80 text-ink hover:border-mint/60",
    chipSelected: "border-mint bg-mint/25 text-ink",
    swatch: "bg-mint",
  },
  "#6f8cff": {
    badge: "bg-[#6f8cff]/20 text-ink",
    chip: "border-[#6f8cff]/30 bg-white/80 text-ink hover:border-[#6f8cff]/60",
    chipSelected: "border-[#6f8cff] bg-[#6f8cff]/20 text-ink",
    swatch: "bg-[#6f8cff]",
  },
  "#f0c96a": {
    badge: "bg-gold/25 text-ink",
    chip: "border-gold/30 bg-white/80 text-ink hover:border-gold/60",
    chipSelected: "border-gold bg-gold/25 text-ink",
    swatch: "bg-gold",
  },
  "#d87df0": {
    badge: "bg-[#d87df0]/20 text-ink",
    chip: "border-[#d87df0]/30 bg-white/80 text-ink hover:border-[#d87df0]/60",
    chipSelected: "border-[#d87df0] bg-[#d87df0]/20 text-ink",
    swatch: "bg-[#d87df0]",
  },
  "#ff667f": {
    badge: "bg-[#ff667f]/20 text-ink",
    chip: "border-[#ff667f]/30 bg-white/80 text-ink hover:border-[#ff667f]/60",
    chipSelected: "border-[#ff667f] bg-[#ff667f]/20 text-ink",
    swatch: "bg-[#ff667f]",
  },
} as const;

const fallback = {
  badge: "bg-ink/10 text-ink",
  chip: "border-ink/10 bg-white/80 text-ink hover:border-ink/30",
  chipSelected: "border-ink bg-ink/10 text-ink",
  swatch: "bg-ink",
};

export const tagPalette = Object.keys(paletteMap);

export const getTagTone = (color: string) =>
  paletteMap[color.toLowerCase() as keyof typeof paletteMap] ?? fallback;
