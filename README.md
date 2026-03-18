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

By default it expects this layout:

```text
signoz/
  doc-editor/
  signoz.io/
```

The backend reads docs from `../signoz.io/data/docs` unless you override it with environment variables.

## Environment variables

The backend process reads these variables:

- `SIGNOZ_DIR` (optional)
  - default: local `../signoz.io` relative to `doc-editor`
  - points to your local `signoz.io` checkout
- `DOCS_PATH` (optional)
  - default: `data/docs`
  - path under `SIGNOZ_DIR` where docs are read from
- `PORT` (optional)
  - default: `3001`
  - port used by the local Express API server

Run by prefixing variables directly:

```bash
SIGNOZ_DIR=/abs/path/to/signoz DOCS_PATH=data/docs PORT=4001 npm run server
```

## Requirements

- Node.js `20` via `.nvmrc`
- a local sibling `signoz.io` checkout

## Setup

```bash
nvm use
npm install
```

## Run

Start frontend and backend together:

```bash
npm start
```

Frontend only:

```bash
npm run dev
```

Backend only:

```bash
npm run server
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

## Philosophy

The source is authoritative.

The preview should stay renderable.

Compatibility fixes for `signoz.io` should happen here, not by editing the external repo.
