// Tipos del dashboard. La fuente de verdad son los .md del vault;
// esto es solo el shape parseado en memoria (no se persiste).

import type { SourceId } from './sources';
import type { Channel, Coverage, Status } from './normalize';

export type { Channel, Coverage, Status };

export type Snapshot = {
  t: string; // horizonte: "+20m" | "+1h" | "+24h" | "+7d" | "+196d" — sin escalera fija
  date?: string; // AAAA-MM-DD — fecha absoluta de la medición (contrato)
  /**
   * Cuenta a la que corresponde la medición (`@ig_tegu`), cuando el corte la
   * declara. Una marca puede tener varias cuentas en la misma red
   * (config/sources.json), y una pieza cross-posteada lleva un corte por cuenta:
   * sin esto, dos mediciones de cuentas distintas se pisarían como si fueran
   * la misma pieza medida dos veces.
   */
  account?: string;
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
  views?: number; // alcance primario de Instagram — IG no reporta impressions
  reach?: number;
  nonFollowers?: number; // % de no-seguidores
};

export type Piece = {
  title: string; // nombre de archivo sin .md
  path: string; // ruta absoluta al .md
  relPath: string; // ruta relativa a la raíz del vault de su fuente
  slug: string; // id URL-safe para /piezas/[slug] — relativo al content root
  source: SourceId; // de qué fuente vino (ver src/lib/sources.ts) = la marca
  tldr: string;
  body: string; // cuerpo de la pieza (sin TL;DR ni footer)

  /**
   * Identidad estable de la pieza, del campo `id` del footer (D-9).
   *
   * Sobrevive a mover, renombrar y reorganizar — que es lo que la ruta no hace,
   * y lo que costó 57 filas del tablero apuntando al vacío. `undefined` cuando
   * la pieza todavía no pasó por el backfill: NUNCA se genera uno al leer.
   */
  id?: string;

  // --- Crudos del vault. Se conservan tal cual se escribieron. ---
  canal?: string;
  cuenta?: string;
  formato?: string;
  formula?: string;
  estado?: string;
  date?: string; // fecha declarada en el campo `date`/`fecha`
  url?: string; // llave del ingest (contrato)
  tags?: string;
  note?: string;

  // --- Normalizados. Conjunto cerrado, con el crudo siempre al lado. ---
  channel: Channel;
  /** true si el canal se dedujo de la ubicación en vez de declararse. */
  channelDerived: boolean;
  status: Status;
  /** Fecha de publicación efectiva: del campo `date`, o extraída de `estado`. */
  publishedAt?: string;
  /** Código de fórmula (`X2`, `B3`) separado de su nombre largo. */
  formulaCode?: string;
  /** Qué tan medida está la pieza. Ver docs/footer-contract.md. */
  coverage: Coverage;

  // Análisis del porqué (co-construido con el humano — ver skill x-analytics-ingest)
  verdict?: string;
  drivers?: string[];
  why?: string;
  lesson?: string;
  snapshots: Snapshot[];
};
