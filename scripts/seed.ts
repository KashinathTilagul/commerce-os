// EKVAAR OS — Seed Script
// Populates database with realistic brand-aligned data

import { db } from '../src/lib/db'

const HOUSES = ['Solids', 'Layers', 'Street', 'Luxe', 'Origins']
const COLORS = ['Noor Black', 'Rui White', 'Agni Red', 'Neel Blue', 'Arav Green', 'Gulabi Pink']

const PRODUCT_NAMES: Record<string, string[]> = {
  Solids: ['Heavyweight Tee', 'Structured Crewneck', 'Pure Cotton Tank', 'Boxy Long Sleeve', 'Calm Henley'],
  Layers: ['Premium Fleece Hoodie', 'Architectural Zip Jacket', 'Daily Drape Cardigan', 'Field Bomber', 'Studio Overshirt'],
  Street: ['Originals Graphic Tee', 'Indian Modernism Hoodie', 'Cultural Syntax Crew', 'Permanence Tee', 'House Sigil Tee'],
  Luxe: ['Limited Drape Coat', 'All-Time Silk Tee', 'Founder Cut Jacket', 'Archive Pant', 'Signature Knit'],
  Origins: ['Cotton Tote', 'Architectural Cap', 'Permanence Journal', 'Cultural Object No.1', 'Restoration Kit'],
}

const MATERIALS: Record<string, string> = {
  Solids: 'Heavyweight cotton 240 GSM',
  Layers: 'Premium fleece 380 GSM',
  Street: 'Heavyweight cotton 260 GSM',
  Luxe: 'Structured drape wool blend',
  Origins: 'Reinforced cotton canvas',
}

const CATEGORIES: Record<string, string> = {
  Solids: 'tee',
  Layers: 'hoodie',
  Street: 'graphic-tee',
  Luxe: 'jacket',
  Origins: 'accessory',
}

const PRICE_RANGES: Record<string, [number, number]> = {
  Solids: [1499, 2499],
  Layers: [3499, 5999],
  Street: [1999, 3499],
  Luxe: [8999, 24999],
  Origins: [699, 2499],
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function hueFromColor(color: string): number {
  const map: Record<string, number> = {
    'Noor Black': 0,
    'Rui White': 40,
    'Agni Red': 0,
    'Neel Blue': 215,
    'Arav Green': 145,
    'Gulabi Pink': 330,
  }
  return map[color] ?? 0
}

async function seedProducts() {
  console.log('→ Seeding products...')
  const products = []
  for (const house of HOUSES) {
    const names = PRODUCT_NAMES[house]
    for (const name of names) {
      const color = pick(COLORS)
      const [minP, maxP] = PRICE_RANGES[house]
      const price = rand(minP, maxP)
      const cost = Math.round(price * 0.35)
      const stock = rand(0, 280)
      const sku = `EKV-${house.slice(0, 3).toUpperCase()}-${rand(1000, 9999)}`
      const p = await db.product.create({
        data: {
          name,
          sku,
          house,
          color,
          category: CATEGORIES[house],
          price,
          cost,
          stock,
          reorderAt: 20,
          status: stock < 20 ? 'RESTOCKING' : pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'DRAFT']),
          material: MATERIALS[house],
          description: `${name} in ${color}. Built for permanence. ${MATERIALS[house]}. Designed once, worn forever.`,
          imageHue: hueFromColor(color),
        },
      })
      products.push(p)
    }
  }
  return products
}

async function seedCustomers() {
  console.log('→ Seeding customers...')
  const firstNames = ['Aarav', 'Vivaan', 'Ananya', 'Diya', 'Aditya', 'Ishaan', 'Saanvi', 'Kabir', 'Myra', 'Reyansh', 'Aanya', 'Vihaan', 'Anika', 'Arjun', 'Navya', 'Aryan', 'Riya', 'Dhruv', 'Sara', 'Kiaan', 'Ira', 'Veer', 'Tara', 'Rudra', 'Mira']
  const lastNames = ['Sharma', 'Verma', 'Iyer', 'Kapoor', 'Mehta', 'Reddy', 'Nair', 'Chopra', 'Bose', 'Khanna', 'Menon', 'Ghosh', 'Rao', 'Singh', 'Joshi', 'Malhotra', 'Banerjee', 'Pillai', 'Das', 'Saxena']
  const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Goa']
  const tiers = ['ORIGINAL', 'ORIGINAL', 'ORIGINAL', 'HOUSE', 'HOUSE', 'ARCHIVE', 'FOUNDER_CIRCLE']
  const customers = []
  for (let i = 0; i < 60; i++) {
    const name = `${pick(firstNames)} ${pick(lastNames)}`
    const email = `${name.toLowerCase().replace(' ', '.')}.${i}@originals.ekvaar`
    const c = await db.customer.create({
      data: {
        name,
        email,
        phone: `+91 ${rand(70000, 99999)} ${rand(10000, 99999)}`,
        city: pick(cities),
        tier: pick(tiers),
        totalOrders: rand(1, 18),
        totalSpent: rand(1500, 180000),
        restorationCount: rand(0, 4),
        lastActive: new Date(Date.now() - rand(0, 90) * 86400000),
      },
    })
    customers.push(c)
  }
  return customers
}

