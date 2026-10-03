import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { renderLanguageChart, validateSnapshot } from "./github-stats.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_PROJECT_IDS = ["lexitrace", "studyai", "contextia", "give-me-some-credit"];

function fail(message) {
  throw new Error(message);
}

export function validateProfileData(profile, stats) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    fail("data/profile.json debe ser un objeto.");
  }
  if (profile.username !== "DiegoRomanP" || profile.name !== "Diego Román") {
    fail("La identidad del perfil no coincide con los datos aprobados.");
  }
  if (typeof profile.intro !== "string" || !profile.intro.trim()) {
    fail("El perfil debe tener una presentación en español.");
  }
  const projectIds = profile.projects?.map(({ id }) => id);
  if (JSON.stringify(projectIds) !== JSON.stringify(EXPECTED_PROJECT_IDS)) {
    fail("Los cuatro proyectos deben permanecer en el orden aprobado.");
  }
  for (const project of profile.projects) {
    const githubUrl = new URL(project.url);
    if (
      githubUrl.protocol !== "https:" ||
      githubUrl.hostname !== "github.com" ||
      githubUrl.pathname.split("/")[1] !== profile.username
    ) {
      fail(`El enlace del proyecto ${project.name} debe llevar a un repositorio público propio.`);
    }
    if (!project.summary?.trim() || !project.purpose?.trim() || !project.scope?.trim()) {
      fail(`Faltan propósito, resumen o alcance para ${project.name}.`);
    }
  }
  for (const key of ["github", "repositories", "linkedin", "portfolio"]) {
    const value = profile.links?.[key];
    if (typeof value !== "string" || !value.startsWith("https://")) {
      fail(`Falta el enlace aprobado ${key}.`);
    }
  }
  if (!Array.isArray(profile.technologyGroups) || profile.technologyGroups.length === 0) {
    fail("Las tecnologías deben agruparse por función.");
  }
  validateSnapshot(stats);

  const serialized = JSON.stringify({ profile, stats }).toLowerCase();
  if (/"(?:email|phone|telephone|dni|token|authorization|secret|private)"\s*:/.test(serialized)) {
    fail("Los datos del perfil contienen un campo sensible no permitido.");
  }
  if (serialized.includes("main_fullstack_ia")) {
    fail("No se debe incluir ni enlazar el CV local privado.");
  }
  return true;
}

async function main() {
  try {
    const [profileText, statsText, chartText] = await Promise.all([
      readFile(resolve(ROOT, "data/profile.json"), "utf8"),
      readFile(resolve(ROOT, "data/github-stats.json"), "utf8"),
      readFile(resolve(ROOT, "public/assets/github-languages.svg"), "utf8"),
    ]);
    const profile = JSON.parse(profileText);
    const stats = JSON.parse(statsText);
    validateProfileData(profile, stats);
    if (chartText !== renderLanguageChart(stats)) {
      throw new Error("El SVG de estadísticas difiere del snapshot; ejecuta npm run stats:update.");
    }
    console.log("Contenido del perfil y snapshot público válidos.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "No se pudo validar el contenido del perfil.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
