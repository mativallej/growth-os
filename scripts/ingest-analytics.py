#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ingesta un export de analytics y escribe los cortes en el footer de cada pieza.

Multi-marca y multi-red: las marcas viven en `config/sources.json` y los adapters
de cada red en `config/networks.json`. Agregar una marca o una red es agregar un
objeto a esos archivos — este script no se toca.

La fuente de verdad son los `.md`. Formato de salida: `docs/footer-contract.md`
(una línea de corte, sin campos base). No inventa nada: si no puede emparejar,
reporta; si una métrica viene en 0, omite la clave.

    python3 ingest-analytics.py --brand mativallej --csv <export.csv>
    python3 ingest-analytics.py --brand tegu --network instagram --csv ... --apply
    python3 ingest-analytics.py --list

Por defecto es DRY-RUN.
"""

import argparse
import csv
import io
import json
import os
import re
import sys
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(os.path.dirname(HERE), "config")
ISO = re.compile(r"(20\d\d-\d\d-\d\d)")


def load(name):
    with io.open(os.path.join(CONFIG, name), encoding="utf-8") as fh:
        return json.load(fh)


def resolve(p):
    return os.path.expanduser(p)


def read_piece(path):
    text = io.open(path, encoding="utf-8").read()
    lines = text.split("\n")
    sep = next((i for i in range(len(lines) - 1, -1, -1) if lines[i].strip() == "---"), None)
    fields = {}
    if sep is not None:
        for idx in range(sep + 1, len(lines)):
            m = re.match(r"^\s*-\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$", lines[idx])
            if m:
                fields[m.group(1).lower()] = m.group(2).strip()
    return text, fields


def index_vault(content_dir, id_re, url_contains=None):
    """id del post → ruta del .md. Si la cuenta define url_contains, solo entran
    las piezas de ESA cuenta — dos cuentas de la misma red no se pisan."""
    pat = re.compile(id_re)
    idx = {}
    for dp, dn, fn in os.walk(content_dir):
        dn[:] = [d for d in dn if not d.startswith(".")]
        for f in fn:
            if not f.endswith(".md"):
                continue
            p = os.path.join(dp, f)
            try:
                _, fields = read_piece(p)
            except Exception:
                continue
            url = fields.get("url", "")
            if url_contains and url_contains not in url:
                continue
            m = pat.search(url)
            if m:
                idx[m.group(1)] = p
    return idx


def detect_network(header, networks):
    for nid, net in networks.items():
        det = net.get("detect") or []
        if det and all(c in header for c in det):
            return nid
    return None


def parse_date(raw, formats):
    for fmt in formats or []:
        try:
            return datetime.strptime(raw.strip(), fmt).date()
        except ValueError:
            continue
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--brand", help="id de la marca (ver config/sources.json)")
    ap.add_argument("--csv")
    ap.add_argument("--network", help="id de la red; si se omite, se detecta del header")
    ap.add_argument("--account", help="id de la cuenta; si se omite y la marca tiene una sola en esa red, se usa esa")
    ap.add_argument("--as-of", help="fecha del corte AAAA-MM-DD; por defecto sale del nombre del archivo")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--list", action="store_true", help="lista marcas y redes configuradas")
    a = ap.parse_args()

    brands = {b["id"]: b for b in load("sources.json")["brands"]}
    networks = load("networks.json")["networks"]

    if a.list:
        print("Marcas y cuentas:")
        for b in brands.values():
            print("  %-12s %-18s %s" % (b["id"], b["label"], b["vault"]))
            for ac in b.get("accounts", []):
                print("      %-16s %-11s @%s" % (ac["id"], ac["network"], ac["handle"]))
        print("\nRedes:")
        for nid, n in networks.items():
            print("  %-14s %-22s %s" % (nid, n["label"], n["status"]))
        return
    if not a.brand or not a.csv:
        sys.exit("Faltan --brand y --csv. Usá --list para ver lo configurado.")
    if a.brand not in brands:
        sys.exit("Marca desconocida: %s. Configuradas: %s" % (a.brand, ", ".join(brands)))

    brand = brands[a.brand]
    csv_path = resolve(a.csv)
    with io.open(csv_path, encoding="utf-8") as fh:
        header = next(csv.reader(fh))

    nid = a.network or detect_network(header, networks)
    if not nid:
        sys.exit("No pude detectar la red del export. Pasá --network. Redes: %s" % ", ".join(networks))
    net = networks.get(nid)
    if not net:
        sys.exit("Red desconocida: %s" % nid)
    if not net.get("metrics"):
        sys.exit("El adapter de '%s' está %s.\nNo invento columnas: pasame un export real de esa red y lo mapeo."
                 % (nid, net["status"]))

    as_of = a.as_of or (ISO.findall(os.path.basename(csv_path)) or [None])[-1]
    if not as_of:
        sys.exit("No pude deducir la fecha del corte. Pasá --as-of AAAA-MM-DD.")
    as_of_d = datetime.strptime(as_of, "%Y-%m-%d").date()

    cands = [ac for ac in brand.get("accounts", []) if ac["network"] == nid]
    if a.account:
        cands = [ac for ac in cands if ac["id"] == a.account]
    if not cands:
        sys.exit("La marca '%s' no tiene cuenta configurada en '%s'%s."
                 % (a.brand, nid, " con id " + a.account if a.account else ""))
    if len(cands) > 1:
        sys.exit("La marca tiene %d cuentas en %s: %s. Pasá --account."
                 % (len(cands), nid, ", ".join(c["id"] for c in cands)))
    account = cands[0]

    content = os.path.join(resolve(brand["vault"]), brand["content"])
    if not os.path.isdir(content):
        sys.exit("No existe el contenido de la marca: %s" % content)

    idx = index_vault(content, net["id_from_link"], account.get("url_contains"))
    print("Marca: %s (%s) · Cuenta: %s (@%s) · Red: %s · Corte: %s"
          % (brand["label"], a.brand, account["id"], account["handle"], net["label"], as_of))
    print("Piezas con URL de %s en el vault: %d\n" % (net["label"], len(idx)))

    matched = unmatched = already = 0
    writes = {}
    with io.open(csv_path, encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            pid = (row.get(net.get("id_col", "")) or "").strip()
            if not pid:
                m = re.search(net["id_from_link"], row.get(net.get("link_col", ""), "") or "")
                pid = m.group(1) if m else None
            path = idx.get(pid)
            if not path:
                unmatched += 1
                continue
            matched += 1
            text, fields = read_piece(path)
            if "snapshot %s" % as_of in text:
                already += 1
                continue

            pairs = []
            for col, short in net["metrics"].items():
                raw = (row.get(col) or "").replace(",", "").strip()
                if raw.isdigit() and int(raw) > 0:       # 0 → se omite la clave
                    pairs.append("%s=%s" % (short, raw))
            if not pairs:
                continue

            pub = None
            if "date" in fields:
                m = ISO.search(fields["date"])
                if m:
                    pub = datetime.strptime(m.group(1), "%Y-%m-%d").date()
            pub = pub or parse_date(row.get(net.get("date_col", ""), ""), net.get("date_formats"))
            horizon = "+%dd" % (as_of_d - pub).days if pub else "s/f"

            line = "- snapshot %s (%s): %s" % (as_of, horizon, " ".join(pairs))
            writes[path] = (text, line)
            print("── %s\n     + %s" % (os.path.relpath(path, content), line))

    print("\nemparejadas: %d · ya tenían este corte: %d · sin pieza en el vault: %d"
          % (matched, already, unmatched))
    print("archivos a modificar: %d" % len(writes))
    if not a.apply:
        print("\nDRY-RUN. Nada se escribió. Agregá --apply para aplicar.")
        return
    for path, (text, line) in writes.items():
        io.open(path, "w", encoding="utf-8").write(text.rstrip("\n") + "\n" + line + "\n")
    print("\n✓ %d archivos escritos." % len(writes))


if __name__ == "__main__":
    main()
