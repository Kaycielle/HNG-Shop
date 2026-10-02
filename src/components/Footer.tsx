import { Link } from 'react-router-dom'
import { config } from '../config'
import { buildId } from '../services/supabase/client'
import { BrandName, logoInitials } from './BrandName'
import { formatPrice } from '../utils/format'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div>
          <Link to="/" className="logo">
            <span className="logo__mark" aria-hidden="true">{logoInitials()}</span>
            <BrandName />
          </Link>
          <p className="site-footer__tagline">Luxury sportswear, training equipment and supplements, delivered across Nigeria.</p>
        </div>
        <nav aria-label="Shop">
          <h2 className="site-footer__heading">Shop</h2>
          <ul>
            <li><Link to="/shop">All products</Link></li>
            <li><Link to="/brands">Brands</Link></li>
            <li><Link to="/shop?category=sportswear">Sportswear</Link></li>
            <li><Link to="/shop?category=equipment">Equipment</Link></li>
            <li><Link to="/shop?category=supplements">Supplements</Link></li>
            <li><Link to="/shop?sale=1">Deals</Link></li>
          </ul>
        </nav>
        <nav aria-label="Your account">
          <h2 className="site-footer__heading">Your order</h2>
          <ul>
            <li><Link to="/cart">Shopping cart</Link></li>
            <li><Link to="/checkout">Checkout</Link></li>
            <li><Link to="/privacy">Privacy policy</Link></li>
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
