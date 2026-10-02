/**
 * Sample catalogue for Fit Heiress NG (sportswear, equipment, supplements).
 *
 * Used when Supabase isn't connected, and the source of supabase/seed.sql
 * (regenerate it with `npm run db:seed`). Nothing in the UI imports this file
 * directly — only services/product/catalogSource.ts does.
 *
 * Prices, stock levels, ratings and details are SAMPLE values for development.
 * Replace them with Fit Heiress NG's real stock before going live.
 */
import type { Brand, Category, Product, ProductType, StockStatus } from '../models/product'

export const mockCategories: Category[] = [
  { id: 'sportswear', name: 'Sportswear', description: 'Leggings, sports bras, tops, jackets and trainers' },
  { id: 'equipment', name: 'Equipment', description: 'Weights, mats, training gear and recovery tools' },
  { id: 'supplements', name: 'Supplements', description: 'Protein, performance and everyday wellness' },
]

export const mockProductTypes: ProductType[] = [
  { id: 'leggings', name: 'Leggings & sets', categoryId: 'sportswear' },
  { id: 'sports-bras', name: 'Sports bras', categoryId: 'sportswear' },
  { id: 'tops', name: 'Tops & tees', categoryId: 'sportswear' },
  { id: 'outerwear', name: 'Jackets & hoodies', categoryId: 'sportswear' },
  { id: 'footwear', name: 'Trainers', categoryId: 'sportswear' },
  { id: 'weights', name: 'Weights', categoryId: 'equipment' },
  { id: 'training', name: 'Training gear', categoryId: 'equipment' },
  { id: 'yoga', name: 'Yoga & mats', categoryId: 'equipment' },
  { id: 'recovery', name: 'Recovery & massage', categoryId: 'equipment' },
  { id: 'bags', name: 'Bags & bottles', categoryId: 'equipment' },
  { id: 'protein', name: 'Protein', categoryId: 'supplements' },
  { id: 'performance', name: 'Performance & energy', categoryId: 'supplements' },
  { id: 'wellness', name: 'Vitamins & wellness', categoryId: 'supplements' },
]

export const mockBrands: Brand[] = [
  { id: 'lululemon', name: 'Lululemon', tagline: 'Align leggings, Energy bras, jackets and yoga mats' },
  { id: 'alo', name: 'Alo Yoga', tagline: 'Airlift leggings and bras, hoodies and Warrior mats' },
  { id: 'nike', name: 'Nike', tagline: 'Running and training shoes, Dri-FIT wear and bags' },
  { id: 'on', name: 'On', tagline: 'Swiss-engineered running shoes and performance tops' },
  { id: 'technogym', name: 'Technogym', tagline: 'Premium Italian weights, mats and training kit' },
  { id: 'therabody', name: 'Therabody', tagline: 'Theragun massage guns and recovery tools' },
  { id: 'momentous', name: 'Momentous', tagline: 'Grass-fed protein, creatine and sleep support' },
  { id: 'heiress', name: 'Heiress', tagline: 'Our own label: sets, weights, bottles and supplements' },
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
    // A path inside the site; ProductService turns it into a full URL.
    image: `images/products/${input.slug}.svg`,
    categoryId: categoryOf[input.typeId],
    stockQuantity: stock,
    stockStatus,
  }
}

/** Shown on every supplement. */
const supplementNote = {
  label: 'Please note',
  value: 'Food supplement. Not a substitute for a varied diet. Speak to a doctor first if pregnant, nursing or taking medication.',
}

