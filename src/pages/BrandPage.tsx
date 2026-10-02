import { Link, useParams, useSearchParams } from 'react-router-dom'
import { EmptyState, Loading } from '../components/EmptyState'
import { ProductGrid } from '../components/ProductGrid'
import { getBrand, getBrands, getProductTypes, getProducts } from '../services/product/productService'
import { pluralize } from '../utils/format'
import { useAsync } from '../utils/useAsync'
import { useDocumentTitle } from '../utils/useDocumentTitle'

/**
 * One brand's page: every item type the brand offers (Leggings & sets,
 * Sports bras, Protein…) with the products for each. ?type= narrows it to one.
 */
export function BrandPage() {
  const { brandId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const typeId = params.get('type') ?? ''

  const brand = useAsync(() => getBrand(brandId), [brandId])
  const brands = useAsync(getBrands, [])
  const types = useAsync(getProductTypes, [])
  const products = useAsync(() => getProducts({ brandId }), [brandId])
  useDocumentTitle(brand.data ? `${brand.data.name}` : brand.loading ? undefined : 'Brand not found')

  if (brand.loading || products.loading || types.loading) {
    return <div className="container page"><Loading label="Loading brand…" /></div>
  }
  if (!brand.data) {
    return (
      <div className="container page">
        <EmptyState
          title="Brand not found."
          message="We don’t stock that brand yet. Take a look at the brands we carry."
          action={<Link to="/brands" className="btn btn--primary">See all brands</Link>}
        />
      </div>
    )
  }

  const all = products.data ?? []
  // Only the item types this brand actually has, in the shop's usual order.
  const groups = (types.data ?? [])
    .map((type) => ({ type, items: all.filter((p) => p.typeId === type.id) }))
    .filter((g) => g.items.length > 0)
  const visible = typeId ? groups.filter((g) => g.type.id === typeId) : groups
  const setType = (id: string | null) => setParams(id ? { type: id } : {}, { replace: true })
  const typeName = new Map((types.data ?? []).map((t) => [t.id, t.name]))

  return (
    <div className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/brands">Brands</Link></li>
          <li aria-current="page">{brand.data.name}</li>
        </ol>
      </nav>

      <header className="brand-hero">
        <p className="eyebrow">Shop {brand.data.name}</p>
        <h1 className="brand-hero__name">{brand.data.name}</h1>
        <p className="page-subtitle">{brand.data.tagline} · {pluralize(all.length, 'product')}</p>
      </header>

      <div className="chips brand-types" role="group" aria-label={`Filter ${brand.data.name} products by type`}>
        <button type="button" className="chip" aria-pressed={!typeId} onClick={() => setType(null)}>
          Everything <span className="chip__count">{all.length}</span>
        </button>
        {groups.map(({ type, items }) => (
          <button key={type.id} type="button" className="chip" aria-pressed={typeId === type.id} onClick={() => setType(type.id)}>
            {type.name} <span className="chip__count">{items.length}</span>
          </button>
        ))}
      </div>

      {typeId && visible.length === 0 ? (
        <EmptyState
          title={`No ${brand.data.name} products of that type.`}
          action={<button type="button" className="btn btn--primary" onClick={() => setType(null)}>Show everything</button>}
        />
      ) : typeId ? (
        visible.map(({ type, items }) => (
          <section key={type.id} className="section brand-section" aria-labelledby={`type-${type.id}`}>
            <div className="section__head">
              <h2 id={`type-${type.id}`} className="section__title">
                {brand.data!.name} {type.name.toLowerCase()} <span className="section__count">{items.length}</span>
              </h2>
              <Link to={`/shop?type=${type.id}`} className="link-arrow">{type.name} from all brands</Link>
            </div>
            <ProductGrid products={items} brands={brands.data ?? []} />
          </section>
        ))
      ) : (
        <>
          <section className="section brand-section" aria-labelledby="by-type-heading">
            <div className="section__head">
              <h2 id="by-type-heading" className="section__title">Shop {brand.data.name} by type</h2>
            </div>
            <ul className="type-grid" role="list">
              {groups.map(({ type, items }) => (
                <li key={type.id}>
                  <button type="button" className="type-tile" onClick={() => setType(type.id)}>
                    <img src={items[0].image} alt="" className="type-tile__img" loading="lazy" />
                    <span className="type-tile__name">{type.name}</span>
                    <span className="type-tile__count">{pluralize(items.length, 'item')}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="section brand-section" aria-labelledby="all-brand-heading">
            <div className="section__head">
              <h2 id="all-brand-heading" className="section__title">
                All {brand.data.name} products <span className="section__count">{all.length}</span>
              </h2>
            </div>
            <ProductGrid
              products={groups.flatMap((g) => g.items)}
              getLabel={(p) => typeName.get(p.typeId)}
            />
          </section>
        </>
      )}
    </div>
  )
}
