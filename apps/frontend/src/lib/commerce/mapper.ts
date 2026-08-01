import crypto from 'crypto'

export class CommerceMapper {
  static generateChecksum(data: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
  }

  static toCanonicalProduct(raw: any, orgId: string) {
    return {
      organizationId: orgId,
      name: raw.title || 'Untitled',
      sku: raw.variants?.[0]?.sku || String(raw.id),
      house: raw.product_type || 'Uncategorized',
      color: 'Unknown',
      category: raw.product_type || 'uncategorized',
      price: parseFloat(raw.variants?.[0]?.price || '0'),
      cost: 0,
      stock: raw.variants?.reduce((sum: number, v: any) => sum + (v.inventory_quantity || 0), 0) || 0,
      status: raw.status === 'active' ? 'ACTIVE' : 'DRAFT',
      material: 'Unknown',
      description: (raw.body_html || '').replace(/<[^>]*>?/gm, '').substring(0, 200),
    }
  }

  static toCanonicalOrder(raw: any, orgId: string) {
    const customerName = raw.customer
      ? `${raw.customer.first_name || ''} ${raw.customer.last_name || ''}`.trim()
      : 'Unknown'
      
    return {
      organizationId: orgId,
      orderNumber: String(raw.name || raw.id),
      customerName: customerName || 'Unknown',
      customerEmail: raw.customer?.email || '',
      customerCity: raw.shipping_address?.city || '',
      channel: raw.source_name || 'Shopify',
      itemsCount: raw.line_items?.length || 0,
      total: parseFloat(raw.total_price || '0'),
      status: raw.fulfillment_status === 'fulfilled' ? 'SHIPPED' 
            : raw.fulfillment_status === 'partial' ? 'PROCESSING' 
            : 'NEW',
      paymentStatus: raw.financial_status === 'paid' ? 'PAID' 
                   : raw.financial_status === 'refunded' ? 'REFUNDED' 
                   : 'PENDING',
    }
  }

  static toCanonicalCustomer(raw: any, orgId: string) {
    return {
      organizationId: orgId,
      name: `${raw.first_name || ''} ${raw.last_name || ''}`.trim() || 'Unknown',
      email: raw.email || '',
      phone: raw.phone || '0000000000',
      city: raw.default_address?.city || 'Unknown',
      tier: 'NEW',
      totalOrders: raw.orders_count || 0,
      totalSpent: parseFloat(raw.total_spent || '0'),
    }
  }
}
