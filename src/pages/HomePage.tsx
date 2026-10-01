import { Link } from 'react-router-dom'
import { Loading } from '../components/EmptyState'
import { ReturnIcon, ShieldIcon, TruckIcon } from '../components/Icons'
import { Price } from '../components/Price'
import { ProductGrid } from '../components/ProductGrid'
import { config } from '../config'
import { getCategories, getFeaturedProducts, getProducts } from '../services/product/productService'
import { assetUrl } from '../utils/assets'
import { formatPrice } from '../utils/format'
import { useAsync } from '../utils/useAsync'
import { useDocumentTitle } from '../utils/useDocumentTitle'

const CATEGORY_IMAGES: Record<string, string> = {
  phones: assetUrl('images/products/nova-x5-pro.svg'),
  gadgets: assetUrl('images/products/airbeat-earbuds.svg'),
  accessories: assetUrl('images/products/gan-charger.svg'),
}

export function HomePage() {
  useDocumentTitle()
  const categories = useAsync(getCategories, [])
  const featured = useAsync(() => getFeaturedProducts(4), [])
  const latest = useAsync(() => getProducts({ sort: 'rating', inStockOnly: true }), [])
  const spotlight = featured.data?.[0]

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__content">
            <p className="eyebrow">100% original · Confam</p>
            <h1 className="hero__title">Phones and gadgets you can <span className="hero__accent">trust.</span></h1>
            <p className="hero__text">
              Brand-new, sealed smartphones, earbuds, smartwatches, chargers and more — with warranty, fair prices and
              free delivery on orders over {formatPrice(config.freeShippingThreshold)}.
            </p>
            <div className="hero__actions">
              <Link to="/shop" className="btn btn--primary btn--lg">Shop all products</Link>
              <Link to="/shop?sale=1" className="btn btn--secondary btn--lg">Browse deals</Link>
            </div>
          </div>
          {spotlight && (
            <Link to={`/product/${spotlight.slug}`} className="hero__card" aria-label={`Featured: ${spotlight.name}`}>
              <span className="hero__card-top" aria-hidden="true">
                <span><strong>Featured</strong><br />{categories.data?.find((c) => c.id === spotlight.categoryId)?.name}</span>
                <em>Just landed</em>
              </span>
              <img src={spotlight.image} alt="" className="hero__card-img" />
              <span className="hero__card-bottom">
                <span className="hero__card-name">{spotlight.name}</span>
                <Price product={spotlight} />
              </span>
            </Link>
          )}
        </div>
      </section>

      <section className="usp" aria-label="Why shop with us">
        <ul className="container usp__list">
          <li className="usp__item"><ShieldIcon /><div><strong>Original &amp; sealed</strong><span>Every device comes with warranty</span></div></li>
          <li className="usp__item"><TruckIcon /><div><strong>Fast delivery</strong><span>Nationwide, 2–5 working days</span></div></li>
          <li className="usp__item"><ReturnIcon /><div><strong>Easy returns</strong><span>14 days to change your mind</span></div></li>
        </ul>
      </section>

      <section className="section container" aria-labelledby="categories-heading">
        <div className="section__head">
          <h2 id="categories-heading" className="section__title">Shop by category</h2>
          <Link to="/shop" className="link-arrow">View all</Link>
        </div>
        {categories.loading ? (
          <Loading />
        ) : (
          <ul className="category-grid" role="list">
            {categories.data?.map((c) => (
              <li key={c.id}>
                <Link to={`/shop?category=${c.id}`} className="category-card">
                  <img src={CATEGORY_IMAGES[c.id] ?? assetUrl('favicon.svg')} alt="" className="category-card__img" loading="lazy" />
                  <span className="category-card__body">
                    <span className="category-card__name">{c.name}</span>
                    <span className="category-card__desc">{c.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section container" aria-labelledby="featured-heading">
        <div className="section__head">
          <h2 id="featured-heading" className="section__title">Featured products</h2>
          <Link to="/shop" className="link-arrow">Shop all</Link>
        </div>
        {featured.loading ? <Loading /> : <ProductGrid products={featured.data ?? []} categories={categories.data ?? []} />}
      </section>

      <section className="section container">
        <div className="promo">
          <div>
            <h2 className="promo__title">Up to 15% off phones, audio and chargers</h2>
            <p className="promo__text">Nova X5 Pro, AirBeat Pro earbuds, Aura headphones and more — while stocks last.</p>
          </div>
          <Link to="/shop?sale=1" className="btn btn--light btn--lg">See the deals</Link>
        </div>
      </section>

      <section className="section container" aria-labelledby="top-rated-heading">
        <div className="section__head">
          <h2 id="top-rated-heading" className="section__title">Customer favourites</h2>
          <Link to="/shop?sort=rating" className="link-arrow">See top rated</Link>
        </div>
        {latest.loading ? <Loading /> : <ProductGrid products={(latest.data ?? []).filter((p) => !featured.data?.some((f) => f.id === p.id)).slice(0, 8)} categories={categories.data ?? []} />}
      </section>
    </>
  )
}
