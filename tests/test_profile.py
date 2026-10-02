from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[1]
README_PATH = ROOT / "README.md"
PAGE_PATH = ROOT / "docs" / "index.html"
CSS_PATH = ROOT / "docs" / "styles.css"
PAGES_URL = "https://diegoromanp.github.io/DiegoRomanP/"
INTRO = (
    "Estudio Ciencia de la Computación en la Universidad Nacional de Ingeniería (UNI) desde 2022. "
    "Me enfoco en construir aplicaciones full stack con IA aplicada: en mis proyectos combino interfaces, "
    "APIs y datos con flujos RAG y modelos predictivos, procurando que las respuestas puedan revisarse."
)
PROJECT_REPOSITORIES = {
    "LexiTrace": "https://github.com/DiegoRomanP/lexitrace-legal-evidence-rag",
    "StudyAI": "https://github.com/DiegoRomanP/StudyAI",
    "Context IA Obsidian": "https://github.com/DiegoRomanP/context-ia-obsidian",
    "Give me some Credit": "https://github.com/DiegoRomanP/Give-me-some-Credit",
}
PROJECT_FACTS = (
    "citas al documento, página y fragmento",
    "repaso espaciado SM-2",
    "investigar con fuentes y generar imágenes",
    "XGBoost que compara métodos de balanceo",
)
PROFILE_FACTS = (
    "Diego Román",
    "Universidad Nacional de Ingeniería (UNI)",
    "2022–presente",
    "Estructuras de Datos",
    "Base de Datos",
    "Ingeniería de Software",
    "Sistemas Operativos",
    "Diplomado en Ciencia de Datos Avanzada",
    "Data Mining Consulting",
    "AI Foundations Associate",
    "Oracle University",
    "Claude Code in Action (2026)",
    "Claude Code 101",
    "Anthropic",
    "Español nativo",
    "inglés avanzado (C1)",
    "ICPNA",
)
BADGE_PATHS = (
    "docs/assets/badges/python.svg",
    "docs/assets/badges/fastapi.svg",
    "docs/assets/badges/react.svg",
    "docs/assets/badges/typescript.svg",
)


