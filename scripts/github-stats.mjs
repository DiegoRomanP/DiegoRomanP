export const GITHUB_USERNAME = "DiegoRomanP";
export const PROFILE_API_URL = `https://api.github.com/users/${GITHUB_USERNAME}`;
export const REPOSITORIES_API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?type=owner&per_page=100`;
export const PROFILE_URL = `https://github.com/${GITHUB_USERNAME}`;

const API_PAGE_SIZE = 100;
const MAX_API_PAGES = 100;
const REQUEST_TIMEOUT_MS = 10_000;
const LANGUAGES_SHOWN_IN_CHART = 4;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function expectExactKeys(value, expectedKeys, label) {
  if (!isRecord(value)) {
    throw new Error(`${label} debe ser un objeto JSON.`);
  }

  const actualKeys = Object.keys(value).sort();
  const requiredKeys = [...expectedKeys].sort();
  if (
    actualKeys.length !== requiredKeys.length ||
    actualKeys.some((key, index) => key !== requiredKeys[index])
  ) {
    throw new Error(`${label} tiene campos inesperados o incompletos.`);
  }
}

function expectNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} debe ser un entero no negativo.`);
  }
}

function expectedRepositoryUrl(name) {
  return `${PROFILE_URL}/${encodeURIComponent(name)}`;
}

function validateRepositoryUrl(urlValue, owner, name, label) {
  if (typeof urlValue !== "string") {
    throw new Error(`${label} debe ser una URL pública de GitHub.`);
  }

  let url;
  try {
    url = new URL(urlValue);
  } catch {
    throw new Error(`${label} no es una URL válida.`);
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    throw new Error(`${label} contiene una ruta inválida.`);
  }

  if (
    url.protocol !== "https:" ||
    url.origin !== "https://github.com" ||
    decodedPath !== `/${owner}/${name}` ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${label} debe pertenecer al repositorio público esperado.`);
  }
}

