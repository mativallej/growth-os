-- EL ÍNDICE DERIVADO DEL VAULT.
--
-- La fuente de verdad son los `.md`. Esto es una PROYECCIÓN: se borra entera y se
-- reconstruye, nunca se reconcilia. Ver D-15 y D-17 en openspec/DECISIONS.md.
--
-- UNA INSTALACIÓN, UNA MARCA, UNA BASE. Ninguna tabla lleva columna de marca para
-- aislar, porque no hay dos marcas acá y no las va a haber (D-17). Dos marcas en
-- el mismo proyecto separadas por RLS sería exactamente el `if` que este proyecto
-- evita, y un bug ahí filtra contenido de otra marca.

-- ── el índice ────────────────────────────────────────────────────────────────

create table if not exists pieces (
  -- El `id` del footer (D-9), NO la ruta. Una pieza que se mueve de carpeta
  -- conserva su identidad; si la llave fuera la ruta, el índice heredaría la
  -- llave rota que costó 57 filas huérfanas en Notion.
  id              text primary key,
  title           text not null,
  rel_path        text not null unique,
  slug            text not null,
  tldr            text,
  body            text,

  -- Crudos del vault, verbatim. Se guardan al lado de los derivados para que
  -- siempre se pueda ver qué escribió la persona y qué dedujo el parser.
  canal           text,
  cuenta          text,
  formato         text,
  formula         text,
  estado          text,
  date_raw        text,
  url             text,
  drive_url       text,
  tags            text,
  note            text,

  -- Derivados. Conjunto cerrado.
  channel         text    not null,
  channel_derived boolean not null,
  status          text    not null,
  published_at    date,
  formula_code    text,
  coverage        text    not null,

  -- Análisis co-construido con el humano.
  verdict         text,
  why             text,
  lesson          text,
  drivers         text[],

  -- Lo que el parser DESCARTA hoy. Es la worklist del validador de footer que
  -- D-15 pide y que se sigue debiendo: 65 claves distintas al 2026-09-28.
  unknown_keys    text[] not null default '{}'
);

create index if not exists pieces_channel_status on pieces (channel, status);
create index if not exists pieces_published      on pieces (published_at desc);
create index if not exists pieces_formula        on pieces (formula_code);

-- Dónde se publicó cada pieza. Una fila por cuenta: el cross-post es la norma,
-- no la excepción — 23 de 129 piezas están en más de un lado.
create table if not exists distribuciones (
  piece_id  text not null references pieces(id) on delete cascade,
  cuenta    text not null,
  url       text,
  date      date,
  -- LLAVE NATURAL, sin `bigserial`. El contrato dice "una entrada por cuenta",
  -- así que esa es la identidad de la fila. Y sin secuencia, dos rebuilds del
  -- mismo vault producen la tabla IDÉNTICA byte a byte — que es lo que la
  -- condición 2 de D-15 pide, y con un surrogate se cumplía solo de palabra.
  -- Si el vault viola el contrato, el insert revienta y el rebuild aborta.
  primary key (piece_id, cuenta)
);

create table if not exists snapshots (
  piece_id       text not null references pieces(id) on delete cascade,
  -- Horizonte libre (`+20m`, `+7d`, `+196d`): el vault no usa una escalera fija.
  t              text not null,
  date           date,
  account        text,
  -- Orden en el archivo. Sin esto dos cortes con el mismo `t` y sin fecha no
  -- tienen orden estable, y el rebuild deja de ser reproducible.
  ord            int  not null,

  impressions    int,
  engagements    int,
  detail_expands int,
  profile_visits int,
  likes          int,
  reposts        int,
  replies        int,
  bookmarks      int,
  shares         int,
  follows        int,
  media_views    int,
  views          int,   -- alcance primario de Instagram: allá `impressions` no existe
  reach          int,
  non_followers  numeric,

  -- La llave es (pieza, posición en el archivo): determinista y sin secuencia,
  -- por lo mismo que en `distribuciones`. `ord` no puede ser NULL, así que sirve
  -- de llave donde `date` y `account` —que sí pueden— no podrían.
  primary key (piece_id, ord)
);

-- Dos cortes sin fecha ni cuenta para el mismo horizonte son el MISMO corte, y
-- con la semántica default de NULL pasarían los dos: en SQL, NULL nunca es igual
-- a NULL, así que un UNIQUE normal no los detecta.
--
-- Se hace con `coalesce` y no con `unique nulls not distinct` a propósito: esa
-- sintaxis existe recién desde PostgreSQL 15, y atarse a una versión del motor
-- por azúcar sintáctico es la clase de dependencia que después aparece como un
-- error de sintaxis en el peor momento.
create unique index if not exists snapshots_llave on snapshots
  (piece_id, t, coalesce(date, '0001-01-01'::date), coalesce(account, ''));

create index if not exists snapshots_piece on snapshots (piece_id, date desc);

-- Un creativo NO es una pieza: no tiene fórmula, ni cortes, ni id estable. Se
-- llavea por la ruta a sabiendas — mover uno lo re-identifica. Aceptable SOLO
-- porque nada lo referencia desde afuera. El día que algo lo haga, hace falta un
-- D-9 para ads.
create table if not exists creatives (
  rel_path   text primary key,
  title      text not null,
  slug       text not null,
  persona    text,
  publico    text,
  dolor      text,
  formato    text,
  angulo     text,
  angulo_raw text,
  ronda      text,
  cta        text,
  estado     text,
  -- Qué dimensiones se dedujeron de la ruta en vez de declararse (REGLA DURA 2).
  derivadas  text[] not null default '{}'
);

-- El catálogo de fórmulas. Es doctrina, no contenido.
create table if not exists formulas (
  code    text primary key,
  nombre  text,
  channel text
);

-- EL SELLO DE FRESCURA, y no es un adorno: sin esto un índice viejo miente en
-- silencio y "fallar ruidoso" se degrada a "mentir sin que nadie se entere".
create table if not exists builds (
  id                bigserial   primary key,
  finished_at       timestamptz not null default now(),
  pieces_count      int         not null,
  pieces_without_id int         not null default 0,
  duplicate_ids     jsonb       not null default '[]',
  unreadable        jsonb       not null default '[]',
  vault_sha         text
);

-- ── lo que NO es índice ──────────────────────────────────────────────────────

-- FAVORITOS. Nacen en la plataforma: no son contenido del vault ni una métrica.
--
-- SIN FOREIGN KEY a `pieces`, y es deliberado: el rebuild borra `pieces` entera,
-- así que un FK con `on delete cascade` borraría todos los favoritos en cada
-- reconstrucción. Un favorito cuya pieza ya no está se MUESTRA como huérfano; no
-- se resuelve en silencio.
--
-- Por eso tampoco se borra en el rebuild: es la única tabla que sobrevive.
create table if not exists favoritos (
  piece_id   text        not null,
  user_id    text        not null,   -- el claim `sub` del JWT de Clerk
  user_label text,                   -- para poder decir QUIÉN lo marcó
  created_at timestamptz not null default now(),
  primary key (piece_id, user_id)
);

create index if not exists favoritos_user on favoritos (user_id);
