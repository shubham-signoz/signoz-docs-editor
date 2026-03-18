# Doc Editor Handoff

## Current Goal
- Rebuild the editor UX so it is stable, session-aware, and able to render custom SigNoz MDX components without duplicating parsing logic inside this repo.
- Get the full test suite and `npm run build` passing using fixes made only in this repo, without modifying the external `signoz.io` checkout.

## Current Status
- `npm test -- --run` passes.
- `npm run build` passes.
- Test execution remains single-threaded via the `package.json` Vitest pool settings to avoid the earlier worker-stall behavior in this environment.

## What Has Been Done

### Repo guidance and housekeeping
- Added and initialized `AGENTS.md`.
- Added `.gitignore` for local build and tool artifacts.
- Confirmed dependencies were already installed with `npm install --package-lock-only`.

### Editor and workspace refactor
- Replaced the old `Editor` shell with a cleaner workspace flow in `src/components/Editor.tsx`.
- Added persistent workspace/session state in `src/hooks/useWorkspaceSession.ts`.
- Added shared file tree utilities in `src/utils/fileTree.ts`.
- Removed the old default-expanded tree behavior.
- Added persisted open files, recent files, restored selected file, and collapsible sidebar behavior.
- Kept source as the authoritative editing surface and disabled fragile bidirectional preview editing in the new main flow.

### Shared SigNoz component import pipeline
- Added `signoz-component-registry.js` as the shared parser for SigNoz MDX component registry data.
- Updated `server.js` to use the shared parser instead of its own duplicate implementation.
- Updated `vite-plugin-signoz-components.ts` to use the same shared parser.
- Added a local shim at `src/shims/signoz-allowed-image-domains.ts`.
- Replaced `vite-plugin-context-resolver.ts` so imports from `@/constants/allowedImageDomains` inside the external `signoz.io` tree can be resolved locally without editing `signoz.io`.

### Test additions and fixes already made
- Added:
  - `src/__tests__/signoz-component-registry.test.ts`
  - `src/utils/__tests__/fileTree.test.ts`
- Replaced or updated:
  - `src/components/__tests__/Editor.test.tsx`
  - `src/hooks/__tests__/useTheme.test.ts`
- Updated shared test setup in `src/test-setup.ts` to:
  - stop replacing `window.localStorage` with a fake object
  - clear real localStorage before each test
  - stub `HTMLElement.prototype.scrollIntoView`
- Updated `src/components/FilePicker.tsx` to safely guard `scrollIntoView`.
- Updated `src/components/PreviewPane.tsx` so empty MDX source shows the empty state immediately instead of briefly rendering only the loading state.
- Updated `src/hooks/__tests__/useKeyboardShortcuts.test.ts` to match current platform/meta-key handling.
- Updated `src/components/__tests__/FrontmatterEditor.test.tsx` to align with current controlled-input behavior and duplicate-tag behavior.
- Updated `src/components/CodePane.tsx` to avoid recreating the CodeMirror view on initial mount from the theme effect, which was causing stacked editor DOM and a visually split source pane.
- Updated `src/components/CodePane.tsx` to keep the latest `onChange` and `onCursorChange` callbacks available to the CodeMirror update listener without forcing editor re-creation.
- Updated `src/components/Editor.tsx` to reconcile restored `openFiles`/`recentFiles` against the current tree, fall back to the last valid open file when needed, and avoid stale render-snapshot state while closing tabs.
- Fixed `Collapse all` in `src/components/Editor.tsx` so it truly clears all expanded tree paths instead of keeping the selected file's ancestor folders open.
- Updated `src/components/Editor.tsx` tree styling so ancestor folders of the selected file get a subtle active-path highlight, while the selected file keeps the stronger highlight.
- Added a `Clear recent` action to the `Recent` section in `src/components/Editor.tsx` so recent-file history can be cleared without affecting open tabs.
- Updated `src/components/Editor.tsx` open-tab ordering so selecting an already open tab no longer moves it to the end of the tab strip; tab order is now stable unless a file is newly opened.
- Updated the MDX preview pipeline (`src/mdx-compiler.ts`, `src/components/PreviewPane.tsx`, `src/components/Editor.tsx`, `server.js`) to resolve local `.md` / `.mdx` imports through a repo-local API, inline shared markdown fragments before browser-side evaluation, and strip remaining top-level import/export statements that the in-browser MDX evaluator cannot execute.
- Updated `src/mdx-compiler.ts` to strip YAML frontmatter using the shared frontmatter utility before preview compilation, so docs that start with `--- ... ---` render cleanly.
- Updated `src/mdx-compiler.ts` again to tolerate leading blank lines before frontmatter and to inject a preview H1 from frontmatter `title` only when the body does not already define its own H1.
- Replaced the browser-side `gray-matter` dependency in `src/mdx-compiler.ts` with a lightweight local frontmatter extractor so frontmatter stripping/title injection stays efficient and does not bloat the preview bundle.
- Fixed the frontmatter-title injection guard in `src/mdx-compiler.ts` so it only suppresses title injection when the body itself starts with an H1, instead of accidentally suppressing it because of a later `# ` match elsewhere in the document.
- Added focused MDX compiler coverage for local shared-markdown import resolution in `src/__tests__/mdx-compiler.test.ts`.
- Updated `server.js` to use a portable repo-local default `SIGNOZ_DIR` and a boundary-safe path check for file read/write APIs.
- Updated `vite.config.ts` to use the same portable repo-local `SIGNOZ_DIR` default.
- Added repo-local static asset serving for `/img/*` and `/svgs/*` from `../signoz.io/public`, with a Vite dev proxy to the local API server so images render without pushing those assets through the preview bundle.
- Updated `src/components/Editor.tsx` to add a lightweight draggable divider between source and preview on desktop, with bounded split ratios and preview overflow constraints so resizing does not introduce horizontal pane scrolling.
- Updated `src/components/Editor.tsx` and `src/components/CodePane.tsx` so each open tab keeps its own draft, dirty state, and cursor offset, and switching tabs restores that per-file editor state instead of sharing one global source/cursor state.
- Rewrote `src/__tests__/preview-rendering.test.tsx` to test the actual `PreviewPane` contract instead of repeatedly running the full MDX compiler. The suite now mocks `compileMDX`, uses direct `findBy*` assertions instead of blanket `waitFor(...)`, and covers the component-owned bug classes: empty-state short-circuiting, loading UI, compiler argument wiring, successful render, error render, and stale async compilation cancellation.
- Fixed a real `PreviewPane` performance bug uncovered during that rewrite: the component was defaulting `components` to a fresh `{}` on every render, and the compile effect depends on `components`, so it could retrigger forever. The default is now a stable shared empty object.
- Added targeted regression coverage in:
  - `src/components/__tests__/CodePane.test.tsx`
  - `src/components/__tests__/Editor.test.tsx`
  for single CodeMirror instance rendering and stale session restore cleanup.