function deriveLanguages(repositories) {
  const counts = new Map();

  for (const repository of repositories) {
    if (repository.language !== null) {
      counts.set(repository.language, (counts.get(repository.language) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name, "en"));
}

export function validateSnapshot(snapshot) {
  expectExactKeys(
    snapshot,
    ["schemaVersion", "generatedAt", "sources", "profile", "repositories", "metrics"],
    "snapshot",
  );

  if (snapshot.schemaVersion !== 1) {
    throw new Error("La versión del snapshot GitHub no es compatible.");
  }

  if (
    typeof snapshot.generatedAt !== "string" ||
    Number.isNaN(Date.parse(snapshot.generatedAt)) ||
    new Date(snapshot.generatedAt).toISOString() !== snapshot.generatedAt
  ) {
    throw new Error("generatedAt debe ser una fecha ISO-8601 UTC válida.");
  }

  expectExactKeys(snapshot.sources, ["profile", "repositories"], "sources");
  if (
    snapshot.sources.profile !== PROFILE_API_URL ||
    snapshot.sources.repositories !== REPOSITORIES_API_URL
  ) {
    throw new Error("Las fuentes del snapshot deben ser los endpoints públicos aprobados de GitHub.");
  }

  expectExactKeys(snapshot.profile, ["url", "followers"], "profile");
  if (snapshot.profile.url !== PROFILE_URL) {
    throw new Error("El perfil del snapshot no coincide con la cuenta aprobada.");
  }
  expectNonNegativeInteger(snapshot.profile.followers, "profile.followers");

  if (!Array.isArray(snapshot.repositories)) {
    throw new Error("repositories debe ser una lista.");
  }

  const seenNames = new Set();
  for (const [index, repository] of snapshot.repositories.entries()) {
    const label = `repositories[${index}]`;
    expectExactKeys(repository, ["name", "url", "stars", "language"], label);

    if (
      typeof repository.name !== "string" ||
      repository.name.trim() !== repository.name ||
      repository.name.length === 0 ||
      repository.name.includes("/")
    ) {
      throw new Error(`${label}.name debe ser un nombre de repositorio válido.`);
    }
    if (seenNames.has(repository.name.toLowerCase())) {
      throw new Error(`El snapshot contiene el repositorio duplicado ${repository.name}.`);
    }
    seenNames.add(repository.name.toLowerCase());

    validateRepositoryUrl(repository.url, GITHUB_USERNAME, repository.name, `${label}.url`);
    expectNonNegativeInteger(repository.stars, `${label}.stars`);
    if (repository.language !== null && (typeof repository.language !== "string" || !repository.language.trim())) {
      throw new Error(`${label}.language debe ser un lenguaje o null.`);
    }
  }

  expectExactKeys(
    snapshot.metrics,
    ["publicOwnedRepositories", "stars", "followers", "languages"],
    "metrics",
  );
  expectNonNegativeInteger(snapshot.metrics.publicOwnedRepositories, "metrics.publicOwnedRepositories");
  expectNonNegativeInteger(snapshot.metrics.stars, "metrics.stars");
  expectNonNegativeInteger(snapshot.metrics.followers, "metrics.followers");

  const repositoryCount = snapshot.repositories.length;
  const totalStars = snapshot.repositories.reduce((total, repository) => total + repository.stars, 0);
  if (!Number.isSafeInteger(totalStars)) {
    throw new Error("La suma de estrellas supera el rango seguro de enteros.");
  }

  if (
    snapshot.metrics.publicOwnedRepositories !== repositoryCount ||
    snapshot.metrics.stars !== totalStars ||
    snapshot.metrics.followers !== snapshot.profile.followers
  ) {
    throw new Error("Las métricas del snapshot no corresponden a sus repositorios y perfil.");
  }

  if (!Array.isArray(snapshot.metrics.languages)) {
    throw new Error("metrics.languages debe ser una lista.");
  }

  for (const [index, language] of snapshot.metrics.languages.entries()) {
    const label = `metrics.languages[${index}]`;
    expectExactKeys(language, ["name", "count"], label);
    if (typeof language.name !== "string" || !language.name.trim()) {
      throw new Error(`${label}.name debe ser texto no vacío.`);
    }
    expectNonNegativeInteger(language.count, `${label}.count`);
    if (language.count === 0) {
      throw new Error(`${label}.count debe ser mayor que cero.`);
    }
  }

  const derivedLanguages = deriveLanguages(snapshot.repositories);
  if (JSON.stringify(snapshot.metrics.languages) !== JSON.stringify(derivedLanguages)) {
    throw new Error("El resumen de lenguajes no coincide con el campo principal de cada repositorio.");
  }

  return snapshot;
}

function apiHeaders(token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "diegoromanp-profile-stats",
  };
  const cleanToken = typeof token === "string" ? token.trim() : "";
  if (cleanToken) {
    headers.Authorization = `Bearer ${cleanToken}`;
  }
  return headers;
}

async function requestJson(url, { fetchImpl, headers, timeoutMs }) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`La solicitud a ${url} superó el límite de ${timeoutMs} ms.`));
    }, timeoutMs);
  });

  try {
    let response;
    try {
      response = await Promise.race([
        fetchImpl(url, { headers, signal: controller.signal, redirect: "error" }),
        timeout,
      ]);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`La solicitud a ${url} agotó el tiempo de espera.`, { cause: error });
      }
      throw new Error(`No se pudo consultar ${url}: ${error instanceof Error ? error.message : "error de red"}.`, {
        cause: error,
      });
    }

    if (!response.ok) {
      const remaining = response.headers?.get?.("x-ratelimit-remaining");
      const rateLimitNote = response.status === 403 && remaining === "0" ? "; límite de API alcanzado" : "";
      throw new Error(`GitHub API devolvió HTTP ${response.status}${rateLimitNote} para ${url}.`);
    }

    let data;
    try {
      data = await Promise.race([response.json(), timeout]);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`La solicitud a ${url} agotó el tiempo de espera.`, { cause: error });
      }
      throw new Error(`GitHub API devolvió JSON inválido para ${url}.`, { cause: error });
    }

    return { data, headers: response.headers };
  } finally {
    clearTimeout(timer);
  }
}

function validateProfileResponse(profile) {
  if (
    !isRecord(profile) ||
    typeof profile.login !== "string" ||
    profile.login.toLowerCase() !== GITHUB_USERNAME.toLowerCase()
  ) {
    throw new Error("La respuesta de GitHub no corresponde al perfil esperado.");
  }
  expectNonNegativeInteger(profile.followers, "profile.followers de GitHub");
  return { url: PROFILE_URL, followers: profile.followers };
}

function nextPageUrl(linkHeader) {
  if (!linkHeader) return null;

  for (const part of linkHeader.split(/,\s*(?=<)/)) {
    const match = part.match(/^\s*<([^>]+)>\s*;\s*rel="?([^";]+)"?/);
    if (match && match[2].split(/\s+/).includes("next")) {
      return match[1];
    }
  }
  return null;
}