export const mockProducts: Product[] = [
  // ───────────── Lululemon ─────────────
  product({
    id: 'p-001', slug: 'lululemon-align-legging', name: 'Lululemon Align High-Rise Legging 25"', brandId: 'lululemon', typeId: 'leggings',
    price: 145000, stock: 20, rating: 4.9, ratingCount: 412, featured: true,
    shortDescription: 'Buttery-soft, weightless feel for yoga and everyday wear.',
    description: 'The legging people buy in every colour. Made from buttery-soft Nulu fabric that feels weightless, with a high rise that stays put through every pose, and a hidden waistband pocket for a card or key.',
    specs: [{ label: 'Fabric', value: 'Nulu (nylon/elastane)' }, { label: 'Rise', value: 'High-rise, 25" inseam' }, { label: 'Sizes', value: 'XS – XL' }, { label: 'Care', value: 'Machine wash cold, hang to dry' }],
  }),
  product({
    id: 'p-002', slug: 'lululemon-energy-bra', name: 'Lululemon Energy Bra', brandId: 'lululemon', typeId: 'sports-bras',
    price: 78000, discountPercent: 5, stock: 25, rating: 4.7, ratingCount: 238,
    shortDescription: 'Medium support with a strappy back for training and runs.',
    description: 'A medium-support favourite for gym sessions and runs. Sweat-wicking fabric, removable cups and a strappy back that moves with you.',
    specs: [{ label: 'Support', value: 'Medium (B–D cups)' }, { label: 'Fabric', value: 'Luxtreme, sweat-wicking' }, { label: 'Sizes', value: 'XS – XL' }, { label: 'Care', value: 'Machine wash cold' }],
  }),
  product({
    id: 'p-003', slug: 'lululemon-define-jacket', name: 'Lululemon Define Jacket', brandId: 'lululemon', typeId: 'outerwear',
    price: 165000, discountPercent: 10, stock: 8, rating: 4.8, ratingCount: 190,
    shortDescription: 'Sculpting, figure-hugging jacket with thumbholes.',
    description: 'A fitted jacket that looks as good at brunch as it does after class. Smooth, four-way stretch fabric, thumbholes and zipped side pockets.',
    specs: [{ label: 'Fabric', value: 'Luon, four-way stretch' }, { label: 'Fit', value: 'Hugs the body, hip length' }, { label: 'Sizes', value: 'XS – XL' }, { label: 'Care', value: 'Machine wash cold' }],
  }),
  product({
    id: 'p-004', slug: 'lululemon-the-mat-5mm', name: 'Lululemon The Mat 5mm', brandId: 'lululemon', typeId: 'yoga',
    price: 120000, stock: 0, rating: 4.8, ratingCount: 305,
    shortDescription: 'Grippy, cushioned yoga mat that soaks up sweat.',
    description: 'A sweat-resistant top layer that keeps its grip in hot flows, on a natural rubber base for cushioning on hard floors.',
    specs: [{ label: 'Thickness', value: '5 mm' }, { label: 'Size', value: '180 × 66 cm' }, { label: 'Material', value: 'Polyurethane top, natural rubber base' }, { label: 'Weight', value: '2.4 kg' }],
  }),
  product({
    id: 'p-005', slug: 'lululemon-everywhere-belt-bag', name: 'Lululemon Everywhere Belt Bag', brandId: 'lululemon', typeId: 'bags',
    price: 58000, stock: 3, rating: 4.8, ratingCount: 520,
    shortDescription: 'Hands-free essentials bag, worn on the hip or cross-body.',
    description: 'Keep your phone, cards and keys close on runs, at the gym or out and about. Water-repellent fabric and an adjustable strap.',
    specs: [{ label: 'Capacity', value: '1 litre' }, { label: 'Fabric', value: 'Water-repellent nylon' }, { label: 'Strap', value: 'Adjustable, wear 3 ways' }],
  }),

  // ───────────── Alo Yoga ─────────────
  product({
    id: 'p-006', slug: 'alo-airlift-legging', name: 'Alo Yoga Airlift High-Waist Legging', brandId: 'alo', typeId: 'leggings',
    price: 160000, stock: 12, rating: 4.7, ratingCount: 276,
    shortDescription: 'Sleek, sculpting legging with a smoothing high waist.',
    description: 'Alo’s signature Airlift fabric has a smooth, glossy finish that sculpts and lifts, with a high waistband that won’t roll down.',
    specs: [{ label: 'Fabric', value: 'Airlift (nylon/spandex)' }, { label: 'Rise', value: 'High-waist, 7/8 length' }, { label: 'Sizes', value: 'XS – L' }, { label: 'Care', value: 'Machine wash cold, lay flat to dry' }],
  }),
  product({
    id: 'p-007', slug: 'alo-airlift-intrigue-bra', name: 'Alo Yoga Airlift Intrigue Bra', brandId: 'alo', typeId: 'sports-bras',
    price: 92000, discountPercent: 15, stock: 10, rating: 4.6, ratingCount: 144,
    shortDescription: 'Light-support bra with a sculpted, criss-cross back.',
    description: 'A light-support bra designed to be seen, with a sculpted criss-cross back and the same smooth Airlift fabric as the leggings.',
    specs: [{ label: 'Support', value: 'Light' }, { label: 'Fabric', value: 'Airlift (nylon/spandex)' }, { label: 'Sizes', value: 'XS – L' }],
  }),
  product({
    id: 'p-008', slug: 'alo-accolade-hoodie', name: 'Alo Yoga Accolade Hoodie', brandId: 'alo', typeId: 'outerwear',
    price: 190000, stock: 6, rating: 4.8, ratingCount: 98,
    shortDescription: 'Heavyweight, relaxed-fit hoodie for after the session.',
    description: 'A thick, brushed-fleece hoodie with a relaxed fit and dropped shoulders — the one you’ll live in on rest days.',
    specs: [{ label: 'Fabric', value: 'Brushed cotton-blend fleece' }, { label: 'Fit', value: 'Relaxed, unisex' }, { label: 'Sizes', value: 'XS – XL' }],
  }),
  product({
    id: 'p-009', slug: 'alo-warrior-mat', name: 'Alo Yoga Warrior Mat', brandId: 'alo', typeId: 'yoga',
    price: 175000, stock: 4, rating: 4.9, ratingCount: 210,
    shortDescription: 'Extra-grippy, heavyweight mat for serious practice.',
    description: 'A dense, non-slip mat with alignment-friendly grip, built for daily practice. Wipes clean in seconds.',
    specs: [{ label: 'Thickness', value: '6 mm' }, { label: 'Size', value: '188 × 66 cm' }, { label: 'Material', value: 'PU top, natural rubber base' }, { label: 'Weight', value: '3.2 kg' }],
  }),

  // ───────────── Nike ─────────────
  product({
    id: 'p-010', slug: 'nike-pegasus-41', name: 'Nike Pegasus 41 Running Shoes', brandId: 'nike', typeId: 'footwear',
    price: 185000, stock: 14, rating: 4.7, ratingCount: 388, featured: true,
    shortDescription: 'Responsive everyday running shoe with ReactX foam.',
    description: 'A reliable daily trainer for road runs, treadmill sessions and everything in between, with springy ReactX foam and a breathable engineered mesh upper.',
    specs: [{ label: 'Best for', value: 'Road running, daily miles' }, { label: 'Drop', value: '10 mm' }, { label: 'Sizes', value: 'EU 36 – 46' }],
  }),
  product({
    id: 'p-011', slug: 'nike-dri-fit-tee', name: 'Nike Dri-FIT Training Tee', brandId: 'nike', typeId: 'tops',
    price: 42000, stock: 40, rating: 4.5, ratingCount: 455,
    shortDescription: 'Lightweight, sweat-wicking tee for hard sessions.',
    description: 'Dri-FIT fabric moves sweat away from your skin so you stay dry and comfortable, with a relaxed cut that’s easy to move in.',
    specs: [{ label: 'Fabric', value: 'Dri-FIT polyester' }, { label: 'Fit', value: 'Standard' }, { label: 'Sizes', value: 'S – XXL' }],
  }),
  product({
    id: 'p-012', slug: 'nike-swoosh-bra', name: 'Nike Swoosh Medium-Support Bra', brandId: 'nike', typeId: 'sports-bras',
    price: 48000, discountPercent: 10, stock: 30, rating: 4.6, ratingCount: 512,
    shortDescription: 'Comfortable everyday sports bra with removable pads.',
    description: 'A comfortable, supportive bra for training, cycling and everyday wear, with soft one-piece padding you can remove.',
    specs: [{ label: 'Support', value: 'Medium' }, { label: 'Fabric', value: 'Dri-FIT' }, { label: 'Sizes', value: 'XS – XL' }],
  }),
  product({
    id: 'p-013', slug: 'nike-brasilia-duffel', name: 'Nike Brasilia Training Duffel', brandId: 'nike', typeId: 'bags',
    price: 65000, stock: 15, rating: 4.6, ratingCount: 260,
    shortDescription: 'Roomy gym bag with a separate shoe compartment.',
    description: 'Fits everything for the gym and the office after, with a vented shoe compartment, a water-resistant base and a padded shoulder strap.',
    specs: [{ label: 'Capacity', value: '41 litres' }, { label: 'Pockets', value: 'Shoe compartment, zipped front pocket' }, { label: 'Material', value: 'Polyester, water-resistant base' }],
  }),
  product({
    id: 'p-035', slug: 'nike-metcon-9', name: 'Nike Metcon 9 Training Shoes', brandId: 'nike', typeId: 'footwear',
    price: 175000, stock: 0, rating: 4.7, ratingCount: 174,
    shortDescription: 'Stable, flat training shoe for lifting and HIIT.',
    description: 'A stable base for squats and deadlifts with enough cushioning for short runs and jumps — built for mixed gym sessions.',
    specs: [{ label: 'Best for', value: 'Lifting, HIIT, cross-training' }, { label: 'Drop', value: '4 mm' }, { label: 'Sizes', value: 'EU 36 – 46' }],
  }),

  // ───────────── On ─────────────
  product({
    id: 'p-014', slug: 'on-cloudmonster', name: 'On Cloudmonster Running Shoes', brandId: 'on', typeId: 'footwear',
    price: 260000, stock: 7, rating: 4.8, ratingCount: 203,
    shortDescription: 'Maximum cushioning with On’s signature CloudTec pods.',
    description: 'Big, bold cushioning for long runs. Oversized CloudTec pods soften every landing, and the rocker shape rolls you forward into the next step.',
    specs: [{ label: 'Best for', value: 'Long runs, recovery runs' }, { label: 'Drop', value: '6 mm' }, { label: 'Sizes', value: 'EU 36 – 46' }],
  }),
  product({
    id: 'p-015', slug: 'on-performance-long-t', name: 'On Performance Long-T', brandId: 'on', typeId: 'tops',
    price: 95000, stock: 5, rating: 4.6, ratingCount: 61,
    shortDescription: 'Lightweight long-sleeve running top with thumbholes.',
    description: 'A soft, quick-drying long-sleeve for early runs and air-conditioned gyms, with thumbholes and reflective details.',
    specs: [{ label: 'Fabric', value: 'Recycled polyester, quick-dry' }, { label: 'Fit', value: 'Slim' }, { label: 'Sizes', value: 'XS – XL' }],
  }),
  product({
    id: 'p-016', slug: 'on-cloud-6', name: 'On Cloud 6 Training Shoes', brandId: 'on', typeId: 'footwear',
    price: 210000, discountPercent: 8, stock: 9, rating: 4.6, ratingCount: 140,
    shortDescription: 'Light, all-day shoe for the gym and the city.',
    description: 'A light, everyday shoe that slips on easily and stays comfortable from morning workouts to evening plans.',
    specs: [{ label: 'Best for', value: 'Walking, light training, everyday' }, { label: 'Weight', value: 'About 230 g' }, { label: 'Sizes', value: 'EU 36 – 46' }],
  }),

  // ───────────── Technogym ─────────────
  product({
    id: 'p-017', slug: 'technogym-kettlebell-12kg', name: 'Technogym Kettlebell 12kg', brandId: 'technogym', typeId: 'weights',
    price: 180000, stock: 6, rating: 4.8, ratingCount: 47,
    shortDescription: 'Beautifully finished kettlebell with a smooth, wide handle.',
    description: 'Italian-designed kettlebell with a balanced shape for swings, cleans and squats, and a smooth finish that’s kind to your hands.',
    specs: [{ label: 'Weight', value: '12 kg' }, { label: 'Material', value: 'Cast iron, soft-touch coating' }],
  }),
  product({
    id: 'p-018', slug: 'technogym-benchmark-dumbbells', name: 'Technogym Benchmark Dumbbells 10kg (pair)', brandId: 'technogym', typeId: 'weights',
    price: 420000, stock: 2, rating: 4.9, ratingCount: 22,
    shortDescription: 'Premium pair of dumbbells for a home gym that looks the part.',
    description: 'Solid, ergonomic dumbbells with a knurled grip and an elegant finish — made to sit beautifully in a home gym.',
    specs: [{ label: 'Weight', value: '2 × 10 kg' }, { label: 'Grip', value: 'Knurled steel handle' }],
  }),
  product({
    id: 'p-019', slug: 'technogym-resistance-bands', name: 'Technogym Resistance Band Kit', brandId: 'technogym', typeId: 'training',
    price: 75000, stock: 18, rating: 4.5, ratingCount: 66,
    shortDescription: 'Three resistance levels for strength and mobility work.',
    description: 'Light, medium and heavy bands for warm-ups, glute work, mobility and travel workouts, in a compact carry pouch.',
    specs: [{ label: 'In the box', value: '3 bands (light, medium, heavy) + pouch' }, { label: 'Material', value: 'Latex-free elastic' }],
  }),
  product({
    id: 'p-020', slug: 'technogym-exercise-mat', name: 'Technogym Exercise Mat', brandId: 'technogym', typeId: 'yoga',
    price: 95000, stock: 10, rating: 4.6, ratingCount: 39,
    shortDescription: 'Thick, cushioned mat for floor work and stretching.',
    description: 'A thicker, cushioned mat for core work, pilates and stretching, with carry handles so it rolls up neatly.',
    specs: [{ label: 'Thickness', value: '8 mm' }, { label: 'Size', value: '183 × 61 cm' }],
  }),

  // ───────────── Therabody ─────────────
  product({
    id: 'p-021', slug: 'theragun-pro-plus', name: 'Theragun PRO Plus', brandId: 'therabody', typeId: 'recovery',
    price: 850000, stock: 3, rating: 4.8, ratingCount: 88, featured: true,
    shortDescription: 'Professional-grade percussive massage gun with heat.',
    description: 'Therabody’s most advanced massage gun, with an adjustable arm, quiet motor and heated attachment for deep post-workout recovery.',
    specs: [{ label: 'Speeds', value: '5 (1,750 – 2,400 per minute)' }, { label: 'Battery', value: 'About 150 minutes' }, { label: 'Attachments', value: '6, including heat' }, { label: 'Warranty', value: '12 months' }],
  }),
  product({
    id: 'p-022', slug: 'theragun-mini', name: 'Theragun Mini', brandId: 'therabody', typeId: 'recovery',
    price: 280000, discountPercent: 10, stock: 11, rating: 4.7, ratingCount: 302,
    shortDescription: 'Pocket-size massage gun for recovery on the go.',
    description: 'Compact and quiet, with three speeds — small enough for your gym bag, strong enough for tight calves and shoulders.',
    specs: [{ label: 'Speeds', value: '3' }, { label: 'Battery', value: 'About 150 minutes' }, { label: 'Weight', value: '0.45 kg' }, { label: 'Warranty', value: '12 months' }],
  }),
  product({
    id: 'p-023', slug: 'therabody-waveroller', name: 'Therabody WaveRoller', brandId: 'therabody', typeId: 'recovery',
    price: 165000, stock: 0, rating: 4.5, ratingCount: 54,
    shortDescription: 'Vibrating foam roller with a wave-textured surface.',
    description: 'A foam roller with five vibration settings and a wave-shaped surface to loosen up legs, back and glutes after training.',
    specs: [{ label: 'Vibration settings', value: '5' }, { label: 'Battery', value: 'About 3 hours' }, { label: 'Length', value: '30 cm' }],
  }),

  // ───────────── Momentous ─────────────
  product({
    id: 'p-024', slug: 'momentous-grass-fed-whey', name: 'Momentous Essential Grass-Fed Whey (24 servings)', brandId: 'momentous', typeId: 'protein',
    price: 98000, stock: 25, rating: 4.7, ratingCount: 196, featured: true,
    shortDescription: 'Clean, grass-fed whey protein. Vanilla.',
    description: 'A simple, high-quality whey protein from grass-fed cows, third-party tested, that mixes smoothly into water or milk.',
    specs: [{ label: 'Servings', value: '24' }, { label: 'Protein per serving', value: 'About 20 g' }, { label: 'Flavour', value: 'Vanilla' }, supplementNote],
  }),
  product({
    id: 'p-025', slug: 'momentous-creatine', name: 'Momentous Creatine Monohydrate (90 servings)', brandId: 'momentous', typeId: 'performance',
    price: 52000, discountPercent: 10, stock: 30, rating: 4.8, ratingCount: 241,
    shortDescription: 'Unflavoured creatine monohydrate, 5 g a day.',
    description: 'Pure creatine monohydrate with no flavour, so it disappears into water, coffee or a shake. Third-party tested.',
    specs: [{ label: 'Servings', value: '90' }, { label: 'Serving size', value: '5 g' }, { label: 'Flavour', value: 'Unflavoured' }, supplementNote],
  }),
  product({
    id: 'p-026', slug: 'momentous-sleep', name: 'Momentous Sleep', brandId: 'momentous', typeId: 'wellness',
    price: 68000, stock: 50, rating: 4.4, ratingCount: 112,
    shortDescription: 'Evening blend with magnesium, apigenin and L-theanine.',
    description: 'A caffeine-free evening blend of magnesium, apigenin and L-theanine to take as part of your wind-down routine.',
    specs: [{ label: 'Servings', value: '30' }, { label: 'Form', value: 'Capsules' }, supplementNote],
  }),

  // ───────────── Heiress (our own label) ─────────────
  product({
    id: 'p-027', slug: 'heiress-smart-jump-rope', name: 'Heiress Smart Jump Rope', brandId: 'heiress', typeId: 'training',
    price: 18500, stock: 60, rating: 4.5, ratingCount: 133,
    shortDescription: 'Weighted handles with a built-in jump counter.',
    description: 'Smooth ball-bearing rope with weighted gold-tone handles and a built-in counter for your skips and calories.',
    specs: [{ label: 'Length', value: 'Adjustable, up to 3 m' }, { label: 'Counter', value: 'Skips, time and calories' }],
  }),
  product({
    id: 'p-028', slug: 'heiress-sculpt-seamless-set', name: 'Heiress Sculpt Seamless Set', brandId: 'heiress', typeId: 'leggings',
    price: 85000, discountPercent: 12, stock: 16, rating: 4.7, ratingCount: 158, featured: true,
    shortDescription: 'Matching seamless sports bra and high-waist legging.',
    description: 'Our signature two-piece: a supportive seamless bra and sculpting high-waist leggings with contour detailing, in a soft matte finish.',
    specs: [{ label: 'In the set', value: 'Sports bra + legging' }, { label: 'Fabric', value: 'Seamless knit nylon/elastane' }, { label: 'Sizes', value: 'XS – XL' }],
  }),
  product({
    id: 'p-029', slug: 'heiress-gold-grip-dumbbells', name: 'Heiress Gold Grip Dumbbells 5kg (pair)', brandId: 'heiress', typeId: 'weights',
    price: 65000, stock: 20, rating: 4.6, ratingCount: 87,
    shortDescription: 'Soft-touch hex dumbbells with gold-tone handles.',
    description: 'Non-roll hexagonal dumbbells with a soft-touch coating and gold-tone handles — as good-looking as they are useful.',
    specs: [{ label: 'Weight', value: '2 × 5 kg' }, { label: 'Shape', value: 'Hexagonal, won’t roll' }],
  }),
  product({
    id: 'p-030', slug: 'heiress-ankle-weights', name: 'Heiress Ankle Weights 1kg (pair)', brandId: 'heiress', typeId: 'training',
    price: 28000, stock: 25, rating: 4.4, ratingCount: 76,
    shortDescription: 'Adjustable ankle and wrist weights for pilates and toning.',
    description: 'Soft, adjustable weights that fasten around ankles or wrists to add a little extra to pilates, walks and glute work.',
    specs: [{ label: 'Weight', value: '2 × 1 kg' }, { label: 'Fastening', value: 'Adjustable strap' }],
  }),
  product({
    id: 'p-031', slug: 'heiress-insulated-bottle', name: 'Heiress Insulated Bottle 1L', brandId: 'heiress', typeId: 'bags',
    price: 22000, stock: 40, rating: 4.7, ratingCount: 201,
    shortDescription: 'Keeps water ice-cold for 24 hours.',
    description: 'A double-walled steel bottle that keeps drinks cold all day in the Lagos heat, with a leak-proof lid and carry loop.',
    specs: [{ label: 'Capacity', value: '1 litre' }, { label: 'Keeps cold', value: 'Up to 24 hours' }, { label: 'Material', value: 'Stainless steel, BPA-free lid' }],
  }),
  product({
    id: 'p-032', slug: 'heiress-plant-protein', name: 'Heiress Plant Protein (30 servings)', brandId: 'heiress', typeId: 'protein',
    price: 45000, stock: 22, rating: 4.4, ratingCount: 94,
    shortDescription: 'Pea and rice protein blend. Chocolate.',
    description: 'A smooth plant-based protein blend of pea and brown rice, dairy-free, in a rich chocolate flavour.',
    specs: [{ label: 'Servings', value: '30' }, { label: 'Protein per serving', value: 'About 20 g' }, { label: 'Flavour', value: 'Chocolate' }, supplementNote],
  }),
  product({
    id: 'p-033', slug: 'heiress-daily-multivitamin', name: 'Heiress Daily Multivitamin (60 tablets)', brandId: 'heiress', typeId: 'wellness',
    price: 19500, discountPercent: 10, stock: 35, rating: 4.5, ratingCount: 118,
    shortDescription: 'Everyday vitamins and minerals for active women.',
    description: 'A once-a-day multivitamin with vitamins and minerals including iron, vitamin D and B vitamins, to support a balanced, active lifestyle.',
    specs: [{ label: 'Tablets', value: '60 (two-month supply)' }, { label: 'Dose', value: '1 tablet a day with food' }, supplementNote],
  }),
  product({
    id: 'p-034', slug: 'heiress-electrolyte-sticks', name: 'Heiress Electrolyte Sticks (20 pack)', brandId: 'heiress', typeId: 'performance',
    price: 15000, stock: 45, rating: 4.6, ratingCount: 143,
    shortDescription: 'Sugar-free hydration sticks. Citrus.',
    description: 'Sugar-free electrolyte sticks with sodium, potassium and magnesium to mix into water before or after a sweaty session.',
    specs: [{ label: 'In the pack', value: '20 sticks' }, { label: 'Flavour', value: 'Citrus' }, supplementNote],
  }),
]