## Validation History
- `npm test -- --run` passes.
- `npm run build` passes.
- Existing build output still includes the non-blocking chunk-size warning and the `crypto` browser-externalization warning from the local `signoz.io` import surface.

## Files Added During This Work
- `AGENTS.md`
- `.gitignore`
- `HANDOFF.md`
- `signoz-component-registry.js`
- `src/hooks/useWorkspaceSession.ts`
- `src/utils/fileTree.ts`
- `src/utils/__tests__/fileTree.test.ts`
- `src/__tests__/signoz-component-registry.test.ts`
- `src/shims/signoz-allowed-image-domains.ts`

## Files Heavily Updated During This Work
- `src/components/Editor.tsx`
- `server.js`
- `vite-plugin-signoz-components.ts`
- `vite-plugin-context-resolver.ts`
- `src/test-setup.ts`
- `src/components/FilePicker.tsx`
- `src/components/PreviewPane.tsx`
- `src/components/__tests__/Editor.test.tsx`
- `src/components/__tests__/FrontmatterEditor.test.tsx`
- `src/hooks/__tests__/useKeyboardShortcuts.test.ts`
- `src/hooks/__tests__/useTheme.test.ts`
- `src/discovery/parseComponents.ts`

## Important Constraints
- Do not modify the external `signoz.io` repo.
- Any compatibility fix for `signoz.io` imports must live inside this repo.
- Keep changes minimal and targeted to the editor app and its local tooling.

## Recent Progress
- Fixed a real `Editor` tab-switch race: stale async `readFile()` completions can no longer overwrite a newer file selection after rapid tab changes.
- Fixed another `Editor` tab-state bug: closing the selected tab now always removes that tab cleanly, even if the fallback replacement file fails to open. In that failure case the editor clears selection instead of leaving the closed tab stuck active.
- Updated session-state sanitation to dedupe persisted `openFiles`, `recentFiles`, and `expandedPaths`, and pruned stale in-memory per-file editor state when the restored open-file list is normalized.
- Updated `src/mdx-compiler.ts` to use a relative `/api` base for local import resolution and to avoid permanently caching failed import lookups.
- Added cancellation guards to `src/components/FileTree.tsx` so stale async tree builds do not commit state after input changes or unmount.
- Fixed the `Editor` session-restore guard so restore/validation is allowed to run again when the tree content actually changes, instead of only once for the lifetime of the component.
- Changed editor actions so file-level `Save` and `Add component` live under the selected file header, the global header action is now `Save all`, and pane divider positions are persisted per file in workspace session state instead of a single global split value.
- Added file-level `Refresh` and global `Refresh all` actions that reload open docs from disk without reordering tabs, and guarded them so a slow refresh cannot overwrite newer in-editor changes that happened after the refresh started.
- Clarified the shared-component status badge so it reports locally loadable components separately from external or unsupported registry entries instead of making the count look like a runtime failure.
- Added a proper `.gitignore`, `.nvmrc`, and `README.md` covering project purpose, setup, commands, local `signoz.io` expectations, and an explicit warning that the tool was vibecoded over one weekend as an internal utility rather than built as a polished frontend product.
