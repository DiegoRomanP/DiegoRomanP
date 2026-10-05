# Pi Agent Configuration

## Objective

Make the project-local `.pi/` agent resources discoverable and correctly configured for Pi, replacing OpenCode-only metadata where it prevents Pi from loading or using the profile workflow.

## Problem and rationale

The four authored agent files used OpenCode frontmatter and the OpenCode `Task` tool. The project Pi runtime did not discover them; `subagent({ action: "list", agentScope: "project" })` showed only built-ins. The profile command was in `.pi/command/`, while Pi prompt templates belong in `.pi/prompts/`. The GitHub Profile README skill already follows Pi's Agent Skills format and remains unchanged.

## Scope and constraints

- Change only project-local Pi resources and supporting documentation under `.pi/`.
- Keep `.opencode/`, `opencode.json`, and other pre-existing untracked files untouched.
- Use Pi `pi-subagents` agent fields and native `/prompt-workflow` integration; restrict each role to the tools it needs.
- Pin `pi-subagents` in project Pi settings. Configure only the isolated Playwright MCP integration required by the reviewer; do not migrate credentialed GitHub or Firecrawl servers.
- Preserve profile content, factuality, accessibility, and no-publication/no-commit constraints.
- Repair `.pi/.gitignore` so it can be tracked and its dependency exclusions persist.
- Do not commit, push, publish, or alter user trust decisions.
- Forecast: approximately 350 authored changed lines; delivery strategy is `ask-on-risk`.

## Tasks

- [ ] **T1 — Migrate Pi configuration and profile workflow.** Convert all four agent definitions to the supported Pi schema, set strict role-specific tool/skill boundaries and explicit nested-agent routing, add pinned project settings and isolated Playwright MCP config, create the supported prompt template, replace the unsupported command file with a deprecation pointer, rewrite `.pi/README.md` for Pi, and fix the self-ignored `.pi/.gitignore`. Acceptance: project agents have required names and supported fields; only Senior can launch the three allowlisted roles; designer/reviewer have no file-write or shell tools; the workflow uses `subagent`/`/prompt-workflow`; all Pi resource paths and trust behavior are documented.
- [ ] **T2 — Resolve the failed JSON-check command.** Independently run a syntactically correct JSON validation and whitespace/config structural checks without launching external MCP processes. Acceptance: corrected checks pass; report the initial verification-command syntax error accurately.
- [ ] **T3 — Verify Pi runtime discovery and close.** Confirm project-agent discovery and prompt/resource paths, inspect ignore behavior, and report the live MCP limitation. Acceptance: all four roles appear with expected tool boundaries; settings and prompt resources are discoverable; live Playwright connection is not claimed unless actually verified.

## Verification

- Use `gentle-ai-verify` for verification commands. Keep checks read-only.
- Validate `.pi/settings.json` and `.pi/mcp.json` as JSON; confirm `.pi/.gitignore` is not ignored while local dependency artifacts remain ignored.
- Confirm Pi project-scope agent discovery returns `designer`, `dev-frontend`, `reviewer`, and `senior` with the expected tool boundaries.
- Do not start/download the Playwright MCP process or change project trust merely to validate static configuration; report its live connection state as unverified if not already running.
- Check focused paths and report all skipped or unavailable checks.

## Progress and evidence

- Exploration: Pi docs define project agents at `.pi/agents/**/*.md`, project prompt templates at `.pi/prompts/`, project settings at `.pi/settings.json`, and project MCP at `.pi/mcp.json`. Installed `pi-subagents` 0.75.0 supports `name`, `tools`, `thinking`, `skills`, `allowNestedSubagents`, and `allowedAgents`.
- Baseline: `.pi/agents/*.md` used OpenCode `mode`, `variant`, `permission`, and `Task`; `.pi/command/profile-workflow.md` used unsupported `agent: senior`; `.pi/settings.json` and `.pi/mcp.json` were absent. `.pi/.gitignore` ignored itself. The skill frontmatter was valid; `.pi/package.json` is an ignored OpenCode dependency manifest, not Pi project settings.
- Runtime baseline: project-scope subagent listing showed only built-ins.
- Implementation: the resumed `gentle-ai-worker` edited the four agents, Pi settings/MCP files, prompt, legacy-command pointer, README, and ignore file. It reported no skill changes, commits, trust changes, MCP launch, push, or publication.
- Writer verification: worker status was partial because its authorized Node validation command had a JavaScript syntax error (`for (const p [...]` omitted `of`); `git diff --check -- .pi` returned 0 but does not inspect untracked files. This is an unverified configuration result, not evidence of invalid JSON.
- Native assessment: `gentle_review assess` returned `risk: unassessable`, `rddLine: unknown`, reason `package-local-binary-missing`, and an independent-verifier plan. Follow that plan.
- Repository: branch `fix/pi-agent-configuration`, based at `6b0596a`; `.pi/` and this feature task file are untracked. No partial writes from the cancelled first attempt; resumed worker changes are present.
- Memory: Engram mirror pending; provider initialization reports its installed `engram` binary predates `v2.0.0-rc.11`.
- Commits: none; the user did not authorize committing.
- Paused: the user requested a separate Astro landing-page implementation; T2 has not started and this configuration task remains incomplete. Resume T2 with `gentle-ai-verify`, then T3.
