import matter from 'gray-matter'

/**
 * Parsed frontmatter result containing the frontmatter object and content body.
 */
export interface ParsedFrontmatter {
  /** The parsed frontmatter as a key-value object */
  frontmatter: Record<string, unknown>
  /** The MDX/markdown content without the frontmatter */
  content: string
  /** Whether the source had valid frontmatter */
  hasFrontmatter: boolean
}

/**
 * Common frontmatter fields found in documentation files.
 */
export interface DocFrontmatter {
  title?: string
  description?: string
  tags?: string[]
  date?: string
  slug?: string
  sidebar_label?: string
  sidebar_position?: number
  [key: string]: unknown
}

/**
 * Parse frontmatter from an MDX or Markdown string.
 * Uses gray-matter for robust YAML frontmatter parsing.
 *
 * @param mdxSource - The full MDX/Markdown source string
 * @returns Parsed frontmatter object and content body
 *
 * @example
 * ```typescript
 * const source = `---
 * title: Getting Started
 * tags: ['intro', 'tutorial']
 * ---
 * # Welcome
 * This is the content.`
 *
 * const { frontmatter, content } = parseFrontmatter(source)
 * // frontmatter = { title: 'Getting Started', tags: ['intro', 'tutorial'] }
 * // content = '# Welcome\nThis is the content.'
 * ```
 */
export function parseFrontmatter(mdxSource: string): ParsedFrontmatter {
  try {
    const result = matter(mdxSource)
    return {
      frontmatter: result.data as Record<string, unknown>,
      content: result.content,
      hasFrontmatter: Object.keys(result.data).length > 0,
    }
  } catch (error) {
    // If parsing fails, return empty frontmatter and original content
    console.warn('Failed to parse frontmatter:', error)
    return {
      frontmatter: {},
      content: mdxSource,
      hasFrontmatter: false,
    }
  }
}

/**
 * Stringify frontmatter and content back into a full MDX/Markdown string.
 * Creates properly formatted YAML frontmatter.
 *
 * @param frontmatter - The frontmatter object to serialize
 * @param content - The MDX/Markdown content body
 * @returns Full MDX/Markdown string with frontmatter
 *
 * @example
 * ```typescript
 * const fm = { title: 'My Doc', tags: ['guide'] }
 * const content = '# Introduction\n\nSome content here.'
 *
 * const result = stringifyFrontmatter(fm, content)
 * // result = '---\ntitle: My Doc\ntags:\n  - guide\n---\n# Introduction\n\nSome content here.'
 * ```
 */
export function stringifyFrontmatter(
  frontmatter: Record<string, unknown>,
  content: string
): string {
  // Filter out undefined/null values from frontmatter
  const cleanedFrontmatter = Object.entries(frontmatter).reduce(
    (acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value
      }
      return acc
    },
    {} as Record<string, unknown>
  )

  // If frontmatter is empty, return content without frontmatter block
  if (Object.keys(cleanedFrontmatter).length === 0) {
    return content
  }

  // Use gray-matter to stringify with proper YAML formatting
  return matter.stringify(content, cleanedFrontmatter)
}

/**
 * Update a specific field in the frontmatter while preserving the rest.
 *
 * @param mdxSource - The full MDX/Markdown source string
 * @param field - The frontmatter field to update
 * @param value - The new value for the field
 * @returns Updated MDX/Markdown string
 */
export function updateFrontmatterField(
  mdxSource: string,
  field: string,
  value: unknown
): string {
  const { frontmatter, content } = parseFrontmatter(mdxSource)
  const updatedFrontmatter = {
    ...frontmatter,
    [field]: value,
  }
  return stringifyFrontmatter(updatedFrontmatter, content)
}

/**
 * Remove a field from the frontmatter.
 *
 * @param mdxSource - The full MDX/Markdown source string
 * @param field - The frontmatter field to remove
 * @returns Updated MDX/Markdown string without the field
 */
export function removeFrontmatterField(
  mdxSource: string,
  field: string
): string {
  const { frontmatter, content } = parseFrontmatter(mdxSource)
  const { [field]: _, ...rest } = frontmatter
  return stringifyFrontmatter(rest, content)
}

/**
 * Extract just the title from a markdown/MDX source.
 * Checks frontmatter first, then falls back to first heading.
 *
 * @param mdxSource - The full MDX/Markdown source string
 * @returns The document title or undefined if not found
 */
export function extractTitle(mdxSource: string): string | undefined {
  const { frontmatter, content } = parseFrontmatter(mdxSource)

  // Check frontmatter for title
  if (frontmatter.title && typeof frontmatter.title === 'string') {
    return frontmatter.title
  }

  // Fall back to first h1 heading
  const h1Match = content.match(/^#\s+(.+)$/m)
  if (h1Match?.[1]) {
    return h1Match[1].trim()
  }

  return undefined
}

/**
 * Validate frontmatter against expected schema.
 * Returns validation errors if any fields are invalid.
 *
 * @param frontmatter - The frontmatter object to validate
 * @returns Array of validation error messages, empty if valid
 */
export function validateFrontmatter(
  frontmatter: Record<string, unknown>
): string[] {
  const errors: string[] = []

  // Title should be a string
  if (frontmatter.title !== undefined && typeof frontmatter.title !== 'string') {
    errors.push('Title must be a string')
  }

  // Description should be a string
  if (
    frontmatter.description !== undefined &&
    typeof frontmatter.description !== 'string'
  ) {
    errors.push('Description must be a string')
  }

  // Tags should be an array of strings
  if (frontmatter.tags !== undefined) {
    if (!Array.isArray(frontmatter.tags)) {
      errors.push('Tags must be an array')
    } else if (!frontmatter.tags.every((tag) => typeof tag === 'string')) {
      errors.push('All tags must be strings')
    }
  }

  // Date should be a valid date string
  if (frontmatter.date !== undefined) {
    const dateValue = frontmatter.date
    if (typeof dateValue === 'string') {
      const parsed = Date.parse(dateValue)
      if (isNaN(parsed)) {
        errors.push('Date must be a valid date string')
      }
    } else if (!(dateValue instanceof Date)) {
      errors.push('Date must be a string or Date object')
    }
  }

  // sidebar_position should be a number
  if (
    frontmatter.sidebar_position !== undefined &&
    typeof frontmatter.sidebar_position !== 'number'
  ) {
    errors.push('sidebar_position must be a number')
  }

  return errors
}
