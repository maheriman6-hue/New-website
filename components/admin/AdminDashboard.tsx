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
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
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
  SectionKey,
  SubscriberDocument,
  SubcategoryDocument,
} from './adminTypes';

type DashboardIconName = IconName | 'plus' | 'trash' | 'upload' | 'close' | 'download';
type ToastState = { message: string; error: boolean } | null;
type LoadState = 'loading' | 'ready';
type ContentSectionKey = SectionKey;
type EditableDraft = Record<string, FieldValue>;

const COLLECTIONS: CollectionName[] = [
  'categories',
  'subcategories',
  'products',
  'media',
  'subscribers',
];

const EMPTY_DATA: DashboardData = {
  categories: [],
  subcategories: [],
  products: [],
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
    if (storedValue !== undefined) {
      draft[field.key] = storedValue;
    } else if (field.type === 'select') {
      draft[field.key] = field.defaultValue ?? field.options[0] ?? '';
    } else if ('defaultValue' in field && field.defaultValue !== undefined) {
      draft[field.key] = field.defaultValue;
    }
  }
  return draft;
}

function fieldsPayload(fields: FieldConfig[], draft: EditableDraft) {
  const payload: Record<string, FieldValue> = {};
  for (const field of fields) {
    if (!('key' in field)) continue;
    const value = draft[field.key];
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

function currentTimestamp() {
  return Date.now();
}

async function shrinkImage(file: File, maxDimension: number, quality: number): Promise<Blob> {
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

async function uploadImage(file: File): Promise<ImageUploadResult> {
  const image = await shrinkImage(file, 1600, 0.85);
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in again before uploading an image.');

  const body = new FormData();
  body.append('file', image, 'product.webp');
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
    media: '',
    subscribers: '',
  });
  const [draft, setDraft] = useState<EditableDraft>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimer = useRef<number | null>(null);
  const pendingImageFileIds = useRef(new Set<string>());

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
            media,
            subscribers,
          ] = await Promise.all([
            loadCollection<CategoryDocument>('categories'),
            loadCollection<SubcategoryDocument>('subcategories'),
            loadCollection<ProductDocument>('products'),
            loadCollection<MediaDocument>('media'),
            loadCollection<SubscriberDocument>('subscribers'),
          ]);
          if (!active || currentAuthChangeId !== authChangeId) return;
          const loadedData = { categories, subcategories, products, media, subscribers };
          setData(loadedData);
          setLoadState('ready');
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
      if (event.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeDrawer, drawerOpen]);

  function setDraftValue(section: SectionKey, key: string, value: FieldValue) {
    const update = (current: EditableDraft) => {
      const next = { ...current, [key]: value };
      if (key === 'image') next.imageFileId = '';
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
    setEditId(record?.id ?? null);
    setDraft(editableDraft(config.fields, record));
    setDrawerOpen(true);
  }

  async function handleImageUpload(
    section: SectionKey,
    key: string,
    file: File,
  ) {
    setUploadingField(key);
    try {
      const uploadedImage = await uploadImage(file);
      pendingImageFileIds.current.add(uploadedImage.fileId);
      setDraftValue(section, key, uploadedImage.url);
      setDraftValue(section, 'imageFileId', uploadedImage.fileId);
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

  async function saveContent() {
    const config = adminSections[activeSection];

    for (const field of config.fields) {
      if (!('key' in field) || !('required' in field) || !field.required) continue;
      const value = draft[field.key];
      if (value === undefined || value === '') {
        showToast(`Please fill in: ${field.label.replace(/\s\(.*/, '')}`, true);
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

    setSaving(true);
    try {
      const payload = fieldsPayload(config.fields, draft);
      if (typeof draft.imageFileId === 'string') {
        payload.imageFileId = draft.imageFileId;
      }
      payload.updatedAt = currentTimestamp();
      const previousImageFileId = editId
        ? data[activeSection].find((record) => record.id === editId)?.imageFileId
        : undefined;
      if (editId) {
        await setDoc(doc(db, activeSection, editId), payload, { merge: true });
        setData((current) => ({
          ...current,
          [activeSection]: current[activeSection].map((record) =>
            record.id === editId ? { ...record, ...payload } : record,
          ),
        }));
      } else {
        payload.createdAt = currentTimestamp();
        const reference = await addDoc(collection(db, activeSection), payload);
        const newRecord = readRecord<AdminRecord>(reference.id, payload);
        setData((current) => ({
          ...current,
          [activeSection]: [...current[activeSection], newRecord],
        }));
      }
      const savedImageFileId = typeof payload.imageFileId === 'string'
        ? payload.imageFileId
        : undefined;
      pendingImageFileIds.current.delete(savedImageFileId ?? '');
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
      if (
        typeof draft.imageFileId === 'string'
        &&
        typeof previousImageFileId === 'string'
        && previousImageFileId
        && previousImageFileId !== payload.imageFileId
      ) {
        const imageSections = ['categories', 'subcategories', 'products', 'media'] as const;
        const oldImageIsShared = imageSections.some((section) => (
          data[section].some((record) => (
            !(section === activeSection && record.id === editId)
            && record.imageFileId === previousImageFileId
          ))
        ));
        if (!oldImageIsShared) {
          try {
            await deleteImageKitFile(previousImageFileId);
          } catch (error) {
            console.error('Record saved, but its previous ImageKit image could not be removed.', error);
            oldImageCleanupFailed = true;
          }
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
      warning = `\n\nIt has ${subcategoryCount} subcategories and ${productCount} products. They will stay but lose this category.`;
    }
    if (section === 'subcategories') {
      const productCount = data.products.filter((item) => item.subcategoryId === record.id).length;
      warning = `\n\n${productCount} products use it. They will stay but lose this subcategory.`;
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
      const imageUrl = typeof record.image === 'string' ? record.image : undefined;
      if (imageUrl?.startsWith('https://firebasestorage.googleapis.com/')) {
        const imageIsShared = [
          ...data.categories.filter((item) => section !== 'categories' || item.id !== record.id),
          ...data.subcategories.filter((item) => section !== 'subcategories' || item.id !== record.id),
          ...data.products.filter((item) => section !== 'products' || item.id !== record.id),
          ...data.media.filter((item) => section !== 'media' || item.id !== record.id),
        ].some((item) => item.image === imageUrl);

        if (!imageIsShared) {
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
      }
      const imageFileId = typeof record.imageFileId === 'string' ? record.imageFileId : undefined;
      if (imageFileId) {
        const imageSections = ['categories', 'subcategories', 'products', 'media'] as const;
        const imageIsShared = imageSections.some((imageSection) => (
          data[imageSection].some((item) => (
            !(imageSection === section && item.id === record.id)
            && item.imageFileId === imageFileId
          ))
        ));
        if (!imageIsShared) {
          try {
            await deleteImageKitFile(imageFileId);
          } catch (error) {
            console.error('Admin record deleted, but its ImageKit image could not be removed.', error);
            imageCleanupFailed = true;
          }
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
      return (
        <div className={styles.formField} key={field.key}>
          <label className={styles.formLabel}>
            {field.label}{field.required ? ' *' : ''}
          </label>
          <div className={styles.imageBox}>
            {image ? (
              <Image src={image} alt="" width={430} height={170} unoptimized />
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
                  if (file) void handleImageUpload(section, field.key, file);
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
              <option key={option} value={option}>{option}</option>
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
        setDraftValue(section, field.key, nextValue);
      },
    };

    return (
      <div className={styles.formField} key={field.key}>
        <label className={styles.formLabel} htmlFor={id}>
          {field.label}{field.required ? ' *' : ''}
        </label>
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
  const query = searchValues[contentSection].toLowerCase();
  const titleField = currentSectionConfig.titleField;

  const visibleRows = currentRows
    .filter((record) => String(record[titleField] ?? '').toLowerCase().includes(query))
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
      const searching = query.length > 0;
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
      const title = String(record[currentSectionConfig.titleField] || 'Untitled');
      const image = getImageUrl(record.image);
      const flag = record[currentSectionConfig.statusField] !== false;
      const statusText = activeSection === 'subscribers'
        ? flag ? 'Subscribed' : 'Unsubscribed'
        : flag ? 'Visible' : 'Hidden';
      return (
        <div
          className={styles.item}
          key={record.id}
        >
          <button className={styles.itemOpen} type="button" onClick={() => openDrawer(record)}>
            <div className={styles.thumbnail}>
              {image ? (
                <Image src={image} alt="" width={56} height={56} unoptimized />
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
    return fields.map((field) => renderField(
      field,
      section,
      'key' in field ? draft[field.key] : undefined,
    ));
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
      {toast && (
        <div className={`${styles.toast} ${styles.toastVisible} ${toast.error ? styles.toastError : ''}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
    </div>
  );
}
