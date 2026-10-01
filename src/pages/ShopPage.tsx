import { Link, useSearchParams } from 'react-router-dom'
import { BrandShowcase } from '../components/BrandShowcase'
import { EmptyState, Loading } from '../components/EmptyState'
import { SearchIcon } from '../components/Icons'
import { ProductGrid } from '../components/ProductGrid'
import {
  getBrandSummaries,
  getCategories,
  getProductTypes,
  getProducts,
  SORT_OPTIONS,
  type ProductSort,
} from '../services/product/productService'
import { pluralize } from '../utils/format'
import { useAsync } from '../utils/useAsync'
import { useDocumentTitle } from '../utils/useDocumentTitle'

/**
 * Product catalogue. Search, department, brand, item type, sort and the
 * checkboxes are stored in the URL (e.g. /shop?brand=samsung&type=audio), so
 * results can be bookmarked, shared, and survive a page refresh.
 *
 * With no filters at all ("Shop all"), the page opens with the brand showcase.
 */
export function ShopPage() {
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const categoryId = params.get('category') ?? ''
  const brandId = params.get('brand') ?? ''
  const typeId = params.get('type') ?? ''
  const sortParam = params.get('sort') as ProductSort | null
  const sort: ProductSort = SORT_OPTIONS.some((o) => o.value === sortParam) ? sortParam! : 'featured'
  const inStockOnly = params.get('stock') === '1'
  const onSaleOnly = params.get('sale') === '1'

  const categories = useAsync(getCategories, [])
  const brands = useAsync(getBrandSummaries, [])
  const types = useAsync(getProductTypes, [])
  const products = useAsync(
    () =>
      getProducts({
        search,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        typeId: typeId || undefined,
        sort,
        inStockOnly,
        onSaleOnly,
      }),
    [search, categoryId, brandId, typeId, sort, inStockOnly, onSaleOnly],
  )

  const category = categories.data?.find((c) => c.id === categoryId)
  const brand = brands.data?.find((b) => b.id === brandId)
  const type = types.data?.find((t) => t.id === typeId)
  const unknownCategory = !!categoryId && !!categories.data && !category
  const hasFilters = !!(search || categoryId || brandId || typeId || inStockOnly || onSaleOnly)

  // Types shown in the dropdown: those in the chosen department, if any.
  const typeOptions = (types.data ?? []).filter((t) => !categoryId || t.categoryId === categoryId)

  const title = search
    ? `Results for “${search}”`
    : [brand?.name, type?.name ?? category?.name].filter(Boolean).join(' · ') || (onSaleOnly ? 'On sale' : 'All products')
  useDocumentTitle(title)

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  return (
    <div className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Shop</li>
        </ol>
      </nav>

      <header className="page-header">
        <h1 className="page-title">{title}</h1>
        {category && !search && !brand && !type && <p className="page-subtitle">{category.description}</p>}
      </header>

      {!hasFilters && (
        <section className="shop-brands" aria-labelledby="brands-heading">
          <div className="section__head">
            <h2 id="brands-heading" className="section__title">Shop by brand</h2>
            <Link to="/brands" className="link-arrow">All brands</Link>
          </div>
          {brands.loading ? <Loading label="Loading brands…" /> : <BrandShowcase brands={brands.data ?? []} />}
          <h2 className="section__title shop-brands__all">Every product</h2>
        </section>
      )}

      <div className="shop-toolbar">
        <div className="chips" role="group" aria-label="Filter by department">
          <button type="button" className="chip" aria-pressed={!categoryId} onClick={() => update({ category: null, type: null })}>
            All
          </button>
          {categories.data?.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={categoryId === c.id} onClick={() => update({ category: c.id, type: null })}>
              {c.name}
            </button>
          ))}
        </div>

        <div className="shop-toolbar__controls">
          <div className="select-field">
            <label htmlFor="brand-filter">Brand</label>
            <select id="brand-filter" className="select" value={brandId} onChange={(e) => update({ brand: e.target.value || null })}>
              <option value="">All brands</option>
              {brands.data?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="select-field">
            <label htmlFor="type-filter">Type</label>
            <select id="type-filter" className="select" value={typeId} onChange={(e) => update({ type: e.target.value || null })}>
              <option value="">All types</option>
              {typeOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={onSaleOnly} onChange={(e) => update({ sale: e.target.checked ? '1' : null })} />
            <span>On sale</span>
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={inStockOnly} onChange={(e) => update({ stock: e.target.checked ? '1' : null })} />
            <span>In stock only</span>
          </label>
          <div className="select-field">
            <label htmlFor="sort">Sort by</label>
            <select id="sort" className="select" value={sort} onChange={(e) => update({ sort: e.target.value === 'featured' ? null : e.target.value })}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="shop-results-bar">
        <p role="status" className="shop-results-count">
          {products.loading ? 'Loading products…' : pluralize(products.data?.length ?? 0, 'product')}
          {search && !products.loading && <> for “{search}”</>}
        </p>
        {hasFilters && (
          <button type="button" className="btn-link" onClick={() => setParams({}, { replace: true })}>
            Clear all filters
          </button>
        )}
      </div>

      {products.error ? (
        <EmptyState title="We couldn’t load products." message="Please check your connection and try again." action={<button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>Try again</button>} />
      ) : products.loading ? (
        <Loading label="Loading products…" />
      ) : unknownCategory ? (
        <EmptyState title="Category not found." message="That category doesn’t exist. Try one of the categories above." action={<Link to="/shop" className="btn btn--primary">View all products</Link>} />
      ) : products.data && products.data.length > 0 ? (
        <ProductGrid products={products.data} brands={brands.data ?? []} />
      ) : (
        <EmptyState
          icon={<SearchIcon width={32} height={32} />}
          title="No products found."
          message={search ? `We couldn’t find anything matching “${search}”. Check the spelling or try a more general word.` : 'There are no products matching these filters right now.'}
          action={<button type="button" className="btn btn--primary" onClick={() => setParams({}, { replace: true })}>Clear filters</button>}
        />
      )}
    </div>
  )
}