function validateRepositoryPageUrl(urlValue) {
  let url;
  try {
    url = new URL(urlValue);
  } catch {
    throw new Error("La paginación de GitHub incluye una URL inválida.");
  }

  const pageSize = url.searchParams.get("per_page");
  const pageNumber = url.searchParams.get("page");
  if (
    url.origin !== "https://api.github.com" ||
    url.pathname !== `/users/${GITHUB_USERNAME}/repos` ||
    url.searchParams.get("type") !== "owner" ||
    pageSize !== String(API_PAGE_SIZE) ||
    !pageNumber ||
    !/^\d+$/.test(pageNumber) ||
    Number(pageNumber) < 1 ||
    url.searchParams.size !== 3
  ) {
    throw new Error("La paginación de GitHub salió del endpoint público esperado.");
  }
  return url.toString();
}

function validateRepositoryRecord(repository, index) {
  const label = `repositorio API ${index + 1}`;
  if (!isRecord(repository)) {
    throw new Error(`${label} debe ser un objeto JSON.`);
  }

  if (
    !isRecord(repository.owner) ||
    typeof repository.owner.login !== "string" ||
    typeof repository.name !== "string" ||
    !repository.name.trim() ||
    typeof repository.private !== "boolean" ||
    typeof repository.fork !== "boolean" ||
    typeof repository.html_url !== "string" ||
    (repository.language !== null && typeof repository.language !== "string")
  ) {
    throw new Error(`${label} tiene campos incompletos o con tipos incorrectos.`);
  }
  expectNonNegativeInteger(repository.stargazers_count, `${label}.stargazers_count`);
  validateRepositoryUrl(repository.html_url, repository.owner.login, repository.name, `${label}.html_url`);

  return {
    ownerMatches: repository.owner.login.toLowerCase() === GITHUB_USERNAME.toLowerCase(),
    isPublicNonFork: repository.private === false && repository.fork === false,
    repository: {
      name: repository.name,
      url: expectedRepositoryUrl(repository.name),
      stars: repository.stargazers_count,
      language: repository.language,
    },
  };
}

async function collectRepositoryPages({ fetchImpl, headers, timeoutMs }) {
  const repositories = [];
  const visitedPages = new Set();
  let pageUrl = `${REPOSITORIES_API_URL}&page=1`;
  let pageCount = 0;

  while (pageUrl) {
    const validatedUrl = validateRepositoryPageUrl(pageUrl);
    if (visitedPages.has(validatedUrl)) {
      throw new Error("La paginación de GitHub repitió una página.");
    }
    visitedPages.add(validatedUrl);
    pageCount += 1;
    if (pageCount > MAX_API_PAGES) {
      throw new Error(`La paginación superó el límite de ${MAX_API_PAGES} páginas.`);
    }

    const { data, headers: responseHeaders } = await requestJson(validatedUrl, {
      fetchImpl,
      headers,
      timeoutMs,
    });
    if (!Array.isArray(data) || data.length > API_PAGE_SIZE) {
      throw new Error(`La página ${pageCount} de repositorios no es una lista válida.`);
    }

    for (const [index, record] of data.entries()) {
      const validated = validateRepositoryRecord(record, repositories.length + index);
      if (validated.ownerMatches && validated.isPublicNonFork) {
        repositories.push(validated.repository);
      }
    }

    const nextUrl = nextPageUrl(responseHeaders?.get?.("link"));
    pageUrl = nextUrl ? validateRepositoryPageUrl(nextUrl) : null;
  }

  const uniqueRepositories = new Set(repositories.map(({ name }) => name.toLowerCase()));
  if (uniqueRepositories.size !== repositories.length) {
    throw new Error("La API devolvió repositorios públicos duplicados.");
  }

  return repositories.sort((first, second) => first.name.localeCompare(second.name, "en"));
}

