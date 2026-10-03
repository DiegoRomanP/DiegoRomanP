import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateProfileData } from "../scripts/check-profile-data.mjs";
import { renderReadme } from "../scripts/render-readme.mjs";
import { renderLanguageChart, validateSnapshot } from "../scripts/github-stats.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

function cssVariables(block) {
  return Object.fromEntries(
    [...block.matchAll(/--([a-z-]+):\s*(#[\da-f]{6})/gi)].map(([, name, value]) => [name, value]),
  );
}

function contrastRatio(firstColor, secondColor) {
  const luminance = (color) => {
    const channels = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16) / 255);
    const linear = channels.map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const first = luminance(firstColor);
  const second = luminance(secondColor);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

test("the profile facts are complete, approved and free of private contact data", async () => {
  const profile = await readJson("data/profile.json");
  const stats = await readJson("data/github-stats.json");
  assert.equal(validateProfileData(profile, stats), true);
  assert.deepEqual(profile.projects.map(({ id }) => id), [
    "lexitrace",
    "studyai",
    "contextia",
    "give-me-some-credit",
  ]);
  assert.equal(profile.links.github, "https://github.com/DiegoRomanP");
  assert.match(profile.intro, /Universidad Nacional de Ingeniería \(UNI\) desde 2022/);
  assert.match(profile.education.languages[1].level, /C1/);
  assert.doesNotMatch(JSON.stringify(profile), /main_fullstack_ia|@|\+\d{6,}/i);
});

test("the local language chart is regenerated from the same validated public snapshot", async () => {
  const stats = validateSnapshot(await readJson("data/github-stats.json"));
  const svg = await readFile(path.join(ROOT, "public/assets/github-languages.svg"), "utf8");
  assert.equal(svg, renderLanguageChart(stats));
});

test("the generated README is GFM, Spanish, synchronized and uses local accessible images", async () => {
  const profile = await readJson("data/profile.json");
  const stats = validateSnapshot(await readJson("data/github-stats.json"));
  const readme = await readFile(path.join(ROOT, "README.md"), "utf8");

  assert.equal(readme, renderReadme(profile, stats));
  assert.equal((readme.match(/^#\s/gm) ?? []).length, 1);
  assert.match(readme, /^# Hola, soy Diego Román 👋$/m);
  assert.match(readme, /GitHub en cifras/);
  assert.ok(readme.includes(stats.generatedAt.slice(0, 10)));
  assert.match(readme, new RegExp(`${stats.generatedAt.slice(0, 10)} \\d{2}:\\d{2} UTC`));
  assert.ok(readme.includes(`| Repositorios propios públicos (sin forks) | ${stats.metrics.publicOwnedRepositories} |`));
  assert.ok(readme.includes(`| Estrellas en esos repositorios | ${stats.metrics.stars} |`));
  assert.ok(readme.includes(`| Seguidores de la cuenta | ${stats.metrics.followers} |`));
  assert.match(readme, /no representa bytes de código ni nivel de dominio/i);
  assert.match(readme, /Ciencia de la Computación.*Universidad Nacional de Ingeniería/s);
  assert.match(readme, /Diplomado en Ciencia de Datos Avanzada/);
  assert.match(readme, /Claude Code 101/);
  assert.match(readme, /formación en ICPNA/);
  assert.doesNotMatch(readme, /<\s*\/?\s*[A-Za-z][^>]*>/);
  assert.doesNotMatch(readme, /javascript:|<\s*(?:script|style|iframe)\b/i);
  assert.doesNotMatch(readme, /github-readme-stats|komarev|visitor.?count|contribution.?graph/i);
  assert.doesNotMatch(readme, /main_fullstack_ia|GITHUB_TOKEN|Bearer\s/i);

  const projectLinks = [...readme.matchAll(/(?<!!)\[([^\]]+)\]\((https:\/\/github\.com\/DiegoRomanP\/[^)]+)\)/g)]
    .map(([, , url]) => url);
  for (const project of profile.projects) {
    assert.equal(projectLinks.filter((url) => url === project.url).length, 1, project.name);
  }

  const images = [...readme.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
  assert.equal(images.length, 2);
  for (const [, alt, relativePath] of images) {
    assert.ok(alt.trim());
    assert.ok(!/^https?:\/\//i.test(relativePath));
    await assert.doesNotReject(readFile(path.join(ROOT, relativePath)));
  }
});

test("Astro uses one shared profile, static Pages base, system theme and reduced-motion support", async () => {
  const page = await readFile(path.join(ROOT, "src/pages/index.astro"), "utf8");
  const header = await readFile(path.join(ROOT, "src/components/SiteHeader.astro"), "utf8");
  const config = await readFile(path.join(ROOT, "astro.config.mjs"), "utf8");
  const css = await readFile(path.join(ROOT, "src/styles/global.css"), "utf8");
  const script = await readFile(path.join(ROOT, "src/scripts/site.ts"), "utf8");

  assert.match(page, /import profile from ["']\.\.\/\.\.\/data\/profile\.json["']/);
  assert.match(page, /import stats from ["']\.\.\/\.\.\/data\/github-stats\.json["']/);
  assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
  assert.match(page, /<html lang="es"/);
  assert.match(config, /output:\s*["']static["']/);
  assert.match(config, /base:\s*["']\/DiegoRomanP\/["']/);
  assert.match(config, /site:\s*["']https:\/\/diegoromanp\.github\.io["']/);
  for (const fragment of ["#inicio", "#proyectos", "#github-stats", "#herramientas", "#formacion"]) {
    assert.ok(page.includes(`href="${fragment}"`) || header.includes(`href="${fragment}"`), fragment);
  }
  assert.match(css, /--page:\s*#faf9f6/i);
  assert.match(css, /--ink:\s*#151515/i);
  assert.match(css, /--accent:\s*#126d67/i);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /prefers-color-scheme:\s*dark/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /:focus-visible/);
  assert.match(script, /motion\/mini/);
  assert.match(script, /localStorage/);
  assert.match(script, /REDUCED_MOTION_QUERY/);
  assert.match(script, /controls\.stop\(\)/);
  assert.match(script, /IntersectionObserver/);
  assert.doesNotMatch(script, /setInterval|requestAnimationFrame|canvas/i);
  assert.doesNotMatch(`${css}\n${script}`, /https?:\/\//i);
});

test("sampled body, metadata, link and SVG text colors meet WCAG AA contrast", async () => {
  const css = await readFile(path.join(ROOT, "src/styles/global.css"), "utf8");
  const lightBlock = css.match(/:root\s*\{([^}]+)\}/)?.[1];
  const darkBlock = css.match(/:root\[data-theme="dark"\]\s*\{([^}]+)\}/)?.[1];
  assert.ok(lightBlock);
  assert.ok(darkBlock);
  const themes = [cssVariables(lightBlock), cssVariables(darkBlock)];

  for (const [themeIndex, theme] of themes.entries()) {
    const pairs = [
      ["body text", theme.ink, theme.page],
      ["muted text", theme.muted, theme.page],
      ["metadata text on page", theme.quiet, theme.page],
      ["metadata text on surface", theme.quiet, theme.surface],
      ["metadata text on secondary surface", theme.quiet, theme["surface-alt"]],
      ["link text", theme["accent-strong"], theme.page],
      ["primary button text", theme.page, theme["accent-strong"]],
    ];
    if (themeIndex === 1) pairs.push(["dark hover link", theme.page, theme.accent]);
    for (const [label, foreground, background] of pairs) {
      assert.ok(contrastRatio(foreground, background) >= 4.5, `${label} contrast is below 4.5:1`);
    }
  }

  for (const foreground of ["#151515", "#62625b", "#14746d"]) {
    assert.ok(contrastRatio(foreground, "#faf9f6") >= 4.5, `${foreground} SVG text contrast is below 4.5:1`);
  }
});

test("the old docs HTML/CSS website is retired rather than maintained as a second site", async () => {
  const docsReadme = await readFile(path.join(ROOT, "docs/README.md"), "utf8");
  await assert.rejects(readFile(path.join(ROOT, "docs/index.html")), { code: "ENOENT" });
  await assert.rejects(readFile(path.join(ROOT, "docs/styles.css")), { code: "ENOENT" });
  assert.match(docsReadme, /reemplazado por el sitio Astro estático/);
  assert.match(docsReadme, /MAINTENANCE\.md/);
});

test("Pages and weekly stats automation use scoped permissions and pinned actions", async () => {
  const workflow = await readFile(path.join(ROOT, ".github/workflows/profile-pages.yml"), "utf8");
  assert.match(workflow, /branches:\s*\n\s+- main/);
  assert.match(workflow, /cron: "17 8 \* \* 1"/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /cancel-in-progress:\s*false/);
  assert.match(workflow, /contents:\s*write/);
  assert.match(workflow, /pages:\s*write/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /GITHUB_TOKEN:\s*\$\{\{ secrets\.GITHUB_TOKEN \}\}/);
  assert.match(workflow, /git add -- README\.md data\/github-stats\.json public\/assets\/github-languages\.svg/);
  assert.match(workflow, /ref:\s*\$\{\{ github\.event_name == 'push' && github\.sha \|\| 'main' \}\}/);
  assert.match(workflow, /ref:\s*\$\{\{ needs\.prepare\.outputs\.revision \}\}/);
  assert.doesNotMatch(workflow, /git add\s+(?:\.\s|--all|-A)/);
  const actionRefs = [...workflow.matchAll(/^\s+uses:\s+[^@]+@([a-f0-9]+)$/gm)];
  assert.ok(actionRefs.length >= 4);
  assert.ok(actionRefs.every(([, sha]) => sha.length === 40));
  assert.doesNotMatch(workflow, /\b(?:PERSONAL_ACCESS_TOKEN|PAT|GH_TOKEN)\b/);
});
