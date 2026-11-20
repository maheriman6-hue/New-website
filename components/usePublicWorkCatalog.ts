'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { workItems, type WorkItem } from '@/data/work';

export type PublicCategory = {
  id: string;
  name: string;
  slug?: string;
  visible?: boolean;
  order?: number;
};

export type PublicSubcategory = {
  id: string;
  name: string;
  slug?: string;
  visible?: boolean;
  categoryId: string;
  order?: number;
};

export type PublicProduct = {
  id: string;
  name: string;
  slug?: string;
  visible?: boolean;
  image: string;
  categoryId: string;
  subcategoryId?: string;
  alt?: string;
  price?: number;
  caption?: string;
  description?: string;
  badge?: string;
  featured?: boolean;
  inStock?: boolean;
  order?: number;
  imagePosition?: string;
  imageFit?: 'contain' | 'cover';
};

type CatalogData = {
  categories: PublicCategory[];
  subcategories: PublicSubcategory[];
  products: PublicProduct[];
};

type CatalogStatus = 'loading' | 'ready' | 'error';

const EMPTY_CATALOG: CatalogData = {
  categories: [],
  subcategories: [],
  products: [],
};

function readText(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readNumber(data: Record<string, unknown>, key: string): number | undefined {
  const value = data[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readBoolean(data: Record<string, unknown>, key: string): boolean | undefined {
  const value = data[key];
  return typeof value === 'boolean' ? value : undefined;
}

function readCategories(snapshot: QuerySnapshot<DocumentData>): PublicCategory[] {
  return snapshot.docs.flatMap((document) => {
    const data: Record<string, unknown> = document.data();
    if (data.visible === false) return [];
    const name = readText(data, 'name');
    if (!name) return [];
    return [{
      id: document.id,
      name,
      slug: readText(data, 'slug'),
      visible: readBoolean(data, 'visible'),
      order: readNumber(data, 'order'),
    }];
  });
}

function readSubcategories(snapshot: QuerySnapshot<DocumentData>): PublicSubcategory[] {
  return snapshot.docs.flatMap((document) => {
    const data: Record<string, unknown> = document.data();
    if (data.visible === false) return [];
    const name = readText(data, 'name');
    const categoryId = readText(data, 'categoryId');
    if (!name || !categoryId) return [];
    return [{
      id: document.id,
      name,
      slug: readText(data, 'slug'),
      visible: readBoolean(data, 'visible'),
      categoryId,
      order: readNumber(data, 'order'),
    }];
  });
}

function readProducts(snapshot: QuerySnapshot<DocumentData>): PublicProduct[] {
  return snapshot.docs.flatMap((document) => {
    const data: Record<string, unknown> = document.data();
    if (data.visible === false) return [];
    const name = readText(data, 'name');
    const image = readText(data, 'image');
    const categoryId = readText(data, 'categoryId');
    if (!name || !image || !categoryId) return [];

    return [{
      id: document.id,
      name,
      slug: readText(data, 'slug'),
      visible: readBoolean(data, 'visible'),
      image,
      categoryId,
      subcategoryId: readText(data, 'subcategoryId'),
      alt: readText(data, 'alt'),
      price: readNumber(data, 'price'),
      caption: readText(data, 'caption'),
      description: readText(data, 'description'),
      badge: readText(data, 'badge'),
      featured: readBoolean(data, 'featured'),
      inStock: readBoolean(data, 'inStock'),
      order: readNumber(data, 'order'),
      imagePosition: readText(data, 'imagePosition'),
      imageFit: data.imageFit === 'contain' || data.imageFit === 'cover'
        ? data.imageFit
        : undefined,
    }];
  });
}

function sortByOrder<T extends { name: string; order?: number }>(records: T[]) {
  return records.sort((left, right) => (
    (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER)
    || left.name.localeCompare(right.name)
  ));
}

export function createWorkItemsFromCatalog(catalog: CatalogData): WorkItem[] {
  const categoriesById = new Map(catalog.categories.map((category) => [category.id, category]));
  const subcategoriesById = new Map(catalog.subcategories.map((subcategory) => [
    subcategory.id,
    subcategory,
  ]));
  const categoriesWithSubcategories = new Set(
    catalog.subcategories.map((subcategory) => subcategory.categoryId),
  );

  return catalog.products.flatMap((product) => {
    const category = categoriesById.get(product.categoryId);
    if (!category) return [];
    if (categoriesWithSubcategories.has(category.id) && !product.subcategoryId) return [];

    const subcategory = product.subcategoryId
      ? subcategoriesById.get(product.subcategoryId)
      : undefined;
    if (product.subcategoryId && (!subcategory || subcategory.categoryId !== category.id)) {
      return [];
    }

    return [{
      slug: product.slug || product.id,
      productId: product.id,
      title: product.name,
      category: category.name,
      categoryId: category.id,
      subcategory: subcategory?.id,
      subcategoryId: subcategory?.id,
      subcategoryLabel: subcategory?.name,
      image: product.image,
      alt: product.alt || `${product.name} — ${category.name}`,
      meta: product.caption || [category.name, subcategory?.name].filter(Boolean).join(' — ').toUpperCase(),
      description: product.description || product.caption || '',
      caption: product.caption,
      price: product.price,
      badge: product.badge,
      featured: product.featured === true,
      inStock: product.inStock !== false,
      order: product.order,
      imagePosition: product.imagePosition,
      imageFit: product.imageFit,
    }];
  }).sort((left, right) => (
    (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER)
    || left.title.localeCompare(right.title)
  ));
}

export function usePublicWorkCatalog() {
  const [catalog, setCatalog] = useState<CatalogData>(EMPTY_CATALOG);
  const [status, setStatus] = useState<CatalogStatus>('loading');

  useEffect(() => {
    let active = true;
    let failed = false;
    const received = new Set<keyof CatalogData>();
    const unsubscribers: Array<() => void> = [];

    function receive<K extends keyof CatalogData>(key: K, value: CatalogData[K]) {
      if (!active || failed) return;
      setCatalog((current) => ({ ...current, [key]: value }));
      received.add(key);
      if (received.size === 3) setStatus('ready');
    }

    function fail(error: Error) {
      if (!active || failed) return;
      failed = true;
      console.error('Could not load the public work catalog.', error);
      setStatus('error');
    }

    unsubscribers.push(
      onSnapshot(
        query(collection(db, 'categories'), where('visible', '==', true)),
        (snapshot) => receive('categories', sortByOrder(readCategories(snapshot))),
        fail,
      ),
      onSnapshot(
        query(collection(db, 'subcategories'), where('visible', '==', true)),
        (snapshot) => receive('subcategories', sortByOrder(readSubcategories(snapshot))),
        fail,
      ),
      onSnapshot(
        query(collection(db, 'products'), where('visible', '==', true)),
        (snapshot) => receive('products', readProducts(snapshot)),
        fail,
      ),
    );

    return () => {
      active = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const hasManagedProducts = status === 'ready' && catalog.products.length > 0;
  const items = useMemo(
    () => hasManagedProducts
      ? createWorkItemsFromCatalog(catalog)
      : workItems,
    [catalog, hasManagedProducts],
  );

  return {
    status,
    hasManagedProducts,
    categories: catalog.categories,
    subcategories: catalog.subcategories,
    items,
  };
}
