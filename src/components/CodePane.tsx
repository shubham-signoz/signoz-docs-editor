import { useEffect, useRef, useCallback, memo } from 'react'
import { EditorSelection, EditorState, Extension } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxHighlighting, defaultHighlightStyle, HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { useTheme } from '@/contexts'

export interface CursorPosition {
  line: number
  column: number
  offset: number
}

export interface CodePaneProps {
  value: string
  cursorOffset?: number
  onChange: (value: string) => void
  onCursorChange?: (position: CursorPosition) => void
  className?: string
  placeholder?: string
}

const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#0b0c0e',
    color: '#c8c8c8',
    height: '100%',
    overflow: 'auto',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '.cm-content': {
    caretColor: '#4e7fff',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#4e7fff',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: '#264f78 !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: '#264f78 !important',
  },
  '.cm-gutters': {
    backgroundColor: '#121317',
    color: '#5c5f66',
    border: 'none',
    borderRight: '1px solid #1d1f25',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#1d1f25',
  },
  '.cm-activeLine': {
    backgroundColor: '#1d1f2580',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: '#1d1f25',
    color: '#c8c8c8',
    border: 'none',
  },
  '.cm-tooltip': {
    backgroundColor: '#1d1f25',
    border: '1px solid #2c2f36',
  },
}, { dark: true })

const lightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#ffffff',
    color: '#1e1e1e',
    height: '100%',
    overflow: 'auto',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '.cm-content': {
    caretColor: '#4e7fff',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#4e7fff',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: '#add6ff !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: '#add6ff !important',
  },
  '.cm-gutters': {
    backgroundColor: '#f8f8f8',
    color: '#999999',
    border: 'none',
    borderRight: '1px solid #e8e8e8',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#f0f0f0',
  },
  '.cm-activeLine': {
    backgroundColor: '#f0f0f080',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: '#f0f0f0',
    color: '#1e1e1e',
    border: 'none',
  },
  '.cm-tooltip': {
    backgroundColor: '#ffffff',
    border: '1px solid #e8e8e8',
  },
}, { dark: false })

const darkHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#c586c0' },
  { tag: tags.operator, color: '#d4d4d4' },
  { tag: tags.special(tags.variableName), color: '#9cdcfe' },
  { tag: tags.typeName, color: '#4ec9b0' },
  { tag: tags.atom, color: '#569cd6' },
  { tag: tags.number, color: '#b5cea8' },
  { tag: tags.definition(tags.variableName), color: '#9cdcfe' },
  { tag: tags.string, color: '#ce9178' },
  { tag: tags.special(tags.string), color: '#d7ba7d' },
  { tag: tags.comment, color: '#6a9955', fontStyle: 'italic' },
  { tag: tags.variableName, color: '#9cdcfe' },
  { tag: tags.tagName, color: '#569cd6' },
  { tag: tags.propertyName, color: '#9cdcfe' },
  { tag: tags.attributeName, color: '#9cdcfe' },
  { tag: tags.className, color: '#4ec9b0' },
  { tag: tags.labelName, color: '#c586c0' },
  { tag: tags.namespace, color: '#4ec9b0' },
  { tag: tags.macroName, color: '#dcdcaa' },
  { tag: tags.link, color: '#ce9178', textDecoration: 'underline' },
  { tag: tags.heading, color: '#4fc1ff', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
])

const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#af00db' },
  { tag: tags.operator, color: '#000000' },
  { tag: tags.special(tags.variableName), color: '#001080' },
  { tag: tags.typeName, color: '#267f99' },
  { tag: tags.atom, color: '#0000ff' },
  { tag: tags.number, color: '#098658' },
  { tag: tags.definition(tags.variableName), color: '#001080' },
  { tag: tags.string, color: '#a31515' },
  { tag: tags.special(tags.string), color: '#863b00' },
  { tag: tags.comment, color: '#008000', fontStyle: 'italic' },
  { tag: tags.variableName, color: '#001080' },
  { tag: tags.tagName, color: '#800000' },
  { tag: tags.propertyName, color: '#001080' },
  { tag: tags.attributeName, color: '#ff0000' },
  { tag: tags.className, color: '#267f99' },
  { tag: tags.labelName, color: '#af00db' },
  { tag: tags.namespace, color: '#267f99' },
  { tag: tags.macroName, color: '#795e26' },
  { tag: tags.link, color: '#a31515', textDecoration: 'underline' },
  { tag: tags.heading, color: '#0000ff', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
])

export const CodePane = memo(function CodePane({
  value,
  cursorOffset,
  onChange,
  onCursorChange,
  className = '',
  placeholder: _placeholder,
}: CodePaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const hasMountedRef = useRef(false)
  const onChangeRef = useRef(onChange)
  const onCursorChangeRef = useRef(onCursorChange)
  const { theme } = useTheme()
  const isExternalUpdate = useRef(false)

  const getInitialSelection = useCallback((doc: string) => {
    if (typeof cursorOffset !== 'number') {
      return undefined
    }

    const clampedOffset = Math.min(doc.length, Math.max(0, cursorOffset))
    return EditorSelection.cursor(clampedOffset)
  }, [cursorOffset])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    onCursorChangeRef.current = onCursorChange
  }, [onCursorChange])

  const getExtensions = useCallback((): Extension[] => {
    const themeExtension = theme === 'dark' ? darkTheme : lightTheme
    const highlightExtension = theme === 'dark'
      ? syntaxHighlighting(darkHighlightStyle)
      : syntaxHighlighting(lightHighlightStyle)

    return [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown({
        base: markdownLanguage,
      }),
      themeExtension,
      highlightExtension,
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          if (!isExternalUpdate.current) {
            onChangeRef.current(update.state.doc.toString())
          }
        }
        if (update.selectionSet) {
          const onCursorChange = onCursorChangeRef.current
          if (onCursorChange) {
            const pos = update.state.selection.main.head
            const line = update.state.doc.lineAt(pos)
            onCursorChange({
              line: line.number,
              column: pos - line.from + 1,
              offset: pos,
            })
          }
        }
      }),
    ]
  }, [theme])

  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: value,
      selection: getInitialSelection(value),
      extensions: getExtensions(),
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }

    if (!viewRef.current || !containerRef.current) return

    const currentDoc = viewRef.current.state.doc.toString()
    viewRef.current.destroy()

    const state = EditorState.create({
      doc: currentDoc,
      selection: getInitialSelection(currentDoc),
      extensions: getExtensions(),
    })

    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    })
  }, [theme])

  useEffect(() => {
    if (!viewRef.current) return

    const currentValue = viewRef.current.state.doc.toString()
    if (currentValue !== value) {
      isExternalUpdate.current = true
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      })
      isExternalUpdate.current = false
    }
  }, [value])

  return (
    <div
      ref={containerRef}
      className={`h-full overflow-auto ${className}`}
      data-testid="code-pane"
    />
  )
})

export default CodePane
