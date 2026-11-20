'use client';

import Image from 'next/image';
import { FirebaseError } from 'firebase/app';
import {
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { auth, db, storage } from '@/lib/firebase';
import { WORK_SUBCATEGORIES, workItems } from '@/data/work';
import { adminSections } from './adminConfig';
import { getAdminSessionExpiresAt } from './adminSession';
import { ImageCropper } from './ImageCropper';
import styles from './Admin.module.css';
import type {
  AdminRecord,
  CategoryDocument,
  CollectionName,
  DashboardData,
  FieldConfig,
  FieldValue,
  IconName,
  MediaDocument,
  ProductDocument,
  SectionConfig,
  SectionKey,
  HeroSlideDocument,
  SubscriberDocument,
  SubcategoryDocument,
} from './adminTypes';

type DashboardIconName = IconName | 'plus' | 'trash' | 'upload' | 'close' | 'download';
type ToastState = { message: string; error: boolean } | null;
type LoadState = 'loading' | 'ready';
type ContentSectionKey = SectionKey;
type EditableDraft = Record<string, FieldValue>;
type CropRequest = {
  section: SectionKey;
  key: string;
  file: File;
  imageUrl: string;
  aspect: number;
  outputWidth: number;
  outputHeight: number;
};

const COLLECTIONS: CollectionName[] = [
  'categories',
  'subcategories',
  'products',
  'heroSlides',
  'media',
  'subscribers',
];

const EMPTY_DATA: DashboardData = {
  categories: [],
  subcategories: [],
  products: [],
  heroSlides: [],
  media: [],
  subscribers: [],
};

const ICON_PATHS: Record<DashboardIconName, ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 10 5-10 5L2 7z" />
      <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
    </>
  ),
  box: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </>
  ),
  play: <path d="m8 5 12 7-12 7z" />,
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </>
  ),
  out: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
};

function Icon({ name, size = 18 }: { name: DashboardIconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readFields(value: unknown): Record<string, FieldValue> {
  if (!isUnknownRecord(value)) return {};

  const fields: Record<string, FieldValue> = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    if (
      typeof fieldValue === 'string'
      || typeof fieldValue === 'number'
      || typeof fieldValue === 'boolean'
    ) {
      fields[key] = fieldValue;
    }
  }
  return fields;
}

function readRecord<T extends AdminRecord>(id: string, value: unknown): T {
  return { ...readFields(value), id } as T;
}

function friendlyError(error: unknown, fallback: string) {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied' || error.code === 'storage/unauthorized') {
      return 'Permission denied. Check your Firebase rules and owner access.';
    }
    if (error.code === 'storage/bucket-not-found') {
      return 'Storage is not set up for this Firebase project.';
    }
    if (error.code === 'storage/quota-exceeded') {
      return 'Firebase Storage is over its current quota.';
    }
  }
  return fallback;
}

async function loadCollection<T extends AdminRecord>(name: CollectionName): Promise<T[]> {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((document) => readRecord<T>(document.id, document.data()));
}

function editableDraft(fields: FieldConfig[], record?: AdminRecord): EditableDraft {
  const draft: EditableDraft = {};
  for (const field of fields) {
    if (!('key' in field)) continue;
    const storedValue = record?.[field.key];
    if (field.type === 'datetime-local' && typeof storedValue === 'number') {
      const date = new Date(storedValue);
      const localValue = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 16);
      draft[field.key] = localValue;
    } else if (storedValue !== undefined) {
      draft[field.key] = storedValue;
    } else if (field.type === 'select') {
      draft[field.key] = field.defaultValue ?? field.options[0] ?? '';
    } else if ('defaultValue' in field && field.defaultValue !== undefined) {
      draft[field.key] = field.defaultValue;
    }
  }
  return draft;
}

function fieldsPayload(fields: FieldConfig[], draft: EditableDraft, editing: boolean) {
  const payload: Record<string, FieldValue | ReturnType<typeof deleteField>> = {};
  for (const field of fields) {
    if (!('key' in field)) continue;
    const value = draft[field.key];
    if (field.type === 'datetime-local') {
      if (typeof value === 'string' && value) {
        const timestamp = new Date(value).getTime();
        if (Number.isFinite(timestamp)) payload[field.key] = timestamp;
      } else if (editing) {
        payload[field.key] = deleteField();
      }
      continue;
    }
    if (value !== undefined) {
      payload[field.key] = value;
    } else if (field.type === 'select') {
      payload[field.key] = field.defaultValue ?? field.options[0] ?? '';
    } else if ('defaultValue' in field && field.defaultValue !== undefined) {
      payload[field.key] = field.defaultValue;
    } else {
      payload[field.key] = '';
    }
  }
  return payload;
}

function recordName(record: AdminRecord | undefined) {
  return typeof record?.name === 'string' ? record.name : '';
}

function getImageUrl(value: FieldValue | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getImageFileIds(record: AdminRecord | undefined) {
  if (!record) return [];
  return Array.from(new Set(Object.entries(record).flatMap(([key, value]) => (
    key.endsWith('FileId') && typeof value === 'string' && value
      ? [value]
      : []
  ))));
}

function getImageUrls(record: AdminRecord | undefined) {
  if (!record) return [];
  return ['image', 'imageDesktop'].flatMap((key) => {
    const value = record[key];
    return typeof value === 'string' && value ? [value] : [];
  });
}

function getHeroSlideLinkState(record: AdminRecord, data: DashboardData) {
  const linkType = typeof record.linkType === 'string' ? record.linkType : 'None';
  const linkId = typeof record.linkId === 'string' ? record.linkId : '';
  if (linkType === 'None' || !linkType) {
    return { label: 'No link', warning: false, warningText: '' };
  }
  if (linkType === 'Custom URL') {
    return { label: 'Links to Custom URL', warning: false, warningText: '' };
  }
  const targetSection = linkType === 'Category'
    ? 'categories'
    : linkType === 'Subcategory' ? 'subcategories'
      : linkType === 'Product' ? 'products' : null;
  if (!targetSection) return { label: 'No link', warning: false, warningText: '' };
  const target = data[targetSection].find((item) => item.id === linkId);
  if (!target) {
    return {
      label: `Links to ${linkType}: Missing item`,
      warning: true,
      warningText: 'Linked item missing',
    };
  }

  let unavailable = target.visible === false;
  if (targetSection === 'products') {
    const category = data.categories.find((item) => item.id === target.categoryId);
    if (!category || category.visible === false) unavailable = true;
    if (typeof target.subcategoryId === 'string' && target.subcategoryId) {
      const subcategory = data.subcategories.find((item) => (
        item.id === target.subcategoryId && item.categoryId === target.categoryId
      ));
      if (!subcategory || subcategory.visible === false) unavailable = true;
    } else if (data.subcategories.some((item) => (
      item.categoryId === target.categoryId && item.visible !== false
    ))) {
      unavailable = true;
    }
  }
  return {
    label: `Links to ${linkType}: ${recordName(target)}${unavailable ? ' (unavailable)' : ''}`,
    warning: unavailable,
    warningText: target.visible === false ? 'Linked item hidden' : 'Linked target unavailable',
  };
}

function isValidCustomUrl(value: string) {
  const url = value.trim();
  if (!url || url.startsWith('//')) return false;
  if (/^https:\/\//i.test(url)) {
    try {
      return new URL(url).protocol === 'https:';
    } catch {
      return false;
    }
  }
  return !/^[a-z][a-z0-9+.-]*:/i.test(url);
}

function currentTimestamp() {
  return Date.now();
}

const SLUG_SECTIONS = ['categories', 'subcategories', 'products'] as const;
type SlugSection = (typeof SLUG_SECTIONS)[number];

function isSlugSection(section: SectionKey): section is SlugSection {
  return SLUG_SECTIONS.some((candidate) => candidate === section);
}

function createSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function randomSlug() {
  return `item-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toLowerCase()}`;
}

async function shrinkImage(file: Blob, maxDimension: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Could not prepare this image.');
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not convert this image.'));
    }, 'image/webp', quality);
  });
}

