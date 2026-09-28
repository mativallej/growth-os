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
--
-- SE PUEDE CORRER DOS VECES. Cada policy va precedida de su `drop ... if exists`,
-- porque `create policy` no tiene `if not exists` y revienta contra una que ya
-- está. Las tablas ya usaban `create table if not exists`, así que el archivo
-- parecía re-aplicable y no lo era: el segundo `psql -f` moría acá. Importa
-- porque este SQL se aplica desde CI en cada merge y se pega a mano en el SQL
-- Editor — las dos cosas pasan más de una vez.

alter table pieces         enable row level security;
alter table distribuciones enable row level security;
alter table snapshots      enable row level security;
alter table creatives      enable row level security;
alter table formulas       enable row level security;
alter table builds         enable row level security;
alter table favoritos      enable row level security;

-- ── el índice: leer y nada más ───────────────────────────────────────────────

drop policy if exists leer_pieces on pieces;
create policy leer_pieces on pieces for select to authenticated using (true);
drop policy if exists leer_distribuciones on distribuciones;
create policy leer_distribuciones on distribuciones for select to authenticated using (true);
drop policy if exists leer_snapshots on snapshots;
create policy leer_snapshots on snapshots for select to authenticated using (true);
drop policy if exists leer_creatives on creatives;
create policy leer_creatives on creatives for select to authenticated using (true);
drop policy if exists leer_formulas on formulas;
create policy leer_formulas on formulas for select to authenticated using (true);
drop policy if exists leer_builds on builds;
create policy leer_builds on builds for select to authenticated using (true);

-- ── favoritos: todos ven, cada uno marca lo suyo ─────────────────────────────
--
-- Que TODOS vean los de TODOS es el punto: convierte la estrella en señal de
-- "esto lo marcó alguien más" en vez de una nota privada. Y que cada uno solo
-- pueda escribir los suyos elimina la guerra de ediciones sin necesidad de
-- bloqueos ni de resolver conflictos.

drop policy if exists favoritos_ver on favoritos;
create policy favoritos_ver on favoritos
  for select to authenticated using (true);

drop policy if exists favoritos_marcar on favoritos;
create policy favoritos_marcar on favoritos
  for insert to authenticated
  with check (user_id = auth.jwt() ->> 'sub');

drop policy if exists favoritos_desmarcar on favoritos;
create policy favoritos_desmarcar on favoritos
  for delete to authenticated
  using (user_id = auth.jwt() ->> 'sub');

-- Sin policy de UPDATE: un favorito no se edita, se pone o se saca.
