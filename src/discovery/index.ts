/**
 * Component Discovery System for SigNoz Docs Editor
 *
 * This module provides functionality to auto-discover React components
 * from a signoz.io repository by parsing MDXComponents.tsx and extracting
 * component props from TypeScript interfaces.
 *
 * @example
 * ```typescript
 * import { parseComponents, extractProps, generateSnippet } from '@/discovery';
 *
 * // Parse MDXComponents.tsx to find all registered components
 * const { components, errors } = parseComponents('/path/to/MDXComponents.tsx');
 *
 * // Extract props from each component
 * for (const component of components) {
 *   const { props } = extractProps(component.resolvedPath, component.name);
 *   const snippet = generateSnippet(component.name, props);
 * }
 * ```
 */

// Types
export type {
  DiscoveredComponent,
  ComponentProp,
  ParseResult,
  ParseError,
  DiscoveryOptions,
  PropExtractionResult,
  ComponentImportInfo,
} from './types';

// Parse MDXComponents.tsx
export {
  parseComponents,
  extractCategory,
  getCategories,
  type ParseComponentsResult,
} from './parseComponents';

// Extract props from component files
export {
  extractProps,
  generateSnippet,
  generateReadableSnippet,
} from './extractProps';

// Re-export a convenience function for full discovery
import { parseComponents, extractCategory } from './parseComponents';
import { extractProps, generateSnippet } from './extractProps';
import type { DiscoveredComponent, DiscoveryOptions, ParseError } from './types';

/**
 * Discover all components from a repository
 * This is the main entry point for the discovery system
 *
 * @param options - Discovery options including repo path
 * @returns List of discovered components with their props and snippets
 */
export async function discoverComponents(
  options: DiscoveryOptions
): Promise<{ components: DiscoveredComponent[]; errors: ParseError[] }> {
  const {
    repoPath,
    mdxComponentsPath = 'components/MDXComponents.tsx',
    includeErroredComponents = false,
  } = options;

  const errors: ParseError[] = [];
  const components: DiscoveredComponent[] = [];

  // Build the full path to MDXComponents.tsx
  const fullMdxPath = `${repoPath}/${mdxComponentsPath}`;

  // Parse MDXComponents.tsx
  const parseResult = parseComponents(fullMdxPath);
  errors.push(...parseResult.errors);

  // Process each component
  for (const componentInfo of parseResult.components) {
    const category = extractCategory(componentInfo.importPath);

    // Extract props
    const propResult = extractProps(componentInfo.resolvedPath, componentInfo.name);

    if (propResult.error) {
      errors.push(propResult.error);
      if (!includeErroredComponents) {
        continue;
      }
    }

    // Generate snippet
    const snippet = generateSnippet(componentInfo.name, propResult.props);

    components.push({
      name: componentInfo.name,
      path: componentInfo.importPath,
      category,
      props: propResult.props,
      snippet,
    });
  }

  return { components, errors };
}
