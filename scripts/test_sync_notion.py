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


if __name__ == "__main__":
    unittest.main(verbosity=2)
