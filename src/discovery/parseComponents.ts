/**
 * Parse MDXComponents.tsx to discover registered components
 * Uses the shared registry parser for runtime and discovery parity.
 */

import { parseComponentRegistry } from './componentRegistryParser.js';
import type { RegistryComponentInfo } from './componentRegistryParser.js';
import type { ComponentImportInfo, ParseError } from './types';

/**
 * Result from parsing MDXComponents.tsx
 */
export interface ParseComponentsResult {
  /** List of component imports found */
  components: ComponentImportInfo[];
  /** Errors encountered during parsing */
  errors: ParseError[];
}

function isResolvedProjectComponent(
  component: RegistryComponentInfo
): component is RegistryComponentInfo & {
  importPath: string;
  resolvedPath: string;
  isDefaultImport: boolean;
} {
  const { importPath, resolvedPath, isDefaultImport } = component;

  return (
    typeof importPath === 'string' &&
    typeof resolvedPath === 'string' &&
    typeof isDefaultImport === 'boolean' &&
    (importPath.startsWith('.') || importPath.startsWith('@/'))
  );
}

/**
 * Parse the MDXComponents.tsx file to extract all registered components
 *
 * @param mdxComponentsPath - Absolute path to MDXComponents.tsx
 * @returns List of discovered components with their import information
 */
export function parseComponents(mdxComponentsPath: string): ParseComponentsResult {
  const result = parseComponentRegistry(mdxComponentsPath);
  const components: ComponentImportInfo[] = result.components
    .filter(isResolvedProjectComponent)
    .map((component) => ({
      name: component.name,
      importPath: component.importPath,
      resolvedPath: component.resolvedPath,
      isDefaultImport: component.isDefaultImport,
    }));

  return {
    components,
    errors: result.errors as ParseError[],
  };
}

/**
 * Extract the category from a component's import path
 * Uses the folder structure to determine category
 *
 * @param importPath - The import path (e.g., "./components/ui/Button")
 * @returns Category string (e.g., "ui")
 */
export function extractCategory(importPath: string): string {
  const normalizedPath = importPath.replace(/^\.?\.?\//, '');
  const parts = normalizedPath.split('/');

  if (parts.length >= 2) {
    const startIndex = parts[0] === 'components' ? 1 : 0;
    if (parts.length > startIndex + 1) {
      return parts[startIndex] ?? 'general';
    }
  }

  return 'general';
}

/**
 * Get all unique categories from a list of components
 */
export function getCategories(components: ComponentImportInfo[]): string[] {
  const categories = new Set<string>();
  for (const component of components) {
    categories.add(extractCategory(component.importPath));
  }
  return Array.from(categories).sort();
}
