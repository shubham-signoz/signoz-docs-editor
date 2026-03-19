import { Plugin } from 'vite'
import * as path from 'path'
import { parseSignozComponentRegistry } from './signoz-component-registry.js'

/**
 * Vite plugin that generates a virtual module containing all signoz.io component imports.
 * This allows Vite to properly resolve and bundle external components.
 */
export function signozComponentsPlugin(signozDir: string): Plugin {
  const virtualModuleId = 'virtual:signoz-components'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'signoz-components',
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },
    async load(id) {
      if (id === resolvedVirtualModuleId) {
        let components: Awaited<ReturnType<typeof parseSignozComponentRegistry>> = []

        try {
          components = (await parseSignozComponentRegistry(signozDir))
            .filter((component) => component.resolvedPath)
        } catch (error) {
          console.warn('Unable to build SigNoz component registry:', error)
        }

        const signozComponentsDir = path.join(signozDir, 'components')

        // Generate dynamic imports with per-component error isolation.
        // If a component fails to import (e.g. missing dependency like lucide-react),
        // only that component is unavailable — the rest still load successfully.
        const entries = components.map((comp) => {
          const fullPath = path.join(signozComponentsDir, comp.resolvedPath as string)
          return `  [${JSON.stringify(comp.name)}, () => import(${JSON.stringify(fullPath)})],`
        }).join('\n')

        return `
const componentLoaders = [
${entries}
];

export async function loadSignozComponents() {
  const result = {};
  const results = await Promise.allSettled(
    componentLoaders.map(async ([name, loader]) => {
      const mod = await loader();
      return [name, mod.default || mod];
    })
  );
  for (const r of results) {
    if (r.status === 'fulfilled') {
      const [name, comp] = r.value;
      result[name] = comp;
    } else {
      console.warn('[signoz-components] Failed to load component:', r.reason?.message || r.reason);
    }
  }
  return result;
}
`
      }
    },
  }
}
