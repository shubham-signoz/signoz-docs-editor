import { ThemeProvider } from '@/contexts'
import { Editor } from '@/components'

/**
 * App - main application shell.
 * No setup needed - just connects to the API server.
 */
function App() {
  return (
    <ThemeProvider>
      <Editor />
    </ThemeProvider>
  )
}

export default App
