import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  collectGitHubStats,
  PROFILE_API_URL,
  REPOSITORIES_API_URL,
  renderLanguageChart,
  validateSnapshot,
} from "../scripts/github-stats.mjs";
import { updateProfileArtifacts } from "../scripts/update-github-stats.mjs";
import { renderReadme } from "../scripts/render-readme.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USERNAME = "DiegoRomanP";

function repository({
  owner = USERNAME,
  name,
  private: isPrivate = false,
  fork = false,
  stars = 0,
  language = null,
}) {
  return {
    owner: { login: owner },
    name,
    private: isPrivate,
    fork,
    stargazers_count: stars,
    language,
    html_url: `https://github.com/${owner}/${name}`,
  };
}

function response(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

function minimalSnapshot(repositories = [], followers = 4) {
  const languagesByName = new Map();
  for (const repo of repositories) {
    if (repo.language !== null) {
      languagesByName.set(repo.language, (languagesByName.get(repo.language) ?? 0) + 1);
    }
  }
  const languages = [...languagesByName.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name, "en"));
  return {
    schemaVersion: 1,
    generatedAt: "2026-10-02T12:30:00.000Z",
    sources: {
      profile: PROFILE_API_URL,
      repositories: REPOSITORIES_API_URL,
    },
    profile: { url: `https://github.com/${USERNAME}`, followers },
    repositories: repositories.map(({ name, language, stars = 0 }) => ({
      name,
      url: `https://github.com/${USERNAME}/${name}`,
      stars,
      language,
    })),
    metrics: {
      publicOwnedRepositories: repositories.length,
      stars: repositories.reduce((total, repo) => total + (repo.stars ?? 0), 0),
      followers,
      languages,
    },
  };
}

test("collects public owned non-fork repositories across pages and counts one primary language each", async () => {
  const requests = [];
  const pageTwo = `${REPOSITORIES_API_URL}&page=2`;
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options });
    if (url === PROFILE_API_URL) {
      return response({ login: USERNAME, followers: 6, public_repos: 100 });
    }
    if (new URL(url).searchParams.get("page") === "1") {
      return response([
        repository({ name: "public-alpha", language: "Python", stars: 3 }),
        repository({ name: "forked-project", fork: true, language: "Python", stars: 50 }),
        repository({ name: "secret-private-name", private: true, language: "Rust", stars: 90 }),
        repository({ owner: "ExampleOrg", name: "outside-owner", language: "Go", stars: 70 }),
      ], {
        headers: {
          Link: `<${pageTwo}>; rel="next", <${pageTwo}>; rel="last"`,
        },
      });
    }
    if (url === pageTwo) {
      return response([
        repository({ name: "public-beta", language: null, stars: 2 }),
        repository({ name: "public-gamma", language: "TypeScript", stars: 1 }),
      ]);
    }
    throw new Error(`Unexpected URL ${url}`);
  };

  const snapshot = await collectGitHubStats({
    fetchImpl,
    token: "not-a-real-test-token",
    now: () => new Date("2026-10-02T12:30:00.000Z"),
  });

  assert.deepEqual(snapshot.repositories.map(({ name }) => name), ["public-alpha", "public-beta", "public-gamma"]);
  assert.equal(snapshot.metrics.publicOwnedRepositories, 3);
  assert.equal(snapshot.metrics.stars, 6);
  assert.equal(snapshot.metrics.followers, 6);
  assert.deepEqual(snapshot.metrics.languages, [
    { name: "Python", count: 1 },
    { name: "TypeScript", count: 1 },
  ]);
  assert.equal(snapshot.generatedAt, "2026-10-02T12:30:00.000Z");
  assert.equal(requests.length, 3);
  assert.ok(requests.every(({ options }) => options.headers.Authorization === "Bearer not-a-real-test-token"));
  assert.ok(requests.some(({ url }) => new URL(url).searchParams.get("per_page") === "100"));
  assert.ok(!JSON.stringify(snapshot).includes("not-a-real-test-token"));
  assert.ok(!JSON.stringify(snapshot).includes("secret-private-name"));
  assert.ok(!JSON.stringify(snapshot).includes("outside-owner"));
  assert.ok(!JSON.stringify(snapshot).includes("forked-project"));
});

test("does not include repositories owned by another account", async () => {
  const fetchImpl = async (url) => {
    if (url === PROFILE_API_URL) return response({ login: USERNAME, followers: 0 });
    return response([repository({ owner: "SomeoneElse", name: "external-project", stars: 8, language: "Go" })]);
  };
  const snapshot = await collectGitHubStats({ fetchImpl, token: "" });
  assert.equal(snapshot.metrics.publicOwnedRepositories, 0);
  assert.deepEqual(snapshot.repositories, []);
  assert.deepEqual(snapshot.metrics.languages, []);
});

