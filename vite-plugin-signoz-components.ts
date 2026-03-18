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

        // Generate import statements with full paths
        const imports = components.map((comp, i) => {
          const fullPath = path.join(signozComponentsDir, comp.resolvedPath as string)
          return `import Component${i} from ${JSON.stringify(fullPath)}`
        }).join('\n')

        // Generate the export object
        const exports = components.map((comp, i) => {
          return `  ${JSON.stringify(comp.name)}: Component${i}`
        }).join(',\n')

        return `
${imports}

export const signozComponents = {
${exports}
}

export default signozComponents
`
      }
    },
  }
}
