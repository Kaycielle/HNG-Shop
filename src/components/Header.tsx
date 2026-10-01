import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { config } from '../config'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { BrandName } from './BrandName'
import { CartIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from './Icons'

const NAV_LINKS = [
  { to: '/shop', label: 'Shop all' },
  { to: '/brands', label: 'Brands' },
  { to: '/shop?category=phones', label: 'Phones' },
  { to: '/shop?category=gadgets', label: 'Gadgets' },
  { to: '/shop?category=accessories', label: 'Accessories' },
  { to: '/shop?sale=1', label: 'Deals' },
]

export function Header() {
  const { cart } = useCart()
  const { user } = useAuth()
  const count = cart.items.reduce((sum, i) => sum + i.quantity, 0)
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [menuOpen, setMenuOpen] = useState(false)

  // Keep the search box in sync with the URL, and close the menu on navigation.
  useEffect(() => {
    setQuery(location.pathname === '/shop' ? params.get('q') ?? '' : '')
    setMenuOpen(false)
  }, [location.pathname, params])

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop')
  }

  // A nav link is "current" when its category and sale filter match the page's.
  const isActive = (to: string) => {
    if (to === '/brands') return location.pathname === '/brands' || location.pathname.startsWith('/brand/')
    if (location.pathname !== '/shop') return false
    const linkParams = new URLSearchParams(to.split('?')[1] ?? '')
    return ['category', 'sale'].every((key) => linkParams.get(key) === params.get(key))
  }

  return (
    <header className="site-header">
      <div className="container site-header__bar">
        <button
          type="button"
          className="icon-btn site-header__menu-btn"
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <Link to="/" className="logo" aria-label={`${config.storeName} home`}>
          <span className="logo__mark" aria-hidden="true">C</span>
          <BrandName />
        </Link>

        <form className="search" role="search" onSubmit={onSearch}>
          <label htmlFor="site-search" className="visually-hidden">Search products</label>
          <input
            id="site-search"
            className="search__input"
            type="search"
            placeholder="Search products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="search__btn" aria-label="Search">
            <SearchIcon />
          </button>
        </form>

        <div className="header-actions">
        <NavLink
          to={user ? '/account' : '/account/sign-in'}
          className="cart-link account-link"
          aria-label={user ? `My account, signed in as ${user.name}` : 'Sign in or create an account'}
        >
          <UserIcon width={22} height={22} />
          <span className="cart-link__label" aria-hidden="true">{user ? user.name.split(' ')[0] : 'Sign in'}</span>
        </NavLink>
        <NavLink to="/cart" className="cart-link" aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
          <CartIcon width={22} height={22} />
          <span className="cart-link__label" aria-hidden="true">Cart</span>
          {count > 0 && <span className="cart-link__count" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
        </NavLink>
        </div>
      </div>

      <nav id="primary-nav" className={`primary-nav${menuOpen ? ' primary-nav--open' : ''}`} aria-label="Main">
        <ul className="container primary-nav__list">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className="primary-nav__link" aria-current={isActive(link.to) ? 'page' : undefined}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
