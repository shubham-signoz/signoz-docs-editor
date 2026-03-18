# SigNoz Docs Editor - Ultra-Minimal Design Plan

## Goal
Build a minimal, fast docs editor that:
- Accepts any signoz.io repo path and auto-discovers all components
- Provides dual editing: code (left) + rendered preview (right)
- Has a floating widget on preview side for inserting components

## User Preferences
- **Edit mode**: Dual (code left, rendered right with insert widget)
- **File picker**: Simple path input + fuzzy search across docs
- **Components**: Auto-discovered from repo (no hardcoding)
- **Theme**: System preference (auto dark/light)

## Architecture Decision: **Vite + React + MDX Runtime**

### Why Vite over Next.js/alternatives:
- **Cold start**: ~300ms vs Next.js 2-3s
- **HMR**: <50ms component updates
- **Zero config** MDX compilation
- **Tiny bundle**: ~150KB vs 500KB+
- **No SSR overhead** - we only need client-side rendering

### Key Insight: Dynamic Component Discovery
On startup, the editor will:
1. Accept repo path (e.g., `/Users/smartass08/signoz/signoz.io`)
2. Parse `components/MDXComponents.tsx` to extract all registered components
3. Auto-generate snippets by analyzing component props
4. Symlink components directory for hot reload

This means:
- Zero hardcoding - add new component to signoz.io → auto-appears in editor
- Edit components in signoz.io → instant hot reload in editor
- Same Tailwind config as production

---

## Current Implementation Status

### What's Built (Phase 1-2 partial):
1. **Backend API Server** (`server.js`) - Express server on port 3001
   - Serves file tree from signoz.io `data/docs` directory
   - Read/write MDX files via REST API (`/api/tree`, `/api/file`)
   - Path traversal security protection
   - Configurable via `SIGNOZ_DIR` environment variable

2. **Frontend App** (Vite + React)
   - Three-pane layout: file tree | code editor | preview
   - File tree populated from API
   - CodeMirror editor with MDX content
   - Theme support (dark/light)

3. **Hooks**
   - `useApi.ts` - API communication for file operations
   - `useTheme.ts` - System theme detection

### What's Needed (remaining work):
1. **Component Discovery** - Parse MDXComponents.tsx dynamically
2. **Browser MDX Compilation** - Use @mdx-js/mdx evaluate() instead of iframe
3. **Component Insertion System** - Insert widget, context menu, markers
4. **Fuzzy File Search** - Cmd+P file picker
5. **Frontmatter Editor** - Visual metadata editing

---

## Architecture

```
doc-editor/
├── index.html           # Single HTML entry
├── server.js            # Backend API for file operations ✅
├── vite.config.ts       # Vite + MDX config ✅
├── tailwind.config.js   # Extends signoz.io's config ✅
├── src/
│   ├── main.tsx         # Entry point ✅
│   ├── App.tsx          # Main app with theme provider ✅
│   ├── components/
│   │   ├── Editor.tsx       # Split-pane code/preview ✅
│   │   ├── CodePane.tsx     # CodeMirror MDX editor ✅
│   │   ├── PreviewPane.tsx  # Rendered MDX (TODO: switch from iframe)
│   │   ├── InsertWidget.tsx # Floating "+" button + component picker
│   │   ├── FilePicker.tsx   # Path input + fuzzy search
│   │   └── FrontmatterEditor.tsx # Visual metadata editor
│   ├── discovery/
│   │   ├── parseComponents.ts  # Parse MDXComponents.tsx
│   │   └── extractProps.ts     # Extract props from TSX
│   ├── hooks/
│   │   ├── useTheme.ts         # System theme detection ✅
│   │   ├── useApi.ts           # API communication ✅
│   │   ├── useRepo.ts          # Repo context + component registry
│   │   └── useSync.ts          # Sync code ↔ preview cursor
│   └── contexts/
│       └── ThemeContext.tsx    # Theme provider ✅
└── package.json         # ✅
```

---

## Core Features

### 1. Split-Pane Dual Editor
- **Left pane**: CodeMirror 6 with MDX syntax highlighting
- **Right pane**: Live rendered preview with actual SigNoz components
- Both panes are editable and stay in sync
- Debounced compilation (150ms) for smooth typing (MDX compile is ~50-100ms)

