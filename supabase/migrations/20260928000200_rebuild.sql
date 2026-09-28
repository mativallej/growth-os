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

  insert into distribuciones (piece_id, cuenta, url, date)
  select piece_id, cuenta, url, date
    from jsonb_to_recordset(coalesce(payload -> 'distribuciones', '[]'::jsonb))
      as x(piece_id text, cuenta text, url text, date date);

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
