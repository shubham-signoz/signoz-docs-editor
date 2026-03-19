declare module 'virtual:signoz-components' {
  export function loadSignozComponents(): Promise<Record<string, React.ComponentType<unknown>>>
}
