#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Re-llavea las filas del tablero que apuntan a archivos que se movieron.

    python3 scripts/reconciliar-llaves.py --brand tegu
    python3 scripts/reconciliar-llaves.py --brand tegu --apply

POR QUÉ EXISTE. El 2026-09-24 se fusionaron los dos pipelines de contenido de
Tegu y **57 filas del tablero quedaron apuntando a archivos que ya no estaban**.
Para el sync eran 57 piezas borradas y 93 nuevas, así que el siguiente `--apply`
habría creado 93 duplicadas y dejado las 57 huérfanas — con su estado del kanban
y su historial adentro.

LO QUE YA FALLÓ, Y POR QUÉ. Se intentó re-llavear el mismo día y se aplicaron 14
filas: **las 14 rutas escritas estaban muertas minutos después**. Otra sesión
estaba reorganizando el vault en paralelo —9 commits entre las 15:57 y las 17:36,
el último a tres minutos de la escritura— y movió los archivos otra vez entre la
medición y la escritura.

La conclusión no fue que el emparejamiento estuviera mal: el criterio descartó
bien un falso positivo, dos colisiones y dos matches que venían de citas
cruzadas. Lo que falló es que **no se puede re-llavear contra un vault que
alguien está reorganizando**. Por eso lo primero que hace este script es exigir
que el vault esté quieto, y esa verificación es un requirement, no una
precaución.

