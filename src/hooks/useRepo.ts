/**
 * Enhanced useRepo hook with component discovery capabilities
 * Provides access to repository context and component discovery functions
 */

import { useCallback, useState } from 'react';
import { useRepo as useRepoContext, type RepoConfig } from '../contexts/RepoContext';
import {
  discoverComponents as discoverComponentsFromRepo,
  type DiscoveredComponent,
  type ParseError,
} from '../discovery';

/**
 * State for discovered components
 */
export interface ComponentDiscoveryState {
  /** List of discovered components */
  components: DiscoveredComponent[];
  /** Categories extracted from components */
  categories: string[];
  /** Whether discovery is in progress */
  isDiscovering: boolean;
  /** Errors from discovery process */
  errors: ParseError[];
  /** Whether discovery has been attempted */
  hasDiscovered: boolean;
}

/**
 * Return type for the enhanced useRepo hook
 */
export interface UseRepoReturn {
  /** Current repository configuration */
  repo: RepoConfig | null;
  /** Set the current repository */
  setRepo: (repo: RepoConfig | null) => void;
  /** Clear the current repository */
  clearRepo: () => void;
  /** Whether a repository is selected */
  hasRepo: boolean;

  /** Component discovery state */
  discovery: ComponentDiscoveryState;
  /** Discover components from the repository */
  discoverComponents: (repoPath?: string) => Promise<void>;
  /** Get components by category */
  getComponentsByCategory: (category: string) => DiscoveredComponent[];
  /** Search components by name */
  searchComponents: (query: string) => DiscoveredComponent[];
  /** Get a component by name */
  getComponent: (name: string) => DiscoveredComponent | undefined;
  /** Clear discovered components */
  clearDiscovery: () => void;
}

const initialDiscoveryState: ComponentDiscoveryState = {
  components: [],
  categories: [],
  isDiscovering: false,
  errors: [],
  hasDiscovered: false,
};

/**
 * Enhanced useRepo hook that includes component discovery functionality
 *
 * @example
 * ```tsx
 * function ComponentPalette() {
 *   const { repo, discovery, discoverComponents, getComponentsByCategory } = useRepo();
 *
 *   useEffect(() => {
 *     if (repo && !discovery.hasDiscovered) {
 *       discoverComponents(repo.path);
 *     }
 *   }, [repo]);
 *
 *   return (
 *     <div>
 *       {discovery.categories.map(category => (
 *         <div key={category}>
 *           <h3>{category}</h3>
 *           {getComponentsByCategory(category).map(comp => (
 *             <ComponentCard key={comp.name} component={comp} />
 *           ))}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRepo(): UseRepoReturn {
  // Get the base repo context
  const { repo, setRepo, clearRepo, hasRepo } = useRepoContext();

  // Component discovery state
  const [discovery, setDiscovery] = useState<ComponentDiscoveryState>(initialDiscoveryState);

  /**
   * Discover components from the repository
   * Uses the provided path or falls back to current repo path
   */
  const discoverComponents = useCallback(
    async (repoPath?: string) => {
      const pathToUse = repoPath ?? repo?.path;

      if (!pathToUse) {
        setDiscovery((prev) => ({
          ...prev,
          errors: [
            {
              type: 'file_not_found',
              message: 'No repository path provided for component discovery',
            },
          ],
        }));
        return;
      }

      setDiscovery((prev) => ({
        ...prev,
        isDiscovering: true,
        errors: [],
      }));

      try {
        // Determine the MDXComponents.tsx path
        // For signoz.io, it's typically in components/MDXComponents.tsx
        const result = await discoverComponentsFromRepo({
          repoPath: pathToUse,
          mdxComponentsPath: repo?.componentsPath ?? 'components/MDXComponents.tsx',
          includeErroredComponents: true,
        });

        // Extract unique categories
        const categories = Array.from(
          new Set(result.components.map((c) => c.category))
        ).sort();

        setDiscovery({
          components: result.components,
          categories,
          isDiscovering: false,
          errors: result.errors,
          hasDiscovered: true,
        });
      } catch (error) {
        setDiscovery((prev) => ({
          ...prev,
          isDiscovering: false,
          hasDiscovered: true,
          errors: [
            {
              type: 'parse_error',
              message: `Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        }));
      }
    },
    [repo]
  );

  /**
   * Get all components in a specific category
   */
  const getComponentsByCategory = useCallback(
    (category: string): DiscoveredComponent[] => {
      return discovery.components.filter((c) => c.category === category);
    },
    [discovery.components]
  );

  /**
   * Search components by name (case-insensitive partial match)
   */
  const searchComponents = useCallback(
    (query: string): DiscoveredComponent[] => {
      if (!query.trim()) {
        return discovery.components;
      }

      const lowerQuery = query.toLowerCase();
      return discovery.components.filter((c) =>
        c.name.toLowerCase().includes(lowerQuery)
      );
    },
    [discovery.components]
  );

  /**
   * Get a component by exact name
   */
  const getComponent = useCallback(
    (name: string): DiscoveredComponent | undefined => {
      return discovery.components.find((c) => c.name === name);
    },
    [discovery.components]
  );

  /**
   * Clear all discovered components
   */
  const clearDiscovery = useCallback(() => {
    setDiscovery(initialDiscoveryState);
  }, []);

  return {
    // Base repo context
    repo,
    setRepo,
    clearRepo,
    hasRepo,

    // Discovery functionality
    discovery,
    discoverComponents,
    getComponentsByCategory,
    searchComponents,
    getComponent,
    clearDiscovery,
  };
}

export default useRepo;
