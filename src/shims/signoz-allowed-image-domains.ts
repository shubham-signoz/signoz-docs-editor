const DEFAULT_ALLOWED_DOMAINS = [
  'picsum.photos',
  'signoz.io',
  'avatars.githubusercontent.com',
  'storage.googleapis.com',
]

function parseDomains(value: string | undefined): string[] {
  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((domain) => domain.trim())
    .filter(Boolean)
}

export function getAllowedImageDomains(): string[] {
  const runtimeDomains = parseDomains(
    import.meta.env.NEXT_PUBLIC_ALLOWED_EXTERNAL_IMAGE_DOMAINS ||
      import.meta.env.VITE_ALLOWED_EXTERNAL_IMAGE_DOMAINS
  )

  return Array.from(new Set([...DEFAULT_ALLOWED_DOMAINS, ...runtimeDomains]))
}

export function isSrcAllowedForNextImage(src: string): boolean {
  const trimmed = src.trim()

  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('data:')
  ) {
    return true
  }

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false
  }

  try {
    const url = new URL(trimmed)
    const hostname = url.hostname.toLowerCase()
    return getAllowedImageDomains().some(
      (domain) => hostname === domain.toLowerCase()
    )
  } catch {
    return false
  }
}

export { DEFAULT_ALLOWED_DOMAINS }
