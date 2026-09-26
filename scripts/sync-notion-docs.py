#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Espeja la documentación de un vault como árbol de páginas en Notion.

No confundir con `sync-notion.py`: ese sincroniza PIEZAS (filas del kanban
Content Creator). Este sincroniza DOCU (páginas: estrategia, guías, research).

    vault  → Notion   una página por `.md`, una página por carpeta
    Notion → vault    nada

Es a propósito. El vault es para crear, Notion para colaborar: la vuelta de
Notion son los comentarios, no el cuerpo del documento. Un round-trip de
markdown ↔ bloques de Notion pierde información en cada viaje, así que acá
hay un solo dueño del texto y es el `.md`.

Qué carpetas entran lo decide `notion.docs` de cada marca en
`config/sources.json`. Si está vacío, la marca no publica docu — es el caso
de la marca personal, que sincroniza solo contenido.

El estado vive en `.state/notion-docs-<marca>.json`: ruta → id de página +
hash del contenido. Un archivo sin cambios no se toca, así que correrlo dos
veces seguidas no escribe nada.

    export NOTION_TOKEN=secret_...
    python3 sync-notion-docs.py --brand tegu              # DRY-RUN
    python3 sync-notion-docs.py --brand tegu --apply
"""
import argparse, hashlib, io, json, os, re, sys, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

def _destinos():
    """Los destinos del workspace, de config/destinos.json.

    Estaban hardcodeados acá y en sync-notion-docs.py, cada uno con su copia.
    Dos copias de un id es una que se va a quedar vieja — y son lo que
    `public-release` tiene que sacar del código antes de abrir el repo."""
    ruta = os.path.join(ROOT, "config", "destinos.json")
    try:
        with io.open(ruta, encoding="utf-8") as f:
            return {d["id"]: d for d in json.load(f).get("destinos", [])}
    except Exception as e:
        sys.exit("No se pudo leer %s: %s\nEs donde viven los ids de los tableros." % (ruta, e))


def destino_ref(id_):
    d = _destinos().get(id_)
    if not d:
        sys.exit("config/destinos.json no declara el destino '%s'." % id_)
    return d["ref"]


API = "https://api.notion.com/v1"
# La versión TIENE que coincidir con los endpoints que se usan. Este script
# consulta `/v1/data_sources/<id>/query`, que existe desde 2025-09-03; con
# 2022-06-28 Notion respondía `invalid_request_url`, un error que parece de ruta
# mal armada y en realidad era de versión — y que además tapaba el problema real
# de abajo (la integración sin acceso a la página).
VERSION = "2025-09-03"
# El id de la página Growth vive en config/destinos.json, no acá.
LIMIT = 100        # bloques por request
CHARS = 1900       # por fragmento de rich_text


# ── API ───────────────────────────────────────────────────────────────────────

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
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit("Notion devolvió %s en %s: %s" % (e.code, path, e.read().decode("utf-8")[:400]))


# ── markdown → bloques ────────────────────────────────────────────────────────

INLINE = re.compile(r"(\*\*.+?\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))")


def rich(text):
    """Texto plano con negrita, code y links. Los wikilinks pierden los corchetes:
    en Notion no resuelven, y dejarlos haría ver `[[algo]]` como si fuera un link roto."""
    text = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", text)
    text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)
    out = []
    for part in INLINE.split(text):
        if not part:
            continue
        if part.startswith("**") and part.endswith("**") and len(part) > 4:
            out.append({"type": "text", "text": {"content": part[2:-2][:CHARS]},
                        "annotations": {"bold": True}})
        elif part.startswith("`") and part.endswith("`") and len(part) > 2:
            out.append({"type": "text", "text": {"content": part[1:-1][:CHARS]},
                        "annotations": {"code": True}})
        else:
            m = re.match(r"^\[([^\]]+)\]\(([^)]+)\)$", part)
            if m and m.group(2).startswith("http"):
                out.append({"type": "text", "text": {"content": m.group(1)[:CHARS],
                                                     "link": {"url": m.group(2)}}})
            else:
                for i in range(0, len(part), CHARS) or [0]:
                    chunk = part[i:i + CHARS]
                    if chunk:
                        out.append({"type": "text", "text": {"content": chunk}})
    return out[:100] or [{"type": "text", "text": {"content": ""}}]


def block(kind, text, **extra):
    body = {"rich_text": rich(text)}
    body.update(extra)
    return {"object": "block", "type": kind, kind: body}


def to_blocks(md):
    """Subconjunto deliberado: encabezados, listas, citas, código, tablas y párrafos.
    Lo que no entra en ese molde viaja como párrafo, nunca se descarta en silencio."""
    lines = md.split("\n")
    out, i = [], 0
    while i < len(lines):
        ln = lines[i]
        s = ln.strip()

        if s.startswith("```"):                       # bloque de código
            lang = s[3:].strip().lower() or "plain text"
            buf, i = [], i + 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                buf.append(lines[i]); i += 1
            i += 1
            code = "\n".join(buf)[:CHARS]
            out.append({"object": "block", "type": "code", "code": {
                "rich_text": [{"type": "text", "text": {"content": code}}],
                "language": lang if lang in NOTION_LANGS else "plain text"}})
            continue

        if s.startswith("|") and s.endswith("|"):      # tabla → código, para que se lea
            buf = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                buf.append(lines[i].strip()); i += 1
            out.append({"object": "block", "type": "code", "code": {
                "rich_text": [{"type": "text", "text": {"content": "\n".join(buf)[:CHARS]}}],
                "language": "markdown"}})
            continue

        if not s:
            i += 1; continue
        if re.match(r"^(---+|\*\*\*+|___+)$", s):
            out.append({"object": "block", "type": "divider", "divider": {}})
        elif s.startswith("#"):
            lvl = min(len(s) - len(s.lstrip("#")), 3)
            out.append(block("heading_%d" % lvl, s.lstrip("#").strip()))
        elif s.startswith(">"):
            out.append(block("quote", s.lstrip(">").strip()))
        elif re.match(r"^[-*+]\s+\[[ xX]\]\s+", s):
            done = s[s.index("[") + 1] in "xX"
            out.append(block("to_do", re.sub(r"^[-*+]\s+\[[ xX]\]\s+", "", s), checked=done))
        elif re.match(r"^[-*+]\s+", s):
            out.append(block("bulleted_list_item", s[2:].strip()))
        elif re.match(r"^\d+[.)]\s+", s):
            out.append(block("numbered_list_item", re.sub(r"^\d+[.)]\s+", "", s)))
        else:
            out.append(block("paragraph", s))
        i += 1
    return out


NOTION_LANGS = {"plain text", "markdown", "javascript", "typescript", "python", "bash",
                "shell", "json", "yaml", "sql", "html", "css", "diff", "java", "go"}


# ── árbol ─────────────────────────────────────────────────────────────────────

def strip_frontmatter(md):
    if md.startswith("---\n"):
        end = md.find("\n---", 4)
        if end != -1:
            return md[end + 4:].lstrip("\n")
    return md


def page(parent, title, blocks=None):
    body = {"parent": {"type": "page_id", "page_id": parent},
            "properties": {"title": [{"text": {"content": title[:200]}}]}}
    if blocks:
        body["children"] = blocks[:LIMIT]
    pg = api("/pages", "POST", body)
    for j in range(LIMIT, len(blocks or []), LIMIT):
        api("/blocks/%s/children" % pg["id"], "PATCH", {"children": blocks[j:j + LIMIT]})
    return pg["id"]


def clear(page_id):
    cursor = None
    while True:
        q = "/blocks/%s/children?page_size=100" % page_id + (("&start_cursor=" + cursor) if cursor else "")
        r = api(q)
        for b in r["results"]:
            api("/blocks/%s" % b["id"], "DELETE")
        if not r.get("has_more"):
            return
        cursor = r["next_cursor"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--brand", required=True)
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    load_env()

    cfg = json.load(io.open(os.path.join(ROOT, "config/sources.json"), encoding="utf-8"))
    brands = {b["id"]: b for b in cfg["brands"]}
    if a.brand not in brands:
        sys.exit("Marca desconocida: %s. Configuradas: %s" % (a.brand, ", ".join(brands)))
    brand = brands[a.brand]
    folders = (brand.get("notion") or {}).get("docs") or []
    if not folders:
        sys.exit("La marca '%s' no publica docu (notion.docs vacío en config/sources.json).\n"
                 "Es a propósito para la marca personal: sincroniza solo contenido." % a.brand)

    vault = os.path.expanduser(brand["vault"])
    if not os.path.isdir(vault):
        sys.exit("No existe el vault: %s" % vault)

    state_path = os.path.join(ROOT, ".state", "notion-docs-%s.json" % a.brand)
    state = json.load(io.open(state_path, encoding="utf-8")) if os.path.isfile(state_path) else {}
    files, dirs = state.setdefault("files", {}), state.setdefault("dirs", {})

    found = []
    for folder in folders:
        base = os.path.join(vault, folder)
        if not os.path.isdir(base):
            print("  (falta en disco, se saltea: %s)" % folder)
            continue
        for dp, dn, fn in os.walk(base):
            dn[:] = sorted(d for d in dn if not d.startswith("."))
            for f in sorted(fn):
                if f.endswith(".md") and f.lower() != "readme.md":
                    found.append(os.path.relpath(os.path.join(dp, f), vault))

    nuevas, cambiadas, iguales = [], [], 0
    for rel in found:
        md = strip_frontmatter(io.open(os.path.join(vault, rel), encoding="utf-8").read())
        h = hashlib.sha1(md.encode("utf-8")).hexdigest()[:12]
        if rel not in files:
            nuevas.append((rel, md, h))
        elif files[rel].get("hash") != h:
            cambiadas.append((rel, md, h))
        else:
            iguales += 1

    print("Marca %s · docu en el vault: %d" % (a.brand, len(found)))
    print("  a crear: %d · a actualizar: %d · sin cambios: %d" % (len(nuevas), len(cambiadas), iguales))
    for rel, _, _ in (nuevas + cambiadas)[:15]:
        print("     %s" % rel)
    if len(nuevas) + len(cambiadas) > 15:
        print("     … y %d más" % (len(nuevas) + len(cambiadas) - 15))

    if not a.apply:
        print("\nDRY-RUN. Nada se escribió. Agregá --apply.")
        return
    if not nuevas and not cambiadas:
        return

    # raíz: una página por marca bajo Growth, y una página por carpeta
    if not state.get("root"):
        state["root"] = page(destino_ref("growth"), "Docs — %s" % brand["label"])
        print("  raíz creada: %s" % state["root"])

    def dir_page(rel_dir):
        if not rel_dir or rel_dir == ".":
            return state["root"]
        if rel_dir not in dirs:
            dirs[rel_dir] = page(dir_page(os.path.dirname(rel_dir)), os.path.basename(rel_dir))
        return dirs[rel_dir]

    def save():
        os.makedirs(os.path.dirname(state_path), exist_ok=True)
        io.open(state_path, "w", encoding="utf-8").write(
            json.dumps(state, indent=2, ensure_ascii=False, sort_keys=True) + "\n")

    try:
        for rel, md, h in nuevas:
            pid = page(dir_page(os.path.dirname(rel)), os.path.basename(rel)[:-3], to_blocks(md))
            files[rel] = {"id": pid, "hash": h}
            print("  + %s" % rel)
        for rel, md, h in cambiadas:
            pid = files[rel]["id"]
            clear(pid)
            blocks = to_blocks(md)
            for j in range(0, len(blocks), LIMIT):
                api("/blocks/%s/children" % pid, "PATCH", {"children": blocks[j:j + LIMIT]})
            files[rel]["hash"] = h
            print("  ~ %s" % rel)
    finally:
        save()   # si se corta a mitad, lo hecho queda registrado y no se duplica

    print("\n✓ %d creadas, %d actualizadas." % (len(nuevas), len(cambiadas)))


if __name__ == "__main__":
    main()
