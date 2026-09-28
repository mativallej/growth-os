-- growth-os · índice derivado del vault
-- Pegar entero en el SQL Editor de Supabase.
--
-- GENERADO por scripts/armar-sql.mjs. No editar a mano: el próximo
-- `node scripts/armar-sql.mjs` lo pisa. Se toca supabase/migrations/.

-- ═══ 20260928000000_indice.sql ═══
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
  -- D-15 pide y que se sigue debiendo: 50 claves distintas al 2026-09-28.
  unknown_keys    text[] not null default '{}'
);

create index if not exists pieces_channel_status on pieces (channel, status);
create index if not exists pieces_published      on pieces (published_at desc);
create index if not exists pieces_formula        on pieces (formula_code);

-- Dónde se publicó cada pieza. El cross-post es la norma, no la excepción.
create table if not exists distribuciones (
  piece_id  text not null references pieces(id) on delete cascade,
  cuenta    text not null,
  url       text,
  date      date,
  -- Orden en el bloque `distribucion:` del footer.
  ord       int  not null,

  -- LA LLAVE ES (pieza, posición), NO (pieza, cuenta).
  --
  -- Fue `(piece_id, cuenta)`, apoyada en que `footer.ts` documenta el bloque como
  -- "una entrada por cuenta". Medido contra el vault el 2026-09-28: DOS piezas lo
  -- contradicen, y tienen razón.
  --
  --     post-005-hable-con-los-dos-lados.md
  --       - blog_mati  url=https://matiasvallejos.com/hable-con-los-dos-lados
  --       - blog_mati  url=https://matiasvallejos.com/es/hable-con-los-dos-lados
  --
  -- Es la misma pieza, en la misma cuenta, en dos idiomas. No es un footer roto:
  -- son dos direcciones reales que hay que poder abrir, y colapsarlas perdería
  -- una. Con la llave vieja el insert reventaba y el rebuild abortaba entero —
  -- el índice nunca se habría podido construir contra este vault.
  --
  -- Sin secuencia, por lo mismo que en `snapshots`: dos rebuilds del mismo vault
  -- producen la tabla idéntica, que es lo que la condición 2 de D-15 pide.
  primary key (piece_id, ord)
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

-- ═══ 20260928000100_rls.sql ═══
-- QUIÉN PUEDE LEER Y ESCRIBIR QUÉ.
--
-- Dos reglas, y las dos son estructurales y no un `if` de la app:
--
--   1. El ÍNDICE es de solo lectura para todo el mundo. No hay policy de insert,
--      update ni delete: la aplicación NO PUEDE corromper el índice ni aunque
--      alguien lo intente desde la consola del navegador. Es la condición 1 de
--      D-15 ("un solo sentido") hecha motor en vez de promesa.
--
--   2. `anon` no lee NADA. La anon key viaja al navegador de cualquiera que
--      abra la página; sin un JWT de Clerk en `Authorization` no debe volver una
--      sola fila. Todas las policies son `to authenticated`.

alter table pieces         enable row level security;
alter table distribuciones enable row level security;
alter table snapshots      enable row level security;
alter table creatives      enable row level security;
alter table formulas       enable row level security;
alter table builds         enable row level security;
alter table favoritos      enable row level security;

-- ── el índice: leer y nada más ───────────────────────────────────────────────

create policy leer_pieces         on pieces         for select to authenticated using (true);
create policy leer_distribuciones on distribuciones for select to authenticated using (true);
create policy leer_snapshots      on snapshots      for select to authenticated using (true);
create policy leer_creatives      on creatives      for select to authenticated using (true);
create policy leer_formulas       on formulas       for select to authenticated using (true);
create policy leer_builds         on builds         for select to authenticated using (true);

-- ── favoritos: todos ven, cada uno marca lo suyo ─────────────────────────────
--
-- Que TODOS vean los de TODOS es el punto: convierte la estrella en señal de
-- "esto lo marcó alguien más" en vez de una nota privada. Y que cada uno solo
-- pueda escribir los suyos elimina la guerra de ediciones sin necesidad de
-- bloqueos ni de resolver conflictos.

create policy favoritos_ver on favoritos
  for select to authenticated using (true);

create policy favoritos_marcar on favoritos
  for insert to authenticated
  with check (user_id = auth.jwt() ->> 'sub');

create policy favoritos_desmarcar on favoritos
  for delete to authenticated
  using (user_id = auth.jwt() ->> 'sub');

-- Sin policy de UPDATE: un favorito no se edita, se pone o se saca.

-- ═══ 20260928000200_rebuild.sql ═══
-- LA ÚNICA FORMA DE ESCRIBIR EL ÍNDICE.
--
-- Una función, una transacción, todo o nada. Eso hace que dos de las cinco
-- condiciones de D-15 dejen de ser una promesa y pasen a ser una propiedad:
--
--   Condición 2 — "rebuild completo, nunca incremental": NO EXISTE una API para
--   un rebuild parcial. No se puede hacer mal porque no se puede hacer.
--
--   Condición 5 — "fallar ruidoso": un payload vacío levanta excepción, y
--   cualquier error hace rollback, así que el índice conserva el estado bueno
--   anterior. Nunca queda a medias, y nunca queda vacío.
--
-- `security definer` + `revoke` de todos los roles: solo se llama con la
-- service_role, que vive como secret del repo del vault y NO llega al deploy.

create or replace function rebuild_index(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n_pieces int;
  build_id bigint;
begin
  n_pieces := coalesce(jsonb_array_length(payload -> 'pieces'), 0);

  -- REGLA DURA 1. Un vault que no se pudo leer devuelve cero piezas, y escribir
  -- un índice vacío es el bug fundacional de este repo con otro destino: el
  -- dashboard mostraría cero y eso parece información.
  if n_pieces = 0 then
    raise exception
      'payload sin piezas: el vault no se leyó. No se escribe un índice vacío (REGLA DURA 1).';
  end if;

  -- La identidad rota aborta; la identidad ausente no. Una pieza sin `id` es una
  -- que todavía no pasó el backfill —se registra y sigue—, pero dos piezas con el
  -- MISMO id significan que el índice no puede distinguirlas.
  if jsonb_array_length(coalesce(payload -> 'duplicate_ids', '[]'::jsonb)) > 0 then
    raise exception 'ids duplicados en el vault: %', payload -> 'duplicate_ids';
  end if;

  -- El orden importa: las hijas primero, aunque el cascade las llevaría igual.
  delete from snapshots;
  delete from distribuciones;
  delete from pieces;
  delete from creatives;
  delete from formulas;

  -- Columnas EXPLÍCITAS y no `select *`, por una razón que el test encontró:
  -- `jsonb_populate_recordset` NO aplica los DEFAULT de la tabla, así que una
  -- clave ausente en el JSON llega como NULL y revienta contra el `not null` de
  -- `unknown_keys`. El `coalesce` lo resuelve, y de paso la lista deja el
  -- contrato a la vista de quien lea la función.
  insert into pieces (
    id, title, rel_path, slug, tldr, body,
    canal, cuenta, formato, formula, estado, date_raw, url, drive_url, tags, note,
    channel, channel_derived, status, published_at, formula_code, coverage,
    verdict, why, lesson, drivers, unknown_keys
  )
  select
    id, title, rel_path, slug, tldr, body,
    canal, cuenta, formato, formula, estado, date_raw, url, drive_url, tags, note,
    channel, channel_derived, status, published_at, formula_code, coverage,
    verdict, why, lesson, drivers, coalesce(unknown_keys, '{}')
  from jsonb_populate_recordset(null::pieces, payload -> 'pieces');

  insert into distribuciones (piece_id, cuenta, url, date, ord)
  select piece_id, cuenta, url, date, ord
    from jsonb_to_recordset(coalesce(payload -> 'distribuciones', '[]'::jsonb))
      as x(piece_id text, cuenta text, url text, date date, ord int);

  insert into snapshots (
    piece_id, t, date, account, ord,
    impressions, engagements, detail_expands, profile_visits, likes, reposts,
    replies, bookmarks, shares, follows, media_views, views, reach, non_followers
  )
  select
    piece_id, t, date, account, ord,
    impressions, engagements, detail_expands, profile_visits, likes, reposts,
    replies, bookmarks, shares, follows, media_views, views, reach, non_followers
    from jsonb_to_recordset(coalesce(payload -> 'snapshots', '[]'::jsonb))
      as x(piece_id text, t text, date date, account text, ord int,
           impressions int, engagements int, detail_expands int, profile_visits int,
           likes int, reposts int, replies int, bookmarks int, shares int,
           follows int, media_views int, views int, reach int, non_followers numeric);

  insert into creatives (
    rel_path, title, slug, persona, publico, dolor, formato,
    angulo, angulo_raw, ronda, cta, estado, derivadas
  )
  select
    rel_path, title, slug, persona, publico, dolor, formato,
    angulo, angulo_raw, ronda, cta, estado, coalesce(derivadas, '{}')
  from jsonb_populate_recordset(null::creatives, coalesce(payload -> 'creatives', '[]'::jsonb));

  insert into formulas (code, nombre, channel)
  select code, nombre, channel
  from jsonb_populate_recordset(null::formulas, coalesce(payload -> 'formulas', '[]'::jsonb));

  insert into builds (pieces_count, pieces_without_id, duplicate_ids, unreadable, vault_sha)
  values (
    n_pieces,
    coalesce((payload ->> 'pieces_without_id')::int, 0),
    coalesce(payload -> 'duplicate_ids', '[]'::jsonb),
    coalesce(payload -> 'unreadable', '[]'::jsonb),
    payload ->> 'vault_sha'
  )
  returning id into build_id;

  return jsonb_build_object(
    'build_id',       build_id,
    'pieces',         (select count(*) from pieces),
    'distribuciones', (select count(*) from distribuciones),
    'snapshots',      (select count(*) from snapshots),
    'creatives',      (select count(*) from creatives),
    'formulas',       (select count(*) from formulas)
  );
end;
$$;

-- Nadie la llama desde la app. Ni el navegador, ni un usuario con sesión.
revoke execute on function rebuild_index(jsonb) from public;
revoke execute on function rebuild_index(jsonb) from anon;
revoke execute on function rebuild_index(jsonb) from authenticated;
