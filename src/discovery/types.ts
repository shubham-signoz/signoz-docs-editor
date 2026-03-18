/**
 * Discovery system types for SigNoz Docs Editor
 * Used for auto-discovering React components from MDXComponents.tsx
 */

/**
 * Represents a prop extracted from a component's TypeScript interface
 */
export interface ComponentProp {
  /** Name of the prop */
  name: string;
  /** TypeScript type as a string (e.g., "string", "boolean", "ReactNode") */
  type: string;
  /** Whether the prop is required (not optional) */
  required: boolean;
  /** Default value if specified in the component */
  defaultValue?: string;
  /** JSDoc description if available */
  description?: string;
}

/**
 * Represents a discovered component from MDXComponents.tsx
 */
export interface DiscoveredComponent {
  /** Component name as exported (e.g., "Admonition", "DocCard") */
  name: string;
  /** Import path relative to the MDXComponents.tsx file */
  path: string;
  /** Category derived from the folder structure (e.g., "ui", "docs", "layout") */
  category: string;
  /** Extracted props from the component's TypeScript interface */
  props: ComponentProp[];
  /** Generated snippet template for inserting the component */
  snippet: string;
}

/**
 * Result from parsing MDXComponents.tsx
 */
export interface ParseResult {
  /** List of discovered components */
  components: DiscoveredComponent[];
  /** Errors encountered during parsing */
  errors: ParseError[];
}

/**
 * Error encountered during component discovery
 */
export interface ParseError {
  /** Type of error */
  type: 'file_not_found' | 'parse_error' | 'invalid_export' | 'prop_extraction_error';
  /** Human-readable error message */
  message: string;
  /** Component name if applicable */
  componentName?: string;
  /** File path if applicable */
  filePath?: string;
}

/**
 * Options for the discovery process
 */
export interface DiscoveryOptions {
  /** Path to the repository root */
  repoPath: string;
  /** Path to MDXComponents.tsx relative to repo root */
  mdxComponentsPath?: string;
  /** Whether to include components with parse errors in results */
  includeErroredComponents?: boolean;
}

/**
 * Result from extracting props from a single component
 */
export interface PropExtractionResult {
  /** Extracted props, empty array if extraction failed */
  props: ComponentProp[];
  /** Error if extraction failed */
  error?: ParseError;
}

/**
 * Metadata about a component import found in MDXComponents.tsx
 */
export interface ComponentImportInfo {
  /** Component name */
  name: string;
  /** Import path as written in the file */
  importPath: string;
  /** Resolved absolute path to the component file */
  resolvedPath: string;
  /** Whether this is a default or named import */
  isDefaultImport: boolean;
}
