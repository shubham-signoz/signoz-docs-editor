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
}

/**
 * Next.js Image shim - renders as a regular img tag
 */
const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  ({ src, alt, width, height, priority, fill, sizes, quality, placeholder, blurDataURL, loading, ...props }, ref) => {
    // Handle fill mode
    const style: React.CSSProperties = fill
      ? { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', ...props.style }
      : props.style || {}

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        loading={priority ? 'eager' : (loading || 'lazy')}
        style={style}
        {...props}
      />
    )
  }
)

Image.displayName = 'Image'

export default Image
