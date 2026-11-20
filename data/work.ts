export type WorkCategory = string;

export const WORK_SUBCATEGORIES = {
  Sportswear: [
    { slug: 'football', label: 'Football' },
    { slug: 'baseball', label: 'Baseball' },
    { slug: 'basketball', label: 'Basketball' },
    { slug: 'cricket', label: 'Cricket' },
    { slug: 'running', label: 'Running' },
    { slug: 'gym-training', label: 'Gym / Training' },
    { slug: 'tracksuits', label: 'Tracksuits' },
  ],
  Streetwear: [
    { slug: 'hoodies', label: 'Hoodies' },
    { slug: 't-shirts', label: 'T-Shirts' },
    { slug: 'sweatshirts', label: 'Sweatshirts' },
    { slug: 'jackets', label: 'Jackets' },
    { slug: 'joggers', label: 'Joggers' },
    { slug: 'caps', label: 'Caps' },
  ],
} as const;

export type WorkSubcategory = string;

export type WorkSpec = {
  label: string;
  value: string;
};

export type WorkItem = {
  slug: string;
  productId?: string;
  title: string;
  category: WorkCategory;
  categoryId?: string;
  subcategory?: WorkSubcategory;
  subcategoryId?: string;
  subcategoryLabel?: string;
  image: string;
  alt: string;
  meta: string;
  description: string;
  caption?: string;
  price?: number;
  badge?: string;
  featured?: boolean;
  inStock?: boolean;
  order?: number;
  imagePosition?: string;
  imageFit?: 'contain' | 'cover';
  specs?: WorkSpec[];
};

export const workItems: WorkItem[] = [
  {
    slug: 'training-set',
    title: 'Training Set',
    category: 'Sportswear',
    subcategory: 'gym-training',
    image: '/media/sportswear-hero.jpg',
    alt: 'Models wearing a coordinated black sportswear training set',
    meta: 'SPORTSWEAR — TEE, SHORTS, JACKET, LEGGINGS — 2026',
    description: 'Performance training pieces, made to your design, cut and stitched in-house.',
  },
  {
    slug: 'hoodie-cargo-set',
    title: 'Hoodie & Cargo Set',
    category: 'Streetwear',
    subcategory: 'hoodies',
    image: '/media/streetwear-hero.jpg',
    alt: 'Model wearing a black hoodie and cargo pants',
    meta: 'STREETWEAR — HOODIE, CARGO PANTS — 2026',
    description: 'Heavyweight streetwear basics, made to your design, with your logo and tags.',
  },
  {
    slug: 'premium-white-hoodie',
    title: 'Premium White Hoodie',
    category: 'Streetwear',
    subcategory: 'hoodies',
    image: '/media/premium-white-hoodie.webp',
    alt: 'Zateef International white hoodie showcase with front and back views, fabric details, and product features',
    meta: 'STREETWEAR — HOODIE — 2026',
    description: 'A premium cotton hoodie with a modern fit, made to your design.',
    imageFit: 'contain',
  },
  {
    slug: 'stitching-floor',
    title: 'On the Stitching Floor',
    category: 'Production',
    image: '/media/stiching.webp',
    alt: 'Hands guiding dark fabric through an industrial sewing machine',
    meta: 'PRODUCTION — STITCHING — 2026',
    description: 'Every piece is stitched and quality-checked before it ships.',
  },
  {
    slug: 'branded-packaging',
    title: 'Branded Packaging',
    category: 'Packaging',
    image: '/media/zateef-delivery.webp',
    alt: 'Branded Zateef International apparel boxes and packed clothing',
    meta: 'PACKAGING — DELIVERY — 2026',
    description: 'Packed in branded boxes and shipped with tracking.',
    imagePosition: '58% center',
  },
];
