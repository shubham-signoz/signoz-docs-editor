import React from 'react'

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  priority?: boolean
  fill?: boolean
  sizes?: string
  quality?: number
  placeholder?: string
  blurDataURL?: string
  layout?: string
  loader?: (p: { src: string; width: number; quality?: number }) => string
  unoptimized?: boolean
}

/**
 * Next.js Image shim - renders as a regular img tag
 */
const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  ({ src, alt, width, height, priority, fill, sizes, quality, placeholder, blurDataURL, loading, layout, loader, unoptimized, ...props }, ref) => {
    // Handle fill mode
    const isResponsive = layout === 'responsive'
    const style: React.CSSProperties = fill
      ? { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', ...props.style }
      : isResponsive
        ? { width: '100%', height: 'auto', ...props.style }
        : props.style || {}

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        width={fill || isResponsive ? undefined : width}
        height={fill || isResponsive ? undefined : height}
        loading={priority ? 'eager' : (loading || 'lazy')}
        style={style}
        {...props}
      />
    )
  }
)

Image.displayName = 'Image'

export default Image
