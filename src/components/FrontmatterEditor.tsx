import React, { useState, useCallback, useMemo } from 'react'

/**
 * Props for the FrontmatterEditor component.
 */
export interface FrontmatterEditorProps {
  /** The parsed frontmatter object */
  frontmatter: Record<string, unknown>
  /** Callback when frontmatter changes */
  onChange: (frontmatter: Record<string, unknown>) => void
  /** Whether the editor is read-only */
  readOnly?: boolean
  /** Whether to show the editor expanded by default */
  defaultExpanded?: boolean
}

/**
 * A tag/chip component for displaying and removing tags.
 */
function Tag({
  value,
  onRemove,
  readOnly,
}: {
  value: string
  onRemove: () => void
  readOnly?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-signoz-bg-surface rounded text-sm text-signoz-text-primary">
      {value}
      {!readOnly && (
        <button
          type="button"
          onClick={onRemove}
          className="text-signoz-text-muted hover:text-signoz-text-primary transition-colors"
          aria-label={`Remove ${value}`}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  )
}

/**
 * Multi-select input for tags.
 */
function TagsInput({
  value,
  onChange,
  readOnly,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  readOnly?: boolean
}) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) return

    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const newTag = inputValue.trim()
      if (newTag && !value.includes(newTag)) {
        onChange([...value, newTag])
      }
      setInputValue('')
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const handleRemove = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {value.map((tag) => (
          <Tag
            key={tag}
            value={tag}
            onRemove={() => handleRemove(tag)}
            readOnly={readOnly}
          />
        ))}
      </div>
      {!readOnly && (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag (press Enter)"
          className="w-full px-3 py-1.5 bg-signoz-bg-surface border border-signoz-bg-elevated rounded text-sm text-signoz-text-primary placeholder-signoz-text-muted focus:outline-none focus:ring-1 focus:ring-signoz-primary"
        />
      )}
    </div>
  )
}

/**
 * Date picker input component.
 */
function DateInput({
  value,
  onChange,
  readOnly,
}: {
  value: string | Date | undefined
  onChange: (date: string) => void
  readOnly?: boolean
}) {
  const dateValue = useMemo(() => {
    if (!value) return ''
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]
    }
    // Try to parse string date
    try {
      const parsed = new Date(value)
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0]
      }
    } catch {
      // Ignore parsing errors
    }
    return value
  }, [value])

  return (
    <input
      type="date"
      value={dateValue}
      onChange={(e) => onChange(e.target.value)}
      disabled={readOnly}
      className="w-full px-3 py-1.5 bg-signoz-bg-surface border border-signoz-bg-elevated rounded text-sm text-signoz-text-primary focus:outline-none focus:ring-1 focus:ring-signoz-primary disabled:opacity-50 disabled:cursor-not-allowed"
    />
  )
}

/**
 * Generic field wrapper with label.
 */
function Field({
  label,
  children,
  description,
}: {
  label: string
  children: React.ReactNode
  description?: string
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-signoz-text-secondary">
        {label}
      </label>
      {children}
      {description && (
        <p className="text-xs text-signoz-text-muted">{description}</p>
      )}
    </div>
  )
}

/**
 * Collapsible panel component.
 */
