# AGENTS.md

## Project Overview
- This repository is a Vite + React + TypeScript app for editing and previewing SigNoz MDX docs.
- The frontend lives in `src/` and the local file API server lives in `server.js`.
- Use the existing `npm` workflow and keep changes minimal and targeted.

## Working Agreements
- Prefer focused changes that preserve the current app structure.
- Follow existing TypeScript, React, and styling patterns already present in the repo.
- Avoid introducing new dependencies unless they are clearly necessary.
- When modifying UI behavior, keep both the code editor and preview workflows in mind.
- Update documentation when behavior or setup changes materially.

## Key Files
- `package.json`: scripts, dependencies, and project entry points.
- `vite.config.ts`: Vite configuration and plugin setup.
- `server.js`: local API server for file tree and file read/write operations.
- `src/App.tsx`: main application shell.
- `src/components/`: editor, preview, and supporting UI components.
- `src/hooks/`: reusable application hooks.

## Commands
- Install dependencies: `npm install`
- Start frontend + backend: `npm start`
- Start only frontend: `npm run dev`
- Start only backend: `npm run server`
- Build production bundle: `npm run build`
- Run tests: `npm test`
- Run lint: `npm run lint`

## Validation
- For code changes, prefer validating with the most relevant command first.
- Use `npm run build` for integration-level verification.
- Run `npm test` when changing behavior covered by tests.
- Run `npm run lint` when touching linted source files or introducing new code paths.

## Notes
- The repo may interact with a local `signoz.io` checkout through the backend server.
- Be careful with file path handling and preserve existing path safety checks in `server.js`.

## Handoff
- Keep the current implementation status and validation history in `HANDOFF.md`.
- Before resuming a large refactor or debugging session, read `HANDOFF.md` first and update it when major changes, blockers, or validation results happen.
- Record both repo-local fixes and external integration blockers, especially anything involving the local `signoz.io` checkout or tool/runtime instability.