class PageAudit(HTMLParser):
    """Collect the small set of structural facts needed for static profile checks."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.ids = set()
        self.fragments = []
        self.links = []
        self.anchor_links = []
        self.repository_links = []
        self.resource_paths = []
        self.image_alts = []
        self.attributes = []
        self.headings = []
        self.text_parts = []
        self._heading = None
        self._anchor = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append(tag)
        self.attributes.extend(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag == "a" and "href" in attrs:
            href = attrs["href"]
            self.links.append(href)
            self._anchor = [href, []]
            if href.startswith("#"):
                self.fragments.append(href[1:])
            if href in PROJECT_REPOSITORIES.values():
                self.repository_links.append(href)
        if tag == "img" and "src" in attrs:
            self.resource_paths.append(attrs["src"])
            self.image_alts.append(attrs.get("alt", ""))
        if tag == "link" and attrs.get("rel") == "stylesheet" and "href" in attrs:
            self.resource_paths.append(attrs["href"])
        if tag in {"h1", "h2", "h3"}:
            self._heading = [tag, []]

    def handle_endtag(self, tag):
        if tag == "a" and self._anchor:
            label = " ".join(" ".join(self._anchor[1]).split())
            self.anchor_links.append((self._anchor[0], label))
            self._anchor = None
        if self._heading and tag == self._heading[0]:
            self.headings.append((self._heading[0], "".join(self._heading[1]).strip()))
            self._heading = None

    def handle_data(self, data):
        self.text_parts.append(data)
        if self._anchor:
            self._anchor[1].append(data)
        if self._heading:
            self._heading[1].append(data)

    @property
    def text(self):
        return " ".join(" ".join(self.text_parts).split())


class ProfileReadmeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.readme = README_PATH.read_text(encoding="utf-8")
        cls.html = PAGE_PATH.read_text(encoding="utf-8")
        cls.css = CSS_PATH.read_text(encoding="utf-8")
        cls.page = PageAudit()
        cls.page.feed(cls.html)
        cls.markdown_link_pairs = re.findall(
            r"(?<!!)\[([^\]]+)\]\((https?://[^)]+)\)", cls.readme
        )
        cls.markdown_links = [href for _, href in cls.markdown_link_pairs]

    def test_profile_intro_and_projects_match_in_readme_and_web(self):
        for content in (self.readme, self.page.text):
            self.assertIn(INTRO, content)
            for fact in PROFILE_FACTS:
                with self.subTest(fact=fact):
                    self.assertIn(fact, content)
            for name, repository in PROJECT_REPOSITORIES.items():
                with self.subTest(project=name, document="README"):
                    self.assertIn(name, self.readme)
                    self.assertEqual(self.markdown_links.count(repository), 1)
                with self.subTest(project=name, document="web"):
                    self.assertIn(name, self.page.text)
                    self.assertEqual(self.page.repository_links.count(repository), 1)
            for fact in PROJECT_FACTS:
                with self.subTest(fact=fact):
                    self.assertIn(fact, content)

    def test_readme_uses_one_heading_gfm_and_local_images(self):
        headings = re.findall(r"(?m)^#\s+", self.readme)
        self.assertEqual(len(headings), 1)
        self.assertIn("# Hola, soy Diego Román 👋", self.readme)
        self.assertIn(PAGES_URL, self.markdown_links)
        readme_linkedin = [href for label, href in self.markdown_link_pairs if label == "LinkedIn"]
        page_linkedin = [href for href, label in self.page.anchor_links if label == "LinkedIn"]
        self.assertEqual(len(readme_linkedin), 1)
        self.assertEqual(readme_linkedin, page_linkedin)
        self.assertTrue(readme_linkedin[0].startswith("https://www.linkedin.com/"))
        self.assertFalse(
            re.search(r"(?i)<\s*/?\s*(?:style|script|iframe)\b|javascript:", self.readme)
        )
        self.assertNotRegex(self.readme, r"<\s*/?\s*[A-Za-z][^>]*>")
        self.assertFalse(re.search(r"(?i)\b(?:placeholder|TODO|FIXME|your name)\b", self.readme))

        markdown_images = re.findall(r"!\[([^\]]*)\]\(([^)]+)\)", self.readme)
        self.assertEqual(len(markdown_images), 5)
        for alt, target in markdown_images:
            with self.subTest(image=target):
                self.assertTrue(alt.strip())
                self.assertFalse(re.match(r"https?://", target))
                self.assertTrue((ROOT / target).is_file())

    def test_page_has_spanish_semantic_structure_and_valid_anchors(self):
        html_tag = re.search(r"<html\b([^>]*)>", self.html, re.IGNORECASE)
        self.assertIsNotNone(html_tag)
        self.assertRegex(html_tag.group(1), r'\blang=["\']es["\']')
        self.assertEqual(sum(tag == "h1" for tag, _ in self.page.headings), 1)
        self.assertEqual(sum(tag == "h3" for tag, _ in self.page.headings), 6)
        for landmark in ("header", "nav", "main", "footer"):
            with self.subTest(landmark=landmark):
                self.assertIn(landmark, self.page.tags)
        for fragment in self.page.fragments:
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, self.page.ids)
        self.assertIn("https://github.com/DiegoRomanP/context-ia-obsidian/releases/tag/v0.1.0", self.html)
        self.assertIn("https://github.com/DiegoRomanP", self.page.links)
        self.assertIn("formacion", self.page.ids)

    def test_all_local_resources_exist_and_no_page_scripts_or_remote_assets(self):
        self.assertNotIn("script", self.page.tags)
        self.assertNotIn("iframe", self.page.tags)
        self.assertNotIn("foreignObject", self.page.tags)
        self.assertFalse(any(attribute.lower().startswith("on") for attribute in self.page.attributes))
        self.assertFalse(re.search(r"(?i)javascript:", self.html))
        self.assertTrue(all(alt.strip() for alt in self.page.image_alts))

        for resource in self.page.resource_paths:
            with self.subTest(resource=resource):
                self.assertFalse(re.match(r"(?:https?:)?//", resource))
                self.assertTrue((PAGE_PATH.parent / resource).is_file())

        svg_assets = list((ROOT / "docs" / "assets").rglob("*.svg"))
        self.assertEqual(len(svg_assets), 5)
        for asset in svg_assets:
            source = asset.read_text(encoding="utf-8")
            with self.subTest(asset=asset.relative_to(ROOT)):
                self.assertNotRegex(source, r"(?i)<\s*script\b|<\s*foreignObject\b")
                self.assertNotRegex(source, r"https?://(?!www\.w3\.org/2000/svg)")
                self.assertNotRegex(source, r"(?i)\b(?:href|xlink:href)\s*=\s*[\"'](?:https?:)?//")

        self.assertNotRegex(self.css, r"(?i)@import\s+url\s*\(\s*[\"']?https?://")
        self.assertNotRegex(self.css, r"(?i)url\(\s*[\"']?(?:https?:)?//")
        self.assertNotRegex(self.css, r"https?://")

    def test_four_local_technology_badges_and_responsive_color_support(self):
        for target in BADGE_PATHS:
            with self.subTest(badge=target):
                self.assertTrue((ROOT / target).is_file())
                self.assertIn(target.removeprefix("docs/"), self.html)
                self.assertIn(target, self.readme)
        self.assertIn("@media (max-width: 760px)", self.css)
        self.assertIn("@media (max-width: 380px)", self.css)
        self.assertIn("@media (prefers-color-scheme: dark)", self.css)
        self.assertIn("@media (prefers-reduced-motion: reduce)", self.css)
        self.assertIn(":focus-visible", self.css)
        self.assertIn('class="skip-link"', self.html)

    def test_private_source_is_ignored_but_site_assets_remain_trackable(self):
        ignore_file = ROOT / ".gitignore"
        rules = ignore_file.read_text(encoding="utf-8").splitlines()
        self.assertIn("/main_fullstack_ia.*", rules)
        self.assertIn("__pycache__/", rules)
        self.assertIn("*.py[cod]", rules)

        ignored_paths = (
            "main_fullstack_ia.tex",
            "main_fullstack_ia.pdf",
            "tests/__pycache__/profile.cpython-314.pyc",
            "tests/profile.pyc",
        )
        for path in ignored_paths:
            with self.subTest(ignored=path):
                self.assertTrue(self._is_ignored(path))

        allowed_paths = [
            "docs/assets/profile-banner.svg",
            *[path.relative_to(ROOT).as_posix() for path in (ROOT / "docs" / "assets").rglob("*.svg")],
            ".opencode/README.md",
            "opencode.json",
        ]
        for path in set(allowed_paths):
            with self.subTest(trackable=path):
                self.assertFalse(self._is_ignored(path))

        private_document_extensions = {".tex", ".pdf"}
        for path in (ROOT / "docs").rglob("*"):
            if path.is_file():
                with self.subTest(public_site_file=path.relative_to(ROOT)):
                    self.assertNotIn(path.suffix.lower(), private_document_extensions)

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
