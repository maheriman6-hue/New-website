export type WorkCategory =
  | 'Sportswear'
  | 'Streetwear'
  | 'Private Label'
  | 'Production'
  | 'Packaging';

export type WorkSpec = {
  label: string;
  value: string;
};

export type WorkItem = {
  slug: string;
  title: string;
  category: WorkCategory;
  image: string;
  alt: string;
  meta: string;
  description: string;
  imagePosition?: string;
  specs?: WorkSpec[];
};

export const WORK_CATEGORIES: WorkCategory[] = [
  'Sportswear',
  'Streetwear',
  'Private Label',
  'Production',
  'Packaging',
];

export const workItems: WorkItem[] = [
  {
    slug: 'training-set',
    title: 'Training Set',
    category: 'Sportswear',
    image: '/media/sportswear-hero.jpg',
    alt: 'Models wearing a coordinated black sportswear training set',
    meta: 'SPORTSWEAR — TEE, SHORTS, JACKET, LEGGINGS — 2026',
    description: 'Performance training pieces, made to your design, cut and stitched in-house.',
  },
  {
    slug: 'hoodie-cargo-set',
    title: 'Hoodie & Cargo Set',
    category: 'Streetwear',
    image: '/media/streetwear-hero.jpg',
    alt: 'Model wearing a black hoodie and cargo pants',
    meta: 'STREETWEAR — HOODIE, CARGO PANTS — 2026',
    description: 'Heavyweight streetwear basics, made to your design, with your logo and tags.',
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
