import React from 'react'

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children: React.ReactNode
  prefetch?: boolean | null
  scroll?: boolean
  replace?: boolean
  shallow?: boolean
  passHref?: boolean
  legacyBehavior?: boolean
  locale?: string | false
}

/**
 * Next.js Link shim - renders as a regular anchor tag
 */
const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, children, prefetch, scroll, replace, shallow, passHref, legacyBehavior, locale, ...props }, ref) => {
    return (
      <a ref={ref} href={href} {...props}>
        {children}
      </a>
    )
  }
)

Link.displayName = 'Link'

export default Link
