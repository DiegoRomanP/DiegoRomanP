import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { collectGitHubStats, renderLanguageChart } from "./github-stats.mjs";
import { renderReadme } from "./render-readme.mjs";
import { validateProfileData } from "./check-profile-data.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readProfile(rootDir) {
  return JSON.parse(await readFile(resolve(rootDir, "data/profile.json"), "utf8"));
}

async function writeGeneratedFiles(rootDir, snapshot, profile) {
  const outputs = new Map([
    ["data/github-stats.json", `${JSON.stringify(snapshot, null, 2)}\n`],
    ["public/assets/github-languages.svg", renderLanguageChart(snapshot)],
    ["README.md", renderReadme(profile, snapshot)],
  ]);
  const staged = [];

  try {
    for (const [relativePath, content] of outputs) {
      const finalPath = resolve(rootDir, relativePath);
      const tempPath = `${finalPath}.tmp-${process.pid}`;
      await writeFile(tempPath, content, "utf8");
      staged.push({ tempPath, finalPath });
    }
    for (const { tempPath, finalPath } of staged) {
      await rename(tempPath, finalPath);
    }
  } catch (error) {
    await Promise.all(staged.map(({ tempPath }) => rm(tempPath, { force: true })));
    throw error;
  }
}

export async function updateProfileArtifacts({
  rootDir = ROOT,
  collectSnapshot = collectGitHubStats,
} = {}) {
  const snapshot = await collectSnapshot();
  const profile = await readProfile(rootDir);
  validateProfileData(profile, snapshot);
  await writeGeneratedFiles(rootDir, snapshot, profile);
  return snapshot;
}

async function main() {
  try {
    const snapshot = await updateProfileArtifacts();
    console.log(
      `Snapshot público actualizado (${snapshot.metrics.publicOwnedRepositories} repositorios propios; ${snapshot.generatedAt}).`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : "No se pudieron actualizar las métricas GitHub.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
