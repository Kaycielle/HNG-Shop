import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { config } from '../config'
import { useCart } from '../context/CartContext'
import { CartIcon, CloseIcon, MenuIcon, SearchIcon } from './Icons'

const NAV_LINKS = [
  { to: '/shop', label: 'Shop all' },
  { to: '/shop?category=electronics', label: 'Electronics' },
  { to: '/shop?category=fashion', label: 'Fashion' },
  { to: '/shop?category=accessories', label: 'Accessories' },
  { to: '/shop?category=home', label: 'Home & Living' },
]

export function Header() {
  const { cart } = useCart()
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

  const currentCategory = location.pathname === '/shop' ? params.get('category') : null
  const isActive = (to: string) => {
    if (location.pathname !== '/shop') return false
    const linkCategory = new URLSearchParams(to.split('?')[1] ?? '').get('category')
    return linkCategory === currentCategory
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
          <span className="logo__mark" aria-hidden="true">K</span>
          <span className="logo__text">{config.storeName}</span>
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

        <NavLink to="/cart" className="cart-link" aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
          <CartIcon width={22} height={22} />
          <span className="cart-link__label" aria-hidden="true">Cart</span>
          {count > 0 && <span className="cart-link__count" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
        </NavLink>
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
