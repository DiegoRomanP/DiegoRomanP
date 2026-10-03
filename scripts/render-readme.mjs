import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import {
  formatCount,
  formatUtcTimestamp,
  renderLanguageChart,
  validateSnapshot,
} from "./github-stats.mjs";
import { validateProfileData } from "./check-profile-data.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} debe ser texto no vacío.`);
  }
  return value;
}

function validateProfile(profile) {
  requireText(profile?.name, "profile.name");
  requireText(profile?.username, "profile.username");
  requireText(profile?.intro, "profile.intro");
  if (!Array.isArray(profile.projects) || profile.projects.length !== 4) {
    throw new Error("El perfil debe contener los cuatro proyectos aprobados.");
  }
  if (!Array.isArray(profile.technologyGroups) || !profile.education) {
    throw new Error("El perfil debe incluir tecnologías y formación.");
  }
  for (const project of profile.projects) {
    requireText(project.name, "project.name");
    requireText(project.url, `project.url de ${project.name}`);
    requireText(project.summary, `project.summary de ${project.name}`);
    if (!Array.isArray(project.stack) || project.stack.length === 0) {
      throw new Error(`El stack de ${project.name} debe ser una lista no vacía.`);
    }
  }
  return profile;
}

function projectMarkdown(project) {
  const lines = [
    `### [${project.name} — ${project.descriptor}](${project.url})`,
    "",
    project.summary,
    "",
    `- **Propósito:** ${project.purpose}`,
    `- **Alcance:** ${project.scope}`,
    `- **Stack:** ${project.stack.join(" · ")}.`,
  ];

  if (project.release) {
    lines.push(`- **Release:** [${project.release.label}](${project.release.url}).`);
  }

  if (project.id === "lexitrace") {
    lines.splice(
      3,
      0,
      "",
      "![Esquema funcional de LexiTrace: un PDF seleccionado, una consulta y una respuesta con citas al documento, página y fragmento](public/assets/lexitrace-flow-mobile.svg)",
    );
  }

  return lines.join("\n");
}

export function renderReadme(profileSource, statsSource) {
  const profile = validateProfile(profileSource);
  const stats = validateSnapshot(statsSource);
  validateProfileData(profile, stats);
  const education = profile.education;
  const academicCourses = education.courses.map((course) => `- ${course}`).join("\n");
  const complementary = education.complementary
    .map(({ name, institution, period }) => {
      const periodText = period ? ` · ${period}` : "";
      return `- **${name}** — ${institution}${periodText}.`;
    })
    .join("\n");
  const languages = education.languages
    .map(({ name, level, note }) => `${name} ${level}${note ? `, ${note}` : ""}`)
    .join(" · ");
  const technologyGroups = profile.technologyGroups
    .map(({ label, technologies }) => `- **${label}:** ${technologies.join(" · ")}.`)
    .join("\n");
  const projects = profile.projects.map(projectMarkdown).join("\n\n");
  const languageCounts = stats.metrics.languages.length
    ? `**Conteos por repositorio:** ${stats.metrics.languages.map(({ name, count }) => `${name}: ${formatCount(count)}`).join(" · ")}.`
    : "El endpoint no informa lenguajes principales para los repositorios incluidos.";
  const languagesInStats = [
    "El lenguaje principal declarado se cuenta una vez por repositorio; los que no informan lenguaje quedan fuera del denominador. No representa bytes de código ni nivel de dominio.",
    languageCounts,
    "![Conteo de lenguajes principales por repositorio público propio](public/assets/github-languages.svg)",
  ].join("\n\n");

  return [
    `# Hola, soy ${profile.name} 👋`,
    "",
    profile.intro,
    "",
    `[Ver mi portafolio](${profile.links.portfolio}) · [Explorar repositorios públicos](${profile.links.repositories})`,
    "",
    "## Enfoque",
    "",
    "Me interesa que, cuando una herramienta responde sobre documentos, el recorrido hasta la fuente pueda revisarse. En LexiTrace eso se concreta en citas al documento, la página y el fragmento; en otros proyectos exploro planificación de estudio, acciones de IA para notas y experimentos de machine learning.",
    "",
    "## Proyectos destacados",
    "",
    projects,
    "",
    "## GitHub en cifras",
    "",
    `Actualizado: **${formatUtcTimestamp(stats.generatedAt)}**. Datos públicos del [perfil de GitHub](${stats.sources.profile}) y de sus [repositorios](${stats.sources.repositories}).`,
    "",
    "| Métrica pública | Valor |",
    "|:--|--:|",
    `| Repositorios propios públicos (sin forks) | ${formatCount(stats.metrics.publicOwnedRepositories)} |`,
    `| Estrellas en esos repositorios | ${formatCount(stats.metrics.stars)} |`,
    `| Seguidores de la cuenta | ${formatCount(stats.metrics.followers)} |`,
    "",
    languagesInStats,
    "",
    "## Tecnologías por área",
    "",
    technologyGroups,
    "",
    "## Formación e idiomas",
    "",
    `**${education.degree} — ${education.institution}** · ${education.status} · ${education.period}.`,
    "",
    "Cursos relacionados:",
    academicCourses,
    "",
    "Formación complementaria:",
    complementary,
    "",
    `**Idiomas:** ${languages}.`,
    "",
    "## Enlaces",
    "",
    `[GitHub](${profile.links.github}) · [LinkedIn](${profile.links.linkedin}) · [Portafolio web](${profile.links.portfolio})`,
    "",
  ].join("\n");
}

async function readSources(root = ROOT) {
  const [profileText, statsText] = await Promise.all([
    readFile(resolve(root, "data/profile.json"), "utf8"),
    readFile(resolve(root, "data/github-stats.json"), "utf8"),
  ]);
  return {
    profile: JSON.parse(profileText),
    stats: JSON.parse(statsText),
  };
}

export async function renderReadmeFromFiles(root = ROOT) {
  const { profile, stats } = await readSources(root);
  return renderReadme(profile, stats);
}

export async function renderLanguageChartFromFiles(root = ROOT) {
  const { stats } = await readSources(root);
  return renderLanguageChart(stats);
}

async function main() {
  try {
    const [content, chart] = await Promise.all([
      renderReadmeFromFiles(),
      renderLanguageChartFromFiles(),
    ]);
    const readmePath = resolve(ROOT, "README.md");
    const chartPath = resolve(ROOT, "public/assets/github-languages.svg");
    if (process.argv.includes("--check")) {
      const [currentReadme, currentChart] = await Promise.all([
        readFile(readmePath, "utf8"),
        readFile(chartPath, "utf8"),
      ]);
      if (currentReadme !== content || currentChart !== chart) {
        throw new Error("README.md o el SVG de estadísticas están desactualizados; ejecuta npm run readme:generate.");
      }
      console.log("README.md y el SVG de estadísticas coinciden con las fuentes de datos.");
      return;
    }
    await Promise.all([
      writeFile(readmePath, content, "utf8"),
      writeFile(chartPath, chart, "utf8"),
    ]);
    console.log("README.md y el SVG de estadísticas generados desde las fuentes de datos.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "No se pudo generar README.md.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