LO QUE LO VUELVE INNECESARIO. Con `stable-piece-id` aplicado, el puente llavea
por el `id` del footer y una mudanza deja de romper nada. Este script es la
reparación **de una sola vez** de las filas que quedaron de antes.
"""

import argparse
import io
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def cargar_marcas():
    with io.open(os.path.join(ROOT, "config/sources.json"), encoding="utf-8") as f:
        return json.load(f)["brands"]


ENV_VAULT = {"tegu": "VAULT_TEGU_DIR", "mativallej": "VAULT_PERSONAL_DIR"}


def raices(brand):
    override = os.environ.get(ENV_VAULT.get(brand["id"], ""), "")
    vault = os.path.expanduser(override or brand["vault"])
    contenido = brand["content"]
    if not isinstance(contenido, list):
        contenido = [contenido]
    return vault, [os.path.join(vault, c) for c in contenido]


def vault_quieto(vault):
    """(quieto, detalle). Es el requirement, no una precaución: ver el docstring.

    El `-- .` acota el estado a la carpeta del vault: puede ser un subdirectorio
    de un repo más grande, y un cambio en otra carpeta del mismo repo no tiene
    por qué bloquear esto."""
    try:
        r = subprocess.run(["git", "-C", vault, "status", "--porcelain", "--", "."],
                           capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError) as e:
        return False, "no se pudo consultar git: %s" % e
    if r.returncode != 0:
        return False, "no es un repositorio de git"
    sucio = [l for l in r.stdout.splitlines()
             if l.strip() and ".obsidian/" not in l]
    if sucio:
        return False, "%d archivo(s) sin commitear" % len(sucio)
    return True, "limpio"


def piezas(roots, ignorar):
    for root in roots:
        for dp, dn, fn in os.walk(root):
            dn[:] = [d for d in dn if not d.startswith(".")]
            for n in sorted(fn):
                if not n.lower().endswith(".md"):
                    continue
                if re.search(r"\s-\s*evaluaci[oó]n\.md$", n, re.I):
                    continue
                p = os.path.join(dp, n)
                if any(p == i or p.startswith(i + os.sep) for i in ignorar):
                    continue
                yield p


def url_de(texto):
    m = re.search(r"^[-*]?\s*(?:url|link)\s*:\s*(https?://\S+)", texto, re.M | re.I)
    return m.group(1).strip() if m else None


def id_de(texto):
    m = re.search(r"^[-*]?\s*id\s*:\s*([0-9a-z]{6,16})\s*$", texto, re.M | re.I)
    return m.group(1).lower() if m else None


# ── la evidencia, de la más fuerte a la más floja ─────────────────────────────
#
# El orden importa: se empareja por lo INEQUÍVOCO y se lista lo ambiguo con sus
# candidatos. Un emparejamiento flojo aplicado en silencio es peor que no
# emparejar — deja una fila apuntando a otra pieza, y nadie se entera.

EVIDENCIAS = [
    ("id", "el mismo identificador de footer", 100),
    ("url", "la misma url publicada", 90),
    ("nombre", "el mismo nombre de archivo", 60),
]


def indexar(archivos, vault):
    """ruta relativa -> {id, url, nombre}."""
    out = {}
    for p in archivos:
        try:
            with io.open(p, encoding="utf-8") as f:
                t = f.read()
        except Exception:
            continue
        out[os.path.relpath(p, vault)] = {
            "id": id_de(t),
            "url": url_de(t),
            "nombre": os.path.basename(p)[:-3].lower(),
        }
    return out


def candidatos(fila, indice):
    """Los destinos posibles de una fila huérfana, con su evidencia y su fuerza.

    `fila` es {ruta, url, nombre}: lo que el tablero guarda de esa pieza.
    Devuelve [(ruta_destino, evidencia, fuerza)] ordenado de más fuerte a más
    flojo, SIN decidir. Decidir es de `emparejar`."""
    out = []
    nombre = os.path.basename(fila.get("ruta") or "")
    nombre = nombre[:-3].lower() if nombre.lower().endswith(".md") else nombre.lower()
    url = (fila.get("url") or "").strip()

    for rel, d in indice.items():
        if d["id"] and d["id"] == fila.get("id"):
            out.append((rel, "el mismo identificador de footer", 100))
        elif url and d["url"] and d["url"] == url:
            out.append((rel, "la misma url publicada", 90))
        elif nombre and d["nombre"] == nombre:
            out.append((rel, "el mismo nombre de archivo", 60))
    return sorted(out, key=lambda x: -x[2])


# Fuerza mínima para emparejar sin preguntar. El nombre de archivo (60) NO
# alcanza si hay más de un candidato: dos piezas pueden llamarse igual en
# carpetas distintas, y ya pasó — el intento del 2026-09-24 descartó dos
# colisiones exactamente así.
FUERZA_INEQUIVOCA = 90


def emparejar(huerfanas, indice):
    """(seguras, ambiguas, sin_candidato).

    EMPAREJA SOLO LO INEQUÍVOCO. Un emparejamiento flojo aplicado en silencio es
    peor que no emparejar: deja una fila apuntando a otra pieza y nadie se
    entera. Lo ambiguo se lista con TODOS sus candidatos para que lo mire una
    persona.

    Inequívoco significa dos cosas a la vez: evidencia fuerte (id o url, no el
    nombre) Y un solo candidato. Dos filas que apuntan al mismo destino tampoco
    se aplican — es una colisión, y elegir una sería inventar."""
    seguras, ambiguas, sin_candidato = [], [], []
    destinos = {}

    for fila in huerfanas:
        cands = candidatos(fila, indice)
        if not cands:
            sin_candidato.append(fila)
            continue
        mejor = cands[0]
        fuertes = [c for c in cands if c[2] >= FUERZA_INEQUIVOCA]
        if len(fuertes) == 1 and mejor[2] >= FUERZA_INEQUIVOCA:
            destinos.setdefault(mejor[0], []).append((fila, mejor))
        else:
            ambiguas.append((fila, cands))

    # Dos filas que resuelven al mismo archivo: colisión, no se aplica ninguna.
    for destino, lista in destinos.items():
        if len(lista) == 1:
            fila, ev = lista[0]
            seguras.append((fila, ev[0], ev[1]))
        else:
            for fila, ev in lista:
                ambiguas.append((fila, [(destino, ev[1] + " (COLISIÓN: %d filas resuelven acá)" % len(lista), ev[2])]))

    return seguras, ambiguas, sin_candidato


def informar(seguras, ambiguas, sin_candidato):
    """Cada cambio de llave con su origen y su destino. Tarea 2.3."""
    if seguras:
        print("\n  %d fila(s) se pueden re-llavear sin ambigüedad:" % len(seguras))
        for fila, destino, evidencia in seguras[:20]:
            print("     %s" % (fila.get("ruta") or "(sin ruta)"))
            print("       → %s" % destino)
            print("         por %s" % evidencia)
        if len(seguras) > 20:
            print("     … y %d más" % (len(seguras) - 20))

    if ambiguas:
        print("\n  %d fila(s) AMBIGUAS — no se tocan, las mira una persona:" % len(ambiguas))
        for fila, cands in ambiguas[:10]:
            print("     %s" % (fila.get("ruta") or "(sin ruta)"))
            for rel, ev, fuerza in cands[:4]:
                print("       ? %s  (%s, fuerza %d)" % (rel, ev, fuerza))

    if sin_candidato:
        print("\n  %d fila(s) sin ningún candidato. O la pieza se borró de verdad," % len(sin_candidato))
        print("     o se renombró tanto que no queda evidencia. No se tocan.")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--brand", required=True)
    ap.add_argument("--apply", action="store_true",
                    help="escribe. Sin esto, dry-run")
    args = ap.parse_args()

    marca = next((b for b in cargar_marcas() if b["id"] == args.brand), None)
    if not marca:
        sys.exit("No existe la marca '%s' en config/sources.json." % args.brand)

    vault, roots = raices(marca)
    ignorar = [os.path.join(vault, p) for p in (marca.get("notion", {}) or {}).get("ads", [])]

    print("\n%s · %s" % (marca["id"], marca["label"]))
    print("  vault  %s" % vault)

    faltan = [r for r in roots if not os.path.isdir(r)]
    if faltan:
        sys.exit("  ERROR: no existe %s" % ", ".join(faltan))

    archivos = list(piezas(roots, ignorar))
    indice = indexar(archivos, vault)
    con_id = sum(1 for d in indice.values() if d["id"])
    print("  %d piezas · %d con id de footer" % (len(indice), con_id))

    # EL FRENO, PRIMERO. Esto es lo que faltó el 2026-09-24.
    quieto, detalle = vault_quieto(vault)
    if not quieto:
        print("\n  ABORTADO: el vault tiene %s." % detalle)
        print("  No se re-llavea contra un vault que alguien está reorganizando.")
        print("  Se probó el 2026-09-24 y las 14 rutas escritas estaban muertas")
        print("  minutos después, porque otra sesión seguía moviendo archivos.")
        print("  Commiteá o descartá lo pendiente del vault y volvé a correr.")
        return 1

    if con_id == len(indice) and con_id > 0:
        print("\n  Todas las piezas tienen id de footer.")
        print("  El puente llavea por id, así que una mudanza ya no rompe nada:")
        print("  esta reconciliación no hace falta. (Ver stable-piece-id / D-9.)")
        return 0

    print("\n  %d piezas SIN id de footer." % (len(indice) - con_id))
    print("  Mientras la llave sea la ruta, una reorganización vuelve a romper el")
    print("  emparejamiento. Lo que resuelve esto de raíz es el backfill:")
    print("      python3 scripts/backfill-piece-id.py --brand %s --apply" % args.brand)
    print("\n  Para re-llavear las filas existentes hace falta leer el tablero, y eso")
    print("  necesita que la integración tenga acceso a la página Growth.")

    if not args.apply:
        print("\nDRY-RUN. Nada se escribió.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
