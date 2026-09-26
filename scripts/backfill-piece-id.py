#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Asigna un identificador estable a las piezas que todavía no lo tienen (D-9).

    python3 scripts/backfill-piece-id.py --brand tegu
    python3 scripts/backfill-piece-id.py --brand tegu --apply

POR QUÉ EXISTE. La identidad de una pieza era su ruta, y la ruta cambia. Cuando
el 2026-09-24 se fusionaron los dos pipelines de Tegu, 57 filas del tablero
quedaron apuntando a archivos que ya no estaban ahí. Se intentó repararlas
emparejando por evidencia y se escribieron 14 rutas que estaban muertas minutos
después, porque otra sesión seguía moviendo el vault. El criterio de
emparejamiento funcionaba; lo que faltaba era algo estable contra qué emparejar.

EL IDENTIFICADOR. Ocho caracteres de un alfabeto de 31, sin los que se confunden
al transcribir (`0`/`O`, `1`/`l`/`i`). Es OPACO a propósito: no codifica red,
fecha, fórmula ni orden. Cualquier cosa que codificara sería una cosa más que se
desactualiza — el mismo defecto de la ruta, disfrazado.

DOS GARANTÍAS DURAS:

  1. NO REASIGNA. Una pieza que ya tiene `id` no se toca nunca. Correr esto dos
     veces seguidas deja el segundo diff vacío.
  2. NO ESCRIBE SOBRE UN VAULT EN MOVIMIENTO. Si el repo del vault tiene cambios
     sin commitear, corta antes de tocar un archivo. No es una precaución: es la
     lección exacta del intento fallido, y es un requirement del spec.

