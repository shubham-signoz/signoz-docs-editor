import { ThemeProvider } from '@/contexts'
import { Editor } from '@/components'
import { RegionProvider } from '@/shims/region-context'

/**
 * App - main application shell.
 * No setup needed - just connects to the API server.
 */
function App() {
  return (
    <ThemeProvider>
      <RegionProvider>
        <Editor />
      </RegionProvider>
    </ThemeProvider>
  )
}

export default App
