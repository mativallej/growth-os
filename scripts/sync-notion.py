#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sincroniza un vault con los tableros de Notion bajo la página Growth.

Tres cosas distintas, tres destinos distintos. No se mezclan:

    posts   →  Content Creator   piezas de contenido orgánico
    ads     →  Ads Creator       creativos de campañas (otro ciclo, otras métricas)
    docu    →  Docs — <marca>    estrategia, guías, research (páginas, no filas)

Si no pasás --scope, pregunta cuál querés. Es a propósito: sincronizar todo el
vault de Tegu son ~190 archivos y rara vez es lo que uno quiere.

Cada campo tiene UN dueño. Nunca los dos lados escriben lo mismo:

    vault  → Notion   pieza, marca, canal, fórmula, archivo, url, fecha,
                      último corte y el estado inicial
    Notion → vault    estado (el carril del kanban) → `- status:` del footer

El estado es el único campo que viaja en los dos sentidos, y por eso tiene una
regla escrita (ver `estado_post`): el vault decide con qué estado NACE la fila,
Notion manda de ahí en adelante. Sin esa regla es justo donde se inventa
información.

    export NOTION_TOKEN=secret_...
    python3 sync-notion.py --brand tegu                      # pregunta y hace dry-run
    python3 sync-notion.py --brand tegu --scope posts --apply
    python3 sync-notion.py --brand tegu --scope all --apply
