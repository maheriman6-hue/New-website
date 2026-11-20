export type FieldValue = string | number | boolean;

export interface AdminRecord {
  id: string;
  createdAt?: number;
  updatedAt?: number;
  [key: string]: FieldValue | undefined;
}

export interface CategoryDocument extends AdminRecord {
  name?: string;
  slug?: string;
  image?: string;
  imageFit?: 'contain' | 'cover';
  caption?: string;
  description?: string;
  order?: number;
  visible?: boolean;
}

export interface SubcategoryDocument extends AdminRecord {
  name?: string;
  slug?: string;
  image?: string;
  imageFit?: 'contain' | 'cover';
  categoryId?: string;
  caption?: string;
  order?: number;
  visible?: boolean;
}

export interface ProductDocument extends AdminRecord {
  name?: string;
  slug?: string;
  image?: string;
  alt?: string;
  price?: number;
  categoryId?: string;
  subcategoryId?: string;
  caption?: string;
  description?: string;
  badge?: string;
  featured?: boolean;
  inStock?: boolean;
  visible?: boolean;
  order?: number;
  imagePosition?: string;
  imageFit?: 'contain' | 'cover';
}

export interface MediaDocument extends AdminRecord {
  image?: string;
  imageFit?: 'contain' | 'cover';
  caption?: string;
  alt?: string;
  placement?: string;
  link?: string;
  order?: number;
  visible?: boolean;
}

export interface HeroSlideDocument extends AdminRecord {
  image?: string;
  imageFileId?: string;
  imageDesktop?: string;
  imageDesktopFileId?: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  linkType?: string;
  linkId?: string;
  customUrl?: string;
  order?: number;
  visible?: boolean;
  startAt?: number;
  endAt?: number;
  imagePosition?: string;
  strongBottomShade?: boolean;
  useMobileImage?: boolean;
  useDesktopImage?: boolean;
}

export interface SubscriberDocument extends AdminRecord {
  email?: string;
  name?: string;
  subscribed?: boolean;
}

export type CollectionName =
  | 'categories'
  | 'subcategories'
  | 'products'
  | 'heroSlides'
  | 'media'
  | 'subscribers';

export type SectionKey = CollectionName;
export type IconName = 'grid' | 'layers' | 'box' | 'image' | 'play' | 'mail' | 'out';

interface FieldBase {
  key: string;
  label: string;
  required?: boolean;
  helperText?: string;
  showWhen?: { key: string; value: FieldValue | readonly FieldValue[] };
}

export interface HeadingField {
  type: 'heading';
  label: string;
}

export interface TextField extends FieldBase {
  type: 'text' | 'email' | 'number' | 'textarea' | 'color' | 'datetime-local';
  defaultValue?: string | number;
}

export interface SelectField extends FieldBase {
  type: 'select';
  options: string[];
  defaultValue?: string;
}

export interface ToggleField extends FieldBase {
  type: 'toggle';
  defaultValue?: boolean;
}

export interface ImageField extends FieldBase {
  type: 'image';
  aspect?: number;
  outputWidth?: number;
  outputHeight?: number;
}

export interface ReferenceField extends FieldBase {
  type: 'reference';
  target: CollectionName;
  dependsOn?: string;
}

export interface LinkReferenceField extends FieldBase {
  type: 'link-reference';
}

export type FieldConfig =
  | HeadingField
  | TextField
  | SelectField
  | ToggleField
  | ImageField
  | ReferenceField
  | LinkReferenceField;

export interface ContentSectionConfig {
  label: string;
  icon: IconName;
  singular: string;
  titleField: string;
  statusField: string;
  hint: string;
  fields: FieldConfig[];
  csv?: boolean;
}

export type SectionConfig = ContentSectionConfig;

export interface DashboardData {
  categories: CategoryDocument[];
  subcategories: SubcategoryDocument[];
  products: ProductDocument[];
  heroSlides: HeroSlideDocument[];
  media: MediaDocument[];
  subscribers: SubscriberDocument[];
}
