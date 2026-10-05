# Dark Portfolio Landing Preview

## Objective

Build a standalone Astro preview route inspired by the Wix "Researcher CV (Minimal)" template, adapted to Diego's portfolio, content, and requested dark, serious, direct style.

## Product decision

The user selected a separate preview route so the existing homepage remains unchanged. `src/pages/landing-preview.astro` renders as static HTML at the preview route.

## Direction and evidence

- Wix's scraped template content uses a compact researcher-CV structure: hero and research CTA, core investigation areas, selected works/papers, and a collaboration close.
- The existing portfolio is editorial and minimal, uses the site's dark palette (`#101417`, `#eff1ea`, mint accent `#79d8c1`), monospaced metadata, concise evidence-focused copy, and responsive Astro styling.
- Reuse `data/profile.json` for verified personal/project content and `src/styles/global.css` for existing tokens; preserve factual scope and link to project repositories instead of implying unavailable live demos.
- The Wix desktop/mobile visual preview could not be inspected: `agent-browser` CLI is unavailable and there are no configured MCP servers. The implementation follows the extracted structure, not a pixel-level reproduction.

## Scope and constraints

- Added exactly one source file: `src/pages/landing-preview.astro`.
- Left `src/pages/index.astro`, shared components, profile data, and global styles unchanged.
- No new dependencies, external images, or project-content claims beyond existing profile data.
- The page is dark by default, responsive, uses semantic landmarks, visible section links, project repository links, and a LinkedIn contact CTA.
- No commit, push, publication, project trust change, browser/MCP launch, or `.pi/npm/` modification.

## Tasks

- [x] **T1 — Create the Astro preview page.** Add one semantic, responsive `.astro` page with a dark hero, adapted focus areas, selected project cards, and a direct collaboration CTA. Use real profile/project data, internal section navigation, repository links, and the existing dark design tokens. Acceptance: the authored route is isolated from the current homepage and never claims projects have live demos where only repositories are known.
- [x] **T2 — Resolve the verification startup blocker.** The owner explicitly authorized parent-session checks after `gentle-ai-verify` stalled. No MCP/browser permission was approved; `.pi/npm/` remains untouched.
- [x] **T3 — Verify the preview.** Run applicable Astro checks and static build; inspect the generated route, links, responsive/semantic structure, and available browser capability without installing tooling. Acceptance: checks pass; disclose unavailable browser comparison.

## Verification

- Presentation-only page; no focused behavioral test exists, so meaningful RED/GREEN does not apply.
- Before build, `git ls-files -- dist` returned 0 files; `dist/` is ignored by `.gitignore:3:/dist/` and contained generated Astro assets, so build was safe.
- `npm run check` — passed: 20 Astro files, 0 errors, 0 warnings, 0 hints; profile snapshot valid; README and SVG statistics match source data.
- `npm run build` — passed: static output includes `/landing-preview/index.html` and `/index.html` (2 pages).
- Generated-route assertion — passed: dark Spanish HTML, all 4 projects, section anchors, GitHub/LinkedIn links, base-prefixed LexiTrace image URL, generated image asset, 640px responsive breakpoint and reduced-motion CSS.
- Source hygiene — passed: no trailing whitespace and final newline present.
- Transient verification issues: an initial shell-quoted assertion did not execute, a strict HTML-attribute-order assertion failed, and a responsive check expected `max-width` rather than Astro's emitted `(width<=640px)` syntax. Corrected read-only assertions passed; no source change was required for these checks.
- Browser visualization was not run: `agent-browser` is not installed and the owner explicitly prohibited starting/installing browser or MCP tooling. No pixel-level Wix comparison is claimed.
- Native `gentle_review inspect` was blocked with `package-local-binary-missing`; `lineage_created: false` and `mutation_performed: false`. The suggested package install was not run. No native review was completed.
- The full `npm test` suite was not run because this is a presentation-only route with no applicable behavioral coverage.

## Progress and evidence

- Exploration: `src/pages/index.astro` uses the existing profile data and shared global CSS; `data/profile.json` provides accurate project descriptions, scope notes, stacks, and repository URLs. `astro.config.mjs` uses static output and base `/DiegoRomanP/`.
- Reference scrape: the Wix template text contains hero, "Core Areas Investigation", selected works, and collaboration sections. Browser screenshot unavailable.
- Implementation: added only `src/pages/landing-preview.astro`. It uses `data/profile.json`, imports the shared stylesheet, sets `data-theme="dark"`, reuses the LexiTrace flow asset, and links project cards to their repositories. The root homepage and shared source files remain untouched.
- Explorer incident: run `muubleau-2-8w7s` (`gentle-ai-explore`) timed out after 4 minutes while waiting on a request to allow project Playwright MCP from `.pi/mcp.json`, despite explicit no-MCP/browser instructions; stderr reported `added 5 packages`. Process inspection found no Playwright MCP process. `.pi/npm/` is present with a package manifest for `pi-subagents`, lockfile, `.gitignore`, and `node_modules`; its origin is unconfirmed and it was left untouched.
- Verifier incident: run `muufkixw-3-xxx2` (`gentle-ai-verify`) timed out after 4 minutes with 0 turns/0 tool calls, stalled at the same project MCP permission prompt. The owner then explicitly authorized the parent to run local checks without MCP.
- Native review inspection: blocked by missing package-local binary; no lineage or mutation was created. Do not run the install recovery command without authorization.
- Repository: `/home/diego/Documentos/portafolio/DiegoRomanP`, branch `feat/dark-portfolio-preview`, HEAD `6b0596a`; `.pi/`, `odd/tasks/`, and `src/pages/landing-preview.astro` are untracked; `dist/` is ignored. No commit, push, or publication.
- The prior Pi configuration migration remains paused and incomplete; resume its verification separately.
- Memory: Engram mirror pending; the installed binary predates `v2.0.0-rc.11` and provider calls fail.
- Next step: the user can preview `/DiegoRomanP/landing-preview/` with the local Astro dev server and give visual/copy feedback for the next iteration.
