import crypto from 'crypto'

export class CommerceMapper {
  static generateChecksum(data: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
  }

  // WooCommerce REST v3 date-time fields: prefer the _gmt variant (UTC, no offset suffix)
  private static parseDate(gmt?: string, local?: string): Date {
    if (gmt) return new Date(`${gmt}Z`)
    if (local) return new Date(local)
    return new Date()
  }

  static toCanonicalProduct(raw: any, orgId: string) {
    return {
      organizationId: orgId,
      name: raw.name || 'Untitled',
      sku: raw.sku || String(raw.id),
      house: raw.categories?.[0]?.name || 'Uncategorized',
      color: 'Unknown',
      category: raw.categories?.[0]?.name || 'uncategorized',
      price: parseFloat(raw.price || '0'),
      cost: 0,
      stock: raw.stock_quantity ?? 0,
      status: raw.status === 'publish' ? 'ACTIVE' : 'DRAFT',
      material: 'Unknown',
      description: (raw.short_description || raw.description || '').replace(/<[^>]*>?/gm, '').substring(0, 200),
      imageUrl: raw.images?.[0]?.src || null,
    }
  }

  static toCanonicalOrder(raw: any, orgId: string) {
    const customerName = `${raw.billing?.first_name || ''} ${raw.billing?.last_name || ''}`.trim()

    return {
      organizationId: orgId,
      orderNumber: String(raw.number || raw.id),
      customerName: customerName || 'Unknown',
      customerEmail: raw.billing?.email || '',
      customerCity: raw.shipping?.city || raw.billing?.city || '',
      channel: raw.created_via || 'WooCommerce',
      itemsCount: raw.line_items?.length || 0,
      total: parseFloat(raw.total || '0'),
      status: raw.status === 'cancelled' || raw.status === 'failed' || raw.status === 'trash' ? 'CANCELLED'
            : raw.status === 'refunded' ? 'RETURNED'
            : raw.status === 'completed' ? 'SHIPPED'
            : raw.status === 'processing' || raw.status === 'on-hold' ? 'PROCESSING'
            : 'NEW',
      paymentStatus: raw.status === 'refunded' ? 'REFUNDED'
                   : raw.date_paid || raw.date_paid_gmt ? 'PAID'
                   : 'PENDING',
      createdAt: CommerceMapper.parseDate(raw.date_created_gmt, raw.date_created),
    }
  }

  static toCanonicalCustomer(raw: any, orgId: string) {
    return {
      organizationId: orgId,
      name: `${raw.first_name || ''} ${raw.last_name || ''}`.trim() || 'Unknown',
      email: raw.email || `woocommerce-${raw.id}@unknown.invalid`,
      phone: raw.billing?.phone || '',
      city: raw.billing?.city || 'Unknown',
      tier: 'NEW',
      // ponytail: wc/v3 customers carry no lifetime totals — needs a /reports or
      // per-customer orders query to fill; left at 0 until someone needs it
      totalOrders: 0,
      totalSpent: 0,
      joinedAt: CommerceMapper.parseDate(raw.date_created_gmt, raw.date_created),
      lastActive: CommerceMapper.parseDate(raw.date_modified_gmt, raw.date_modified),
    }
  }
}
