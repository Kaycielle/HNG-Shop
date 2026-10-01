import { Link } from 'react-router-dom'
import { config } from '../config'
import { buildId } from '../services/supabase/client'
import { BrandName } from './BrandName'
import { formatPrice } from '../utils/format'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div>
          <Link to="/" className="logo">
            <span className="logo__mark" aria-hidden="true">C</span>
            <BrandName />
          </Link>
          <p className="site-footer__tagline">Original phones, gadgets and accessories, delivered across Nigeria.</p>
        </div>
        <nav aria-label="Shop">
          <h2 className="site-footer__heading">Shop</h2>
          <ul>
            <li><Link to="/shop">All products</Link></li>
            <li><Link to="/brands">Brands</Link></li>
            <li><Link to="/shop?category=phones">Phones</Link></li>
            <li><Link to="/shop?category=gadgets">Gadgets</Link></li>
            <li><Link to="/shop?category=accessories">Accessories</Link></li>
            <li><Link to="/shop?sale=1">Deals</Link></li>
          </ul>
        </nav>
        <nav aria-label="Your account">
          <h2 className="site-footer__heading">Your order</h2>
          <ul>
            <li><Link to="/cart">Shopping cart</Link></li>
            <li><Link to="/checkout">Checkout</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="site-footer__heading">Delivery</h2>
          <p className="site-footer__text">
            Free delivery on orders of {formatPrice(config.freeShippingThreshold)} or more. Flat-rate delivery
            on everything else.
          </p>
        </div>
      </div>
      <div className="container site-footer__bottom">
        <p>© {new Date().getFullYear()} {config.storeName}. All rights reserved.</p>
        <p className="site-footer__build">Build {buildId}</p>
      </div>
    </footer>
  )
}
