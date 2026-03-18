/**
 * Types for MDX component discovery and insertion
 */

/** Represents a prop/parameter of an MDX component */
export interface ComponentProp {
  name: string
  type: string
  required: boolean
  defaultValue?: string
  description?: string
}

/** Category for grouping components */
export type ComponentCategory =
  | 'layout'
  | 'navigation'
  | 'content'
  | 'media'
  | 'interactive'
  | 'data'
  | 'utility'
  | 'custom'

/** A discovered MDX component from the repository */
export interface DiscoveredComponent {
  /** Component name (e.g., "Admonition", "CodeBlock") */
  name: string
  /** Category for grouping in UI */
  category: ComponentCategory
  /** Brief description of the component */
  description?: string
  /** File path where component is defined */
  filePath: string
  /** Props/parameters the component accepts */
  props: ComponentProp[]
  /** Example usage snippet */
  example?: string
  /** Whether this is a self-closing component */
  selfClosing?: boolean
}

/** Position coordinates for context menu and insertion markers */
export interface Position {
  x: number
  y: number
}

/** Recent/favorite component entry stored in localStorage */
export interface RecentComponent {
  name: string
  timestamp: number
  useCount: number
}
