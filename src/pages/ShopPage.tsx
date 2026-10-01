import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, Loading } from '../components/EmptyState'
import { SearchIcon } from '../components/Icons'
import { ProductGrid } from '../components/ProductGrid'
import { getCategories, getProducts, SORT_OPTIONS, type ProductSort } from '../services/product/productService'
import { pluralize } from '../utils/format'
import { useAsync } from '../utils/useAsync'
import { useDocumentTitle } from '../utils/useDocumentTitle'

/**
 * Product catalogue. Search, category, sort and "in stock only" are stored in
 * the URL (e.g. /shop?category=fashion&sort=price-asc), so results can be
 * bookmarked, shared, and survive a page refresh.
 */
export function ShopPage() {
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const categoryId = params.get('category') ?? ''
  const sortParam = params.get('sort') as ProductSort | null
  const sort: ProductSort = SORT_OPTIONS.some((o) => o.value === sortParam) ? sortParam! : 'featured'
  const inStockOnly = params.get('stock') === '1'
  const onSaleOnly = params.get('sale') === '1'

  const categories = useAsync(getCategories, [])
  const products = useAsync(
    () => getProducts({ search, categoryId: categoryId || undefined, sort, inStockOnly, onSaleOnly }),
    [search, categoryId, sort, inStockOnly, onSaleOnly],
  )

  const category = categories.data?.find((c) => c.id === categoryId)
  const unknownCategory = !!categoryId && !!categories.data && !category
  const title = search ? `Results for “${search}”` : category?.name ?? (onSaleOnly ? 'On sale' : 'All products')
  useDocumentTitle(title)

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }
  const hasFilters = !!(search || categoryId || inStockOnly || onSaleOnly)

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
        {category && !search && <p className="page-subtitle">{category.description}</p>}
      </header>

      <div className="shop-toolbar">
        <div className="chips" role="group" aria-label="Filter by category">
          <button type="button" className="chip" aria-pressed={!categoryId} onClick={() => update({ category: null })}>
            All
          </button>
          {categories.data?.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={categoryId === c.id} onClick={() => update({ category: c.id })}>
              {c.name}
            </button>
          ))}
        </div>

        <div className="shop-toolbar__controls">
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
        <ProductGrid products={products.data} categories={categories.data ?? []} />
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