export async function collectGitHubStats({
  fetchImpl = globalThis.fetch,
  token = process.env.GITHUB_TOKEN,
  now = () => new Date(),
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("Se requiere fetch para consultar GitHub API.");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new Error("timeoutMs debe ser un entero positivo.");
  }

  const headers = apiHeaders(token);
  const { data: profilePayload } = await requestJson(PROFILE_API_URL, {
    fetchImpl,
    headers,
    timeoutMs,
  });
  const profile = validateProfileResponse(profilePayload);
  const repositories = await collectRepositoryPages({ fetchImpl, headers, timeoutMs });
  const totalStars = repositories.reduce((total, repository) => total + repository.stars, 0);
  if (!Number.isSafeInteger(totalStars)) {
    throw new Error("La suma de estrellas de los repositorios excede el rango seguro.");
  }

  const currentTime = now();
  if (!(currentTime instanceof Date) || Number.isNaN(currentTime.getTime())) {
    throw new Error("El reloj de snapshot debe devolver una fecha válida.");
  }

  return validateSnapshot({
    schemaVersion: 1,
    generatedAt: currentTime.toISOString(),
    sources: {
      profile: PROFILE_API_URL,
      repositories: REPOSITORIES_API_URL,
    },
    profile,
    repositories,
    metrics: {
      publicOwnedRepositories: repositories.length,
      stars: totalStars,
      followers: profile.followers,
      languages: deriveLanguages(repositories),
    },
  });
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function renderLanguageChart(snapshot) {
  validateSnapshot(snapshot);
  const allLanguages = snapshot.metrics.languages;
  const rows = allLanguages.slice(0, LANGUAGES_SHOWN_IN_CHART);
  const remainingCount = allLanguages
    .slice(LANGUAGES_SHOWN_IN_CHART)
    .reduce((total, language) => total + language.count, 0);
  if (remainingCount > 0) rows.push({ name: "Otros lenguajes", count: remainingCount });
  if (rows.length === 0) rows.push({ name: "Sin datos de lenguaje", count: 0 });

  const width = 320;
  const height = 100 + rows.length * 34;
  const largestCount = Math.max(...rows.map(({ count }) => count), 1);
  const rowMarkup = rows.map(({ name, count }, index) => {
    const baseline = 88 + index * 34;
    const barWidth = count === 0 ? 0 : Math.max(5, (count / largestCount) * 200);
    return [
      `  <text x="16" y="${baseline}" fill="#151515" font-family="system-ui, sans-serif" font-size="18">${xmlEscape(name)}</text>`,
      `  <text x="304" y="${baseline}" fill="#151515" font-family="system-ui, sans-serif" font-size="18" font-weight="700" text-anchor="end">${count}</text>`,
      `  <rect x="16" y="${baseline + 7}" width="200" height="5" rx="2.5" fill="#e3e1da" />`,
      `  <rect x="16" y="${baseline + 7}" width="${barWidth.toFixed(2)}" height="5" rx="2.5" fill="#14746d" />`,
    ].join("\n");
  }).join("\n");
  const languageCount = allLanguages.reduce((total, language) => total + language.count, 0);
  const title = "Lenguaje principal declarado por repositorio";
  const description = `Distribución entre ${languageCount} repositorios con lenguaje principal informado; cada repositorio cuenta una vez.`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">`,
    `  <title id="title">${xmlEscape(title)}</title>`,
    `  <desc id="description">${xmlEscape(description)}</desc>`,
    `  <rect width="${width}" height="${height}" rx="14" fill="#faf9f6" />`,
    `  <text x="16" y="27" fill="#151515" font-family="system-ui, sans-serif" font-size="18" font-weight="700">Lenguajes principales</text>`,
    `  <text x="16" y="50" fill="#62625b" font-family="system-ui, sans-serif" font-size="14">1 repositorio = 1 dato · sin bytes ni nivel</text>`,
    rowMarkup,
    `  <text x="16" y="${height - 12}" fill="#62625b" font-family="system-ui, sans-serif" font-size="13">n = ${languageCount} · excluye repos sin lenguaje informado</text>`,
    "</svg>",
    "",
  ].join("\n");
}

export function formatUtcTimestamp(isoTimestamp) {
  validateSnapshot({
    schemaVersion: 1,
    generatedAt: isoTimestamp,
    sources: { profile: PROFILE_API_URL, repositories: REPOSITORIES_API_URL },
    profile: { url: PROFILE_URL, followers: 0 },
    repositories: [],
    metrics: { publicOwnedRepositories: 0, stars: 0, followers: 0, languages: [] },
  });
  return `${isoTimestamp.slice(0, 10)} ${isoTimestamp.slice(11, 16)} UTC`;
}

export function formatCount(value) {
  expectNonNegativeInteger(value, "valor");
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(value);
}
