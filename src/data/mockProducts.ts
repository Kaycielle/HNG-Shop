/**
 * TEMPORARY MOCK DATA (Phase 1 only).
 *
 * In Phase 2 these products will live in the database and this file will be
 * deleted. Nothing in the UI imports this file directly — only
 * services/product/productService.ts does — so swapping it out is a one-file
 * change.
 *
 * Prices, stock levels, ratings and specs are SAMPLE values for development.
 * Replace them with Confam NG's real stock before going live.
 */
import type { Brand, Category, Product, ProductType, StockStatus } from '../models/product'
import { assetUrl } from '../utils/assets'

export const mockCategories: Category[] = [
  { id: 'phones', name: 'Phones', description: 'Smartphones for every budget, brand-new and sealed' },
  { id: 'gadgets', name: 'Gadgets', description: 'Audio, smartwatches, tablets and speakers' },
  { id: 'accessories', name: 'Accessories', description: 'Power banks, chargers, cables and cases' },
]

export const mockProductTypes: ProductType[] = [
  { id: 'phones', name: 'Phones', categoryId: 'phones' },
  { id: 'tablets', name: 'Tablets', categoryId: 'gadgets' },
  { id: 'audio', name: 'Headsets & earbuds', categoryId: 'gadgets' },
  { id: 'smartwatches', name: 'Smartwatches', categoryId: 'gadgets' },
  { id: 'speakers', name: 'Speakers', categoryId: 'gadgets' },
  { id: 'power-banks', name: 'Power banks', categoryId: 'accessories' },
  { id: 'chargers', name: 'Chargers & cables', categoryId: 'accessories' },
  { id: 'protection', name: 'Cases & protection', categoryId: 'accessories' },
]

export const mockBrands: Brand[] = [
  { id: 'apple', name: 'Apple', tagline: 'iPhone, AirPods, Apple Watch and official chargers' },
  { id: 'samsung', name: 'Samsung', tagline: 'Galaxy phones, tablets, Buds and watches' },
  { id: 'google', name: 'Google', tagline: 'Pixel phones, Buds and Pixel Watch' },
  { id: 'tecno', name: 'Tecno', tagline: 'Camon, Spark and Pova phones plus accessories' },
  { id: 'infinix', name: 'Infinix', tagline: 'Note and Hot series phones and audio' },
  { id: 'oraimo', name: 'Oraimo', tagline: 'Earbuds, power banks, chargers and cables' },
  { id: 'nova', name: 'Nova', tagline: 'Our own range of phones, audio and accessories' },
]

/** Department for each item type, so products only need to name their type. */
const categoryOf = Object.fromEntries(mockProductTypes.map((t) => [t.id, t.categoryId]))

interface ProductInput {
  id: string
  slug: string
  name: string
  brandId: string
  typeId: string
  price: number
  stock: number
  shortDescription: string
  description: string
  discountPercent?: number
  rating?: number
  ratingCount?: number
  featured?: boolean
  specs?: { label: string; value: string }[]
}

/** Fills in the fields every product shares (image path, category, stock status). */
function product(input: ProductInput): Product {
  const { stock, ...rest } = input
  const stockStatus: StockStatus = stock === 0 ? 'out_of_stock' : stock <= 5 ? 'low_stock' : 'in_stock'
  return {
    ...rest,
    image: assetUrl(`images/products/${input.slug}.svg`),
    categoryId: categoryOf[input.typeId],
    stockQuantity: stock,
    stockStatus,
  }
}

const warranty = (months: number) => ({ label: 'Warranty', value: `${months} months` })