"""
import argparse, io, json, os, re, subprocess, sys, urllib.error, urllib.request
from datetime import date, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
API = "https://api.notion.com/v1"
VERSION = "2022-06-28"
CONTENT_DS = "f74f3fb7-4fe5-4e52-b683-c7d8eeefff0d"   # Content Creator
ADS_DS = "d4b673e1-a79d-4b6f-b2f1-7de8e3e08e94"       # Ads Creator
ISO = re.compile(r"(20\d\d-\d\d-\d\d)")
CANAL = {"x": "X", "twitter": "X", "instagram": "Instagram", "linkedin": "LinkedIn",
         "blog": "Blog", "tiktok": "TikTok"}
SCOPES = ["posts", "ads", "docs", "all"]


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
        sys.exit("Notion devolvió %s en %s: %s" % (e.code, path, e.read().decode("utf-8")[:300]))


# ── leer el vault ─────────────────────────────────────────────────────────────

# Los dos vaults escriben el mismo metadato con dos gramáticas distintas, y las
# dos son legítimas. Brain usa un bullet por clave al final del archivo:
#     - status: publicado
#     - url: https://...
# Tegu las pone en una línea separada por " · ":
#     canal: Twitter · formato: tweet suelto · fórmula: X4 · Builder-número
# Un lector que entienda solo una de las dos ve 14 piezas donde hay 125, así que
# entiende las dos. La lista de claves conocidas es el filtro: sin ella, una
# línea de prosa como "Detrás de todo esto: +150 builds" entraría como metadato.
CLAVES = {"id": "id", "status": "status", "estado": "status", "url": "url", "link": "url",
          "date": "date", "fecha": "date", "canal": "platform", "platform": "platform",
          "red": "platform", "formato": "formato", "fórmula": "formula",
          "formula": "formula", "cuenta": "account", "account": "account",
          "notas": "notas", "tags": "tags", "analytics": "analytics"}
PAR = re.compile(r"^\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{0,24}?)\s*:\s*(.*)$")


def read_piece(path):
    t = io.open(path, encoding="utf-8").read()
    f = {}
    for raw in t.split("\n"):
        ln = raw.strip()
        if not ln:
            continue
        ln = re.sub(r"^[-*]\s+", "", ln)
        # una línea inline puede traer varias claves; una de bullet trae una
        for seg in (ln.split(" · ") if " · " in ln else [ln]):
            m = PAR.match(seg.strip())
            if m:
                bruto = m.group(1).strip().lower()
                k = CLAVES.get(bruto) or AD_CLAVES.get(bruto)
                if k:
                    f.setdefault(k, m.group(2).strip())
    cortes = re.findall(r"^-\s+snapshot\s+(.+)$", t, re.M)
    return t, f, (cortes[-1] if cortes else "")


def estado_post(f):
    """El carril del kanban, derivado del vault. La regla importa más que el código:

    Sin señal explícita una pieza va a Backlog, NO a "En producción". Una pieza
    que el vault no marca como en vuelo no está en vuelo, y llenar el tablero de
    trabajo-en-curso que nadie está haciendo es peor que dejarlo vacío: hace
    ilegible la única columna que importa.

    Una `url` es evidencia dura de publicación. `pendiente grabar`, `listo`,
    `falta X` son evidencia de que alguien la está trabajando. Todo lo demás es
    una idea guardada.
    """
    s = (f.get("status") or "").lower()
    if (f.get("url") or "").startswith("http") or re.search(r"publicad", s):
        return "Publicado"
    if re.search(r"listo|pendiente|grabar|falta", s) \
            and not re.search(r"no publicar|sin auditar|variante|esperando", s):
        return "En producción"
    return "Backlog"


def estado_ad(f):
    """Un ad no se publica: se activa y se pausa. Mismo criterio de prudencia."""
    s = (f.get("status") or "").lower()
    if re.search(r"pausad|apagad", s):
        return "Pausado"
    if re.search(r"activ|corriendo|publicad", s) or (f.get("url") or "").startswith("http"):
        return "Activo"
    if re.search(r"listo|pendiente|grabar|falta", s) and not re.search(r"no publicar", s):
        return "En producción"
    return "Backlog"


AD_FORMATO = [("carrusel", "carrusel"), ("ugc", "ugc"), ("video", "video"),
              ("reel", "video"), ("imagen", "imagen")]
AD_CLAVES = {"buyer persona": "persona", "persona": "persona", "público": "publico",
             "publico": "publico", "dolor": "dolor", "ángulo": "angulo",
             "angulo": "angulo", "ronda": "ronda", "cta": "cta"}


def txt(v):
    return {"rich_text": [{"text": {"content": (v or "")[:1900]}}]} if v else {"rich_text": []}


def _limpio(v):
    """Saca el paréntesis aclaratorio: "Educativo (pregunta)" → "Educativo".
    Es normalización de formato, no inferencia de contenido: el valor sigue siendo
    el que el creativo declaró, sin el matiz que lo volvía único."""
    return re.sub(r"\s*\(.*$", "", (v or "")).strip()


def _ronda(v, vault, ads_root):
    """Los creativos escriben la ronda de tres formas: "Ronda 1 - Jul 2026", "1", y
    "2 (pendiente de abrir formalmente)". Se normaliza al nombre canónico, que es el
    del archivo en Rondas/ — la fuente, no una lista en el código."""
    m = re.search(r"(\d+)", v or "")
    if not m:
        return None
    n = m.group(1)
    d = os.path.join(vault, ads_root, "Rondas")
    if os.path.isdir(d):
        for f in sorted(os.listdir(d)):
            if f.endswith(".md") and re.match(r"Ronda\s+%s\b" % n, f):
                return f[:-3]
    return "Ronda %s" % n


def no_es_creativo(rel):
    """Dentro de Create/Ads hay tres cosas que no son creativos y que generarían una
    fila cada una: las evaluaciones que acompañan a cada creativo (13 archivos), el
    framework, y los documentos de ronda."""
    base = os.path.basename(rel).lower()
    if "evaluacion" in base or "evaluación" in base:
        return True
    if base.startswith("framework"):
        return True
    return os.sep + "Rondas" + os.sep in rel


def ad_fields(rel, f, vault, ads_root):
    """Las dimensiones salen de lo que el creativo DECLARA. La ruta es respaldo, no
    fuente: solo se usa cuando el footer no dice nada, y se reporta cuál se derivó.

    Medido el 2026-09-24: de 13 creativos, 6 declaran buyer persona y 7 no. Negarse a
    derivar dejaría la mitad de las filas vacías; derivar en silencio escondería qué
    creativos tienen el footer incompleto. Por eso: se deriva y se avisa."""
    parts = rel.split(os.sep)
    derivados = []
    out = {}

    publico = _limpio(f.get("publico"))
    if not publico and len(parts) > 2 and parts[2] in ("Cliente", "Profesional"):
        publico, _ = parts[2], derivados.append("público")
    if publico in ("Cliente", "Profesional"):
        out["Público"] = {"select": {"name": publico}}

    persona = _limpio(f.get("persona"))
    if not persona and len(parts) > 3:
        persona, _ = parts[3], derivados.append("persona")
    if persona:
        out["Persona"] = {"select": {"name": persona}}

    dolor = f.get("dolor") or ""
    if not dolor and len(parts) > 4 and parts[4].lower().startswith("dolor"):
        dolor, _ = parts[4], derivados.append("dolor")
    if dolor:
        out["Dolor"] = txt(_limpio(dolor))

    angulo = _limpio(f.get("angulo"))
    if angulo:
        out["Ángulo"] = {"select": {"name": angulo}}

    ronda = _ronda(f.get("ronda"), vault, ads_root)
    if ronda:
        out["Ronda"] = {"select": {"name": ronda}}

    fmt = _limpio(f.get("formato")).lower()
    if not fmt:
        fmt, _ = os.path.basename(rel).lower(), derivados.append("formato")
    for needle, val in AD_FORMATO:
        if needle in fmt:
            out["Formato"] = {"select": {"name": val}}
            break

    out["Plataforma"] = {"select": {"name": "Meta"}}
    return out, derivados


def operativa(f, days):
    """El tablero es para lo que se mueve. Una pieza publicada hace meses no es
    trabajo en curso: es archivo, y el archivo vive en el vault. Sin este corte,
    el primer --apply sube 100 piezas viejas y el kanban deja de servir para
    mirar la semana, que es para lo único que sirve un kanban."""
    if not days:
        return True
    if estado_post(f) != "Publicado":
        return True
    m = ISO.search((f.get("date") or "") + " " + (f.get("status") or ""))
    if not m:
        return True          # publicada sin fecha: no la escondemos, es deuda visible
    pub = datetime.strptime(m.group(1), "%Y-%m-%d").date()
    return (date.today() - pub).days <= days


def walk(root, vault, skip_prefixes=()):
    """Recolecta `.md` con footer. Recaudo: nunca sale del root configurado, y
    saltea carpetas ocultas y READMEs."""
    out = {}
    for dp, dn, fn in os.walk(root):
        dn[:] = [d for d in dn if not d.startswith(".")]
        for f in fn:
            if not f.endswith(".md") or f.lower() == "readme.md":
                continue
            p = os.path.join(dp, f)
            rel = os.path.relpath(p, vault)
            if any(rel.startswith(x) for x in skip_prefixes):
                continue
            _, fields, corte = read_piece(p)
            if not fields:
                continue
            out[rel] = {"name": f[:-3], "f": fields, "corte": corte}
    return out


def _rich(props, name):
    return "".join(x["plain_text"] for x in props.get(name, {}).get("rich_text", []))


def remote_rows(ds):
    """Filas del tablero, LLAVEADAS POR `ID` (D-9).

    Devuelve (por_id, sin_llave). La columna `Archivo` queda como dato
    informativo: se sigue escribiendo y actualizando, pero ya no empareja.

    Una fila sin `ID` —toda fila anterior al backfill— NO se empareja por ruta
    como respaldo. Ese respaldo silencioso es exactamente lo que dejó 57 filas
    apuntando al archivo equivocado cuando el vault se reorganizó: el
    emparejamiento parecía funcionar y estaba mintiendo. Se reportan aparte,
    como pendientes de re-llavear.
    """
    por_id, sin_llave, cursor = {}, [], None
    while True:
        body = {"page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        r = api("/data_sources/%s/query" % ds, "POST", body)
        for pg in r["results"]:
            props = pg["properties"]
            est = (props.get("Estado") or {}).get("select") or {}
            fila = {"id": pg["id"], "estado": est.get("name", ""),
                    "archivo": _rich(props, "Archivo")}
            pid = _rich(props, "ID").strip().lower()
            if pid:
                por_id[pid] = fila
            else:
                sin_llave.append(fila)
        if not r.get("has_more"):
            return por_id, sin_llave
        cursor = r["next_cursor"]


# ── un pase (posts o ads) ─────────────────────────────────────────────────────

def sync_rows(kind, brand, marca, vault, local, apply_, only_to_notion, ads_root=""):
    ds = ADS_DS if kind == "ads" else CONTENT_DS
    titulo = "Creativo" if kind == "ads" else "Pieza"
    estado = estado_ad if kind == "ads" else estado_post
    remote, sin_llave = remote_rows(ds)

    # El vault se re-indexa por id. Una pieza sin id no se puede emparejar con
    # nada de forma estable, así que no entra al pase: se cuenta y se nombra.
    por_id = {}
    sin_id = []
    for k in sorted(local):
        pid = (local[k]["f"].get("id") or "").strip().lower()
        if pid:
            por_id.setdefault(pid, k)
        else:
            sin_id.append(k)

    nuevas = [pid for pid in sorted(por_id) if pid not in remote]
    existentes = [pid for pid in sorted(por_id) if pid in remote]
    print("\n%s · marca %s (Notion: %s)" % (kind.upper(), brand, marca))
    print("  en el vault: %d (%d con id) · filas en Notion: %d (%d con ID)"
          % (len(local), len(por_id), len(remote) + len(sin_llave), len(remote)))
    print("  a crear: %d · ya existen: %d" % (len(nuevas), len(existentes)))

    if sin_id:
        print("  %d pieza(s) del vault SIN id: no se sincronizan." % len(sin_id))
        print("     Correr scripts/backfill-piece-id.py. Ejemplos:")
        for k in sin_id[:5]:
            print("       %s" % k)
    if sin_llave:
        print("  %d fila(s) de Notion SIN ID — pendientes de re-llavear." % len(sin_llave))
        print("     NO se emparejan por ruta: el respaldo silencioso es lo que")
        print("     dejó 57 filas apuntando al archivo equivocado. Ejemplos:")
        for f in sin_llave[:5]:
            print("       %s" % (f["archivo"] or "(sin Archivo)"))

    # La pieza se movió: la fila ya empareja por id, y lo que hay que corregir es
    # el dato informativo. Antes esto era la llave y por eso una mudanza
    # rompía el emparejamiento; ahora es una actualización de rutina.
    mudadas = [(pid, por_id[pid]) for pid in existentes
               if remote[pid]["archivo"] != por_id[pid]]
    if mudadas:
        print("  %d pieza(s) cambiaron de ruta — la fila empareja igual, se actualiza `Archivo`:"
              % len(mudadas))
        for pid, k in mudadas[:5]:
            print("     %s  %s → %s" % (pid, remote[pid]["archivo"] or "(vacío)", k))

    devuelta = []
    if not only_to_notion:
        for pid in existentes:
            k = por_id[pid]
            est = remote[pid]["estado"]
            cur = local[k]["f"].get("status") or ""
            if est and not cur.lower().startswith(est.lower()):
                devuelta.append((k, est, cur))
        print("  estado a escribir de vuelta al vault: %d" % len(devuelta))
        for k, nuevo, viejo in devuelta[:10]:
            print("     %s: %s → %s" % (os.path.basename(k)[:46], viejo or "(vacío)", nuevo))

    if not apply_:
        return

    for pid in nuevas:
        k = por_id[pid]
        d = local[k]; f = d["f"]
        props = {
            titulo: {"title": [{"text": {"content": d["name"][:200]}}]},
            "Marca": {"select": {"name": marca}},
            "Estado": {"select": {"name": estado(f)}},
            # `ID` es la llave; `Archivo` es dato informativo y se actualiza solo.
            "ID": txt(pid),
            "Archivo": txt(k), "Último corte": txt(d["corte"]),
        }
        if f.get("url", "").startswith("http"):
            props["URL"] = {"url": f["url"]}
        if kind == "ads":
            campos, derivados = ad_fields(k, f, vault, ads_root)
            props.update(campos)
            props["Notas"] = txt(f.get("notas"))
            if derivados:
                print("     %s — derivado de la ruta: %s"
                      % (os.path.basename(k)[:50], ", ".join(derivados)))
        else:
            props["Fórmula"] = txt(f.get("formula"))
            crudo = (f.get("platform") or f.get("canal") or "").strip().lower()
            canal = CANAL.get(crudo.split()[0]) if crudo else None
            if canal:
                props["Canal"] = {"select": {"name": canal}}
            m = ISO.search(f.get("date", ""))
            if m:
                props["Fecha"] = {"date": {"start": m.group(1)}}
        api("/pages", "POST", {"parent": {"type": "data_source_id", "data_source_id": ds},
                               "properties": props})
    if nuevas:
        print("  ✓ %d filas creadas." % len(nuevas))

    for pid, k in mudadas:
        api("/pages/%s" % remote[pid]["id"], "PATCH", {"properties": {"Archivo": txt(k)}})
    if mudadas:
        print("  ✓ %d rutas informativas actualizadas." % len(mudadas))

    for k, nuevo, _ in devuelta:
        p = os.path.join(vault, k)
        t = io.open(p, encoding="utf-8").read()
        if re.search(r"^-\s+status:.*$", t, re.M):
            t = re.sub(r"^-\s+status:.*$", "- status: %s" % nuevo.lower(), t, count=1, flags=re.M)
        else:
            t = t.rstrip("\n") + "\n- status: %s\n" % nuevo.lower()
        io.open(p, "w", encoding="utf-8").write(t)
    if devuelta:
        print("  ✓ %d estados escritos de vuelta al vault." % len(devuelta))


def ask_scope(brand, counts):
    print("¿Qué querés sincronizar de %s?\n" % brand)
    labels = [("posts", "solo contenido orgánico → Content Creator"),
              ("ads",   "solo creativos de campañas → Ads Creator"),
              ("docs",  "solo documentación → páginas Docs"),
              ("all",   "todo el vault")]
    for i, (k, desc) in enumerate(labels, 1):
        print("  %d) %-6s %-44s %s" % (i, k, desc, counts.get(k, "")))
    try:
        raw = input("\nOpción [1]: ").strip() or "1"
    except EOFError:
        sys.exit("\nSin terminal interactiva: pasá --scope %s." % "|".join(SCOPES))
    if raw in SCOPES:
        return raw
    if raw.isdigit() and 1 <= int(raw) <= len(labels):
        return labels[int(raw) - 1][0]
    sys.exit("Opción inválida: %s" % raw)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--brand", required=True)
    ap.add_argument("--scope", choices=SCOPES, help="si se omite, pregunta")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--only-to-notion", action="store_true",
                    help="no escribe el estado de vuelta al vault")
    ap.add_argument("--all-history", action="store_true",
                    help="ignora el corte operativo y sube también el archivo publicado")
    ap.add_argument("--ronda", metavar="N",
                    help="solo los creativos de esa ronda. El número, o el nombre "
                         "completo del documento de ronda")
    ap.add_argument("--only", metavar="RUTA",
                    help="sincroniza UNA sola pieza o creativo, por su ruta relativa al "
                         "vault. El resto del lote queda sin tocar")
    a = ap.parse_args()
    load_env()

    cfg = json.load(io.open(os.path.join(ROOT, "config/sources.json"), encoding="utf-8"))
    brands = {b["id"]: b for b in cfg["brands"]}
    if a.brand not in brands:
        sys.exit("Marca desconocida: %s. Configuradas: %s" % (a.brand, ", ".join(brands)))
    brand = brands[a.brand]
    notion = brand.get("notion") or {}
    marca = notion.get("marca")
    if not marca:
        sys.exit("La marca '%s' no tiene notion.marca en config/sources.json.\n"
                 "Es la etiqueta exacta de la opción del select Marca en Notion." % a.brand)

    vault = os.path.expanduser(brand["vault"])
    roots = brand["content"]
    roots = [roots] if isinstance(roots, str) else roots
    faltan = [r for r in roots if not os.path.isdir(os.path.join(vault, r))]
    if faltan:
        sys.exit("No existe el contenido de la marca: %s" % ", ".join(faltan))
    ads_prefixes = [os.path.normpath(x) for x in (notion.get("ads") or [])]

    posts = {}
    for r in roots:
        posts.update(walk(os.path.join(vault, r), vault, skip_prefixes=ads_prefixes))
    dias = 0 if a.all_history else notion.get("operational_days") or 0
    if dias:
        antes = len(posts)
        posts = {k: v for k, v in posts.items() if operativa(v["f"], dias)}
        archivo = antes - len(posts)
        if archivo:
            print("Corte operativo: %d piezas publicadas hace más de %d días quedan fuera "
                  "del tablero (--all-history para incluirlas)." % (archivo, dias))
    ads = {}
    for pre in ads_prefixes:
        base = os.path.join(vault, pre)
        if os.path.isdir(base):
            ads.update(walk(base, vault))
    if a.only:
        # Alcance por elemento. Es la MISMA operación que el lote —mismo walk, mismos
        # campos, mismo estado derivado— nada más que sobre una clave. Si no
        # coincide con ninguna, se corta acá en vez de sincronizar un lote entero
        # que nadie pidió.
        objetivo = os.path.normpath(a.only)
        posts = {k: v for k, v in posts.items() if os.path.normpath(k) == objetivo}
        ads = {k: v for k, v in ads.items() if os.path.normpath(k) == objetivo}
        if not posts and not ads:
            sys.exit("--only %s no coincide con ninguna pieza ni creativo del vault.\n"
                     "La ruta va relativa a la raíz del vault, con la extensión .md." % a.only)

    if a.ronda:
        # El filtro usa la MISMA resolución de ronda que la fila que se va a crear
        # (_ronda: el footer manda, el documento de Rondas/ resuelve el nombre), así
        # que filtrar por ronda y ver la ronda en el tablero no pueden discrepar.
        quiere = _ronda(a.ronda, vault, ads_prefixes[0] if ads_prefixes else "")
        antes_ronda = len(ads)
        ads = {k: v for k, v in ads.items()
               if _ronda(v["f"].get("ronda"), vault,
                         ads_prefixes[0] if ads_prefixes else "") == quiere}
        if not ads:
            sys.exit("Ningún creativo declara la ronda %r (se miraron %d).\n"
                     "Las rondas salen del campo `ronda` del footer de cada creativo."
                     % (quiere, antes_ronda))
        print("Ronda %s: %d de %d creativos." % (quiere, len(ads), antes_ronda))

    no_creativos = [k for k in ads if no_es_creativo(k)]
    for k in no_creativos:
        del ads[k]
    if no_creativos:
        print("Ads: %d archivos excluidos por no ser creativos (evaluaciones, "
              "framework, rondas)." % len(no_creativos))

    scope = a.scope or ask_scope(a.brand, {
        "posts": "(%d archivos)" % len(posts),
        "ads": "(%d archivos)" % len(ads),
        "docs": "(%d carpetas)" % len(notion.get("docs") or []),
        "all": "(%d archivos + docu)" % (len(posts) + len(ads))})

    if scope in ("posts", "all"):
        sync_rows("posts", a.brand, marca, vault, posts, a.apply, a.only_to_notion)
    if scope in ("ads", "all"):
        if not ads:
            print("\nADS · la marca %s no tiene creativos configurados (notion.ads vacío)." % a.brand)
        else:
            sync_rows("ads", a.brand, marca, vault, ads, a.apply, a.only_to_notion,
                      ads_root=ads_prefixes[0] if ads_prefixes else "")
    if scope in ("docs", "all"):
        if not (notion.get("docs") or []):
            print("\nDOCU · la marca %s no publica documentación (notion.docs vacío)." % a.brand)
        else:
            cmd = [sys.executable, os.path.join(HERE, "sync-notion-docs.py"), "--brand", a.brand]
            if a.apply:
                cmd.append("--apply")
            print()
            subprocess.call(cmd)

    if not a.apply:
        print("\nDRY-RUN. Nada se escribió. Agregá --apply para aplicar.")


if __name__ == "__main__":
    main()
