import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Footer } from './Footer'
import { Header } from './Header'

export function Layout() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  // When moving to a new page: scroll to the top and move keyboard/screen-reader
  // focus to the main content, like a normal page load would.
  // (Skipped on the very first load so the "Skip to main content" link stays
  // the first thing a keyboard user reaches.)
  const previousPath = useRef(pathname)
  useEffect(() => {
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    window.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="app">
      <a href="#main" className="skip-link">Skip to main content</a>
      <Header />
      <main id="main" ref={mainRef} tabIndex={-1} className="main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