Dry-run por default, como todo en scripts/.
"""

import argparse
import io
import json
import os
import re
import secrets
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 31 caracteres: 8 dígitos + 23 letras. Sin 0/O ni 1/l/i — los que se confunden
# al leer en voz alta o transcribir a mano. Ver D-9.
ALFABETO = "23456789abcdefghjkmnpqrstuvwxyz"
LARGO = 8
ID_RE = re.compile(r"^\s*[-*]?\s*id\s*:\s*([%s]{%d})\s*$" % (ALFABETO, LARGO), re.I)
CUALQUIER_ID = re.compile(r"^\s*[-*]?\s*id\s*:", re.I)


def nuevo_id(usados):
    """Un id que no esté en uso. `secrets` y no `random`: no queremos que la
    secuencia sea reproducible a partir de una semilla."""
    while True:
        v = "".join(secrets.choice(ALFABETO) for _ in range(LARGO))
        if v not in usados:
            usados.add(v)
            return v


def cargar_marcas():
    with io.open(os.path.join(ROOT, "config/sources.json"), encoding="utf-8") as f:
        return json.load(f)["brands"]


# Mismo override que scripts/audit-vaults.mjs y src/lib/sources.ts: reapuntar el
# vault sin tocar la config. Es lo que hace testeable este script.
ENV_VAULT = {"tegu": "VAULT_TEGU_DIR", "mativallej": "VAULT_PERSONAL_DIR"}


def raices(brand):
    override = os.environ.get(ENV_VAULT.get(brand["id"], ""), "")
    vault = os.path.expanduser(override or brand["vault"])
    contenido = brand["content"]
    if not isinstance(contenido, list):
        contenido = [contenido]
    return vault, [os.path.join(vault, c) for c in contenido]


def piezas(roots, ignorar):
    for root in roots:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if not d.startswith(".")]
            for name in sorted(filenames):
                if not name.lower().endswith(".md"):
                    continue
                p = os.path.join(dirpath, name)
                if any(p == i or p.startswith(i + os.sep) for i in ignorar):
                    continue
                yield p


def vault_limpio(vault):
    """(limpio, detalle). Un vault que no es repo de git se considera NO limpio:

    El `-- .` acota el estado A LA CARPETA DEL VAULT. Un vault puede ser un
    subdirectorio de un repo más grande —`~/vaults/brain` lo es: su raíz de git
    está un nivel arriba— y sin acotar, un cambio en cualquier otra carpeta del
    mismo repo bloquearía un backfill que no tiene nada que ver con ella.

    sin historia no hay forma de revertir el backfill, y escribir 265 archivos
    sin vuelta atrás no es algo que este script deba hacer solo."""
    try:
        r = subprocess.run(["git", "-C", vault, "status", "--porcelain", "--", "."],
                           capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError) as e:
        return False, "no se pudo consultar git: %s" % e
    if r.returncode != 0:
        return False, "no es un repositorio de git (o git falló)"
    sucio = [l for l in r.stdout.splitlines() if l.strip()
             and not l.endswith(".obsidian/workspace.json")
             and not l.endswith(".obsidian/graph.json")]
    if sucio:
        return False, "%d archivo(s) sin commitear" % len(sucio)
    return True, "limpio"


def separador(lineas):
    """Índice del último `---` solo. -1 si la pieza no tiene footer."""
    for i in range(len(lineas) - 1, -1, -1):
        if lineas[i].strip() == "---":
            return i
    return -1


def id_de(lineas, sep):
    if sep == -1:
        return None
    for l in lineas[sep + 1:]:
        m = ID_RE.match(l)
        if m:
            return m.group(1).lower()
        if CUALQUIER_ID.match(l):
            # Hay un `id:` pero no con la forma esperada. No se pisa: se reporta.
            return l.strip()
    return None


def estilo_bullet(lineas, sep):
    """El vault personal escribe `- clave: valor`; el de Tegu, `clave: valor`.
    El id se escribe en el estilo que el archivo ya usa: meter un bullet en un
    footer inline (o al revés) es reformatear el vault, y eso no se hace."""
    for l in lineas[sep + 1:]:
        if re.match(r"^\s*[-*]\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ_]+\s*:", l):
            return True
        if re.match(r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ_]+\s*:", l):
            return False
    return True


def insertar(lineas, sep, valor):
    """Devuelve las líneas con el id puesto como primer campo del footer."""
    linea = ("- id: %s" if estilo_bullet(lineas, sep) else "id: %s") % valor
    i = sep + 1
    # Salta las líneas en blanco que separan el `---` del primer campo.
    while i < len(lineas) and not lineas[i].strip():
        i += 1
    return lineas[:i] + [linea] + lineas[i:]


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--brand", required=True, help="id de marca de config/sources.json, o 'all'")
    ap.add_argument("--apply", action="store_true", help="escribe. Sin esto, dry-run")
    ap.add_argument("--crear-footer", action="store_true",
                    help="también le crea footer a las piezas que no tienen. "
                         "Apagado por default: agregar un footer es más que "
                         "asignar un id y conviene mirarlo antes")
    args = ap.parse_args()

    marcas = cargar_marcas()
    if args.brand != "all":
        marcas = [b for b in marcas if b["id"] == args.brand]
        if not marcas:
            sys.exit("No existe la marca '%s' en config/sources.json." % args.brand)

    total_escritos = 0
    for brand in marcas:
        vault, roots = raices(brand)
        ignorar = [os.path.join(vault, p) for p in (brand.get("notion", {}) or {}).get("ads", [])]
        print("\n%s · %s" % (brand["id"], brand["label"]))
        print("  vault  %s" % vault)

        faltan = [r for r in roots if not os.path.isdir(r)]
        if faltan:
            print("  ERROR: no existe %s" % ", ".join(faltan))
            continue

        archivos = list(piezas(roots, ignorar))
        usados = set()
        sin_id, con_id, sin_footer, raros = [], [], [], []

        for p in archivos:
            with io.open(p, encoding="utf-8") as f:
                lineas = f.read().split("\n")
            sep = separador(lineas)
            if sep == -1:
                sin_footer.append(p)
                continue
            v = id_de(lineas, sep)
            if v is None:
                sin_id.append(p)
            elif re.fullmatch(r"[%s]{%d}" % (ALFABETO, LARGO), v):
                con_id.append(p)
                usados.add(v)
            else:
                raros.append((p, v))

        print("  %d piezas · %d ya tienen id · %d sin id · %d sin footer"
              % (len(archivos), len(con_id), len(sin_id), len(sin_footer)))
        if raros:
            print("  %d con un `id:` que no tiene la forma esperada (no se tocan):" % len(raros))
            for p, v in raros[:5]:
                print("     %s  →  %s" % (os.path.relpath(p, vault), v[:60]))

        objetivo = sin_id + (sin_footer if args.crear_footer else [])
        if not objetivo:
            print("  Nada que hacer.")
            continue
        if sin_footer and not args.crear_footer:
            print("  %d sin footer quedan afuera (agregá --crear-footer para incluirlas)"
                  % len(sin_footer))

        if not args.apply:
            print("  DRY-RUN — se asignarían %d ids. Ejemplos:" % len(objetivo))
            prev = set(usados)
            for p in objetivo[:5]:
                print("     %s  →  %s" % (os.path.relpath(p, vault), nuevo_id(prev)))
            continue

        limpio, detalle = vault_limpio(vault)
        if not limpio:
            print("  ABORTADO: el vault tiene %s." % detalle)
            print("  No se escribe sobre un vault en movimiento — se probó el")
            print("  2026-09-24 y las 14 escrituras estaban muertas minutos después.")
            print("  Commiteá o descartá los cambios del vault y volvé a correr.")
            continue

        escritos = 0
        for p in objetivo:
            with io.open(p, encoding="utf-8") as f:
                texto = f.read()
            lineas = texto.split("\n")
            sep = separador(lineas)
            if sep == -1:
                # --crear-footer: el separador se agrega al final del cuerpo.
                if lineas and lineas[-1].strip():
                    lineas.append("")
                lineas += ["---", ""]
                sep = len(lineas) - 2
            nuevas = insertar(lineas, sep, nuevo_id(usados))
            # Conservar el salto final EXACTAMENTE como estaba. Escribir sin él
            # ensucia el diff de todo archivo que sí lo tenía, y con él ensucia
            # el de los que no — en los dos casos por una razón que no tiene
            # nada que ver con lo que este script vino a hacer.
            salida = "\n".join(nuevas)
            if texto.endswith("\n") and not salida.endswith("\n"):
                salida += "\n"
            with io.open(p, "w", encoding="utf-8") as f:
                f.write(salida)
            escritos += 1
        print("  Escritos %d archivos." % escritos)
        total_escritos += escritos

    if not args.apply:
        print("\nDRY-RUN. Nada se escribió. Agregá --apply para aplicar.")
    elif total_escritos:
        print("\nListo: %d archivos. Revisá el diff en el vault y commiteá ahí." % total_escritos)


if __name__ == "__main__":
    main()