### 2. Multi-Mode Component Insertion
Several ways to insert components into the preview:

**a) Insertion Markers**
- Subtle "+" markers appear between elements on hover
- Click marker → opens component picker → inserts at that position

**b) Right-Click Context Menu**
- Right-click anywhere in preview
- Shows "Insert Component" submenu
- Recent/favorite components at top
- Search for any component

**c) Menu Bar**
- "Insert" dropdown in top menu bar
- Lists all discovered components grouped by folder
- Search field at top

**d) Keyboard Shortcut**
- `Cmd+Shift+I` → opens component picker at cursor position

All methods:
- Components auto-discovered from repo's MDXComponents.tsx
- Search/filter by name
- Shows prop hints in picker

### 3. Auto-Discovered Component Palette
Components dynamically loaded from signoz.io repo:
- Parses `MDXComponents.tsx` exports
- Extracts component names and import paths
- Analyzes TypeScript props to generate smart snippets
- No manual categorization needed - uses folder structure

### 3. File Picker
- Quick path input at top
- Fuzzy search modal (Cmd+P) across all docs
- Recent files dropdown
- Index docs on startup for instant search

### 4. Hot Module Replacement
- Components symlinked from signoz.io
- Vite watches both directories
- Edit component in signoz.io → preview updates instantly

### 5. Theme Support
- System preference detection
- Dark/light toggle override
- Matches SigNoz site styling

### 6. Keyboard Shortcuts
- `Cmd+S` - Save file
- `Cmd+P` - Open file picker (fuzzy search)
- `Cmd+Shift+I` - Open component picker
- `Cmd+B` - Bold selection
- `Cmd+I` - Italic selection
- `Cmd+K` - Insert link
- `Esc` - Close modals/picker

### 7. Frontmatter Editor
- Visual panel above editor for metadata
- Fields: title, description, tags (multi-select)
- Auto-sync with MDX frontmatter
- Collapsible to save space

---

## Tech Stack (Validated)

| Purpose | Library | Why |
|---------|---------|-----|
| Build | Vite 5 | Fastest HMR, dev-only |
| UI | React 18 | Same as signoz.io |
| MDX Runtime | **@mdx-js/mdx** `evaluate()` | Browser-native, no server needed |
| Editor | CodeMirror 6 + lang-markdown | Best perf, extensible for MDX |
| Split pane | react-split | Minimal, flexible |
| Fuzzy search | fuse.js | Fast client-side search |
| Styling | Tailwind (shared) | Reuse signoz.io's config |
| TS Parsing | ts-morph | Extract props from component interfaces |
| Backend | Express.js | File operations API |

**Key Validation:**
- `@mdx-js/mdx` supports `evaluate(file, options)` for browser runtime compilation
- mdx-bundler is server-only, so we use @mdx-js/mdx directly
- CodeMirror 6 has `lang-markdown` package, extensible for JSX syntax
- Runtime MDX compilation is ~50-100ms, so 150ms debounce is appropriate
- ts-morph wraps TypeScript compiler API for AST parsing (extract component props)

---

## Implementation Steps

### Phase 1: Project Setup ✅
1. Initialize Vite + React + TypeScript project
2. Configure Tailwind to extend signoz.io's config
3. Setup MDX compilation pipeline

### Phase 2: Backend API + File Operations ✅
1. Create Express server for file operations
2. Implement file tree endpoint
3. Implement file read/write endpoints
4. Create useApi hook for API communication

### Phase 3: Repo Setup + Discovery (TODO)
1. Create RepoSetup component for initial repo path input
2. Implement parseComponents.ts to parse MDXComponents.tsx
3. Implement extractProps.ts to analyze component props
4. Create useRepo hook for global component registry
5. Dynamically symlink components on repo selection

### Phase 4: Dual Editor with Browser MDX (TODO)
1. Build split-pane layout (CodePane + PreviewPane)
2. Integrate CodeMirror with MDX mode
3. **Replace iframe with browser MDX compilation**
4. Create PreviewPane with MDXProvider + discovered components
5. Wire up debounced compilation + cursor sync

