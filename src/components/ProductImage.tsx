import { useState } from 'react'

/** Product image with a neutral placeholder if the image fails to load. */
export function ProductImage({ src, alt, className = '', eager = false }: { src: string; alt: string; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className={`product-image product-image--fallback ${className}`} role="img" aria-label={alt}>
        <span aria-hidden="true">Image unavailable</span>
      </div>
    )
  }
  return (
    <img
      className={`product-image ${className}`}
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      width={800}
      height={800}
      onError={() => setFailed(true)}
    />
  )
}