async function seedOrders(products: any[], customers: any[]) {
  console.log('→ Seeding orders...')
  const statuses = ['NEW', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'RETURNED', 'CANCELLED']
  const channels = ['D2C', 'D2C', 'D2C', 'RETAIL', 'WHOLESALE', 'POPUP']
  const now = Date.now()
  for (let i = 0; i < 120; i++) {
    const customer = pick(customers)
    const itemsCount = rand(1, 4)
    const items = []
    let total = 0
    for (let j = 0; j < itemsCount; j++) {
      const product = pick(products)
      const qty = rand(1, 2)
      const price = product.price
      total += price * qty
      items.push({ product, qty, price })
    }
    const order = await db.order.create({
      data: {
        orderNumber: `EKV-${String(10000 + i).padStart(5, '0')}`,
        customerName: customer.name,
        customerEmail: customer.email,
        customerCity: customer.city,
        channel: pick(channels),
        itemsCount,
        total,
        status: pick(statuses),
        paymentStatus: pick(['PAID', 'PAID', 'PAID', 'PENDING', 'REFUNDED']),
        createdAt: new Date(now - rand(0, 120) * 86400000),
      },
    })
    for (const item of items) {
      await db.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.product.id,
          quantity: item.qty,
          price: item.price,
        },
      })
    }
  }
}

async function seedTransactions() {
  console.log('→ Seeding transactions...')
  const now = Date.now()
  for (let i = 0; i < 80; i++) {
    const cat = pick(['PRODUCT_SALES', 'PRODUCT_SALES', 'PRODUCT_SALES', 'WHOLESALE', 'WHOLESALE', 'RETAIL'])
    const amount = rand(1500, 85000)
    await db.transaction.create({
      data: {
        type: 'INCOME',
        category: cat,
        amount,
        description: `${cat.toLowerCase().replace('_', ' ')} receipt #${rand(1000, 9999)}`,
        reference: `RCP-${rand(10000, 99999)}`,
        date: new Date(now - rand(0, 120) * 86400000),
      },
    })
  }
  const expenseCats = [
    { cat: 'MATERIALS', min: 25000, max: 320000 },
    { cat: 'LABOR', min: 18000, max: 220000 },
    { cat: 'LOGISTICS', min: 8000, max: 95000 },
    { cat: 'MARKETING', min: 12000, max: 180000 },
    { cat: 'OPS', min: 15000, max: 140000 },
    { cat: 'AI_INFRA', min: 22000, max: 280000 },
    { cat: 'RESTORATION', min: 3000, max: 45000 },
    { cat: 'R&D', min: 18000, max: 220000 },
  ]
  for (let i = 0; i < 70; i++) {
    const e = pick(expenseCats)
    await db.transaction.create({
      data: {
        type: 'EXPENSE',
        category: e.cat,
        amount: rand(e.min, e.max),
        description: `${e.cat.toLowerCase().replace('_', ' ')} payment to vendor #${rand(100, 999)}`,
        reference: `PAY-${rand(10000, 99999)}`,
        date: new Date(now - rand(0, 120) * 86400000),
      },
    })
  }
}