function CollapsiblePanel({
  title,
  children,
  defaultExpanded = true,
}: {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-signoz-bg-elevated rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-signoz-bg-elevated text-signoz-text-primary hover:bg-signoz-bg-surface transition-colors"
      >
        <span className="font-medium">{title}</span>
        <svg
          className={`w-4 h-4 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isExpanded && (
        <div className="px-4 py-3 bg-signoz-bg-ink">{children}</div>
      )}
    </div>
  )
}

/**
 * Visual editor for MDX frontmatter.
 * Provides form inputs for common frontmatter fields like title, description, tags, and dates.
 *
 * @example
 * ```tsx
 * function MyEditor() {
 *   const [frontmatter, setFrontmatter] = useState({
 *     title: 'My Document',
 *     description: 'A description',
 *     tags: ['guide', 'tutorial'],
 *   })
 *
 *   return (
 *     <FrontmatterEditor
 *       frontmatter={frontmatter}
 *       onChange={setFrontmatter}
 *     />
 *   )
 * }
 * ```
 */
export function FrontmatterEditor({
  frontmatter,
  onChange,
  readOnly = false,
  defaultExpanded = true,
}: FrontmatterEditorProps) {
  /**
   * Update a single field in the frontmatter.
   */
  const updateField = useCallback(
    (field: string, value: unknown) => {
      onChange({
        ...frontmatter,
        [field]: value,
      })
    },
    [frontmatter, onChange]
  )

  /**
   * Remove a field from the frontmatter.
   */
  const removeField = useCallback(
    (field: string) => {
      const { [field]: _, ...rest } = frontmatter
      onChange(rest)
    },
    [frontmatter, onChange]
  )

  // Extract known fields with proper typing
  const title = typeof frontmatter.title === 'string' ? frontmatter.title : ''
  const description =
    typeof frontmatter.description === 'string' ? frontmatter.description : ''
  const tags = Array.isArray(frontmatter.tags)
    ? (frontmatter.tags as string[])
    : []
  const date = frontmatter.date as string | Date | undefined
  const sidebarLabel =
    typeof frontmatter.sidebar_label === 'string'
      ? frontmatter.sidebar_label
      : ''
  const sidebarPosition =
    typeof frontmatter.sidebar_position === 'number'
      ? frontmatter.sidebar_position
      : undefined
  const slug = typeof frontmatter.slug === 'string' ? frontmatter.slug : ''

  // Get any additional/custom fields
  const knownFields = [
    'title',
    'description',
    'tags',
    'date',
    'sidebar_label',
    'sidebar_position',
    'slug',
  ]
  const customFields = Object.entries(frontmatter).filter(
    ([key]) => !knownFields.includes(key)
  )

  return (
    <CollapsiblePanel title="Frontmatter" defaultExpanded={defaultExpanded}>
      <div className="space-y-4">
        {/* Title */}
        <Field label="Title" description="The document title">
          <input
            type="text"
            value={title}
            onChange={(e) => updateField('title', e.target.value)}
            disabled={readOnly}
            placeholder="Document title"
            className="w-full px-3 py-1.5 bg-signoz-bg-surface border border-signoz-bg-elevated rounded text-sm text-signoz-text-primary placeholder-signoz-text-muted focus:outline-none focus:ring-1 focus:ring-signoz-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </Field>

        {/* Description */}
        <Field label="Description" description="Brief description for SEO and previews">
          <textarea
            value={description}
            onChange={(e) => updateField('description', e.target.value)}
            disabled={readOnly}
            placeholder="A brief description of the document"
            rows={2}
            className="w-full px-3 py-1.5 bg-signoz-bg-surface border border-signoz-bg-elevated rounded text-sm text-signoz-text-primary placeholder-signoz-text-muted focus:outline-none focus:ring-1 focus:ring-signoz-primary disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          />
        </Field>

        {/* Tags */}
        <Field label="Tags" description="Categories for organizing content">
          <TagsInput
            value={tags}
            onChange={(newTags) => updateField('tags', newTags)}
            readOnly={readOnly}
          />
        </Field>

        {/* Date */}
        <Field label="Date" description="Publication or last updated date">
          <DateInput
            value={date}
            onChange={(newDate) => updateField('date', newDate)}
            readOnly={readOnly}
          />
        </Field>

        {/* Sidebar Label */}
        <Field
          label="Sidebar Label"
          description="Label shown in the navigation sidebar"
        >
          <input
            type="text"
            value={sidebarLabel}
            onChange={(e) => updateField('sidebar_label', e.target.value)}
            disabled={readOnly}
            placeholder="Navigation label"
            className="w-full px-3 py-1.5 bg-signoz-bg-surface border border-signoz-bg-elevated rounded text-sm text-signoz-text-primary placeholder-signoz-text-muted focus:outline-none focus:ring-1 focus:ring-signoz-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </Field>

        {/* Sidebar Position */}
        <Field
          label="Sidebar Position"
          description="Order in the navigation sidebar"
        >
          <input
            type="number"
            value={sidebarPosition ?? ''}
            onChange={(e) =>
              updateField(
                'sidebar_position',
                e.target.value ? parseInt(e.target.value, 10) : undefined
              )
            }
            disabled={readOnly}
            placeholder="Position number"
            className="w-full px-3 py-1.5 bg-signoz-bg-surface border border-signoz-bg-elevated rounded text-sm text-signoz-text-primary placeholder-signoz-text-muted focus:outline-none focus:ring-1 focus:ring-signoz-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </Field>

        {/* Slug */}
        <Field label="Slug" description="URL path for this document">
          <input
            type="text"
            value={slug}
            onChange={(e) => updateField('slug', e.target.value)}
            disabled={readOnly}
            placeholder="/path/to/doc"
            className="w-full px-3 py-1.5 bg-signoz-bg-surface border border-signoz-bg-elevated rounded text-sm text-signoz-text-primary placeholder-signoz-text-muted focus:outline-none focus:ring-1 focus:ring-signoz-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </Field>

        {/* Custom Fields */}
        {customFields.length > 0 && (
          <div className="pt-2 border-t border-signoz-bg-elevated">
            <p className="text-xs text-signoz-text-muted mb-2">Custom Fields</p>
            <div className="space-y-2">
              {customFields.map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-sm text-signoz-text-secondary min-w-[100px]">
                    {key}:
                  </span>
                  <input
                    type="text"
                    value={
                      typeof value === 'string'
                        ? value
                        : JSON.stringify(value)
                    }
                    onChange={(e) => {
                      // Try to parse as JSON, fall back to string
                      let newValue: unknown = e.target.value
                      try {
                        newValue = JSON.parse(e.target.value)
                      } catch {
                        // Keep as string
                      }
                      updateField(key, newValue)
                    }}
                    disabled={readOnly}
                    className="flex-1 px-2 py-1 bg-signoz-bg-surface border border-signoz-bg-elevated rounded text-sm text-signoz-text-primary focus:outline-none focus:ring-1 focus:ring-signoz-primary disabled:opacity-50"
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeField(key)}
                      className="text-signoz-text-muted hover:text-red-400 transition-colors"
                      aria-label={`Remove ${key}`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Custom Field */}
        {!readOnly && <AddCustomField onAdd={updateField} />}
      </div>
    </CollapsiblePanel>
  )
}

/**
 * Component to add a new custom field.
 */
function AddCustomField({
  onAdd,
}: {
  onAdd: (key: string, value: unknown) => void
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const handleAdd = () => {
    if (!newKey.trim()) return

    // Try to parse value as JSON
    let parsedValue: unknown = newValue
    try {
      parsedValue = JSON.parse(newValue)
    } catch {
      // Keep as string
    }

    onAdd(newKey.trim(), parsedValue)
    setNewKey('')
    setNewValue('')
    setIsAdding(false)
  }

  if (!isAdding) {
    return (
      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className="text-sm text-signoz-primary hover:text-signoz-primary-light transition-colors"
      >
        + Add custom field
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 pt-2">
      <input
        type="text"
        value={newKey}
        onChange={(e) => setNewKey(e.target.value)}
        placeholder="Field name"
        className="w-32 px-2 py-1 bg-signoz-bg-surface border border-signoz-bg-elevated rounded text-sm text-signoz-text-primary placeholder-signoz-text-muted focus:outline-none focus:ring-1 focus:ring-signoz-primary"
        autoFocus
      />
      <input
        type="text"
        value={newValue}
        onChange={(e) => setNewValue(e.target.value)}
        placeholder="Value"
        className="flex-1 px-2 py-1 bg-signoz-bg-surface border border-signoz-bg-elevated rounded text-sm text-signoz-text-primary placeholder-signoz-text-muted focus:outline-none focus:ring-1 focus:ring-signoz-primary"
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
      />
      <button
        type="button"
        onClick={handleAdd}
        className="px-2 py-1 bg-signoz-primary text-white rounded text-sm hover:bg-signoz-primary-light transition-colors"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => {
          setIsAdding(false)
          setNewKey('')
          setNewValue('')
        }}
        className="text-signoz-text-muted hover:text-signoz-text-primary transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
