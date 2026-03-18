import React from 'react'

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children: React.ReactNode
}

/**
 * Next.js Link shim - renders as a regular anchor tag
 */
const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, children, ...props }, ref) => {
    return (
      <a ref={ref} href={href} {...props}>
        {children}
      </a>
    )
  }
)

Link.displayName = 'Link'

export default Link
