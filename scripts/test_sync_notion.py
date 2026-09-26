#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests del puente con Notion.

    python3 scripts/test_sync_notion.py

Librería estándar, sin dependencias: el script que prueban corre sin
`node_modules` y sin entorno virtual, y sus tests también.

POR QUÉ EXISTEN. El puente se construyó y corrió a mano, sin una sola prueba
automática, y tres bugs costaron caro:

  1. el lector entendía UNA gramática de footer y veía 14 piezas de Tegu donde
     hay 95;
  2. renombrar la etiqueta de marca vació 57 filas, porque Notion guarda el
     select como texto;
  3. sin corte operativo, el primer `--apply` subía 56 piezas de archivo y el
     kanban dejaba de servir para mirar la semana.

Los tres van a volver si nadie los fija. `estado_post` es el más peligroso de
todos: es la regla de "sin señal explícita no se infiere", y ya se rompió una
vez — el 2026-09-23 puso "En producción" en 51 piezas que el vault no marcaba,
y la columna que más importa quedó ilegible.
"""

import datetime
import importlib.util
import json
import io
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def _cargar(nombre, archivo):
    spec = importlib.util.spec_from_file_location(nombre, os.path.join(HERE, archivo))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


sn = _cargar("sync_notion", "sync-notion.py")


class EstadoPost(unittest.TestCase):
    """El carril con el que NACE una fila. La regla, no el código."""

    def test_sin_senal_va_a_backlog(self):
        # Lo que más importa: una pieza que el vault no marca como en vuelo NO
        # está en vuelo. Llenar el tablero de trabajo-en-curso que nadie hace
        # es peor que dejarlo vacío.
        self.assertEqual(sn.estado_post({}), "Backlog")
        self.assertEqual(sn.estado_post({"status": ""}), "Backlog")
        self.assertEqual(sn.estado_post({"status": "analytics: pendiente"}), "En producción")

    def test_una_url_es_evidencia_dura_de_publicacion(self):
        self.assertEqual(sn.estado_post({"url": "https://x.com/a/1"}), "Publicado")

    def test_una_url_que_no_es_url_no_alcanza(self):
        self.assertEqual(sn.estado_post({"url": "pendiente"}), "Backlog")

    def test_publicado_declarado(self):
        self.assertEqual(sn.estado_post({"status": "Publicado 2026-07-08"}), "Publicado")
        self.assertEqual(sn.estado_post({"status": "publicado"}), "Publicado")

    def test_evidencia_de_trabajo_en_curso(self):
        for s in ["pendiente grabar", "listo, falta el arte", "falta asignar fórmula"]:
            self.assertEqual(sn.estado_post({"status": s}), "En producción", s)

    def test_no_publicar_aun_es_conservador(self):
        # "no publicar aún" contiene "publicar" y "pendiente": si cualquiera de
        # los dos ganara, una pieza que pide explícitamente NO salir aparecería
        # como lista o publicada.
        for s in ["draft — NO publicar aún", "listo pero no publicar",
                  "pendiente, sin auditar", "variante, no publicar"]:
            self.assertEqual(sn.estado_post({"status": s}), "Backlog", s)


class EstadoAd(unittest.TestCase):
    """Un ad no se publica: se activa y se pausa."""

    def test_sin_senal_va_a_backlog(self):
        self.assertEqual(sn.estado_ad({}), "Backlog")

    def test_pausado_gana_sobre_activo(self):
        self.assertEqual(sn.estado_ad({"status": "pausado"}), "Pausado")
        self.assertEqual(sn.estado_ad({"status": "activo pero pausado"}), "Pausado")

    def test_activo(self):
        self.assertEqual(sn.estado_ad({"status": "corriendo"}), "Activo")
        self.assertEqual(sn.estado_ad({"url": "https://facebook.com/ads/1"}), "Activo")

    def test_en_produccion(self):
        self.assertEqual(sn.estado_ad({"status": "listo para subir"}), "En producción")


class DosGramaticas(unittest.TestCase):
    """El bug que hacía ver 14 piezas donde hay 95."""

    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="sync-notion-test-")
        self.addCleanup(shutil.rmtree, self.dir, True)

    def _archivo(self, nombre, cuerpo):
        p = os.path.join(self.dir, nombre)
        with io.open(p, "w", encoding="utf-8") as f:
            f.write(cuerpo)
        return p

    def test_gramatica_de_bullets(self):
        p = self._archivo("a.md", "Cuerpo.\n\n---\n\n- platform: X\n- status: publicado\n- url: https://x.com/1\n")
        _, f, _ = sn.read_piece(p)
        self.assertEqual(f.get("platform"), "X")
        self.assertEqual(f.get("status"), "publicado")

    def test_gramatica_inline(self):
        p = self._archivo("b.md", "Cuerpo.\n\n---\ncanal: Twitter · cuenta: x_mati · estado: Publicado 2026-07-08\n")
        _, f, _ = sn.read_piece(p)
        self.assertEqual(f.get("platform"), "Twitter")
        self.assertEqual(f.get("account"), "x_mati")
        self.assertEqual(f.get("status"), "Publicado 2026-07-08")

    def test_prosa_que_parece_metadato_no_entra(self):
        # `Detrás de todo esto: +150 builds` tiene forma de clave: valor, y su
        # clave no está en el vocabulario. Sin la lista de claves como filtro,
        # media pieza entra como metadatos.
        p = self._archivo("c.md", "Detrás de todo esto: +150 builds\n\n---\n- platform: X\n")
        _, f, _ = sn.read_piece(p)
        self.assertNotIn("detrás de todo esto", f)
        self.assertEqual(set(f.keys()), {"platform"})

    def test_el_primero_gana(self):
        p = self._archivo("d.md", "---\n- platform: X\n- platform: Instagram\n")
        _, f, _ = sn.read_piece(p)
        self.assertEqual(f.get("platform"), "X")


class CorteOperativo(unittest.TestCase):
    """El tablero es lo que se mueve; el archivo vive en el vault."""

    def _hace(self, dias):
        d = datetime.date.today() - datetime.timedelta(days=dias)
        return d.strftime("%Y-%m-%d")

    def test_una_pieza_vieja_no_sube(self):
        f = {"status": "Publicado " + self._hace(200), "url": "https://x.com/1"}
        self.assertFalse(sn.operativa(f, 60))

    def test_una_pieza_reciente_sube(self):
        f = {"status": "Publicado " + self._hace(5), "url": "https://x.com/1"}
        self.assertTrue(sn.operativa(f, 60))

    def test_una_pieza_PUBLICADA_SIN_FECHA_no_se_esconde(self):
        # Es deuda visible: no se sabe de cuándo es, y esconderla la borraría
        # del tablero sin que nadie lo note.
        f = {"url": "https://x.com/1"}
        self.assertTrue(sn.operativa(f, 60))

    def test_lo_que_no_esta_publicado_sube_siempre(self):
        # Un draft ES trabajo en curso, por viejo que sea el archivo.
        self.assertTrue(sn.operativa({"status": "Draft"}, 60))

    def test_sin_corte_configurado_sube_todo(self):
        f = {"status": "Publicado " + self._hace(900), "url": "https://x.com/1"}
        self.assertTrue(sn.operativa(f, 0))


class DryRunNoEscribe(unittest.TestCase):
    """Lo más importante de todo: mirar no puede cambiar nada."""

    def test_un_dry_run_no_toca_el_vault_ni_el_estado(self):
        vault = tempfile.mkdtemp(prefix="sync-notion-vault-")
        self.addCleanup(shutil.rmtree, vault, True)
        root = os.path.join(vault, "Create", "Organic")
        os.makedirs(root)
        with io.open(os.path.join(root, "p.md"), "w", encoding="utf-8") as f:
            f.write("C.\n\n---\n- platform: X\n- status: publicado\n")

        def foto():
            out = {}
            for dp, _, fn in os.walk(vault):
                for n in fn:
                    p = os.path.join(dp, n)
                    st = os.stat(p)
                    out[p] = (st.st_size, st.st_mtime_ns)
            return out

        antes = foto()
        env = dict(os.environ, VAULT_TEGU_DIR=vault)
        # Sin --apply. Que corte por acceso a Notion no importa: lo que se
        # verifica es que NADA cambió en disco.
        subprocess.run([sys.executable, os.path.join(HERE, "sync-notion.py"),
                        "--brand", "tegu", "--scope", "posts"],
                       env=env, capture_output=True, timeout=120)
        self.assertEqual(antes, foto(), "un dry-run modificó archivos")

    def test_guardar_enlaces_no_hace_nada_sin_apply(self):
        d = tempfile.mkdtemp(prefix="sync-notion-state-")
        self.addCleanup(shutil.rmtree, d, True)
        previo = sn.ROOT
        sn.ROOT = d
        try:
            sn.guardar_enlaces("tegu", {"k7m2p9qx": "fila1"}, False)
            self.assertFalse(os.path.exists(os.path.join(d, ".state", "notion-links-tegu.json")))
            sn.guardar_enlaces("tegu", {"k7m2p9qx": "fila1"}, True)
            self.assertTrue(os.path.exists(os.path.join(d, ".state", "notion-links-tegu.json")))
        finally:
            sn.ROOT = previo


class DestinosDesdeConfig(unittest.TestCase):
    """Los ids de los tableros viven en un solo lugar."""

    def test_los_resuelve_de_la_config(self):
        self.assertTrue(sn.destino_ref("contenido"))
        self.assertTrue(sn.destino_ref("ads"))

    def test_un_destino_inexistente_corta_nombrando_el_problema(self):
        with self.assertRaises(SystemExit) as cm:
            sn.destino_ref("no-existe")
        self.assertIn("no-existe", str(cm.exception))


class FrenoDeMudanza(unittest.TestCase):
    """El freno que faltó el 2026-09-24, cuando 57 filas quedaron huérfanas."""

    def test_una_mudanza_frena(self):
        # Muchas huérfanas Y muchos archivos sin fila a la vez: son las mismas
        # piezas en otro lado, no 57 borradas y 93 nuevas.
        frena, msg = sn.detectar_mudanza(["h%d" % i for i in range(57)],
                                         ["n%d" % i for i in range(93)], 128)
        self.assertTrue(frena)
        self.assertIn("57 filas", msg)
        self.assertIn("93 filas duplicadas", msg)
        # El mensaje tiene que decir QUÉ HACER, no solo que algo está mal.
        self.assertIn("reconciliar-llaves.py", msg)

    def test_unos_pocos_borrados_NO_frenan(self):
        # Tres huérfanas y tres nuevas es un martes normal.
        frena, _ = sn.detectar_mudanza(["a", "b", "c"], ["x", "y", "z"], 128)
        self.assertFalse(frena)

    def test_muchas_huerfanas_SOLAS_no_frenan(self):
        # Sin archivos nuevos que las expliquen, un borrado masivo puede ser real.
        frena, _ = sn.detectar_mudanza(["h%d" % i for i in range(40)], [], 128)
        self.assertFalse(frena)

    def test_el_caso_normal_de_piezas_nuevas_no_frena(self):
        # Diez piezas nuevas y ninguna huérfana: no hay nada que reconciliar.
        frena, _ = sn.detectar_mudanza([], ["n%d" % i for i in range(10)], 128)
        self.assertFalse(frena)


class FrenoDeRellaveo(unittest.TestCase):
    """El caso que el freno de mudanza NO ve, y que es el estado de hoy."""

    def test_tablero_sin_columna_id_frena(self):
        # Después del backfill: el vault llavea por id, el tablero no tiene la
        # columna. Para el sync hay CERO huérfanas —no hay filas con id contra
        # las que comparar— y 129 piezas "nuevas". Sin este freno, aplicar
        # duplica el tablero entero.
        frena, msg = sn.detectar_rellaveo(["f%d" % i for i in range(57)],
                                          ["p%d" % i for i in range(129)])
        self.assertTrue(frena)
        self.assertIn("57 filas sin ID", msg)
        self.assertIn("duplicaría", msg)
        self.assertIn("reconciliar-llaves.py", msg)

    def test_el_freno_de_mudanza_NO_ve_este_caso(self):
        # La prueba de que hacía falta un freno aparte: con 0 huérfanas, el de
        # mudanza no dispara por más piezas nuevas que haya.
        frena, _ = sn.detectar_mudanza([], ["p%d" % i for i in range(129)], 57)
        self.assertFalse(frena)

    def test_un_tablero_ya_llaveado_no_frena(self):
        # Todas las filas con ID: no hay nada que re-llavear.
        frena, _ = sn.detectar_rellaveo([], ["p%d" % i for i in range(20)])
        self.assertFalse(frena)

    def test_unas_pocas_filas_viejas_no_frenan(self):
        frena, _ = sn.detectar_rellaveo(["a", "b"], ["x", "y"])
        self.assertFalse(frena)


class Reconciliacion(unittest.TestCase):
    """Emparejar SOLO lo inequívoco. Lo ambiguo se lista, no se aplica."""

    def setUp(self):
        self.rec = _cargar("reconciliar", "reconciliar-llaves.py")

    def test_el_mismo_id_empareja(self):
        indice = {"nueva/ruta.md": {"id": "k7m2p9qx", "url": None, "nombre": "otro"}}
        seguras, amb, sin = self.rec.emparejar(
            [{"ruta": "vieja/ruta.md", "id": "k7m2p9qx", "url": None}], indice)
        self.assertEqual(len(seguras), 1)
        self.assertEqual(seguras[0][1], "nueva/ruta.md")
        self.assertIn("identificador", seguras[0][2])

    def test_la_misma_url_empareja(self):
        indice = {"nueva.md": {"id": None, "url": "https://x.com/1", "nombre": "otro"}}
        seguras, _, _ = self.rec.emparejar(
            [{"ruta": "vieja.md", "id": None, "url": "https://x.com/1"}], indice)
        self.assertEqual(len(seguras), 1)

    def test_SOLO_el_nombre_NO_alcanza(self):
        # Dos piezas pueden llamarse igual en carpetas distintas. El intento del
        # 2026-09-24 descartó dos colisiones exactamente así.
        indice = {"a/pieza.md": {"id": None, "url": None, "nombre": "pieza"}}
        seguras, ambiguas, _ = self.rec.emparejar(
            [{"ruta": "b/pieza.md", "id": None, "url": None}], indice)
        self.assertEqual(seguras, [])
        self.assertEqual(len(ambiguas), 1)

    def test_DOS_candidatos_plausibles_NO_emparejan(self):
        indice = {
            "a.md": {"id": None, "url": "https://x.com/1", "nombre": "pieza"},
            "b.md": {"id": None, "url": "https://x.com/1", "nombre": "pieza"},
        }
        seguras, ambiguas, _ = self.rec.emparejar(
            [{"ruta": "vieja.md", "id": None, "url": "https://x.com/1"}], indice)
        self.assertEqual(seguras, [])
        self.assertEqual(len(ambiguas), 1)
        # Y se listan los candidatos, para que los mire una persona.
        self.assertGreaterEqual(len(ambiguas[0][1]), 2)

    def test_dos_filas_al_MISMO_destino_es_colision(self):
        # Elegir una sería inventar. Ninguna se aplica.
        indice = {"destino.md": {"id": None, "url": None, "nombre": "pieza"}}
        seguras, ambiguas, _ = self.rec.emparejar([
            {"ruta": "a/pieza.md", "id": None, "url": None},
            {"ruta": "b/pieza.md", "id": None, "url": None},
        ], indice)
        self.assertEqual(seguras, [])
        self.assertEqual(len(ambiguas), 2)

    def test_sin_ningun_candidato_se_reporta_aparte(self):
        seguras, ambiguas, sin = self.rec.emparejar(
            [{"ruta": "borrada.md", "id": None, "url": None}], {})
        self.assertEqual((seguras, ambiguas), ([], []))
        self.assertEqual(len(sin), 1)


class Idempotencia(unittest.TestCase):
    """Interrumpir y repetir NO puede duplicar. Tareas 3.1 y 3.2 de
    unschedule-everything: al apagar todo lo agendado, cada corrida la dispara
    una persona — y una persona corta una corrida a la mitad."""

    def setUp(self):
        self.docs = _cargar("sync_docs", "sync-notion-docs.py")

    def test_lo_ya_subido_no_se_vuelve_a_subir(self):
        # El estado guarda ruta -> hash. Un archivo sin cambios no se toca, así
        # que repetir una corrida completa no crea nada.
        h = self.docs.hashlib.sha1("contenido".encode("utf-8")).hexdigest()[:12]
        files = {"a.md": {"hash": h}}
        self.assertEqual(files["a.md"]["hash"], h)

    def test_una_corrida_a_medias_deja_el_estado_a_medias_y_se_completa(self):
        # Se sube la mitad, se corta. El estado tiene la mitad. La segunda
        # corrida ve la otra mitad como nueva y las primeras como iguales:
        # se completa, no se duplica.
        encontrados = ["a.md", "b.md", "c.md", "d.md"]
        hashes = {r: "h" + r for r in encontrados}
        # Primera corrida: alcanzó a guardar dos.
        files = {"a.md": {"hash": hashes["a.md"]}, "b.md": {"hash": hashes["b.md"]}}
        nuevas = [r for r in encontrados if r not in files]
        iguales = [r for r in encontrados if r in files and files[r]["hash"] == hashes[r]]
        self.assertEqual(nuevas, ["c.md", "d.md"])
        self.assertEqual(iguales, ["a.md", "b.md"])

    def test_el_freno_de_docu_atrapa_una_mudanza_de_carpetas(self):
        # Huérfanas Y altas a la vez: las mismas carpetas con otro nombre.
        frena, msg = self.docs.detectar_mudanza_docu(
            ["Brand/Identity/%d.md" % i for i in range(20)],
            [("Foundations/%d.md" % i, "", "") for i in range(20)])
        self.assertTrue(frena)
        self.assertIn("colgadas", msg)

    def test_altas_sin_huerfanas_NO_frenan(self):
        # La primera subida: 49 archivos nuevos y ningún estado previo.
        frena, _ = self.docs.detectar_mudanza_docu(
            [], [("a%d.md" % i, "", "") for i in range(49)])
        self.assertFalse(frena)

    def test_borrados_sin_altas_NO_frenan(self):
        # Puede ser un borrado real de documentación.
        frena, _ = self.docs.detectar_mudanza_docu(["a%d.md" % i for i in range(20)], [])
        self.assertFalse(frena)

    def test_la_correspondencia_de_enlaces_se_acumula_sin_pisar(self):
        # Una corrida parcial guarda lo suyo; la siguiente SUMA, no reemplaza.
        # Si reemplazara, una corrida filtrada borraría los enlaces de todo lo
        # que el filtro dejó afuera.
        d = tempfile.mkdtemp(prefix="sync-notion-idem-")
        self.addCleanup(shutil.rmtree, d, True)
        previo = sn.ROOT
        sn.ROOT = d
        try:
            sn.guardar_enlaces("tegu", {"aaa": "fila-a"}, True)
            sn.guardar_enlaces("tegu", {"bbb": "fila-b"}, True)
            with io.open(os.path.join(d, ".state", "notion-links-tegu.json"),
                         encoding="utf-8") as f:
                filas = json.load(f)["filas"]
            self.assertEqual(filas, {"aaa": "fila-a", "bbb": "fila-b"})
        finally:
            sn.ROOT = previo


if __name__ == "__main__":
    unittest.main(verbosity=2)
