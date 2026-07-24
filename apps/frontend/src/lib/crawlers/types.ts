export interface CompetitorSelectors {
  productCard: string
  name: string
  price: string
  mrp: string
  discount: string
  image: string
  brand: string
  category: string
  inStock: string
  sizes: string
  colors: string
  rating: string
  reviewCount: string
  url: string
}

export interface ScrapedProduct {
  name: string
  url: string
  price: number
  mrp: number
  discount: number
  imageUrl?: string
  brand?: string
  category?: string
  inStock: boolean
  sizes: string[]
  colors: string[]
  rating: number
  reviewCount: number
  competitorSku?: string
}

export interface ScrapeResult {
  success: boolean
  products: ScrapedProduct[]
  errors: string[]
  stats: {
    pagesVisited: number
    productsFound: number
    productsUpdated: number
    errors: number
    durationMs: number
  }
}

export const COMPETITOR_CONFIGS: Record<string, {
  name: string
  domain: string
  baseUrl: string
  selectors: CompetitorSelectors
  color: string
  logo: string
}> = {
  myntra: {
    name: 'Myntra',
    domain: 'myntra.com',
    baseUrl: 'https://www.myntra.com',
    color: '#FF3E6C',
    logo: 'https://assets.myntra.com/assets/myntra-275.png',
    selectors: {
      productCard: '.product-base',
      name: '.product-product',
      price: '.product-discountedPrice',
      mrp: '.product-strike',
      discount: '.product-discountPercentage',
      image: '.product-image img',
      brand: '.product-brand',
      category: '.product-categories',
      inStock: '.size-buttons-size-not-present',
      sizes: '.size-buttons-button',
      colors: '.color-options',
      rating: '.product-ratingsAverage',
      reviewCount: '.product-ratingsCount',
      url: 'a',
    },
  },
  ajio: {
    name: 'Ajio',
    domain: 'ajio.com',
    baseUrl: 'https://www.ajio.com',
    color: '#D4A017',
    logo: 'https://assets.ajio.com/assets/ajio-logo.png',
    selectors: {
      productCard: '.item',
      name: '.name',
      price: '.price',
      mrp: '.orig-price',
      discount: '.offer',
      image: '.image img',
      brand: '.brand',
      category: '.category',
      inStock: '.out-of-stock',
      sizes: '.size-variants',
      colors: '.color-variants',
      rating: '.rating',
      reviewCount: '.ratings-count',
      url: 'a',
    },
  },
  amazon: {
    name: 'Amazon India',
    domain: 'amazon.in',
    baseUrl: 'https://www.amazon.in',
    color: '#FF9900',
    logo: 'https://www.amazon.in/favicon.ico',
    selectors: {
      productCard: '.s-result-item',
      name: 'h2 a span',
      price: '.a-price .a-offscreen',
      mrp: '.a-text-price .a-offscreen',
      discount: '.a-text-price',
      image: '.s-image',
      brand: '.a-color-secondary',
      category: '.a-color-secondary',
      inStock: '.a-color-price',
      sizes: '.a-dropdown-prompt',
      colors: '.imageSwatches',
      rating: '.a-icon-star-small .a-icon-alt',
      reviewCount: '.a-size-small .a-link-normal',
      url: 'h2 a',
    },
  },
  flipkart: {
    name: 'Flipkart',
    domain: 'flipkart.com',
    baseUrl: 'https://www.flipkart.com',
    color: '#2874F0',
    logo: 'https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zh/img/favicon.png',
    selectors: {
      productCard: '._1AtVbE',
      name: '._4rR01T',
      price: '._30jeq3',
      mrp: '._3I9_wc',
      discount: '._3Ay6Sb',
      image: '._396cs4',
      brand: '._2WkVRV',
      category: '._1BwK6g',
      inStock: '._2KK9hQ',
      sizes: '._1l9b9y',
      colors: '._58ab_P',
      rating: '._3LWZlK',
      reviewCount: '._2_R_DZ',
      url: 'a._1fQZEK',
    },
  },
  nykaa: {
    name: 'Nykaa',
    domain: 'nykaa.com',
    baseUrl: 'https://www.nykaafashion.com',
    color: '#FC2779',
    logo: 'https://www.nykaa.com/assets/images/nykaa_logo.png',
    selectors: {
      productCard: '.product-card',
      name: '.product-name',
      price: '.price',
      mrp: '.mrp',
      discount: '.discount',
      image: '.product-image img',
      brand: '.brand-name',
      category: '.category-name',
      inStock: '.out-of-stock',
      sizes: '.size-options',
      colors: '.color-options',
      rating: '.rating-value',
      reviewCount: '.review-count',
      url: 'a',
    },
  },
}