### Phase 5: Component Insertion System (TODO)
1. Add insertion markers between preview elements
2. Implement right-click context menu with component picker
3. Add "Insert" menu to menu bar
4. Build component picker modal with search
5. Auto-generate snippets from discovered props
6. Add `Cmd+Shift+I` keyboard shortcut

### Phase 6: File Operations + Polish (TODO)
1. File picker with fuzzy search
2. Save functionality
3. Frontmatter editor
4. Keyboard shortcuts

---

## Dynamic Component Discovery

```tsx
import { Project } from 'ts-morph'

// At startup, editor runs this:
async function discoverComponents(repoPath: string) {
  const project = new Project()

  // 1. Read MDXComponents.tsx
  const mdxFile = project.addSourceFileAtPath(
    `${repoPath}/components/MDXComponents.tsx`
  )

  // 2. Parse exports object to get component names
  const exportsObj = mdxFile.getVariableDeclaration('components')
  const componentNames = extractObjectKeys(exportsObj) // ['Admonition', 'Tabs', ...]

  // 3. For each component, resolve import and read source
  for (const name of componentNames) {
    const importDecl = mdxFile.getImportDeclaration(d =>
      d.getDefaultImport()?.getText() === name
    )
    const componentPath = resolveImportPath(importDecl)

    // 4. Add component source and extract props interface
    const componentFile = project.addSourceFileAtPath(componentPath)
    const props = extractPropsInterface(componentFile, name) // uses ts-morph

    // 5. Generate snippet template from props
    const snippet = generateSnippet(name, props)

    components.push({ name, path: componentPath, props, snippet })
  }

  // 6. Group by folder for UI categorization
  return groupByFolder(components)
}
```

**Result**: Editor automatically knows about ALL components without hardcoding.

---

## Files to Create

### Completed ✅
1. `package.json` - Dependencies
2. `vite.config.ts` - Vite + MDX + path aliases
3. `tailwind.config.js` - Extends signoz.io config
4. `postcss.config.js` - Tailwind processing
5. `index.html` - Entry HTML
6. `tsconfig.json` - TypeScript config
7. `src/main.tsx` - React entry
8. `src/App.tsx` - Main app with providers
9. `server.js` - Backend API server
10. `src/hooks/useApi.ts` - API communication
11. `src/hooks/useTheme.ts` - System theme hook
12. `src/components/Editor.tsx` - Split-pane container
13. `src/components/CodePane.tsx` - CodeMirror MDX editor

### TODO
14. `src/RepoSetup.tsx` - Initial repo path input
15. `src/components/PreviewPane.tsx` - Browser MDX rendering (replace iframe)
16. `src/components/InsertionMarker.tsx` - "+" markers between elements
17. `src/components/ComponentPicker.tsx` - Modal for searching/selecting components
18. `src/components/ContextMenu.tsx` - Right-click menu
19. `src/components/MenuBar.tsx` - Top menu bar with Insert dropdown
20. `src/components/FilePicker.tsx` - Path input + fuzzy search modal
21. `src/components/FrontmatterEditor.tsx` - Visual metadata editor
22. `src/mdx-compiler.ts` - MDX compilation utility
23. `src/discovery/parseComponents.ts` - Parse MDXComponents.tsx exports
24. `src/discovery/extractProps.ts` - Extract TypeScript props
25. `src/hooks/useRepo.ts` - Repo context + discovered components
26. `src/hooks/useFileIndex.ts` - Doc file indexing
27. `src/hooks/useKeyboardShortcuts.ts` - Global shortcuts

---

## Verification

1. `npm run dev` starts editor at localhost:5173 ✅
2. Paste signoz.io repo path → components auto-discovered
3. Open any .mdx file from the repo's docs ✅
4. Edit MDX in code pane → preview updates in <100ms
5. Click "+" widget on preview → see all discovered components
6. Search for "Admonition" → insert → appears in both panes
7. `Cmd+P` opens fuzzy file search
8. `Cmd+S` saves file
9. Edit frontmatter visually → syncs to MDX
10. Modify component in signoz.io/components → hot reloads
11. Add new component to MDXComponents.tsx → auto-appears in widget

---

## Future Extensions (Not in v1)
- Multi-doc navigation (doc chain)
- Git integration (diff view)
- Component prop editor (visual editing)