export const mockProducts: Product[] = [
  // ───────────── Apple ─────────────
  product({
    id: 'p-001', slug: 'iphone-16-pro-max', name: 'iPhone 16 Pro Max (256GB)', brandId: 'apple', typeId: 'phones',
    price: 2150000, stock: 3, rating: 4.9, ratingCount: 214, featured: true,
    shortDescription: '6.9" Super Retina XDR, titanium design, 48MP Pro camera.',
    description: 'Apple’s biggest and most capable iPhone. A 6.9-inch always-on display, a light titanium body, a 48MP main camera with 5× zoom, and battery life that easily lasts the day. Brand-new and sealed.',
    specs: [{ label: 'Display', value: '6.9" Super Retina XDR, 120Hz' }, { label: 'Storage', value: '256GB' }, { label: 'Camera', value: '48MP + 48MP ultra-wide + 12MP 5× telephoto' }, { label: 'Connector', value: 'USB-C' }, warranty(12)],
  }),
  product({
    id: 'p-002', slug: 'iphone-15', name: 'iPhone 15 (128GB)', brandId: 'apple', typeId: 'phones',
    price: 1150000, discountPercent: 5, stock: 8, rating: 4.8, ratingCount: 341,
    shortDescription: '6.1" display, Dynamic Island, 48MP camera, USB-C.',
    description: 'A brilliant everyday iPhone with Dynamic Island, a sharp 48MP camera and fast USB-C charging, in a tough colour-infused glass design.',
    specs: [{ label: 'Display', value: '6.1" Super Retina XDR' }, { label: 'Storage', value: '128GB' }, { label: 'Camera', value: '48MP + 12MP ultra-wide' }, { label: 'Connector', value: 'USB-C' }, warranty(12)],
  }),
  product({
    id: 'p-003', slug: 'airpods-pro-2', name: 'AirPods Pro (2nd generation)', brandId: 'apple', typeId: 'audio',
    price: 385000, stock: 14, rating: 4.8, ratingCount: 502,
    shortDescription: 'Active Noise Cancellation, Adaptive Audio, USB-C case.',
    description: 'Rich sound with up to twice the noise cancellation of the original AirPods Pro. Transparency mode lets the world in when you need it, and the USB-C case adds up to 30 hours of listening.',
    specs: [{ label: 'Noise cancelling', value: 'Active, adaptive' }, { label: 'Battery', value: 'Up to 6 hours (30 with case)' }, { label: 'Case', value: 'USB-C, MagSafe' }, warranty(12)],
  }),
  product({
    id: 'p-004', slug: 'apple-watch-series-10', name: 'Apple Watch Series 10 (42mm)', brandId: 'apple', typeId: 'smartwatches',
    price: 720000, stock: 0, rating: 4.7, ratingCount: 96,
    shortDescription: 'Thinnest Apple Watch yet, with a bigger, brighter display.',
    description: 'Track workouts, sleep and heart health, reply to messages and pay from your wrist. Series 10 has Apple’s largest and brightest display in a thinner, lighter case.',
    specs: [{ label: 'Case size', value: '42mm aluminium' }, { label: 'Battery', value: 'Up to 18 hours' }, { label: 'Water resistance', value: '50m' }, warranty(12)],
  }),
  product({
    id: 'p-005', slug: 'apple-20w-usb-c-adapter', name: 'Apple 20W USB-C Power Adapter', brandId: 'apple', typeId: 'chargers',
    price: 38000, stock: 40, rating: 4.7, ratingCount: 688,
    shortDescription: 'Official fast charger for iPhone and iPad.',
    description: 'Charge your iPhone up to 50% in around 30 minutes. The official Apple adapter, made to work safely with every iPhone and iPad that charges over USB-C.',
    specs: [{ label: 'Output', value: '20 W USB-C' }, { label: 'Plug', value: 'UK 3-pin' }, warranty(12)],
  }),

  // ───────────── Samsung ─────────────
  product({
    id: 'p-006', slug: 'galaxy-s25-ultra', name: 'Galaxy S25 Ultra (256GB)', brandId: 'samsung', typeId: 'phones',
    price: 1950000, stock: 6, rating: 4.8, ratingCount: 188, featured: true,
    shortDescription: '6.9" Dynamic AMOLED, 200MP camera, built-in S Pen.',
    description: 'Samsung’s most powerful Galaxy. A huge 6.9-inch display, a 200MP camera that shines at night, the built-in S Pen for notes and sketches, and Galaxy AI features built in.',
    specs: [{ label: 'Display', value: '6.9" Dynamic AMOLED 2X, 120Hz' }, { label: 'Storage / RAM', value: '256GB / 12GB' }, { label: 'Camera', value: '200MP + 50MP + 50MP + 10MP' }, { label: 'Extras', value: 'Built-in S Pen' }, warranty(12)],
  }),
  product({
    id: 'p-007', slug: 'galaxy-a55', name: 'Galaxy A55 5G (128GB)', brandId: 'samsung', typeId: 'phones',
    price: 520000, discountPercent: 8, stock: 20, rating: 4.6, ratingCount: 274,
    shortDescription: '6.6" Super AMOLED, 50MP OIS camera, metal frame.',
    description: 'Premium looks at a mid-range price. A bright 6.6-inch Super AMOLED screen, a steady 50MP camera, a strong metal frame and four years of Android updates.',
    specs: [{ label: 'Display', value: '6.6" Super AMOLED, 120Hz' }, { label: 'Storage / RAM', value: '128GB / 8GB' }, { label: 'Battery', value: '5,000mAh, 25W charging' }, warranty(12)],
  }),
  product({
    id: 'p-008', slug: 'galaxy-tab-s9-fe', name: 'Galaxy Tab S9 FE (128GB)', brandId: 'samsung', typeId: 'tablets',
    price: 640000, stock: 7, rating: 4.6, ratingCount: 83,
    shortDescription: '10.9" tablet with S Pen included. Water-resistant.',
    description: 'A big, bright tablet for school, work and movies, with the S Pen in the box and IP68 water resistance.',
    specs: [{ label: 'Display', value: '10.9" TFT, 90Hz' }, { label: 'Storage / RAM', value: '128GB / 6GB' }, { label: 'In the box', value: 'S Pen' }, warranty(12)],
  }),
  product({
    id: 'p-009', slug: 'galaxy-buds3-pro', name: 'Galaxy Buds3 Pro', brandId: 'samsung', typeId: 'audio',
    price: 310000, stock: 12, rating: 4.5, ratingCount: 129,
    shortDescription: 'Hi-fi sound, adaptive noise cancelling, blade lights.',
    description: 'Studio-quality sound with two-way speakers, intelligent noise cancelling that adapts to your surroundings, and live translation with Galaxy AI.',
    specs: [{ label: 'Noise cancelling', value: 'Adaptive ANC' }, { label: 'Battery', value: 'Up to 6 hours (26 with case)' }, { label: 'Water resistance', value: 'IP57' }, warranty(12)],
  }),
  product({
    id: 'p-010', slug: 'galaxy-watch7', name: 'Galaxy Watch7 (44mm)', brandId: 'samsung', typeId: 'smartwatches',
    price: 420000, stock: 9, rating: 4.5, ratingCount: 77,
    shortDescription: 'Health tracking, sleep coaching and GPS.',
    description: 'Get personalised health insights, sleep coaching and accurate GPS for your runs, with a bright sapphire-glass display.',
    specs: [{ label: 'Case size', value: '44mm' }, { label: 'Battery', value: 'Up to 40 hours' }, { label: 'Works with', value: 'Android' }, warranty(12)],
  }),
  product({
    id: 'p-011', slug: 'samsung-25w-charger', name: 'Samsung 25W Super Fast Charger', brandId: 'samsung', typeId: 'chargers',
    price: 25000, stock: 60, rating: 4.7, ratingCount: 455,
    shortDescription: 'Official USB-C fast charger with cable.',
    description: 'Charge your Galaxy at full speed with the official 25W Super Fast Charger. Includes a 1m USB-C to USB-C cable.',
    specs: [{ label: 'Output', value: '25 W USB-C PD' }, { label: 'In the box', value: 'Charger + 1m cable' }, warranty(12)],
  }),
  product({
    id: 'p-012', slug: 'samsung-10000mah-power-bank', name: 'Samsung 10,000mAh Power Bank (25W)', brandId: 'samsung', typeId: 'power-banks',
    price: 42000, stock: 18, rating: 4.6, ratingCount: 160,
    shortDescription: 'Slim power bank with 25W Super Fast Charging.',
    description: 'Slip it in your bag and charge your phone up to twice. Two USB-C ports let you charge two devices at the same time.',
    specs: [{ label: 'Capacity', value: '10,000 mAh' }, { label: 'Max output', value: '25 W' }, { label: 'Ports', value: '2 × USB-C' }, warranty(12)],
  }),

  // ───────────── Google ─────────────
  product({
    id: 'p-013', slug: 'pixel-9-pro', name: 'Pixel 9 Pro (128GB)', brandId: 'google', typeId: 'phones',
    price: 1650000, stock: 5, rating: 4.7, ratingCount: 92,
    shortDescription: '6.3" Super Actua display, pro triple camera, Gemini built in.',
    description: 'The best of Google in a compact phone. A pro-level triple camera, a super-bright display and helpful AI built right in, with seven years of updates.',
    specs: [{ label: 'Display', value: '6.3" OLED, 120Hz' }, { label: 'Storage / RAM', value: '128GB / 16GB' }, { label: 'Camera', value: '50MP + 48MP + 48MP 5× telephoto' }, warranty(12)],
  }),
  product({
    id: 'p-014', slug: 'pixel-9a', name: 'Pixel 9a (128GB)', brandId: 'google', typeId: 'phones',
    price: 780000, discountPercent: 6, stock: 11, rating: 4.6, ratingCount: 58,
    shortDescription: 'Pixel camera and AI at a friendlier price.',
    description: 'Great photos in any light, a smooth 6.3-inch display and Google’s helpful AI features, with all-day battery life and seven years of updates.',
    specs: [{ label: 'Display', value: '6.3" OLED, 120Hz' }, { label: 'Storage / RAM', value: '128GB / 8GB' }, { label: 'Battery', value: '5,100mAh' }, warranty(12)],
  }),
  product({
    id: 'p-015', slug: 'pixel-buds-pro-2', name: 'Pixel Buds Pro 2', brandId: 'google', typeId: 'audio',
    price: 290000, stock: 4, rating: 4.5, ratingCount: 44,
    shortDescription: 'Small, comfortable earbuds with powerful noise cancelling.',
    description: 'Google’s lightest Pro earbuds, with Active Noise Cancellation, clear calls and hands-free help from Gemini.',
    specs: [{ label: 'Noise cancelling', value: 'Active' }, { label: 'Battery', value: 'Up to 8 hours (30 with case)' }, warranty(12)],
  }),
  product({
    id: 'p-016', slug: 'pixel-watch-3', name: 'Pixel Watch 3 (41mm)', brandId: 'google', typeId: 'smartwatches',
    price: 560000, stock: 6, rating: 4.4, ratingCount: 31,
    shortDescription: 'Fitbit health tracking in a sleek round design.',
    description: 'Daily readiness, sleep and heart-rate tracking from Fitbit, with Google Maps, Wallet and Assistant on your wrist.',
    specs: [{ label: 'Case size', value: '41mm' }, { label: 'Battery', value: 'Up to 24 hours' }, { label: 'Works with', value: 'Android' }, warranty(12)],
  }),

  // ───────────── Tecno ─────────────
  product({
    id: 'p-017', slug: 'tecno-camon-30-pro', name: 'Tecno Camon 30 Pro 5G (512GB)', brandId: 'tecno', typeId: 'phones',
    price: 520000, stock: 15, rating: 4.5, ratingCount: 233,
    shortDescription: '50MP selfie camera, 512GB storage, 70W charging.',
    description: 'Made for photos. A 50MP main camera with stabilisation, a sharp 50MP selfie camera, a curved AMOLED display and super-fast 70W charging.',
    specs: [{ label: 'Display', value: '6.78" AMOLED, 144Hz' }, { label: 'Storage / RAM', value: '512GB / 12GB' }, { label: 'Battery', value: '5,000mAh, 70W' }, warranty(12)],
  }),
  product({
    id: 'p-018', slug: 'tecno-spark-30-pro', name: 'Tecno Spark 30 Pro (256GB)', brandId: 'tecno', typeId: 'phones',
    price: 265000, discountPercent: 10, stock: 35, rating: 4.4, ratingCount: 410, featured: true,
    shortDescription: '6.78" AMOLED, 108MP camera, 256GB storage.',
    description: 'Big features for less. A smooth AMOLED screen, a 108MP main camera, stereo speakers and plenty of storage for apps, photos and videos.',
    specs: [{ label: 'Display', value: '6.78" AMOLED, 120Hz' }, { label: 'Storage / RAM', value: '256GB / 8GB' }, { label: 'Battery', value: '5,000mAh, 33W' }, warranty(12)],
  }),
  product({
    id: 'p-019', slug: 'tecno-pova-6-pro', name: 'Tecno Pova 6 Pro 5G (256GB)', brandId: 'tecno', typeId: 'phones',
    price: 410000, stock: 10, rating: 4.5, ratingCount: 172,
    shortDescription: 'Huge 6,000mAh battery and gaming-ready performance.',
    description: 'Built for long days and long gaming sessions, with a 6,000mAh battery, 70W fast charging and a 120Hz AMOLED display.',
    specs: [{ label: 'Display', value: '6.78" AMOLED, 120Hz' }, { label: 'Storage / RAM', value: '256GB / 12GB' }, { label: 'Battery', value: '6,000mAh, 70W' }, warranty(12)],
  }),
  product({
    id: 'p-020', slug: 'tecno-true-wireless-earbuds', name: 'Tecno True Wireless Earbuds', brandId: 'tecno', typeId: 'audio',
    price: 24000, stock: 30, rating: 4.2, ratingCount: 140,
    shortDescription: 'Light everyday earbuds with clear calls.',
    description: 'Comfortable everyday earbuds with punchy sound, clear call microphones and a pocket-size charging case.',
    specs: [{ label: 'Battery', value: 'Up to 5 hours (20 with case)' }, { label: 'Water resistance', value: 'IPX4' }, warranty(6)],
  }),

  // ───────────── Infinix ─────────────
  product({
    id: 'p-021', slug: 'infinix-note-40-pro', name: 'Infinix Note 40 Pro (256GB)', brandId: 'infinix', typeId: 'phones',
    price: 395000, stock: 16, rating: 4.4, ratingCount: 198,
    shortDescription: 'Curved AMOLED, 108MP camera, wireless charging.',
    description: 'A stylish curved-screen phone with a 108MP camera, 45W wired and 20W wireless charging, and JBL-tuned speakers.',
    specs: [{ label: 'Display', value: '6.78" curved AMOLED, 120Hz' }, { label: 'Storage / RAM', value: '256GB / 8GB' }, { label: 'Battery', value: '5,000mAh, 45W' }, warranty(12)],
  }),
  product({
    id: 'p-022', slug: 'infinix-hot-50', name: 'Infinix Hot 50 (128GB)', brandId: 'infinix', typeId: 'phones',
    price: 210000, discountPercent: 7, stock: 28, rating: 4.3, ratingCount: 265,
    shortDescription: 'Slim, tough everyday phone with a 120Hz screen.',
    description: 'One of the slimmest phones at its price, with a smooth 120Hz display, a 50MP camera and a 5,000mAh battery.',
    specs: [{ label: 'Display', value: '6.7" IPS, 120Hz' }, { label: 'Storage / RAM', value: '128GB / 8GB' }, { label: 'Battery', value: '5,000mAh, 18W' }, warranty(12)],
  }),
  product({
    id: 'p-023', slug: 'infinix-buds', name: 'Infinix XBuds Earbuds', brandId: 'infinix', typeId: 'audio',
    price: 28000, stock: 0, rating: 4.1, ratingCount: 62,
    shortDescription: 'Noise-reducing earbuds with low-latency game mode.',
    description: 'Wireless earbuds with environmental noise reduction for calls and a low-latency mode for gaming and videos.',
    specs: [{ label: 'Battery', value: 'Up to 6 hours (24 with case)' }, { label: 'Water resistance', value: 'IPX5' }, warranty(6)],
  }),

  // ───────────── Oraimo ─────────────
  product({
    id: 'p-024', slug: 'oraimo-freepods-4', name: 'Oraimo FreePods 4', brandId: 'oraimo', typeId: 'audio',
    price: 32000, discountPercent: 10, stock: 45, rating: 4.5, ratingCount: 820, featured: true,
    shortDescription: 'Noise-cancelling earbuds with 35.5-hour playtime.',
    description: 'Popular for a reason: active noise cancellation, deep bass and up to 35.5 hours of playtime with the charging case.',
    specs: [{ label: 'Noise cancelling', value: 'Active' }, { label: 'Battery', value: 'Up to 35.5 hours with case' }, { label: 'Water resistance', value: 'IPX5' }, warranty(12)],
  }),
  product({
    id: 'p-025', slug: 'oraimo-boompop-headphones', name: 'Oraimo BoomPop 2 Headphones', brandId: 'oraimo', typeId: 'audio',
    price: 28000, stock: 22, rating: 4.4, ratingCount: 307,
    shortDescription: 'Over-ear wireless headset with 60-hour battery.',
    description: 'Comfortable over-ear headphones with booming bass, a built-in mic for calls and up to 60 hours of battery life.',
    specs: [{ label: 'Battery', value: 'Up to 60 hours' }, { label: 'Connectivity', value: 'Bluetooth 5.3, AUX' }, warranty(12)],
  }),
  product({
    id: 'p-026', slug: 'oraimo-traveler-power-bank', name: 'Oraimo Traveler 20,000mAh Power Bank', brandId: 'oraimo', typeId: 'power-banks',
    price: 26000, stock: 50, rating: 4.6, ratingCount: 1210,
    shortDescription: 'Fast-charging power bank, ideal for NEPA days.',
    description: 'Keep your phone alive through power cuts. Charges most phones four times, with 22.5W fast charging and three ports.',
    specs: [{ label: 'Capacity', value: '20,000 mAh' }, { label: 'Max output', value: '22.5 W' }, { label: 'Ports', value: '1 × USB-C, 2 × USB-A' }, warranty(12)],
  }),
  product({
    id: 'p-027', slug: 'oraimo-braided-cable', name: 'Oraimo Braided USB-C Cable (2m)', brandId: 'oraimo', typeId: 'chargers',
    price: 4500, stock: 90, rating: 4.5, ratingCount: 642,
    shortDescription: 'Tough braided cable with 60W fast charging.',
    description: 'A strong nylon-braided cable that survives daily bending and travel, supporting fast charging up to 60W.',
    specs: [{ label: 'Length', value: '2 m' }, { label: 'Max charging', value: '60 W' }, warranty(6)],
  }),
  product({
    id: 'p-028', slug: 'oraimo-watch', name: 'Oraimo Watch 5', brandId: 'oraimo', typeId: 'smartwatches',
    price: 45000, stock: 20, rating: 4.2, ratingCount: 188,
    shortDescription: 'AMOLED smartwatch with calls and 100+ sport modes.',
    description: 'Answer calls from your wrist, track 100+ sports and monitor heart rate and sleep, with a bright AMOLED display.',
    specs: [{ label: 'Display', value: '1.43" AMOLED' }, { label: 'Battery', value: 'Up to 10 days' }, { label: 'Works with', value: 'Android and iPhone' }, warranty(12)],
  }),

  // ───────────── Nova (house brand) ─────────────
  product({
    id: 'p-029', slug: 'nova-x5-pro', name: 'Nova X5 Pro', brandId: 'nova', typeId: 'phones',
    price: 485000, discountPercent: 8, stock: 12, rating: 4.8, ratingCount: 276, featured: true,
    shortDescription: '6.7" AMOLED, 256GB storage, 50MP triple camera.',
    description: 'Our best all-rounder. A bright 6.7-inch 120Hz AMOLED display, a 50MP triple camera that handles low light well, and a 5,000mAh battery that easily lasts a full day.',
    specs: [{ label: 'Display', value: '6.7" AMOLED, 120Hz' }, { label: 'Storage / RAM', value: '256GB / 12GB' }, { label: 'Battery', value: '5,000mAh, 67W' }, warranty(12)],
  }),
  product({
    id: 'p-030', slug: 'nova-tab-11', name: 'Nova Tab 11', brandId: 'nova', typeId: 'tablets',
    price: 340000, stock: 9, rating: 4.6, ratingCount: 104,
    shortDescription: '11" tablet for study, work and streaming. 128GB.',
    description: 'A big, sharp 11-inch screen for online classes, documents, movies and video calls, with quad speakers and an 8,000mAh battery.',
    specs: [{ label: 'Display', value: '11" 2K, 90Hz' }, { label: 'Storage / RAM', value: '128GB / 8GB' }, { label: 'Connectivity', value: 'Wi-Fi + 4G SIM' }, warranty(12)],
  }),
  product({
    id: 'p-031', slug: 'nova-aura-headphones', name: 'Nova Aura Wireless Headphones', brandId: 'nova', typeId: 'audio',
    price: 85000, discountPercent: 15, stock: 18, rating: 4.7, ratingCount: 312,
    shortDescription: 'Over-ear, active noise cancelling, 40-hour battery.',
    description: 'Immerse yourself in rich, detailed sound. Adaptive noise cancelling blocks out the commute, and soft memory-foam cushions stay comfortable for hours.',
    specs: [{ label: 'Battery', value: 'Up to 40 hours' }, { label: 'Connectivity', value: 'Bluetooth 5.3, 3.5mm cable' }, warranty(12)],
  }),
  product({
    id: 'p-032', slug: 'nova-echo-speaker', name: 'Nova Echo Bluetooth Speaker', brandId: 'nova', typeId: 'speakers',
    price: 45000, stock: 0, rating: 4.4, ratingCount: 96,
    shortDescription: 'Portable 360° sound, splash-proof, 18-hour battery.',
    description: 'Echo fills the room with clear 360° sound and deep bass. Splash-proof, light enough to carry anywhere, and pairs with a second Echo for stereo.',
    specs: [{ label: 'Battery', value: 'Up to 18 hours' }, { label: 'Water resistance', value: 'IPX5' }, warranty(12)],
  }),
  product({
    id: 'p-033', slug: 'nova-65w-gan-charger', name: 'Nova 65W GaN Fast Charger', brandId: 'nova', typeId: 'chargers',
    price: 24000, discountPercent: 10, stock: 50, rating: 4.8, ratingCount: 298,
    shortDescription: 'Charge a phone and laptop at once. Compact and cool-running.',
    description: 'One small charger for everything: two USB-C ports and one USB-A port, with up to 65W to fast-charge phones, tablets and laptops.',
    specs: [{ label: 'Max output', value: '65 W' }, { label: 'Ports', value: '2 × USB-C, 1 × USB-A' }, { label: 'Plug', value: 'UK 3-pin' }, warranty(6)],
  }),
  product({
    id: 'p-034', slug: 'nova-volt-power-bank', name: 'Nova Volt 20,000mAh Power Bank', brandId: 'nova', typeId: 'power-banks',
    price: 18500, stock: 40, rating: 4.6, ratingCount: 421,
    shortDescription: 'Fast-charge two devices at once.',
    description: 'Charges a phone up to four times, supports 22.5W fast charging, and has USB-C and USB-A ports so you can charge two devices together.',
    specs: [{ label: 'Capacity', value: '20,000 mAh' }, { label: 'Max output', value: '22.5 W' }, warranty(6)],
  }),
  product({
    id: 'p-035', slug: 'nova-shockproof-case', name: 'Nova Shockproof Case for X5 Pro', brandId: 'nova', typeId: 'protection',
    price: 8500, stock: 35, rating: 4.4, ratingCount: 162,
    shortDescription: 'Slim case with air-cushioned corners.',
    description: 'Keep your phone safe from drops without adding bulk. Air-cushioned corners absorb impact and raised edges protect the screen and camera.',
    specs: [{ label: 'Fits', value: 'Nova X5 Pro' }, { label: 'Drop protection', value: 'Up to 2 m' }],
  }),
]