type ImageUploadResult = { url: string; fileId: string };

async function uploadImage(
  file: File | Blob,
  preserveDimensions = false,
  folder: 'catalog' | 'hero' = 'catalog',
): Promise<ImageUploadResult> {
  const image = preserveDimensions ? file : await shrinkImage(file, 1600, 0.85);
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in again before uploading an image.');

  const body = new FormData();
  body.append('file', image, file instanceof File ? file.name : 'hero-crop.webp');
  body.append('folder', folder);
  const response = await fetch('/api/admin/images', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
    body,
  });
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error('Image upload returned an invalid response.');
  }
  if (
    typeof result !== 'object'
    || result === null
    || !('url' in result)
    || typeof result.url !== 'string'
    || !('fileId' in result)
    || typeof result.fileId !== 'string'
  ) {
    const message = (
      typeof result === 'object'
      && result !== null
      && 'error' in result
      && typeof result.error === 'string'
    ) ? result.error : 'Image upload failed.';
    throw new Error(message);
  }
  if (!response.ok) throw new Error('error' in result && typeof result.error === 'string'
    ? result.error
    : 'Image upload failed.');
  return { url: result.url, fileId: result.fileId };
}

async function createInlineImageFallback(file: Blob, maxDataUrlLength: number): Promise<string> {
  const image = await createImageBitmap(file);
  const ratio = Math.min(1, 1280 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  const context = canvas.getContext('2d');
  if (!context) {
    image.close();
    throw new Error('Image upload failed and a compressed fallback could not be prepared.');
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();

  for (const quality of [0.75, 0.65, 0.55, 0.45, 0.35]) {
    const compressed = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', quality);
    });
    if (!compressed) continue;
    const estimatedDataUrlLength = Math.ceil(compressed.size / 3) * 4 + 30;
    if (estimatedDataUrlLength > maxDataUrlLength) continue;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Could not prepare the compressed image fallback.'));
      };
      reader.onerror = () => reject(new Error('Could not prepare the compressed image fallback.'));
      reader.readAsDataURL(compressed);
    });
  }
  throw new Error('Image upload failed and the compressed fallback exceeds the safe Firestore size limit. Choose a smaller image.');
}

async function deleteImageKitFile(fileId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in again to remove the unused image.');
  const response = await fetch('/api/admin/images', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileId }),
  });
  if (!response.ok) {
    const result: unknown = await response.json().catch(() => null);
    const message = (
      typeof result === 'object'
      && result !== null
      && 'error' in result
      && typeof result.error === 'string'
    ) ? result.error : 'Could not remove the unused ImageKit image.';
    throw new Error(message);
  }
}

