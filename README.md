# SigNoz Doc Editor

## Warning

This project is 100% vibecoded.

I do not have real frontend app experience, and this was built over one weekend to unblock docs editing work. It is useful, tested, and locally buildable, but it should be treated like a pragmatic internal tool rather than a polished product.

## Why

Editing SigNoz docs directly in the `signoz.io` repo is slow for quick iteration when you want:
- a local file tree
- a source-first MDX editor
- a live preview
- local loading of shared SigNoz components
- compatibility fixes without touching the external `signoz.io` checkout

This repo exists to make that loop faster.

## What

This is a Vite + React + TypeScript app with a small local Express server.

It provides:
- a source editor for MDX docs
- a live preview pane
- a local docs file tree
- session restore for open tabs and workspace state
- local resolution of shared SigNoz components and markdown imports
- local serving of `signoz.io/public` assets for preview rendering

The editor is designed to work alongside a sibling `signoz.io` checkout and keeps compatibility fixes inside this repo.

## How it works

The app has two parts:
- frontend: React app served by Vite
- backend: local Express server that reads docs, resolves imports, and serves assets

By default it expects to be run from the `signoz.io` repo directory.

The backend reads docs from `./data/docs` unless you override it with environment variables.

## Environment variables

The backend process reads these variables:

- `SIGNOZ_DIR` (optional)
  - default: current working directory (`process.cwd()`)
  - typically points to your local `signoz.io` checkout
- `DOCS_PATH` (optional)
  - default: `data/docs`
  - path under `SIGNOZ_DIR` where docs are read from
- `PORT` (optional)
  - default: `3001`
  - port used by the local Express API server
- `VITE_API_BASE` (optional)
  - default: `/api`
  - frontend API base for the React app and MDX compiler

`VITE_API_BASE` is useful when you run behind a different host/port setup.

Run by prefixing variables directly:

```bash
SIGNOZ_DIR=/abs/path/to/signoz DOCS_PATH=data/docs PORT=4001 npm run server
```

## Requirements

- Node.js `20` via `.nvmrc`
- run from the `signoz.io` checkout where `data/docs` exists

## Use from npm (main flow)

You can install and run without cloning this repo from within your `signoz.io` checkout:

```bash
cd /path/to/signoz.io
signoz-docs-editor
```

If you prefer a global install:

```bash
npm i -g signoz-docs-editor@latest
signoz-docs-editor
```

Or run directly with npx (this is the recommended no-sync flow):

```bash
npx signoz-docs-editor@latest
```

If you see `EBADENGINE` warnings, upgrade to Node.js `20+`.

This defaults `SIGNOZ_DIR` to the directory you launch from, so from any machine with `signoz.io` checked out you can run:

```bash
cd /path/to/signoz.io
npx signoz-docs-editor@latest
```

If you run the binary from outside `signoz.io`, pass the checkout path explicitly:

```bash
SIGNOZ_DIR=/path/to/signoz.io signoz-docs-editor
```

## Local development flow (for contributors)

If you want to modify this package locally:

```bash
git clone <repo-url>
cd signoz-doc-editor
nvm use
npm install
```

From the project root, run both frontend and backend with your local `signoz.io` path:

```bash
SIGNOZ_DIR=/path/to/signoz.io npm run start:dev
```

Frontend only:

```bash
npm run dev
```

Backend only:

```bash
npm run server
```

Or set `SIGNOZ_DIR` explicitly for any command:

```bash
SIGNOZ_DIR=/path/to/signoz.io npm run dev
SIGNOZ_DIR=/path/to/signoz.io npm run server
```

## Validate

Run tests:

```bash
npm test -- --run
```

Build:

```bash
npm run build
```

## Key files

- `src/components/Editor.tsx`: main editor shell
- `src/components/PreviewPane.tsx`: preview rendering
- `src/components/CodePane.tsx`: CodeMirror editor wrapper
- `src/mdx-compiler.ts`: browser-side MDX compile path
- `server.js`: local file/import/assets API
- `vite.config.ts`: local compatibility and dev server config
- `HANDOFF.md`: implementation status and validation history

## Known limits

- this is an internal tool, not a general-purpose CMS
- some compatibility behavior exists specifically for local `signoz.io` integration
- build output still has large chunk warnings
- preview correctness depends on the local `signoz.io` structure staying broadly compatible
- if the UI loads as blank, open DevTools Network/Console and verify requests to `/api/config`, `/api/tree`, and `/api/components` are not failing

## Philosophy

The source is authoritative.

The preview should stay renderable.

Compatibility fixes for `signoz.io` should happen here, not by editing the external repo.
