/**
 * Makes the current owner's cart available everywhere in the app.
 *
 * - Loads the cart for the current owner (a guest, or the signed-in customer).
 * - When a guest signs in, moves their guest cart into the account's cart so
 *   nothing is lost. Signing out leaves the account's cart saved for next time.
 * - Applies changes with the rules in CartService.
 * - Saves every change through CartRepository (browser now, database later).
 * - Looks up live product details so prices are always current.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Cart, CartLine, CartTotals } from '../models/cart'
import type { Product } from '../models/product'
import { ownerKey, type CartOwner } from '../models/user'
import { cartRepository } from '../services/cart/cartRepository'
import * as cartService from '../services/cart/cartService'
import { getProductsByIds } from '../services/product/productService'
import { useAuth } from './AuthContext'

interface CartContextValue {
  cart: Cart
  lines: CartLine[]
  totals: CartTotals
  /** True while the saved cart or its product details are loading. */
  loading: boolean
  getQuantity: (productId: string) => number
  addItem: (product: Product, quantity?: number) => void
  setQuantity: (product: Product, quantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { owner, ready } = useAuth()
  const key = ownerKey(owner)
  const [cart, setCart] = useState<Cart>(() => cartService.createEmptyCart(owner))
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  // 1. Load the saved cart whenever the owner changes (first visit, sign-in,
  //    sign-out). Waits until we know whether someone is signed in.
  const previousOwner = useRef<CartOwner | null>(null)
  useEffect(() => {
    if (!ready) return
    const from = previousOwner.current
    let active = true
    loadCartFor(owner, from).then((loaded) => {
      previousOwner.current = owner
      if (!active) return
      setCart(loaded)
      setLoadedFor(key)
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready])

  // 2. Save every change — but only after the saved cart has loaded, so we
  //    never overwrite it with an empty one.
  useEffect(() => {
    if (loadedFor === key && ownerKey(cart.owner) === key) void cartRepository.save(cart)
  }, [cart, key, loadedFor])

  // 3. Fetch the current details of the products in the cart.
  const idsKey = cart.items.map((i) => i.productId).sort().join(',')
  useEffect(() => {
    let active = true
    if (!idsKey) {
      setProducts([])
      return
    }
    setProductsLoading(true)
    getProductsByIds(idsKey.split(',')).then((list) => {
      if (!active) return
      setProducts(list)
      setProductsLoading(false)
    })
    return () => {
      active = false
    }
  }, [idsKey])

  const addItem = useCallback((product: Product, quantity = 1) => {
    setCart((c) => cartService.addItem(c, product, quantity))
    setProducts((list) => (list.some((p) => p.id === product.id) ? list : [...list, product]))
  }, [])
  const setQuantity = useCallback((product: Product, quantity: number) => {
    setCart((c) => cartService.setItemQuantity(c, product, quantity))
  }, [])
  const removeItem = useCallback((productId: string) => {
    setCart((c) => cartService.removeItem(c, productId))
  }, [])
  const clearCart = useCallback(() => setCart((c) => cartService.clearItems(c)), [])
  const getQuantity = useCallback((productId: string) => cartService.getItemQuantity(cart, productId), [cart])

  const value = useMemo<CartContextValue>(() => {
    const lines = cartService.buildCartLines(cart, products)
    return {
      cart,
      lines,
      totals: cartService.calculateTotals(lines),
      loading: loadedFor !== key || productsLoading,
      getQuantity,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    }
  }, [cart, products, loadedFor, key, productsLoading, getQuantity, addItem, setQuantity, removeItem, clearCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

/**
 * Loads `owner`'s saved cart. If a guest has just signed in (`from` was a
 * guest), their guest items are merged into the account cart and the guest
 * cart is cleared.
 */
// Cart loads run one at a time, so a sign-in merge can never happen twice at once.
let loadQueue: Promise<unknown> = Promise.resolve()

function loadCartFor(owner: CartOwner, from: CartOwner | null): Promise<Cart> {
  const next = loadQueue.then(() => loadAndMerge(owner, from))
  loadQueue = next.catch(() => undefined)
  return next
}

async function loadAndMerge(owner: CartOwner, from: CartOwner | null): Promise<Cart> {
  let cart = (await cartRepository.load(owner)) ?? cartService.createEmptyCart(owner)
  if (owner.kind === 'user' && from?.kind === 'guest') {
    const guestCart = await cartRepository.load(from)
    if (guestCart && guestCart.items.length > 0) {
      const products = await getProductsByIds(guestCart.items.map((i) => i.productId))
      cart = cartService.mergeCarts(cart, guestCart, products)
      await cartRepository.save(cart)
      await cartRepository.clear(from)
    }
  }
  return cart
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