async function seedCampaigns() {
  console.log('→ Seeding campaigns...')
  const pillars = ['philosophy', 'product', 'culture', 'process', 'founder', 'community']
  const channels = ['INSTAGRAM', 'JOURNAL', 'EMAIL', 'HOUSE_ACCESS', 'ALL']
  const titles = [
    'We Started With a Pause',
    'Heavyweight Permanence',
    'India Is Not Costume',
    'The Restoration Series',
    'House of Originals Launch',
    'Founder Note No.7',
    'Cultural Syntax',
    'Built Against Disposability',
    'All-Time, Not Fast Time',
    'Quiet Architecture',
    'The Six Colors',
    'Worn Forever',
  ]
  for (const title of titles) {
    const start = new Date(Date.now() - rand(0, 90) * 86400000)
    const end = new Date(start.getTime() + rand(7, 45) * 86400000)
    await db.campaign.create({
      data: {
        title,
        pillar: pick(pillars),
        status: pick(['LIVE', 'LIVE', 'DRAFT', 'SCHEDULED', 'ARCHIVED']),
        channel: pick(channels),
        startDate: start,
        endDate: end,
        budget: rand(50000, 800000),
        spend: rand(20000, 750000),
        impressions: rand(15000, 2400000),
        engagement: Math.round(Math.random() * 12 * 10) / 10,
      },
    })
  }
}

async function seedFounderNotes() {
  console.log('→ Seeding founder notes...')
  const notes = [
    { title: 'We Started With a Pause', excerpt: 'EKVAAR rejects excess. One time, chosen with intent. All time, relevant across time.', body: 'We did not start with a plan. We started with a pause. The pause was the point. Most fashion today is built against the wearer — designed to be replaced. We are building for the opposite. EKVAAR is a permanent Indian cultural fashion house. Designed once. Worn forever.' },
    { title: 'Permanence Over Speed', excerpt: 'The goal is not sustainability marketing. The goal is structural permanence.', body: 'Every major decision at EKVAAR must strengthen permanence, originality, emotional durability, visual discipline, and cultural intelligence. Speed is not our metric. Relevance across years is our metric.' },
    { title: 'Culture Is Not Costume', excerpt: 'EKVAAR is not ethnic fashion. It is Indian cultural modernism.', body: 'India interpreted through permanence, minimalism, structure, and emotional symbolism. Culture should never become costume. We design from the inside of culture outward — not the surface inward.' },
    { title: 'The Six Colors', excerpt: 'Noor Black, Rui White, Agni Red, Neel Blue, Arav Green, Gulabi Pink. The EKVAAR palette is permanent.', body: 'No uncontrolled palettes. All products integrate into the six-color system. Cross-collection compatibility is mandatory. A garment from season one must sit beside a garment from season ten — without friction.' },
    { title: 'House of Originals', excerpt: 'One House. Five structured categories. Categories must never blur.', body: 'Solids for plain essentials. Layers for functional dailywear. Street for Indian graphic expression. Luxe for elevated limited pieces. Origins for accessories and objects. The boundaries are the discipline.' },
  ]
  for (const n of notes) {
    await db.founderNote.create({
      data: {
        title: n.title,
        excerpt: n.excerpt,
        body: n.body,
        status: pick(['PUBLISHED', 'PUBLISHED', 'DRAFT']),
        publishedAt: new Date(Date.now() - rand(0, 60) * 86400000),
      },
    })
  }
}

async function seedRestorations(products: any[]) {
  console.log('→ Seeding restorations...')
  const reasons = ['WEAR', 'REPAIR', 'RESHAPE', 'RECOLOR']
  const statuses = ['REQUESTED', 'IN_REPAIR', 'COMPLETED', 'COMPLETED', 'DECLINED']
  for (let i = 0; i < 20; i++) {
    const p = pick(products)
    const status = pick(statuses)
    await db.restoration.create({
      data: {
        customerName: `${pick(['Aarav', 'Ananya', 'Diya', 'Kabir', 'Myra'])} ${pick(['Sharma', 'Kapoor', 'Bose', 'Reddy'])}`,
        productSku: p.sku,
        productName: p.name,
        reason: pick(reasons),
        status,
        requestedAt: new Date(Date.now() - rand(0, 60) * 86400000),
        completedAt: status === 'COMPLETED' ? new Date(Date.now() - rand(0, 30) * 86400000) : null,
      },
    })
  }
}

