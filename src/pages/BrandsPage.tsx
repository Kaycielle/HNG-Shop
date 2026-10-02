import { Link } from 'react-router-dom'
import { BrandShowcase } from '../components/BrandShowcase'
import { Loading } from '../components/EmptyState'
import { getBrandSummaries } from '../services/product/productService'
import { useAsync } from '../utils/useAsync'
import { useDocumentTitle } from '../utils/useDocumentTitle'

export function BrandsPage() {
  useDocumentTitle('Shop by brand')
  const brands = useAsync(getBrandSummaries, [])
  return (
    <div className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Brands</li>
        </ol>
      </nav>
      <header className="page-header">
        <p className="eyebrow">Luxury labels</p>
        <h1 className="page-title">Shop by brand</h1>
        <p className="page-subtitle">Choose a brand to see everything we stock from it, from leggings to protein.</p>
      </header>
      {brands.loading ? <Loading label="Loading brands…" /> : <BrandShowcase brands={brands.data ?? []} />}
    </div>
  )
}
