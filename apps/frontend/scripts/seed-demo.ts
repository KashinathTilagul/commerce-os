// Demo seed for grant reviewers.
// 1. Sign up the demo founder on /signup first (creates the organisation,
//    context, capabilities, workspace and integration catalog).
// 2. Run:  DEMO_FOUNDER_EMAIL=... DEMO_REVIEWER_EMAIL=... DEMO_REVIEWER_PASSWORD=... npx tsx scripts/seed-demo.ts
// Adds clearly fictional sample data to that organisation (replacing earlier
// demo rows) and creates/updates a read-only VIEWER reviewer account.
import { hash } from 'bcryptjs'
import { db } from '../src/lib/db'

const DEMO_TAG = '[DEMO]'

function need(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

const PRODUCTS = [
  ['Everyday Cotton Tee', 'tee', 799, 320, 64],
  ['Relaxed Linen Shirt', 'shirt', 1899, 780, 22],
  ['Fleece Hoodie', 'hoodie', 2499, 1050, 9],
  ['Denim Jacket', 'jacket', 3999, 1800, 14],
  ['Canvas Tote Bag', 'accessory', 499, 160, 120],
  ['Wool Beanie', 'accessory', 699, 240, 6],
] as const

const CUSTOMERS = [
  ['Asha Demo', 'Bengaluru'], ['Rohan Sample', 'Mumbai'], ['Meera Example', 'Pune'],
  ['Kabir Test', 'Delhi'], ['Nila Placeholder', 'Chennai'], ['Dev Fictional', 'Hyderabad'],
] as const

async function main() {
  const founderEmail = need('DEMO_FOUNDER_EMAIL').toLowerCase()
  const reviewerEmail = need('DEMO_REVIEWER_EMAIL').toLowerCase()
  const reviewerPassword = need('DEMO_REVIEWER_PASSWORD')
  if (reviewerPassword.length < 12) throw new Error('DEMO_REVIEWER_PASSWORD must be at least 12 characters')

  const founder = await db.user.findUnique({ where: { email: founderEmail } })
  if (!founder?.organizationId) throw new Error(`Sign up ${founderEmail} on /signup first`)
  const organizationId = founder.organizationId

  // Replace earlier demo rows only (identified by the [DEMO] tag / demo SKUs / example.com emails).
  const oldOrders = await db.order.findMany({ where: { organizationId, orderNumber: { startsWith: 'DEMO-' } }, select: { id: true } })
  await db.orderItem.deleteMany({ where: { orderId: { in: oldOrders.map((o) => o.id) } } })
  await db.order.deleteMany({ where: { id: { in: oldOrders.map((o) => o.id) } } })
  await db.product.deleteMany({ where: { organizationId, sku: { startsWith: 'DEMO-' } } })
  await db.customer.deleteMany({ where: { organizationId, email: { endsWith: '@example.com' } } })
  await db.transaction.deleteMany({ where: { organizationId, description: { startsWith: DEMO_TAG } } })

  const products = []
  for (const [i, [name, category, price, cost, stock]] of PRODUCTS.entries()) {
    products.push(await db.product.create({ data: {
      organizationId, name, sku: `DEMO-${String(i + 1).padStart(3, '0')}`, house: 'Demo Collection',
      color: 'Assorted', category, price, cost, stock, reorderAt: 10,
      status: stock < 10 ? 'RESTOCKING' : 'ACTIVE', material: 'Sample material',
      description: `${DEMO_TAG} Fictional product for demonstration.`, imageHue: (i * 57) % 360,
    } }))
  }

  const customers = []
  for (const [i, [name, city]] of CUSTOMERS.entries()) {
    customers.push(await db.customer.create({ data: {
      organizationId, name, city, email: `${name.split(' ')[0].toLowerCase()}@example.com`,
      phone: `+91 90000 0000${i}`, tier: i < 2 ? 'VIP' : 'REGULAR',
    } }))
  }

  const statuses = ['NEW', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'DELIVERED', 'DELIVERED']
  const channels = ['D2C', 'D2C', 'RETAIL', 'WHOLESALE']
  const day = 86_400_000
  for (let n = 0; n < 24; n++) {
    const customer = customers[n % customers.length]
    const lines = [products[n % products.length], products[(n * 3 + 1) % products.length]]
    const qty = [1 + (n % 3), 1]
    const total = lines.reduce((sum, p, k) => sum + p.price * qty[k], 0)
    const createdAt = new Date(Date.now() - (n * 2 + 1) * day)
    const order = await db.order.create({ data: {
      organizationId, orderNumber: `DEMO-${1001 + n}`, customerName: customer.name,
      customerEmail: customer.email, customerCity: customer.city, channel: channels[n % channels.length],
      itemsCount: qty[0] + qty[1], total, status: statuses[n % statuses.length], paymentStatus: 'PAID', createdAt,
    } })
    for (const [k, p] of lines.entries()) {
      await db.orderItem.create({ data: { orderId: order.id, productId: p.id, quantity: qty[k], price: p.price } })
    }
    await db.customer.update({ where: { id: customer.id }, data: { totalOrders: { increment: 1 }, totalSpent: { increment: total }, lastActive: createdAt } })
    await db.transaction.create({ data: {
      organizationId, type: 'INCOME', category: 'PRODUCT_SALES', amount: total,
      description: `${DEMO_TAG} Sale ${order.orderNumber}`, reference: order.orderNumber, date: createdAt,
    } })
  }
  const expenses = [['MATERIALS', 18000], ['LOGISTICS', 6500], ['MARKETING', 9000], ['AI_INFRA', 1200]] as const
  for (const [i, [category, amount]] of expenses.entries()) {
    await db.transaction.create({ data: {
      organizationId, type: 'EXPENSE', category, amount,
      description: `${DEMO_TAG} Sample ${category.toLowerCase()} expense`, date: new Date(Date.now() - (i * 7 + 3) * day),
    } })
  }

  const password = await hash(reviewerPassword, 12)
  await db.user.upsert({
    where: { email: reviewerEmail },
    update: { password, orgRole: 'VIEWER', role: 'USER', organizationId },
    create: { email: reviewerEmail, password, name: 'Grant Reviewer', orgRole: 'VIEWER', role: 'USER', organizationId },
  })

  console.log(`Seeded ${products.length} products, ${customers.length} customers, 24 orders; reviewer ${reviewerEmail} is VIEWER.`)
}

main().then(() => process.exit(0)).catch((error) => { console.error(error.message || error); process.exit(1) })