async function seedSuppliers() {
  console.log('→ Seeding suppliers...')
  const suppliers = [
    { name: 'Tirupur Cotton Co-op', material: 'Heavyweight cotton', city: 'Tirupur', leadTime: 21, rating: 4.8 },
    { name: 'Ludhiana Fleece Works', material: 'Premium fleece', city: 'Ludhiana', leadTime: 28, rating: 4.6 },
    { name: 'Bhagalpur Drape House', material: 'Drape fabric', city: 'Bhagalpur', leadTime: 35, rating: 4.5 },
    { name: 'Surat Thread Mills', material: 'Reinforced thread', city: 'Surat', leadTime: 14, rating: 4.9 },
    { name: 'Jaipur Natural Dye Lab', material: 'Plant-based dye', city: 'Jaipur', leadTime: 30, rating: 4.7 },
    { name: 'Pune Packaging Studio', material: 'Premium packaging', city: 'Pune', leadTime: 12, rating: 4.8 },
    { name: 'Kanchipuram Weave Co.', material: 'Structured silk blend', city: 'Kanchipuram', leadTime: 45, rating: 4.6 },
  ]
  for (const s of suppliers) {
    await db.supplier.create({
      data: {
        name: s.name,
        material: s.material,
        city: s.city,
        leadTime: s.leadTime,
        rating: s.rating,
        status: pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'PAUSED']),
        lastOrder: new Date(Date.now() - rand(5, 80) * 86400000),
      },
    })
  }
}

async function seedAISystems() {
  console.log('→ Seeding AI systems...')
  const systems = [
    { name: 'Brand Guardian AI', pillar: 'brand', description: 'Enforces brand book compliance across all assets, products, content, and packaging. Flags palette violations, voice drift, and forbidden aesthetics.' },
    { name: 'Content AI', pillar: 'content', description: 'Generates restrained, intelligent brand content across philosophy, product, culture, process, founder, and community pillars.' },
    { name: 'Creative AI', pillar: 'creative', description: 'Proposes original product concepts within the five-house system. Rejects copy-led and trend-led proposals by default.' },
    { name: 'Commerce AI', pillar: 'commerce', description: 'Manages demand forecasting, inventory discipline, and controlled drops. Optimizes for permanence, not virality.' },
    { name: 'Founder AI', pillar: 'founder', description: 'Maintains founder voice and decision principles across notes, campaigns, and public communications.' },
    { name: 'Product Intelligence AI', pillar: 'product', description: 'Tracks emotional durability signals — repeat wear, retention, restoration demand — across all SKUs.' },
    { name: 'Operations AI', pillar: 'operations', description: 'Coordinates suppliers, manufacturing, logistics, and restoration programs toward structural permanence.' },
  ]
  for (const s of systems) {
    await db.aISystem.create({
      data: {
        name: s.name,
        pillar: s.pillar,
        description: s.description,
        status: pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'IDLE', 'TRAINING', 'ALERT']),
        health: rand(78, 100),
        tasksToday: rand(12, 480),
        tasksTotal: rand(12000, 480000),
        accuracy: Math.round((rand(920, 999) / 10) * 10) / 10,
        lastRun: new Date(Date.now() - rand(0, 3600) * 1000),
      },
    })
  }
}

async function seedBrandChecks() {
  console.log('→ Seeding brand checks...')
  const modules = ['PRODUCT', 'CONTENT', 'CAMPAIGN', 'PACKAGING', 'DIGITAL']
  const assets = ['Q3 Lookbook', 'Founder Note 07', 'Agni Red Tee Campaign', 'Premium Packaging V2', 'House Access Page', 'Restoration Kit Visual', 'Luxe Drop 04', 'Origins Catalog', 'Mobile Site Hero', 'Wholesale Deck']
  for (let i = 0; i < 25; i++) {
    const violations = rand(0, 4)
    await db.brandCheck.create({
      data: {
        module: pick(modules),
        asset: pick(assets),
        status: violations === 0 ? 'PASS' : violations <= 2 ? 'WARN' : 'FAIL',
        violations,
        notes: violations === 0 ? 'Within brand system.' : pick(['Palette drift detected.', 'Voice too loud.', 'Excessive gradient.', 'Meme aesthetic flagged.']),
        checkedAt: new Date(Date.now() - rand(0, 14) * 86400000),
      },
    })
  }
}

async function main() {
  console.log('🌱 Seeding EKVAAR OS database...')
  await db.brandCheck.deleteMany()
  await db.aISystem.deleteMany()
  await db.supplier.deleteMany()
  await db.restoration.deleteMany()
  await db.founderNote.deleteMany()
  await db.campaign.deleteMany()
  await db.transaction.deleteMany()
  await db.orderItem.deleteMany()
  await db.order.deleteMany()
  await db.customer.deleteMany()
  await db.product.deleteMany()

  const products = await seedProducts()
  const customers = await seedCustomers()
  await seedOrders(products, customers)
  await seedTransactions()
  await seedCampaigns()
  await seedFounderNotes()
  await seedRestorations(products)
  await seedSuppliers()
  await seedAISystems()
  await seedBrandChecks()

  console.log('✅ EKVAAR OS seeded successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
