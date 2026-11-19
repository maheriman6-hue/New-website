export type FieldValue = string | number | boolean;

export interface AdminRecord {
  id: string;
  createdAt?: number;
  updatedAt?: number;
  [key: string]: FieldValue | undefined;
}

export interface CategoryDocument extends AdminRecord {
  name?: string;
  image?: string;
  caption?: string;
  description?: string;
  order?: number;
  visible?: boolean;
}

export interface SubcategoryDocument extends AdminRecord {
  name?: string;
  image?: string;
  categoryId?: string;
  caption?: string;
  order?: number;
  visible?: boolean;
}

export interface ProductDocument extends AdminRecord {
  name?: string;
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
  caption?: string;
  alt?: string;
  placement?: string;
  link?: string;
  order?: number;
  visible?: boolean;
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
  | 'media'
  | 'subscribers';

export type SectionKey = CollectionName;
export type IconName = 'grid' | 'layers' | 'box' | 'image' | 'mail' | 'out';

interface FieldBase {
  key: string;
  label: string;
  required?: boolean;
}

export interface HeadingField {
  type: 'heading';
  label: string;
}

export interface TextField extends FieldBase {
  type: 'text' | 'email' | 'number' | 'textarea' | 'color';
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
}

export interface ReferenceField extends FieldBase {
  type: 'reference';
  target: CollectionName;
  dependsOn?: string;
}

export type FieldConfig =
  | HeadingField
  | TextField
  | SelectField
  | ToggleField
  | ImageField
  | ReferenceField;

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
  media: MediaDocument[];
  subscribers: SubscriberDocument[];
}
