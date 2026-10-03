from html.parser import HTMLParser
from html import unescape
import json
from pathlib import Path
import re
import subprocess
import unittest
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
README_PATH = ROOT / "README.md"
PROFILE_PATH = ROOT / "data" / "profile.json"
STATS_PATH = ROOT / "data" / "github-stats.json"
SITE_SOURCE_PATH = ROOT / "src" / "pages" / "index.astro"
CSS_PATH = ROOT / "src" / "styles" / "global.css"
SCRIPT_PATH = ROOT / "src" / "scripts" / "site.ts"
DIST_PATH = ROOT / "dist"
BASE_PATH = "/DiegoRomanP/"
PROJECT_IDS = ("lexitrace", "studyai", "contextia", "give-me-some-credit")
HTML_URI_ATTRIBUTES = {"href", "src", "srcset", "action", "formaction", "poster", "xlink:href"}


def normalize_uri_for_scheme_check(value):
    candidate = unescape(value.strip())
    for _ in range(3):
        decoded = unquote(candidate)
        if decoded == candidate:
            break
        candidate = decoded
    return "".join(character for character in candidate if not character.isspace() and ord(character) >= 0x20)


class PageAudit(HTMLParser):
    """Collect structural and local-resource details from the built static page."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.ids = set()
        self.fragments = []
        self.links = []
        self.icon_paths = []
        self.url_attributes = []
        self.repository_links = []
        self.resource_paths = []
        self.image_alts = []
        self.attributes = []
        self.headings = []
        self.text_parts = []
        self._heading = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append(tag)
        self.attributes.extend(attrs)
        self.url_attributes.extend(
            (tag, name, value)
            for name, value in attrs.items()
            if name.lower() in HTML_URI_ATTRIBUTES
        )
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag == "a" and "href" in attrs:
            href = attrs["href"]
            self.links.append(href)
            if href.startswith("#"):
                self.fragments.append(href[1:])
            if href.startswith("https://github.com/DiegoRomanP/") and href.count("/") >= 4:
                self.repository_links.append(href)
        if tag == "img":
            self.resource_paths.append(attrs.get("src", ""))
            self.image_alts.append(attrs.get("alt", ""))
        if tag == "source" and attrs.get("srcset"):
            self.resource_paths.append(attrs["srcset"])
        if tag == "script" and attrs.get("src"):
            self.resource_paths.append(attrs["src"])
        if tag == "link" and attrs.get("rel") in {"stylesheet", "icon"} and attrs.get("href"):
            self.resource_paths.append(attrs["href"])
            if attrs.get("rel") == "icon":
                self.icon_paths.append(attrs["href"])
        if tag in {"h1", "h2", "h3", "h4"}:
            self._heading = [tag, []]

    def handle_endtag(self, tag):
        if self._heading and tag == self._heading[0]:
            self.headings.append((self._heading[0], "".join(self._heading[1]).strip()))
            self._heading = None

    def handle_data(self, data):
        self.text_parts.append(data)
        if self._heading:
            self._heading[1].append(data)

    @property
    def text(self):
        return " ".join(" ".join(self.text_parts).split())


class ProfileReadmeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.readme = README_PATH.read_text(encoding="utf-8")
        cls.profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
        cls.stats = json.loads(STATS_PATH.read_text(encoding="utf-8"))
        cls.site_source = SITE_SOURCE_PATH.read_text(encoding="utf-8")
        cls.css = CSS_PATH.read_text(encoding="utf-8")
        cls.script = SCRIPT_PATH.read_text(encoding="utf-8")
        cls.markdown_link_pairs = re.findall(
            r"(?<!!)\[([^\]]+)\]\((https?://[^)]+)\)", cls.readme
        )
        cls.markdown_links = [href for _, href in cls.markdown_link_pairs]
        cls.markdown_images = re.findall(r"!\[([^\]]*)\]\(([^)]+)\)", cls.readme)
        cls.site_file = next(
            (
                candidate
                for candidate in (DIST_PATH / "index.html", DIST_PATH / "DiegoRomanP" / "index.html")
                if candidate.is_file()
            ),
            None,
        )
        cls.page = None
        cls.html = ""
        if cls.site_file:
            cls.html = cls.site_file.read_text(encoding="utf-8")
            cls.page = PageAudit()
            cls.page.feed(cls.html)

    def test_profile_and_project_facts_match_the_shared_source(self):
        self.assertIn(self.profile["intro"], self.readme)
        for project in self.profile["projects"]:
            with self.subTest(project=project["id"]):
                self.assertIn(project["name"], self.readme)
                self.assertIn(project["summary"], self.readme)
                self.assertEqual(self.markdown_links.count(project["url"]), 1)
        for item in self.profile["education"]["complementary"]:
            self.assertIn(item["name"], self.readme)
            self.assertIn(item["institution"], self.readme)
        for course in self.profile["education"]["courses"]:
            self.assertIn(course, self.readme)
        self.assertIn("AI Foundations Associate", self.readme)
        self.assertIn("Claude Code 101", self.readme)
        self.assertIn("Español nativo", self.readme)
        self.assertIn("Inglés avanzado (C1)", self.readme)
        self.assertIn("ICPNA", self.readme)

    def test_readme_is_gfm_with_one_h1_local_accessible_assets_and_public_links(self):
        headings = re.findall(r"(?m)^#\s+", self.readme)
        self.assertEqual(len(headings), 1)
        self.assertIn("# Hola, soy Diego Román 👋", self.readme)
        self.assertIn("GitHub en cifras", self.readme)
        self.assertIn(self.stats["generatedAt"][:10], self.readme)
        self.assertIn(str(self.stats["metrics"]["publicOwnedRepositories"]), self.readme)
        self.assertIn(str(self.stats["metrics"]["stars"]), self.readme)
        self.assertIn(str(self.stats["metrics"]["followers"]), self.readme)
        self.assertIn("no representa bytes de código ni nivel de dominio", self.readme.lower())
        for language in self.stats["metrics"]["languages"]:
            self.assertIn(f"{language['name']}: {language['count']}", self.readme)
        self.assertFalse(re.search(r"(?i)<\s*/?\s*(?:style|script|iframe)\b", self.readme))
        self.assertNotRegex(self.readme, r"<\s*/?\s*[A-Za-z][A-Za-z0-9-]*(?=\s|/?>)[^>]*>")
        self.assertFalse(
            re.search(r"(?i)\b(?:placeholder|TODO|FIXME|your name|main_fullstack_ia|GITHUB_TOKEN)\b", self.readme)
        )

        self.assertEqual(len(self.markdown_images), 2)
        for alt, target in self.markdown_images:
            with self.subTest(image=target):
                self.assertTrue(alt.strip())
                self.assertFalse(re.match(r"https?://", target))
                self.assertTrue((ROOT / target).is_file())

        expected_links = {
            self.profile["links"]["github"],
            self.profile["links"]["linkedin"],
            self.profile["links"]["portfolio"],
            self.stats["sources"]["profile"],
            self.stats["sources"]["repositories"],
        }
        self.assertTrue(expected_links.issubset(set(self.markdown_links)))
        self.assertFalse(any(not href.startswith("https://") for href in self.markdown_links))

    def test_stats_snapshot_contains_only_public_data_and_correct_aggregates(self):
        self.assertEqual(self.stats["schemaVersion"], 1)
        self.assertRegex(self.stats["generatedAt"], r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$")
        repositories = self.stats["repositories"]
        metrics = self.stats["metrics"]
        self.assertEqual(metrics["publicOwnedRepositories"], len(repositories))
        self.assertEqual(metrics["stars"], sum(repository["stars"] for repository in repositories))
        self.assertEqual(metrics["followers"], self.stats["profile"]["followers"])
        self.assertTrue(all(repository["url"].startswith("https://github.com/DiegoRomanP/") for repository in repositories))
        serialized = json.dumps(self.stats).lower()
        for sensitive_name in ("token", "authorization", "private", "email", "phone", "secret"):
            self.assertNotIn(f'"{sensitive_name}"', serialized)
        self.assertNotIn("main_fullstack_ia", serialized)

    def test_built_page_has_spanish_semantics_one_h1_and_valid_in_page_anchors(self):
        if self.page is None:
            self.fail("Ejecuta npm run build antes de la prueba de la página compilada.")

        html_tag = re.search(r"<html\b([^>]*)>", self.html, re.IGNORECASE)
        self.assertIsNotNone(html_tag)
        self.assertRegex(html_tag.group(1), r'\blang=["\']es["\']')
        self.assertEqual(sum(tag == "h1" for tag, _ in self.page.headings), 1)
        self.assertIn(
            '<link rel="canonical" href="https://diegoromanp.github.io/DiegoRomanP/">',
            self.html,
        )
        self.assertIn("Diego Román", self.page.text)
        self.assertIn(self.profile["intro"], self.page.text)
        for project in self.profile["projects"]:
            with self.subTest(project=project["id"]):
                self.assertIn(project["name"], self.page.text)
                self.assertEqual(self.page.links.count(project["url"]), 1)
        for language in self.stats["metrics"]["languages"][:4]:
            self.assertIn(language["name"], self.page.text)
            count_label = "repositorio" if language["count"] == 1 else "repositorios"
            self.assertIn(f"{language['count']} {count_label}", self.page.text)
        if len(self.stats["metrics"]["languages"]) > 4:
            self.assertIn("Otros lenguajes", self.page.text)
        for landmark in ("header", "nav", "main", "footer"):
            self.assertIn(landmark, self.page.tags)
        self.assertIn("skip-link", self.html)
        for fragment in self.page.fragments:
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, self.page.ids)
        self.assertIn("https://github.com/DiegoRomanP/context-ia-obsidian/releases/tag/v0.1.0", self.page.links)
        self.assertTrue(all(alt.strip() for alt in self.page.image_alts))

    def test_built_resources_are_local_base_aware_and_free_of_trackers(self):
        if self.page is None:
            self.fail("Ejecuta npm run build antes de comprobar los recursos compilados.")

        for resource in self.page.resource_paths:
            with self.subTest(resource=resource):
                self.assertTrue(resource.startswith(BASE_PATH), resource)
                relative_path = resource.removeprefix(BASE_PATH)
                self.assertTrue((DIST_PATH / relative_path).is_file(), resource)
                self.assertFalse(resource.startswith("//"))

        self.assertTrue(all(alt.strip() for alt in self.page.image_alts))
        self.assertFalse(any(attribute.lower().startswith("on") for attribute in self.page.attributes))
        self.assertNotRegex(self.html, r"(?i)google-analytics|googletagmanager|plausible\.io|hotjar")
        for tag, attribute, raw_value in self.page.url_attributes:
            values = raw_value.split(",") if attribute == "srcset" else [raw_value]
            for value in values:
                uri = value.strip().split()[0]
                normalized = normalize_uri_for_scheme_check(uri)
                with self.subTest(tag=tag, attribute=attribute, value=uri):
                    self.assertFalse(normalized.lower().startswith("javascript:"))
                    parsed = urlsplit(normalized)
                    if parsed.scheme:
                        self.assertEqual(parsed.scheme.lower(), "https")
                    else:
                        self.assertTrue(uri.startswith(BASE_PATH) or uri.startswith("#"))
        self.assertIn("github-languages.svg", self.html)
        self.assertIn("lexitrace-flow.svg", self.html)
        self.assertIn("lexitrace-flow-mobile.svg", self.html)

        for asset in (ROOT / "public" / "assets").rglob("*.svg"):
            source = asset.read_text(encoding="utf-8")
            root = ElementTree.parse(asset).getroot()
            with self.subTest(asset=asset.relative_to(ROOT)):
                self.assertTrue(root.attrib.get("width"))
                self.assertTrue(root.attrib.get("height"))
                self.assertTrue(root.attrib.get("viewBox"))
                self.assertNotRegex(source, r"(?i)<\s*script\b|<\s*foreignObject\b")
                self.assertNotRegex(source, r"https?://(?!www\.w3\.org/2000/svg)")
                self.assertNotRegex(source, r"(?i)\b(?:href|xlink:href)\s*=\s*[\"'](?:https?:)?//")

        self.assertNotRegex(self.css, r"(?i)@import\s+url\s*\(\s*[\"']?https?://")
        self.assertNotRegex(self.css, r"url\(\s*[\"']?(?:https?:)?//")
        self.assertNotRegex(self.css, r"https?://")
        built_scripts = "\n".join(
            script.read_text(encoding="utf-8")
            for script in (DIST_PATH / "_astro").glob("*.js")
        )
        self.assertNotRegex(built_scripts, r"(?i)fetch\s*\(\s*[\"']https://api\.github\.com")
        self.assertNotRegex(built_scripts, r"(?i)google-analytics|googletagmanager|plausible\.io|hotjar")

    def test_favicon_is_declared_local_exists_and_uses_the_pages_base(self):
        if self.page is None:
            self.fail("Ejecuta npm run build antes de comprobar el favicon compilado.")

        expected_url = f"{BASE_PATH}assets/favicon.svg"
        self.assertEqual(self.page.icon_paths, [expected_url])
        self.assertNotIn("favicon.ico", self.html)
        self.assertTrue((DIST_PATH / "assets/favicon.svg").is_file())
        source = (ROOT / "src" / "pages" / "index.astro").read_text(encoding="utf-8")
        self.assertIn('rel="icon" type="image/svg+xml" href={`${baseUrl}assets/favicon.svg`}', source)

        favicon = ElementTree.parse(ROOT / "public" / "assets" / "favicon.svg").getroot()
        self.assertEqual(favicon.attrib.get("width"), "64")
        self.assertEqual(favicon.attrib.get("height"), "64")
        self.assertEqual(favicon.attrib.get("viewBox"), "0 0 64 64")

    def test_pages_artifact_is_static_and_does_not_ship_the_audited_cache_module(self):
        if self.page is None:
            self.fail("Ejecuta npm run build antes de comprobar el alcance del artefacto Pages.")

        astro_config = (ROOT / "astro.config.mjs").read_text(encoding="utf-8")
        self.assertRegex(astro_config, r'output:\s*["\']static["\']')
        self.assertNotRegex(astro_config, r"\badapter\s*:")
        self.assertEqual(
            {path.name for path in DIST_PATH.iterdir()},
            {"index.html", "_astro", "assets"},
        )

        built_files = [path for path in DIST_PATH.rglob("*") if path.is_file()]
        self.assertTrue(built_files)
        forbidden_runtime_extensions = {".mjs", ".cjs", ".node", ".wasm", ".map", ".json"}
        artifact_bytes = bytearray()
        for path in built_files:
            relative_path = path.relative_to(DIST_PATH)
            with self.subTest(artifact=relative_path):
                self.assertNotIn(path.suffix.lower(), forbidden_runtime_extensions)
                self.assertFalse({"server", "ssr", "functions"}.intersection(part.lower() for part in relative_path.parts))
            artifact_bytes.extend(path.read_bytes().lower())

        for marker in (b"http-cache-semantics", b"cachepolicy", b"max-stale", b"set-cookie"):
            self.assertNotIn(marker, artifact_bytes)

        maintenance = (ROOT / "MAINTENANCE.md").read_text(encoding="utf-8")
        self.assertIn("Alcance técnico de GHSA-ch52-4w7c-c8xp", maintenance)
        self.assertIn("2 hallazgos High", maintenance)
        self.assertIn("no convierte el audit en PASS", maintenance)
        self.assertIn("Reviewer debe validar este alcance", maintenance)

    def test_system_theme_reduced_motion_mobile_layout_and_keyboard_focus_are_defined(self):
        self.assertIn("@media (max-width: 700px)", self.css)
        self.assertIn("@media (max-width: 380px)", self.css)
        self.assertIn("@media (prefers-color-scheme: dark)", self.css)
        self.assertIn("@media (prefers-reduced-motion: reduce)", self.css)
        self.assertIn(":focus-visible", self.css)
        theme_button = re.search(r"\.theme-switcher button\s*\{([^}]+)\}", self.css)
        self.assertIsNotNone(theme_button)
        self.assertRegex(theme_button.group(1), r"min-height:\s*44px")
        self.assertRegex(theme_button.group(1), r"min-width:\s*44px")
        self.assertIn("data-theme=\"dark\"", self.css)
        self.assertIn("motion/mini", self.script)
        self.assertIn("controls.stop()", self.script)
        self.assertIn("IntersectionObserver", self.script)
        self.assertNotRegex(self.script, r"setInterval|requestAnimationFrame|canvas")

    def test_cv_and_local_artifacts_are_not_ignored_into_the_public_build(self):
        rules = (ROOT / ".gitignore").read_text(encoding="utf-8").splitlines()
        self.assertIn("/main_fullstack_ia.*", rules)
        self.assertIn("/node_modules/", rules)
        self.assertIn("/dist/", rules)
        self.assertIn("__pycache__/", rules)
        self.assertIn("*.py[cod]", rules)

        for private_file in ("main_fullstack_ia.tex", "main_fullstack_ia.pdf"):
            self.assertTrue(self._is_ignored(private_file))

        allowed = [
            "public/assets/lexitrace-flow.svg",
            "public/assets/github-languages.svg",
            ".opencode/README.md",
            ".serena/project.yml",
            "opencode.json",
        ]
        for path in allowed:
            with self.subTest(trackable=path):
                self.assertFalse(self._is_ignored(path))

        private_document_extensions = {".tex", ".pdf"}
        for path in DIST_PATH.rglob("*") if DIST_PATH.exists() else ():
            if path.is_file():
                with self.subTest(built_file=path.relative_to(DIST_PATH)):
                    self.assertNotIn(path.suffix.lower(), private_document_extensions)
                    self.assertNotIn("main_fullstack_ia", path.name)
                    self.assertNotIn(".opencode", path.parts)
                    self.assertNotIn(".serena", path.parts)
                    self.assertNotIn(".playwright-mcp", path.parts)
                    self.assertNotIn("live-site-net.txt", path.name)

    @staticmethod
    def _is_ignored(path):
        result = subprocess.run(
            ["git", "check-ignore", "-q", "--", path],
            cwd=ROOT,
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
        )
        if result.returncode not in (0, 1):
            raise AssertionError(f"git check-ignore failed for {path}: {result.stderr}")
        return result.returncode == 0


if __name__ == "__main__":
    unittest.main()
