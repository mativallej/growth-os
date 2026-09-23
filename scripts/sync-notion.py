#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sincroniza las piezas de un vault con la base Contenido de Notion.

Cada campo tiene UN dueño. Nunca los dos lados escriben lo mismo:

    vault  → Notion   pieza, marca, canal, formato, fórmula, archivo, url,
                      fecha y último corte (los escribe el ingest)
    Notion → vault    estado (el carril del kanban) → `- status:` del footer

La llave de emparejamiento es la ruta relativa del `.md` (columna "Archivo"):
es única y no cambia aunque se renombre el título.

    export NOTION_TOKEN=secret_...
    python3 sync-notion.py --brand mativallej            # DRY-RUN
    python3 sync-notion.py --brand mativallej --apply
    python3 sync-notion.py --brand tegu --apply --only-to-notion
"""
import argparse, io, json, os, re, sys, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
API = "https://api.notion.com/v1"
VERSION = "2022-06-28"
DS = "f74f3fb7-4fe5-4e52-b683-c7d8eeefff0d"   # base Contenido
ISO = re.compile(r"(20\d\d-\d\d-\d\d)")
CANAL = {"x": "X", "instagram": "Instagram", "linkedin": "LinkedIn", "blog": "Blog", "tiktok": "TikTok"}


def load_env():
    p = os.path.join(ROOT, ".env.local")
    if os.path.isfile(p):
        for line in io.open(p, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


def api(path, method="GET", body=None):
    tok = os.environ.get("NOTION_TOKEN")
    if not tok:
        sys.exit("Falta NOTION_TOKEN.\nEs un token de integración de Notion (no el OAuth del MCP):\n"
                 "  notion.so/my-integrations → New integration → copiar el secret\n"
                 "  y compartir la página Growth con esa integración.\n"
                 "Después: agregalo a growth-loop-obsidian/.env.local")
    req = urllib.request.Request(API + path, method=method,
        data=json.dumps(body).encode("utf-8") if body else None,
        headers={"Authorization": "Bearer " + tok, "Notion-Version": VERSION,
                 "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit("Notion devolvió %s: %s" % (e.code, e.read().decode("utf-8")[:300]))


def read_piece(path):
    t = io.open(path, encoding="utf-8").read()
    lines = t.split("\n")
    sep = next((i for i in range(len(lines) - 1, -1, -1) if lines[i].strip() == "---"), None)
    f = {}
    if sep is not None:
        for i in range(sep + 1, len(lines)):
            m = re.match(r"^\s*-\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$", lines[i])
            if m:
                f.setdefault(m.group(1).lower(), m.group(2).strip())
    cortes = re.findall(r"^-\s+snapshot\s+(.+)$", t, re.M)
    return t, f, (cortes[-1] if cortes else "")


def txt(v):
    return {"rich_text": [{"text": {"content": (v or "")[:1900]}}]} if v else {"rich_text": []}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--brand", required=True)
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--only-to-notion", action="store_true", help="no escribe el estado de vuelta al vault")
    a = ap.parse_args()
    load_env()

    brands = {b["id"]: b for b in json.load(io.open(os.path.join(ROOT, "config/sources.json"), encoding="utf-8"))["brands"]}
    if a.brand not in brands:
        sys.exit("Marca desconocida: %s" % a.brand)
    brand = brands[a.brand]
    vault = os.path.expanduser(brand["vault"])
    content = os.path.join(vault, brand["content"])

    # ── lo que hay en el vault
    local = {}
    for dp, dn, fn in os.walk(content):
        dn[:] = [d for d in dn if not d.startswith(".")]
        for f in fn:
            if not f.endswith(".md") or f.lower() == "readme.md":
                continue
            p = os.path.join(dp, f)
            _, fields, corte = read_piece(p)
            if not fields:
                continue
            local[os.path.relpath(p, vault)] = {"name": f[:-3], "f": fields, "corte": corte}

    # ── lo que hay en Notion
    remote, cursor = {}, None
    while True:
        body = {"page_size": 100}
        if cursor: body["start_cursor"] = cursor
        r = api("/data_sources/%s/query" % DS, "POST", body)
        for pg in r["results"]:
            props = pg["properties"]
            arch = "".join(x["plain_text"] for x in props.get("Archivo", {}).get("rich_text", []))
            if arch:
                est = (props.get("Estado") or {}).get("select") or {}
                remote[arch] = {"id": pg["id"], "estado": est.get("name", "")}
        if not r.get("has_more"): break
        cursor = r["next_cursor"]

    nuevas = [k for k in local if k not in remote]
    existentes = [k for k in local if k in remote]
    print("Marca %s · piezas en el vault: %d · filas en Notion: %d" % (a.brand, len(local), len(remote)))
    print("  a crear en Notion: %d · ya existen: %d" % (len(nuevas), len(existentes)))

    # ── estado de Notion → vault
    devuelta = []
    if not a.only_to_notion:
        for k in existentes:
            est = remote[k]["estado"].lower()
            cur = (local[k]["f"].get("status") or "").lower()
            if est and not cur.startswith(est):
                devuelta.append((k, remote[k]["estado"], local[k]["f"].get("status", "")))
        print("  estado a escribir de vuelta al vault: %d" % len(devuelta))
        for k, nuevo, viejo in devuelta[:10]:
            print("     %s: %s → %s" % (os.path.basename(k)[:48], viejo or "(vacío)", nuevo))

    if not a.apply:
        print("\nDRY-RUN. Nada se escribió. Agregá --apply.")
        return

    for k in nuevas:
        d = local[k]; f = d["f"]
        props = {
            "Pieza": {"title": [{"text": {"content": d["name"][:200]}}]},
            "Marca": {"select": {"name": a.brand}},
            "Archivo": txt(k), "Fórmula": txt(f.get("formula")), "Último corte": txt(d["corte"]),
        }
        canal = CANAL.get((f.get("platform") or "").lower())
        if canal: props["Canal"] = {"select": {"name": canal}}
        if f.get("url", "").startswith("http"): props["URL"] = {"url": f["url"]}
        m = ISO.search(f.get("date", ""))
        if m: props["Fecha"] = {"date": {"start": m.group(1)}}
        if (f.get("status") or "").lower().startswith("public"):
            props["Estado"] = {"select": {"name": "Publicado"}}
        api("/pages", "POST", {"parent": {"type": "data_source_id", "data_source_id": DS}, "properties": props})
    print("✓ %d filas creadas en Notion." % len(nuevas))

    for k, nuevo, _ in devuelta:
        p = os.path.join(vault, k)
        t = io.open(p, encoding="utf-8").read()
        if re.search(r"^-\s+status:.*$", t, re.M):
            t = re.sub(r"^-\s+status:.*$", "- status: %s" % nuevo.lower(), t, count=1, flags=re.M)
        else:
            t = t.rstrip("\n") + "\n- status: %s\n" % nuevo.lower()
        io.open(p, "w", encoding="utf-8").write(t)
    if devuelta:
        print("✓ %d estados escritos de vuelta al vault." % len(devuelta))


if __name__ == "__main__":
    main()
