// Tipos del dashboard. La fuente de verdad son los .md del vault;
// esto es solo el shape parseado en memoria (no se persiste).

export type Snapshot = {
  t: string; // horizonte: "+20m" | "+1h" | "+24h" | "+7d" | "+196d" — sin escalera fija
  date?: string; // AAAA-MM-DD — fecha absoluta de la medición (contrato)
  impressions?: number;
  engagements?: number;
  detailExpands?: number;
  profileVisits?: number;
  likes?: number;
  reposts?: number;
  replies?: number;
  bookmarks?: number;
  shares?: number;
  follows?: number;
  mediaViews?: number;
  // IG-specific
  reach?: number;
  nonFollowers?: number; // % de no-seguidores
};

export type Piece = {
  title: string; // nombre de archivo sin .md
  path: string; // ruta absoluta al .md
  relPath: string; // ruta relativa a Brand/Content
  slug: string; // id URL-safe para /piezas/[slug]
  tldr: string;
  body: string; // cuerpo de la pieza (sin TL;DR ni footer)
  canal?: string;
  cuenta?: string;
  formato?: string;
  formula?: string;
  estado?: string;
  date?: string; // fecha de publicación (contrato)
  url?: string; // llave del ingest (contrato)
  tags?: string;
  note?: string;
  // Análisis del porqué (co-construido con el humano — ver skill x-analytics-ingest)
  verdict?: string;
  drivers?: string[];
  why?: string;
  lesson?: string;
  snapshots: Snapshot[];
};
