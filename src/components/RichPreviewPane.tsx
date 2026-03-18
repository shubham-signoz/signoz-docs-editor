import { useCallback, useRef, useEffect } from 'react'
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  frontmatterPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  CodeToggle,
  InsertCodeBlock,
  type MDXEditorMethods,
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

export interface RichPreviewPaneProps {
  /** MDX source content */
  mdxSource: string
  /** Called when content changes */
  onChange: (value: string) => void
  /** Additional CSS class names */
  className?: string
}

/**
 * RichPreviewPane - A WYSIWYG MDX editor using @mdxeditor/editor.
 * Allows direct editing of the rendered preview.
 */
export function RichPreviewPane({
  mdxSource,
  onChange,
  className = '',
}: RichPreviewPaneProps) {
  const editorRef = useRef<MDXEditorMethods>(null)
  const isExternalUpdate = useRef(false)
  const externalUpdateTimeoutRef = useRef<number | null>(null)

  // Update editor when external source changes
  useEffect(() => {
    if (editorRef.current) {
      const currentMarkdown = editorRef.current.getMarkdown()
      if (currentMarkdown !== mdxSource) {
        isExternalUpdate.current = true
        editorRef.current.setMarkdown(mdxSource)
        // Reset flag after a short delay
        if (externalUpdateTimeoutRef.current !== null) {
          window.clearTimeout(externalUpdateTimeoutRef.current)
        }
        externalUpdateTimeoutRef.current = window.setTimeout(() => {
          isExternalUpdate.current = false
          externalUpdateTimeoutRef.current = null
        }, 50)
      }
    }

    return () => {
      if (externalUpdateTimeoutRef.current !== null) {
        window.clearTimeout(externalUpdateTimeoutRef.current)
        externalUpdateTimeoutRef.current = null
      }
    }
  }, [mdxSource])

  // Handle changes from the editor
  const handleChange = useCallback((markdown: string) => {
    if (!isExternalUpdate.current) {
      onChange(markdown)
    }
  }, [onChange])

  return (
    <div className={`h-full overflow-auto rich-preview-pane ${className}`}>
      <MDXEditor
        ref={editorRef}
        markdown={mdxSource}
        onChange={handleChange}
        contentEditableClassName="prose prose-invert max-w-none p-6 min-h-full focus:outline-none"
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin(),
          tablePlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: 'typescript' }),
          codeMirrorPlugin({
            codeBlockLanguages: {
              js: 'JavaScript',
              javascript: 'JavaScript',
              ts: 'TypeScript',
              typescript: 'TypeScript',
              jsx: 'JSX',
              tsx: 'TSX',
              css: 'CSS',
              html: 'HTML',
              json: 'JSON',
              yaml: 'YAML',
              bash: 'Bash',
              shell: 'Shell',
              python: 'Python',
              go: 'Go',
              rust: 'Rust',
              sql: 'SQL',
              graphql: 'GraphQL',
              markdown: 'Markdown',
              mdx: 'MDX',
            },
          }),
          frontmatterPlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <UndoRedo />
                <BoldItalicUnderlineToggles />
                <CodeToggle />
                <BlockTypeSelect />
                <CreateLink />
                <ListsToggle />
                <InsertTable />
                <InsertThematicBreak />
                <InsertCodeBlock />
              </>
            ),
          }),
        ]}
      />
    </div>
  )
}

export default RichPreviewPane