test("rejects HTTP, rate-limit, malformed JSON, malformed records and unsafe pagination", async (t) => {
  await t.test("HTTP failure", async () => {
    const fetchImpl = async () => new Response("unavailable", { status: 502 });
    await assert.rejects(collectGitHubStats({ fetchImpl }), /HTTP 502/);
  });

  await t.test("GitHub API rate limit", async () => {
    const fetchImpl = async () => new Response("rate limited", {
      status: 403,
      headers: { "x-ratelimit-remaining": "0" },
    });
    await assert.rejects(collectGitHubStats({ fetchImpl }), /HTTP 403; límite de API alcanzado/);
  });

  await t.test("invalid JSON", async () => {
    const fetchImpl = async () => new Response("{", { status: 200 });
    await assert.rejects(collectGitHubStats({ fetchImpl }), /JSON inválido/);
  });

  await t.test("malformed profile or repository page", async () => {
    const malformedProfile = async () => response({ login: USERNAME, followers: "many" });
    await assert.rejects(collectGitHubStats({ fetchImpl: malformedProfile }), /followers.*entero/);

    const malformedRepositoryPage = async (url) => {
      if (url === PROFILE_API_URL) return response({ login: USERNAME, followers: 0 });
      return response({ repositories: [] });
    };
    await assert.rejects(collectGitHubStats({ fetchImpl: malformedRepositoryPage }), /lista válida/);
  });

  await t.test("pagination cannot send authorization to another host", async () => {
    const fetchImpl = async (url) => {
      if (url === PROFILE_API_URL) return response({ login: USERNAME, followers: 0 });
      return response([], {
        headers: { Link: "<https://example.com/private?per_page=100&page=2>; rel=\"next\"" },
      });
    };
    await assert.rejects(collectGitHubStats({ fetchImpl }), /salió del endpoint público esperado/);
  });
});

test("times out network requests and rejects an invalid clock", async (t) => {
  await t.test("network timeout", async () => {
    const fetchImpl = () => new Promise(() => {});
    await assert.rejects(
      collectGitHubStats({ fetchImpl, timeoutMs: 5 }),
      /agotó el tiempo de espera/,
    );
  });

  await t.test("response body timeout", async () => {
    const fetchImpl = async (url) => {
      if (url === PROFILE_API_URL) return response({ login: USERNAME, followers: 0 });
      return {
        ok: true,
        headers: new Headers(),
        json: () => new Promise(() => {}),
      };
    };
    await assert.rejects(
      collectGitHubStats({ fetchImpl, timeoutMs: 5 }),
      /agotó el tiempo de espera/,
    );
  });

  await t.test("invalid UTC clock", async () => {
    const fetchImpl = async (url) =>
      url === PROFILE_API_URL
        ? response({ login: USERNAME, followers: 0 })
        : response([]);
    await assert.rejects(
      collectGitHubStats({ fetchImpl, now: () => new Date(Number.NaN) }),
      /fecha válida/,
    );
  });
});

test("validates snapshots and escapes language labels before rendering SVG", () => {
  const snapshot = minimalSnapshot([
    { name: "parser-proof", language: "<script>alert(1)</script>", stars: 1 },
  ]);
  assert.equal(validateSnapshot(snapshot), snapshot);
  const svg = renderLanguageChart(snapshot);
  assert.match(svg, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(svg, /<script/);
  assert.throws(
    () => validateSnapshot({ ...snapshot, metrics: { ...snapshot.metrics, stars: 8 } }),
    /no corresponden/,
  );
});

test("README generation accepts JavaScript as a repository language and emits its count", async () => {
  const profile = JSON.parse(await readFile(path.join(ROOT, "data/profile.json"), "utf8"));
  const snapshot = minimalSnapshot([
    { name: "language-label-fixture", language: "JavaScript", stars: 0 },
  ]);

  const readme = renderReadme(profile, snapshot);
  assert.match(readme, /\*\*Conteos por repositorio:\*\* JavaScript: 1\./);
});

test("API failure leaves the last generated snapshot, SVG and README unchanged", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "profile-stats-stale-"));
  try {
    await mkdir(path.join(temporaryRoot, "data"), { recursive: true });
    await mkdir(path.join(temporaryRoot, "public/assets"), { recursive: true });
    const previousFiles = new Map([
      ["data/github-stats.json", "previous snapshot\n"],
      ["public/assets/github-languages.svg", "previous chart\n"],
      ["README.md", "previous README\n"],
    ]);
    for (const [relativePath, content] of previousFiles) {
      await writeFile(path.join(temporaryRoot, relativePath), content);
    }

    await assert.rejects(
      updateProfileArtifacts({
        rootDir: temporaryRoot,
        collectSnapshot: async () => {
          throw new Error("synthetic API failure");
        },
      }),
      /synthetic API failure/,
    );
    for (const [relativePath, previousContent] of previousFiles) {
      assert.equal(await readFile(path.join(temporaryRoot, relativePath), "utf8"), previousContent);
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("writes one validated snapshot and matching README/SVG outputs", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "profile-stats-write-"));
  try {
    await mkdir(path.join(temporaryRoot, "data"), { recursive: true });
    await mkdir(path.join(temporaryRoot, "public/assets"), { recursive: true });
    await writeFile(
      path.join(temporaryRoot, "data/profile.json"),
      await readFile(path.join(ROOT, "data/profile.json"), "utf8"),
    );
    const snapshot = minimalSnapshot([
      { name: "alpha", language: "Python", stars: 2 },
      { name: "beta", language: "TypeScript", stars: 3 },
    ]);

    await updateProfileArtifacts({
      rootDir: temporaryRoot,
      collectSnapshot: async () => snapshot,
    });

    const storedSnapshot = JSON.parse(await readFile(path.join(temporaryRoot, "data/github-stats.json"), "utf8"));
    const svg = await readFile(path.join(temporaryRoot, "public/assets/github-languages.svg"), "utf8");
    const readme = await readFile(path.join(temporaryRoot, "README.md"), "utf8");
    assert.deepEqual(storedSnapshot, snapshot);
    assert.match(svg, />Python</);
    assert.match(svg, />TypeScript</);
    assert.match(readme, /Repositorios propios públicos \(sin forks\) \| 2/);
    assert.match(readme, /Estrellas en esos repositorios \| 5/);
    assert.match(readme, /2026-10-02 12:30 UTC/);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
