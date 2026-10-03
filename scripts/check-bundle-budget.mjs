import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const DIST_DIRECTORY = path.resolve("dist");
const MAX_FIRST_PARTY_GZIP_BYTES = 35 * 1024;

async function listJavaScript(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listJavaScript(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      results.push(entryPath);
    }
  }
  return results;
}

async function main() {
  try {
    const scripts = await listJavaScript(path.join(DIST_DIRECTORY, "_astro"));
    if (scripts.length === 0) {
      throw new Error("No se encontró JavaScript del sitio en dist/_astro.");
    }

    const reports = await Promise.all(
      scripts.map(async (scriptPath) => {
        const contents = await readFile(scriptPath);
        return { path: path.relative(DIST_DIRECTORY, scriptPath), gzipBytes: gzipSync(contents).byteLength };
      }),
    );
    const totalGzipBytes = reports.reduce((total, report) => total + report.gzipBytes, 0);
    for (const report of reports) {
      console.log(`${report.path}: ${report.gzipBytes} B gzip`);
    }
    console.log(`JavaScript de primera parte: ${totalGzipBytes} B gzip (límite ${MAX_FIRST_PARTY_GZIP_BYTES} B).`);
    if (totalGzipBytes > MAX_FIRST_PARTY_GZIP_BYTES) {
      throw new Error("El JavaScript del sitio supera el presupuesto gzip.");
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "No se pudo medir el JavaScript de primera parte.");
    process.exitCode = 1;
  }
}

await main();