function subscriberCsv(records: SubscriberDocument[]) {
  const quote = (value: FieldValue | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const header = 'email,name,subscribed,joined';
  const rows = records.map((subscriber) => [
    subscriber.email,
    subscriber.name,
    subscriber.subscribed !== false,
    subscriber.createdAt ? new Date(subscriber.createdAt).toISOString() : '',
  ].map(quote).join(','));
  return [header, ...rows].join('\n');
}

function getItemMeta(
  section: ContentSectionKey,
  record: AdminRecord,
  data: DashboardData,
) {
  if (section === 'heroSlides') {
    return getHeroSlideLinkState(record, data).label;
  }

  if (section === 'categories') {
    const subcategoryCount = data.subcategories.filter((item) => item.categoryId === record.id).length;
    const productCount = data.products.filter((item) => item.categoryId === record.id).length;
    const subcategoryLabel = subcategoryCount === 1 ? 'subcategory' : 'subcategories';
    const productLabel = productCount === 1 ? 'product' : 'products';
    return `${subcategoryCount} ${subcategoryLabel}, ${productCount} ${productLabel}`;
  }

  if (section === 'subcategories') {
    const category = data.categories.find((item) => item.id === record.categoryId);
    const productCount = data.products.filter((item) => item.subcategoryId === record.id).length;
    const productLabel = productCount === 1 ? 'product' : 'products';
    return `In ${recordName(category) || 'no category'}, ${productCount} ${productLabel}`;
  }

  if (section === 'products') {
    const category = data.categories.find((item) => item.id === record.categoryId);
    const subcategory = data.subcategories.find((item) => item.id === record.subcategoryId);
    const location = [recordName(category) || 'No category', recordName(subcategory)]
      .filter(Boolean)
      .join(' › ');
    const price = record.price;
    return `${location}${typeof price === 'number' || typeof price === 'string' && price !== '' ? `   Price ${price}` : ''}`;
  }

  if (section === 'media') {
    const placement = typeof record.placement === 'string' && record.placement ? record.placement : 'Gallery';
    const alt = typeof record.alt === 'string' && record.alt ? `, ${record.alt}` : '';
    return `${placement}${alt}`;
  }

  const name = typeof record.name === 'string' && record.name ? `${record.name}, ` : '';
  const joined = typeof record.createdAt === 'number'
    ? `joined ${new Date(record.createdAt).toLocaleDateString()}`
    : '';
  return `${name}${joined}`;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [activeSection, setActiveSection] = useState<SectionKey>('categories');
  const [searchValues, setSearchValues] = useState<Record<ContentSectionKey, string>>({
    categories: '',
    subcategories: '',
    products: '',
    heroSlides: '',
    media: '',
    subscribers: '',
  });
  const [draft, setDraft] = useState<EditableDraft>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [cropRequest, setCropRequest] = useState<CropRequest | null>(null);
  const [heroIntervalInput, setHeroIntervalInput] = useState('3');
  const [savingHeroInterval, setSavingHeroInterval] = useState(false);
  const [generatingSlugs, setGeneratingSlugs] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimer = useRef<number | null>(null);
  const pendingImageFileIds = useRef(new Set<string>());
  const cropObjectUrlRef = useRef<string | null>(null);
  const slugManuallyEditedRef = useRef(false);

  const showToast = useCallback((message: string, error = false) => {
    setToast({ message, error });
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const closeDrawer = useCallback(() => {
    if (uploadingField !== null) return;
    setDrawerOpen(false);
    for (const fileId of Array.from(pendingImageFileIds.current)) {
      void deleteImageKitFile(fileId).then(() => {
        pendingImageFileIds.current.delete(fileId);
      }).catch((error: unknown) => {
        console.error('Cancelled image upload could not be removed from ImageKit.', error);
        showToast('Cancelled, but an unused image could not be removed from ImageKit.', true);
      });
    }
  }, [showToast, uploadingField]);

  const closeCropper = useCallback(() => {
    if (cropObjectUrlRef.current) {
      URL.revokeObjectURL(cropObjectUrlRef.current);
      cropObjectUrlRef.current = null;
    }
    setCropRequest(null);
  }, []);

  useEffect(() => () => {
    if (cropObjectUrlRef.current) URL.revokeObjectURL(cropObjectUrlRef.current);
  }, []);

  useEffect(() => {
    let active = true;
    let sessionTimer: number | null = null;
    let authChangeId = 0;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!active) return;
      const currentAuthChangeId = ++authChangeId;
      if (sessionTimer !== null) {
        window.clearTimeout(sessionTimer);
        sessionTimer = null;
      }

      if (!user) {
        router.replace('/admin');
        return;
      }

      void (async () => {
        if (!active) return;
        const expiresAt = await getAdminSessionExpiresAt(user);
        if (!active || currentAuthChangeId !== authChangeId) return;
        if (!expiresAt) {
          await signOut(auth);
          if (active) router.replace('/admin');
          return;
        }

        sessionTimer = window.setTimeout(() => {
          void signOut(auth).then(() => {
            if (active) router.replace('/admin');
          }).catch((error: unknown) => {
            if (!active) return;
            console.error('Could not end the expired admin session.', error);
            showToast('Could not end the expired session. Please reload.', true);
            router.replace('/admin');
          });
        }, Math.max(0, expiresAt - Date.now()));

        setLoadState('loading');
        try {
          const [
            categories,
            subcategories,
            products,
            heroSlides,
            media,
            subscribers,
          ] = await Promise.all([
            loadCollection<CategoryDocument>('categories'),
            loadCollection<SubcategoryDocument>('subcategories'),
            loadCollection<ProductDocument>('products'),
            loadCollection<HeroSlideDocument>('heroSlides'),
            loadCollection<MediaDocument>('media'),
            loadCollection<SubscriberDocument>('subscribers'),
          ]);
          if (!active || currentAuthChangeId !== authChangeId) return;
          const loadedData = { categories, subcategories, products, heroSlides, media, subscribers };
          setData(loadedData);
          setLoadState('ready');
          void getDoc(doc(db, 'settings', 'site')).then((settingsSnapshot) => {
            if (!active || currentAuthChangeId !== authChangeId) return;
            const interval = settingsSnapshot.data()?.heroInterval;
            if (typeof interval === 'number' && Number.isFinite(interval) && interval > 0) {
              setHeroIntervalInput(String(interval));
            }
          }).catch((error: unknown) => {
            if (!active || currentAuthChangeId !== authChangeId) return;
            console.error('Could not load the homepage slideshow duration.', error);
            showToast(friendlyError(error, 'Could not load slideshow settings.'), true);
          });
        } catch (error) {
          if (!active || currentAuthChangeId !== authChangeId) return;
          setData(EMPTY_DATA);
          setLoadState('ready');
          showToast(friendlyError(error, 'Couldn’t load data. Check your Firestore rules.'), true);
        }
      })().catch(async (error: unknown) => {
        if (!active || currentAuthChangeId !== authChangeId) return;
        console.error('Could not verify or load the admin session.', error);
        try {
          await signOut(auth);
        } catch (signOutError: unknown) {
          if (active) {
            console.error('Could not clear the unverified admin session.', signOutError);
            showToast('Could not sign out. Please close this page and try again.', true);
          }
        }
        if (active) router.replace('/admin');
      });
    });

    return () => {
      active = false;
      unsubscribe();
      if (sessionTimer !== null) window.clearTimeout(sessionTimer);
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, [router, showToast]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !cropRequest) closeDrawer();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeDrawer, cropRequest, drawerOpen]);

  function setDraftValue(section: SectionKey, key: string, value: FieldValue) {
    const update = (current: EditableDraft) => {
      const next = { ...current, [key]: value };
      if (key === 'image' || key === 'imageDesktop') next[`${key}FileId`] = '';
      if (key === 'linkType') next.linkId = '';
      const config = adminSections[section];
      for (const field of config.fields) {
        if ('dependsOn' in field && field.dependsOn === key) next[field.key] = '';
      }
      return next;
    };

    setDraft(update);
  }

  function openDrawer(record?: AdminRecord) {
    const config = adminSections[activeSection];
    slugManuallyEditedRef.current = false;
    setEditId(record?.id ?? null);
    const nextDraft = editableDraft(config.fields, record);
    if (!record && activeSection === 'heroSlides') {
      nextDraft.order = data.heroSlides.reduce((largest, slide) => (
        typeof slide.order === 'number' ? Math.max(largest, slide.order) : largest
      ), 0) + 1;
    }
    setDraft(nextDraft);
    setDrawerOpen(true);
  }

  async function handleImageUpload(
    section: SectionKey,
    key: string,
    file: File,
    preserveDimensions = false,
  ) {
    setUploadingField(key);
    try {
      const uploadedImage = await uploadImage(file, preserveDimensions);
      pendingImageFileIds.current.add(uploadedImage.fileId);
      setDraftValue(section, key, uploadedImage.url);
      setDraftValue(section, `${key}FileId`, uploadedImage.fileId);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : friendlyError(error, 'Image upload failed.'),
        true,
      );
    } finally {
      setUploadingField(null);
    }
  }

  async function handleCroppedImage(image: Blob) {
    if (!cropRequest) return;
    setUploadingField(cropRequest.key);
    try {
      try {
        const uploadedImage = await uploadImage(image, true, 'hero');
        pendingImageFileIds.current.add(uploadedImage.fileId);
        setDraftValue(cropRequest.section, cropRequest.key, uploadedImage.url);
        setDraftValue(cropRequest.section, `${cropRequest.key}FileId`, uploadedImage.fileId);
      } catch (uploadError) {
        console.error('ImageKit upload failed; preparing the compressed hero image fallback.', uploadError);
        const otherImageKey = cropRequest.key === 'image' ? 'imageDesktop' : 'image';
        const otherImage = draft[otherImageKey];
        const otherImageSize = typeof otherImage === 'string' && otherImage.startsWith('data:')
          ? otherImage.length
          : 0;
        const fallbackUrl = await createInlineImageFallback(
          image,
          Math.max(0, 850_000 - otherImageSize),
        );
        setDraftValue(cropRequest.section, cropRequest.key, fallbackUrl);
        setDraftValue(cropRequest.section, `${cropRequest.key}FileId`, '');
        showToast('ImageKit upload failed; a compressed image fallback is ready.');
      }
    } finally {
      setUploadingField(null);
    }
  }

  async function saveContent() {
    const config: SectionConfig = adminSections[activeSection];
    const draftToSave = { ...draft };

    if (isSlugSection(activeSection) && !editId && !slugManuallyEditedRef.current) {
      const name = typeof draft.name === 'string' ? draft.name : '';
      const currentSlug = typeof draft.slug === 'string' ? draft.slug.trim() : '';
      if (!currentSlug) draftToSave.slug = createSlug(name) || randomSlug();
    }

    for (const field of config.fields) {
      if (!('key' in field) || !('required' in field) || !field.required) continue;
      if (field.showWhen) {
        const condition = field.showWhen.value;
        if (Array.isArray(condition)
          ? !condition.includes(draftToSave[field.showWhen.key])
          : condition !== draftToSave[field.showWhen.key]) continue;
      }
      const value = draftToSave[field.key];
      if (value === undefined || value === '') {
        showToast(`Please fill in: ${field.label.replace(/\s\(.*/, '')}`, true);
        return;
      }
    }

    if (isSlugSection(activeSection)) {
      const slug = typeof draftToSave.slug === 'string' ? draftToSave.slug.trim() : '';
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        showToast('Slug must use lowercase letters, numbers and single hyphens only.', true);
        return;
      }
      try {
        const matches = await getDocs(query(
          collection(db, activeSection),
          where('slug', '==', slug),
        ));
        const duplicate = matches.docs.find((document) => document.id !== editId);
        if (duplicate) {
          const base = slug.replace(/-\d+$/, '');
          let suffix = 2;
          let suggestion = `${base}-${suffix}`;
          while (true) {
            const suggestionMatches = await getDocs(query(
              collection(db, activeSection),
              where('slug', '==', suggestion),
            ));
            if (!suggestionMatches.docs.some((document) => document.id !== editId)) break;
            suffix += 1;
            suggestion = `${base}-${suffix}`;
          }
          showToast(`Slug already exists. Try “${suggestion}”.`, true);
          return;
        }
      } catch (error) {
        showToast(friendlyError(error, 'Could not verify that the slug is unique.'), true);
        return;
      }
    }

    if (activeSection === 'subcategories') {
      const categoryId = draft.categoryId;
      if (
        typeof categoryId !== 'string'
        || !data.categories.some((category) => category.id === categoryId)
      ) {
        showToast('Choose a valid parent category.', true);
        return;
      }
    }

    if (activeSection === 'products') {
      const categoryId = draft.categoryId;
      const category = typeof categoryId === 'string'
        ? data.categories.find((entry) => entry.id === categoryId)
        : undefined;
      if (!category) {
        showToast('Choose a valid product category.', true);
        return;
      }

      const categorySubcategories = data.subcategories.filter(
        (subcategory) => subcategory.categoryId === category.id,
      );
      const subcategoryId = typeof draft.subcategoryId === 'string'
        ? draft.subcategoryId
        : '';
      if (categorySubcategories.length > 0 && !subcategoryId) {
        showToast('Choose a subcategory for this product.', true);
        return;
      }
      if (
        subcategoryId
        && !categorySubcategories.some((subcategory) => subcategory.id === subcategoryId)
      ) {
        showToast('Choose a subcategory that belongs to the selected category.', true);
        return;
      }
    }

    if (activeSection === 'heroSlides') {
      if (draftToSave.useMobileImage !== true && draftToSave.useDesktopImage !== true) {
        showToast('Enable at least one device image for this slide.', true);
        return;
      }

      const linkType = draftToSave.linkType;
      const linkId = draftToSave.linkId;
      if (linkType === 'Category' || linkType === 'Subcategory' || linkType === 'Product') {
        const targetSection = linkType === 'Category'
          ? 'categories'
          : linkType === 'Subcategory' ? 'subcategories' : 'products';
        if (
          typeof linkId !== 'string'
          || !data[targetSection].some((record) => record.id === linkId)
        ) {
          showToast(`Choose a valid ${linkType.toLowerCase()} for this slide.`, true);
          return;
        }
      } else if (linkType === 'Custom URL') {
        const customUrl = typeof draftToSave.customUrl === 'string' ? draftToSave.customUrl : '';
        if (!isValidCustomUrl(customUrl)) {
          showToast('Use a relative URL or an https:// URL only.', true);
          return;
        }
      }

      const startAt = typeof draftToSave.startAt === 'string' && draftToSave.startAt
        ? new Date(draftToSave.startAt).getTime()
        : undefined;
      const endAt = typeof draftToSave.endAt === 'string' && draftToSave.endAt
        ? new Date(draftToSave.endAt).getTime()
        : undefined;
      if (
        startAt !== undefined && !Number.isFinite(startAt)
        || endAt !== undefined && !Number.isFinite(endAt)
      ) {
        showToast('Enter a valid start and end date.', true);
        return;
      }
      if (
        startAt !== undefined
        && endAt !== undefined
        && Number.isFinite(startAt)
        && Number.isFinite(endAt)
        && startAt >= endAt
      ) {
        showToast('The end date must be later than the start date.', true);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = fieldsPayload(config.fields, draftToSave, Boolean(editId));
      for (const [key, value] of Object.entries(draftToSave)) {
        if (key.endsWith('FileId') && typeof value === 'string') payload[key] = value;
      }
      if (activeSection === 'heroSlides' && payload.linkType !== 'Custom URL') {
        payload.customUrl = '';
      }
      if (activeSection === 'heroSlides' && payload.linkType !== 'Category'
        && payload.linkType !== 'Subcategory' && payload.linkType !== 'Product') {
        payload.linkId = '';
      }
      payload.updatedAt = currentTimestamp();
      const previousRecord = editId
        ? data[activeSection].find((record) => record.id === editId)
        : undefined;
      if (editId) {
        await setDoc(doc(db, activeSection, editId), payload, { merge: true });
        const localPayload = Object.fromEntries(
          Object.entries(payload).filter(([, value]) => typeof value === 'string'
            || typeof value === 'number' || typeof value === 'boolean'),
        );
        const clearedDateFields = config.fields.flatMap((field) => (
          'key' in field
          && field.type === 'datetime-local'
          && (!draftToSave[field.key] || draftToSave[field.key] === '')
            ? [field.key]
            : []
        ));
        setData((current) => ({
          ...current,
          [activeSection]: current[activeSection].map((record) => {
            if (record.id !== editId) return record;
            const updated = { ...record, ...localPayload };
            for (const key of clearedDateFields) delete updated[key];
            return updated;
          }),
        }));
      } else {
        payload.createdAt = currentTimestamp();
        const reference = await addDoc(collection(db, activeSection), payload);
        const newRecord = readRecord<AdminRecord>(reference.id, Object.fromEntries(
          Object.entries(payload).filter(([, value]) => typeof value === 'string'
            || typeof value === 'number' || typeof value === 'boolean'),
        ));
        setData((current) => ({
          ...current,
          [activeSection]: [...current[activeSection], newRecord],
        }));
      }
      const savedImageFileIds = new Set(
        Object.entries(payload).flatMap(([key, value]) => (
          key.endsWith('FileId') && typeof value === 'string' && value ? [value] : []
        )),
      );
      savedImageFileIds.forEach((fileId) => pendingImageFileIds.current.delete(fileId));
      let pendingImageCleanupFailed = false;
      for (const pendingFileId of Array.from(pendingImageFileIds.current)) {
        try {
          await deleteImageKitFile(pendingFileId);
          pendingImageFileIds.current.delete(pendingFileId);
        } catch (error) {
          console.error('Saved record, but an unused ImageKit upload could not be removed.', error);
          pendingImageCleanupFailed = true;
        }
      }
      let oldImageCleanupFailed = false;
      const nextImageFileIds = new Set(
        Object.entries(payload).flatMap(([key, value]) => (
          key.endsWith('FileId') && typeof value === 'string' && value ? [value] : []
        )),
      );
      for (const oldFileId of getImageFileIds(previousRecord)) {
        if (nextImageFileIds.has(oldFileId)) continue;
        const isShared = COLLECTIONS.some((section) => data[section].some((record) => (
          !(section === activeSection && record.id === editId)
          && getImageFileIds(record).includes(oldFileId)
        )));
        if (isShared) continue;
        try {
          await deleteImageKitFile(oldFileId);
        } catch (error) {
          console.error('Record saved, but its previous ImageKit image could not be removed.', error);
          oldImageCleanupFailed = true;
        }
      }
      closeDrawer();
      showToast(oldImageCleanupFailed || pendingImageCleanupFailed
        ? 'Saved, but an unused image could not be removed from ImageKit.'
        : 'Saved', oldImageCleanupFailed || pendingImageCleanupFailed);
    } catch (error) {
      showToast(friendlyError(error, 'Couldn’t save. Check your Firestore rules.'), true);
    } finally {
      setSaving(false);
    }
  }

  async function generateMissingSlugs(section: SlugSection) {
    const records = data[section];
    const reserved = new Set(records.flatMap((record) => (
      typeof record.slug === 'string' && record.slug.trim() ? [record.slug.trim()] : []
    )));
    const updates = records.flatMap((record) => {
      if (typeof record.slug === 'string' && record.slug.trim()) return [];
      const base = createSlug(recordName(record)) || randomSlug();
      let candidate = base;
      let suffix = 2;
      while (reserved.has(candidate)) {
        candidate = `${base}-${suffix}`;
        suffix += 1;
      }
      reserved.add(candidate);
      return [{ id: record.id, slug: candidate }];
    });

    if (updates.length === 0) {
      showToast('All items already have slugs.');
      return;
    }

    setGeneratingSlugs(true);
    let updatedCount = 0;
    try {
      for (let offset = 0; offset < updates.length; offset += 450) {
        const batch = writeBatch(db);
        const chunk = updates.slice(offset, offset + 450);
        for (const update of chunk) {
          batch.update(doc(db, section, update.id), {
            slug: update.slug,
            updatedAt: currentTimestamp(),
          });
        }
        await batch.commit();
        updatedCount += chunk.length;
        const committedUpdates = new Map(chunk.map((update) => [update.id, update.slug]));
        setData((current) => ({
          ...current,
          [section]: current[section].map((record) => {
            const slug = committedUpdates.get(record.id);
            return slug ? { ...record, slug } : record;
          }),
        }));
      }
      showToast(`Updated ${updatedCount} missing ${updatedCount === 1 ? 'slug' : 'slugs'}.`);
    } catch (error) {
      console.error(`Could not generate missing ${section} slugs.`, error);
      showToast(
        updatedCount
          ? `Updated ${updatedCount} slugs before the remaining updates failed.`
          : friendlyError(error, 'Could not generate missing slugs.'),
        true,
      );
    } finally {
      setGeneratingSlugs(false);
    }
  }

  async function saveHeroInterval() {
    const interval = Number(heroIntervalInput);
    if (!Number.isFinite(interval) || interval <= 0) {
      showToast('Slide duration must be a number greater than 0 seconds.', true);
      return;
    }

    setSavingHeroInterval(true);
    try {
      await setDoc(doc(db, 'settings', 'site'), {
        heroInterval: interval,
        updatedAt: currentTimestamp(),
      }, { merge: true });
      setHeroIntervalInput(String(interval));
      showToast('Slideshow duration saved.');
    } catch (error) {
      showToast(friendlyError(error, 'Could not save slideshow settings.'), true);
    } finally {
      setSavingHeroInterval(false);
    }
  }

  async function importExistingWork() {
    if (data.products.length > 0 || data.categories.length > 0 || data.subcategories.length > 0) {
      showToast('The catalog already has content, so the existing examples were not imported.', true);
      return;
    }
    if (!window.confirm(`Import the ${workItems.length} current website examples so you can edit them here?`)) {
      return;
    }

    setSaving(true);
    try {
      const [categoriesSnapshot, subcategoriesSnapshot, productsSnapshot] = await Promise.all([
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'subcategories')),
        getDocs(collection(db, 'products')),
      ]);
      if (
        !categoriesSnapshot.empty
        || !subcategoriesSnapshot.empty
        || !productsSnapshot.empty
      ) {
        showToast('The Firestore catalog changed, so the examples were not imported.', true);
        return;
      }

      const batch = writeBatch(db);
      const now = Date.now();
      const categoryNames = Array.from(new Set(workItems.map((item) => item.category)));
      const categoryRefs = new Map(categoryNames.map((name) => [
        name,
        doc(collection(db, 'categories')),
      ]));
      const categoryRecords: CategoryDocument[] = categoryNames.map((name, order) => {
        const reference = categoryRefs.get(name);
        if (!reference) throw new Error(`Could not create the ${name} category reference.`);
        return {
          id: reference.id,
          name,
          slug: createSlug(name) || randomSlug(),
          order,
          visible: true,
          createdAt: now,
          updatedAt: now,
        };
      });
      const subcategoryRefs = new Map<string, ReturnType<typeof doc>>();
      const subcategoryRecords: SubcategoryDocument[] = [];

      categoryRecords.forEach((category) => {
        const { id, ...fields } = category;
        batch.set(doc(db, 'categories', id), fields);
      });

      for (const [categoryName, options] of Object.entries(WORK_SUBCATEGORIES)) {
        const categoryRef = categoryRefs.get(categoryName);
        if (!categoryRef) continue;

        options.forEach((option, order) => {
          const reference = doc(collection(db, 'subcategories'));
          subcategoryRefs.set(`${categoryName}:${option.slug}`, reference);
          const subcategory: SubcategoryDocument = {
            id: reference.id,
            name: option.label,
            slug: createSlug(option.label) || randomSlug(),
            categoryId: categoryRef.id,
            order,
            visible: true,
            createdAt: now,
            updatedAt: now,
          };
          subcategoryRecords.push(subcategory);
          const { id, ...fields } = subcategory;
          batch.set(reference, fields);
        });
      }

      const productRecords: ProductDocument[] = workItems.map((item, order) => {
        const reference = doc(collection(db, 'products'));
        const categoryRef = categoryRefs.get(item.category);
        if (!categoryRef) throw new Error(`Could not find the ${item.category} category.`);
        const subcategoryId = item.subcategory
          ? subcategoryRefs.get(`${item.category}:${item.subcategory}`)?.id
          : undefined;
        const product: ProductDocument = {
          id: reference.id,
          name: item.title,
          slug: createSlug(item.title) || randomSlug(),
          image: item.image,
          alt: item.alt,
          categoryId: categoryRef.id,
          caption: item.meta,
          description: item.description,
          order,
          featured: true,
          inStock: true,
          visible: true,
          createdAt: now,
          updatedAt: now,
          ...(subcategoryId ? { subcategoryId } : {}),
          ...(item.imagePosition ? { imagePosition: item.imagePosition } : {}),
          ...(item.imageFit ? { imageFit: item.imageFit } : {}),
        };
        const { id, ...fields } = product;
        batch.set(reference, fields);
        return product;
      });

      await batch.commit();
      setData((current) => ({
        ...current,
        categories: categoryRecords,
        subcategories: subcategoryRecords,
        products: productRecords,
      }));
      showToast('Existing work imported. You can now edit each item.');
    } catch (error) {
      showToast(friendlyError(error, 'Couldn’t import the existing work. Check your Firestore rules.'), true);
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(record: AdminRecord) {
    const section = activeSection;
    const config = adminSections[section];

    let warning = '';
    if (section === 'categories') {
      const subcategoryCount = data.subcategories.filter((item) => item.categoryId === record.id).length;
      const productCount = data.products.filter((item) => item.categoryId === record.id).length;
      const heroSlideCount = data.heroSlides.filter((slide) => (
        slide.linkType === 'Category' && slide.linkId === record.id
      )).length;
      warning = `\n\nIt has ${subcategoryCount} subcategories and ${productCount} products. They will stay but lose this category. ${heroSlideCount} hero slides link to it; they will remain but stop being clickable.`;
    }
    if (section === 'subcategories') {
      const productCount = data.products.filter((item) => item.subcategoryId === record.id).length;
      const heroSlideCount = data.heroSlides.filter((slide) => (
        slide.linkType === 'Subcategory' && slide.linkId === record.id
      )).length;
      warning = `\n\n${productCount} products use it. They will stay but lose this subcategory. ${heroSlideCount} hero slides link to it; they will remain but stop being clickable.`;
    }
    if (section === 'products') {
      const heroSlideCount = data.heroSlides.filter((slide) => (
        slide.linkType === 'Product' && slide.linkId === record.id
      )).length;
      warning = `\n\n${heroSlideCount} hero slides link to this product; they will remain but stop being clickable.`;
    }

    const title = String(record[config.titleField] || 'this item');
    if (!window.confirm(`Delete “${title}”?${warning}`)) return;

    try {
      const relatedUpdates: Promise<void>[] = [];
      if (section === 'categories') {
        for (const item of data.subcategories.filter((entry) => entry.categoryId === record.id)) {
          relatedUpdates.push(updateDoc(doc(db, 'subcategories', item.id), {
            categoryId: '',
            updatedAt: Date.now(),
          }));
        }
        for (const item of data.products.filter((entry) => entry.categoryId === record.id)) {
          relatedUpdates.push(updateDoc(doc(db, 'products', item.id), {
            categoryId: '',
            subcategoryId: '',
            updatedAt: Date.now(),
          }));
        }
      } else if (section === 'subcategories') {
        for (const item of data.products.filter((entry) => entry.subcategoryId === record.id)) {
          relatedUpdates.push(updateDoc(doc(db, 'products', item.id), {
            subcategoryId: '',
            updatedAt: Date.now(),
          }));
        }
      }

      await Promise.all([
        deleteDoc(doc(db, section, record.id)),
        ...relatedUpdates,
      ]);

      let imageCleanupFailed = false;
      for (const imageUrl of getImageUrls(record)) {
        if (!imageUrl.startsWith('https://firebasestorage.googleapis.com/')) continue;
        const imageIsShared = COLLECTIONS.some((imageSection) => (
          data[imageSection].some((item) => (
            !(imageSection === section && item.id === record.id)
            && getImageUrls(item).includes(imageUrl)
          ))
        ));
        if (imageIsShared) continue;
        try {
          const imageRef = ref(storage, imageUrl);
          if (
            imageRef.bucket === storage.app.options.storageBucket
            && imageRef.fullPath.startsWith('uploads/')
          ) {
            await deleteObject(imageRef);
          }
        } catch (error) {
          if (!(error instanceof FirebaseError) || error.code !== 'storage/object-not-found') {
            console.error('Admin record deleted, but its Storage image could not be removed.', error);
            imageCleanupFailed = true;
          }
        }
      }
      for (const imageFileId of getImageFileIds(record)) {
        const imageIsShared = COLLECTIONS.some((imageSection) => (
          data[imageSection].some((item) => (
            !(imageSection === section && item.id === record.id)
            && getImageFileIds(item).includes(imageFileId)
          ))
        ));
        if (imageIsShared) continue;
        try {
          await deleteImageKitFile(imageFileId);
        } catch (error) {
          console.error('Admin record deleted, but its ImageKit image could not be removed.', error);
          imageCleanupFailed = true;
        }
      }

      setData((current) => {
        const next: DashboardData = {
          ...current,
          [section]: current[section].filter((item) => item.id !== record.id),
        };
        if (section === 'categories') {
          next.subcategories = next.subcategories.map((item) =>
            item.categoryId === record.id ? { ...item, categoryId: '' } : item,
          );
          next.products = next.products.map((item) =>
            item.categoryId === record.id
              ? { ...item, categoryId: '', subcategoryId: '' }
              : item,
          );
        }
        if (section === 'subcategories') {
          next.products = next.products.map((item) =>
            item.subcategoryId === record.id ? { ...item, subcategoryId: '' } : item,
          );
        }
        return next;
      });
      if (imageCleanupFailed) {
        showToast(`${title} deleted, but its image could not be removed from image storage.`, true);
        return;
      }
      showToast('Deleted');
    } catch (error) {
      showToast(friendlyError(error, 'Couldn’t delete. Check your Firestore rules.'), true);
    }
  }

  function exportSubscribers() {
    const blob = new Blob([subscriberCsv(data.subscribers)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'subscribers.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function renderField(field: FieldConfig, section: SectionKey, value: FieldValue | undefined) {
    if (field.type === 'heading') {
      return <h4 className={styles.fieldHeading} key={field.label}>{field.label}</h4>;
    }

    const valueAsString = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const id = `admin-field-${field.key}`;
    if (field.type === 'image') {
      const image = getImageUrl(value);
      const cropEnabled = field.aspect !== undefined
        && field.outputWidth !== undefined
        && field.outputHeight !== undefined;
      return (
        <div className={styles.formField} key={field.key}>
          <label className={styles.formLabel}>
            {field.label}{field.required ? ' *' : ''}
          </label>
          <div
            className={`${styles.imageBox} ${cropEnabled ? styles.cropPreview : ''}`}
            style={cropEnabled
              ? { aspectRatio: `${field.outputWidth} / ${field.outputHeight}` }
              : undefined}
          >
            {image ? (
              <Image
                src={image}
                alt=""
                width={430}
                height={170}
                unoptimized
                style={{
                  objectFit: cropEnabled || draft.imageFit === 'cover' ? 'cover' : 'contain',
                  width: '100%',
                  height: '100%',
                }}
              />
            ) : (
              'No image yet'
            )}
          </div>
          <div className={styles.imageActions}>
            <label className={`${styles.button} ${styles.uploadLabel}`}>
              <Icon name="upload" size={16} />
              {image ? 'Replace' : 'Upload'}
              <input
                className={styles.hiddenFileInput}
                type="file"
                accept="image/*"
                aria-label={`Upload ${field.label.toLowerCase()}`}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  if (
                    field.aspect !== undefined
                    && field.outputWidth !== undefined
                    && field.outputHeight !== undefined
                  ) {
                    if (cropObjectUrlRef.current) URL.revokeObjectURL(cropObjectUrlRef.current);
                    const imageUrl = URL.createObjectURL(file);
                    cropObjectUrlRef.current = imageUrl;
                    setCropRequest({
                      section,
                      key: field.key,
                      file,
                      imageUrl,
                      aspect: field.aspect,
                      outputWidth: field.outputWidth,
                      outputHeight: field.outputHeight,
                    });
                  } else {
                    void handleImageUpload(section, field.key, file);
                  }
                }}
              />
            </label>
            {image && (
              <button
                className={styles.button}
                type="button"
                onClick={() => setDraftValue(section, field.key, '')}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      );
    }

    if (field.type === 'toggle') {
      return (
        <div className={styles.formField} key={field.key}>
          <label className={styles.switchLabel} htmlFor={id}>
            <input
              id={id}
              className={styles.switchInput}
              type="checkbox"
              checked={typeof value === 'boolean' ? value : field.defaultValue ?? false}
              onChange={(event) => setDraftValue(section, field.key, event.target.checked)}
            />
            <span className={styles.switchTrack} aria-hidden="true" />
            {field.label}
          </label>
        </div>
      );
    }

    if (field.type === 'reference') {
      const references = data[field.target];
      const referenceOptions = references
        .filter((record) => !field.dependsOn || record[field.dependsOn] === draft[field.dependsOn])
        .sort((left, right) => recordName(left).localeCompare(recordName(right)));
      const noParentSelected = Boolean(field.dependsOn && !draft[field.dependsOn]);
      return (
        <div className={styles.formField} key={field.key}>
          <label className={styles.formLabel} htmlFor={id}>
            {field.label}{field.required ? ' *' : ''}
          </label>
          <select
            id={id}
            className={styles.dashboardSelect}
            value={valueAsString}
            disabled={noParentSelected}
            onChange={(event) => setDraftValue(section, field.key, event.target.value)}
          >
            <option value="">None</option>
            {referenceOptions.map((record) => (
              <option key={record.id} value={record.id}>{recordName(record)}</option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === 'link-reference') {
      const target = draft.linkType === 'Category'
        ? 'categories'
        : draft.linkType === 'Subcategory' ? 'subcategories'
          : draft.linkType === 'Product' ? 'products' : null;
      const references = target ? data[target] : [];
      const referenceOptions = [...references].sort((left, right) => (
        recordName(left).localeCompare(recordName(right))
      ));
      return (
        <div className={styles.formField} key={field.key}>
          <label className={styles.formLabel} htmlFor={id}>{field.label}</label>
          <select
            id={id}
            className={styles.dashboardSelect}
            value={valueAsString}
            onChange={(event) => setDraftValue(section, field.key, event.target.value)}
          >
            <option value="">Choose an item</option>
            {referenceOptions.map((record) => (
              <option key={record.id} value={record.id}>
                {recordName(record)}{record.visible === false ? ' (hidden)' : ''}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div className={styles.formField} key={field.key}>
          <label className={styles.formLabel} htmlFor={id}>
            {field.label}{field.required ? ' *' : ''}
          </label>
          <select
            id={id}
            className={styles.dashboardSelect}
            value={valueAsString || field.defaultValue || ''}
            onChange={(event) => setDraftValue(section, field.key, event.target.value)}
          >
            {field.options.map((option) => (
              <option key={option} value={option}>
                {field.key === 'imageFit'
                  ? option === 'cover' ? 'Fill frame (crop edges)' : 'Show whole image'
                  : option}
              </option>
            ))}
          </select>
        </div>
      );
    }

    const inputValue = valueAsString || (field.type === 'color' && 'defaultValue' in field
      ? field.defaultValue ?? ''
      : '');
    const commonProps = {
      id,
      className: `${styles.dashboardInput} ${field.type === 'color' ? styles.colorInput : ''}`,
      value: inputValue,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const nextValue = field.type === 'number'
          ? event.target.value === '' ? '' : Number(event.target.value)
          : event.target.value;
        if (field.key === 'name' && isSlugSection(section) && !editId && !slugManuallyEditedRef.current) {
          setDraftValue(section, 'name', nextValue);
          setDraftValue(section, 'slug', createSlug(String(nextValue)));
          return;
        }
        if (field.key === 'slug' && isSlugSection(section) && !editId) {
          slugManuallyEditedRef.current = true;
        }
        setDraftValue(section, field.key, nextValue);
      },
    };

    return (
      <div className={styles.formField} key={field.key}>
        <label className={styles.formLabel} htmlFor={id}>
          {field.label}{field.required ? ' *' : ''}
        </label>
        {field.helperText && <p className={styles.helperText}>{field.helperText}</p>}
        {field.type === 'textarea' ? (
          <textarea
            {...commonProps}
            className={styles.dashboardTextarea}
          />
        ) : (
          <input
            {...commonProps}
            type={field.type}
            min={field.type === 'number' ? 0 : undefined}
          />
        )}
      </div>
    );
  }

  if (loadState === 'loading') {
    return <div className={styles.dashboardLoading} aria-label="Loading admin dashboard" />;
  }

  const contentSection = activeSection;
  const currentSectionConfig = adminSections[contentSection];
  const currentRows = data[contentSection];
  const searchQuery = searchValues[contentSection].toLowerCase();
  const titleField = currentSectionConfig.titleField;

  const visibleRows = currentRows
    .filter((record) => String(record[titleField] ?? '').toLowerCase().includes(searchQuery))
    .sort((left, right) => {
      const leftOrder = typeof left.order === 'number' ? left.order : Number.MAX_SAFE_INTEGER;
      const rightOrder = typeof right.order === 'number' ? right.order : Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder
        || String(left[titleField] ?? '').localeCompare(String(right[titleField] ?? ''));
    });

  function renderNavigation() {
    return (
      <aside className={styles.sideNav} aria-label="Admin sections">
        <div className={styles.brand}>
          <span className={styles.brandMark}><Icon name="grid" /></span>
          Admin Console
        </div>
        <div className={styles.groupLabel}>Manage content</div>
        {COLLECTIONS.map((section) => {
          const config = adminSections[section];
          return (
            <button
              className={`${styles.tab} ${activeSection === section ? styles.activeTab : ''}`}
              key={section}
              type="button"
              disabled={uploadingField !== null}
              onClick={() => {
                setActiveSection(section);
                setDrawerOpen(false);
              }}
            >
              <Icon name={config.icon} />
              {config.label}
              <em className={styles.count}>{data[section].length}</em>
            </button>
          );
        })}
        <div className={styles.spacer} />
        <button
          className={styles.tab}
          type="button"
          disabled={uploadingField !== null}
          onClick={() => {
            void signOut(auth)
              .then(() => router.replace('/admin'))
              .catch((error: unknown) => showToast(friendlyError(error, 'Could not sign out.'), true));
          }}
        >
          <Icon name="out" />
          Sign out
        </button>
      </aside>
    );
  }

  function renderRows() {
    if (visibleRows.length === 0) {
      const searching = searchQuery.length > 0;
      if (contentSection === 'products' && !searching && data.products.length === 0) {
        return (
          <div className={styles.empty}>
            <strong>Current website work</strong>
            <p>These examples are on your Work page but are not yet editable in the catalog:</p>
            <ul>
              {workItems.map((item) => (
                <li key={item.slug}>{item.title} — {item.category}</li>
              ))}
            </ul>
            <button
              className={`${styles.button} ${styles.redButton}`}
              type="button"
              disabled={saving}
              onClick={() => void importExistingWork()}
            >
              Import current work to edit
            </button>
          </div>
        );
      }
      return (
        <div className={styles.empty}>
          <strong>{searching ? 'Nothing matches your search' : `No ${currentSectionConfig.label.toLowerCase()} yet`}</strong>
          {searching ? 'Try a different word.' : `Select Add ${currentSectionConfig.singular} to create the first one.`}
        </div>
      );
    }

    return visibleRows.map((record) => {
      const title = String(record[currentSectionConfig.titleField]
        || (contentSection === 'heroSlides' ? 'Untitled slide' : 'Untitled'));
      const image = getImageUrl(record.image);
      const flag = record[currentSectionConfig.statusField] !== false;
      const heroSlide = contentSection === 'heroSlides';
      const heroLinkState = heroSlide ? getHeroSlideLinkState(record, data) : null;
      const now = Date.now();
      const scheduleLabel = heroSlide
        ? typeof record.endAt === 'number' && record.endAt <= now
          ? 'Expired'
          : typeof record.startAt === 'number' && record.startAt > now
            ? 'Scheduled'
            : null
        : null;
      const statusText = activeSection === 'subscribers'
        ? flag ? 'Subscribed' : 'Unsubscribed'
        : flag ? 'Visible' : 'Hidden';
      return (
        <div
          className={styles.item}
          key={record.id}
        >
          <button className={styles.itemOpen} type="button" onClick={() => openDrawer(record)}>
            <div className={`${styles.thumbnail} ${heroSlide ? styles.heroThumbnail : ''}`}>
              {image ? (
                <Image
                  src={image}
                  alt=""
                  width={56}
                  height={56}
                  unoptimized
                  style={{ objectFit: record.imageFit === 'cover' ? 'cover' : 'contain' }}
                />
              ) : contentSection === 'subscribers' ? (
                String(record.email || '?').slice(0, 1).toUpperCase()
              ) : (
                <Icon name={currentSectionConfig.icon} size={22} />
              )}
            </div>
            <div className={styles.itemInfo}>
              <strong className={styles.itemTitle}>{title}</strong>
              <span className={styles.itemMeta}>{getItemMeta(contentSection, record, data)}</span>
            </div>
          </button>
          <span className={`${styles.pill} ${flag ? styles.pillOn : ''}`}>{statusText}</span>
          {heroLinkState?.warning && (
            <span className={`${styles.pill} ${styles.warningPill}`}>
              {heroLinkState.warningText}
            </span>
          )}
          {scheduleLabel && (
            <span className={styles.pill}>{scheduleLabel}</span>
          )}
          <button
            className={`${styles.iconButton} ${styles.deleteButton}`}
            type="button"
            aria-label={`Delete ${title}`}
            onClick={(event) => {
              event.stopPropagation();
              void deleteItem(record);
            }}
          >
            <Icon name="trash" />
          </button>
        </div>
      );
    });
  }

  function renderFields(section: SectionKey, fields: FieldConfig[]) {
    return fields.flatMap((field) => {
      if (
        'key' in field
        && field.showWhen
        && (Array.isArray(field.showWhen.value)
          ? !field.showWhen.value.includes(draft[field.showWhen.key])
          : draft[field.showWhen.key] !== field.showWhen.value)
      ) return [];
      return [renderField(
        field,
        section,
        'key' in field ? draft[field.key] : undefined,
      )];
    });
  }

  function renderDrawer() {
    if (!drawerOpen) return null;
    const config = adminSections[activeSection];
    return (
      <>
        <button
          className={`${styles.overlay} ${styles.overlayOpen}`}
          type="button"
          aria-label="Close editor"
          disabled={uploadingField !== null}
          onClick={closeDrawer}
        />
        <section
          className={`${styles.drawer} ${styles.drawerOpen}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-drawer-title"
        >
          <header className={styles.drawerHeader}>
            <h2 className={styles.drawerTitle} id="admin-drawer-title">
              {editId ? 'Edit ' : 'Add '}{config.singular}
            </h2>
            <button
              className={styles.iconButton}
              type="button"
              aria-label="Close"
              disabled={uploadingField !== null}
              onClick={closeDrawer}
            >
              <Icon name="close" />
            </button>
          </header>
          <div className={styles.drawerBody}>{renderFields(activeSection, config.fields)}</div>
          <footer className={styles.drawerFooter}>
            <button
              className={styles.button}
              type="button"
              disabled={uploadingField !== null}
              onClick={closeDrawer}
            >
              Cancel
            </button>
            <button
              className={`${styles.button} ${styles.redButton}`}
              type="button"
              disabled={saving || uploadingField !== null}
              onClick={() => void saveContent()}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </footer>
        </section>
      </>
    );
  }

  return (
    <div className={styles.dashboardShell}>
      {renderNavigation()}
      <main className={styles.dashboardMain}>
        <header className={styles.topBar}>
          <div>
            <h1 className={styles.sectionTitle}>{currentSectionConfig.label}</h1>
            <p className={styles.hint}>{currentSectionConfig.hint}</p>
          </div>
          <div className={styles.buttonGroup}>
            {contentSection === 'heroSlides' && (
              <>
                <label className={styles.heroInterval}>
                  Slide duration (seconds)
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={heroIntervalInput}
                    onChange={(event) => setHeroIntervalInput(event.target.value)}
                  />
                </label>
                <button
                  className={styles.button}
                  type="button"
                  disabled={savingHeroInterval}
                  onClick={() => void saveHeroInterval()}
                >
                  {savingHeroInterval ? 'Saving…' : 'Save duration'}
                </button>
              </>
            )}
            {isSlugSection(contentSection) && (
              <button
                className={styles.button}
                type="button"
                disabled={generatingSlugs}
                onClick={() => void generateMissingSlugs(contentSection)}
              >
                {generatingSlugs ? 'Generating…' : 'Generate missing slugs'}
              </button>
            )}
            {'csv' in currentSectionConfig && currentSectionConfig.csv && (
              <button className={styles.button} type="button" onClick={exportSubscribers}>
                <Icon name="download" size={16} />
                Export CSV
              </button>
            )}
            {contentSection === 'products'
              && data.products.length === 0
              && data.categories.length === 0
              && data.subcategories.length === 0 && (
                <button
                  className={styles.button}
                  type="button"
                  disabled={saving}
                  onClick={() => void importExistingWork()}
                >
                  Import current work
                </button>
              )}
            <button
              className={`${styles.button} ${styles.redButton}`}
              type="button"
              onClick={() => openDrawer()}
            >
              <Icon name="plus" size={16} />
              Add {currentSectionConfig.singular}
            </button>
          </div>
        </header>
        <div className={styles.searchBar}>
          <input
            className={styles.dashboardInput}
            type="text"
            placeholder={`Search ${currentSectionConfig.label.toLowerCase()}`}
            aria-label="Search"
            value={searchValues[contentSection]}
            onChange={(event) => setSearchValues((current) => ({
              ...current,
              [contentSection]: event.target.value,
            }))}
          />
        </div>
        <div className={styles.list}>{renderRows()}</div>
      </main>
      {renderDrawer()}
      {cropRequest && (
        <ImageCropper
          file={cropRequest.file}
          imageUrl={cropRequest.imageUrl}
          aspectRatio={cropRequest.aspect}
          outputWidth={cropRequest.outputWidth}
          outputHeight={cropRequest.outputHeight}
          onCancel={closeCropper}
          onDone={handleCroppedImage}
          onError={(error) => showToast(
            error instanceof Error ? error.message : 'Could not crop or upload this image.',
            true,
          )}
        />
      )}
      {toast && (
        <div className={`${styles.toast} ${styles.toastVisible} ${toast.error ? styles.toastError : ''}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
    </div>
  );
}
