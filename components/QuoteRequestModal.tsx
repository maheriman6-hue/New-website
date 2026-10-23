'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  CONTACT_EMAIL,
  CONTACT_MAILTO_LINK,
  QUOTE_WHATSAPP_LINK,
} from '@/lib/contactLinks';

const FORM_ENDPOINT = ''; // leave empty for now. Later paste my Formspree / Web3Forms / EmailJS URL here
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

type FormErrors = Record<string, string>;
type SubmitState = 'idle' | 'sending' | 'success' | 'error';

const fieldLengthLimits = {
  fullName: 120,
  brandName: 120,
  email: 254,
  whatsapp: 32,
  product: 40,
  category: 32,
  quantity: 32,
  designLink: 2048,
  notes: 2000,
} as const;

const requiredFields = [
  ['fullName', 'Full name'],
  ['brandName', 'Brand / company name'],
  ['email', 'Email'],
  ['whatsapp', 'WhatsApp number'],
  ['product', 'What do you want made?'],
  ['category', 'Category'],
  ['quantity', 'Approximate quantity per design'],
] as const;

// TODO: connect email service here when the website is finished. Email should go to zateefinternational@gmail.com, subject 'New Quote Request - [Brand name]', Reply-To = customer's email.
async function submitQuoteForm(formData: FormData) {
  if (!FORM_ENDPOINT) {
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    return;
  }

  const endpoint = new URL(FORM_ENDPOINT);
  if (endpoint.protocol !== 'https:') {
    throw new Error('The quote form endpoint must use HTTPS.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Quote request failed with status ${response.status}`);
  }
}

function validateForm(formData: FormData) {
  const errors: FormErrors = {};

  for (const [name, label] of requiredFields) {
    if (!String(formData.get(name) ?? '').trim()) {
      errors[name] = `${label} is required.`;
    }
  }

  for (const [name, limit] of Object.entries(fieldLengthLimits)) {
    const value = formData.get(name);
    if (typeof value === 'string' && value.length > limit) {
      errors[name] = `Use ${limit} characters or fewer.`;
    }
  }

  const email = String(formData.get('email') ?? '').trim();
  if (email && (email.length > fieldLengthLimits.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    errors.email = 'Enter a valid email address.';
  }

  const file = formData.get('designFile');
  if (file instanceof File && file.size > 0) {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      errors.designFile = 'Upload a PDF, JPG, or PNG file.';
    } else if (file.size > MAX_UPLOAD_BYTES) {
      errors.designFile = 'Files must be 5 MB or smaller.';
    }
  }

  return errors;
}

export function QuoteRequestModal({
  onClose,
  initialProduct,
  initialCategory,
}: {
  onClose: () => void;
  initialProduct?: string;
  initialCategory?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      dialog.scrollTop += event.deltaY;
    };

    document.body.style.overflow = 'hidden';
    dialog.showModal();
    document.dispatchEvent(new Event('quote-modal:open'));
    dialog.addEventListener('wheel', handleWheel, { capture: true, passive: false });

    return () => {
      dialog.removeEventListener('wheel', handleWheel, true);
      document.dispatchEvent(new Event('quote-modal:close'));
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  function closeModal() {
    if (isClosing) return;
    setIsClosing(true);
    closeTimeoutRef.current = window.setTimeout(() => {
      dialogRef.current?.close();
      onClose();
    }, 180);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitState === 'sending' || submitState === 'success') return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    if (String(formData.get('website') ?? '').trim()) return;

    const nextErrors = validateForm(formData);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidField = Object.keys(nextErrors)[0];
      const invalidField = form.elements.namedItem(firstInvalidField);
      if (invalidField instanceof HTMLElement) invalidField.focus();
      return;
    }

    setSubmitState('sending');
    void submitQuoteForm(formData)
      .then(() => setSubmitState('success'))
      .catch((error: unknown) => {
        console.error('Unable to send quote request:', error);
        setSubmitState('error');
      });
  }

  return (
    <dialog
      ref={dialogRef}
      className={`quote-modal${isClosing ? ' quote-modal--closing' : ''}`}
      data-lenis-prevent
      aria-labelledby="quote-modal-title"
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        closeModal();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div className="quote-modal__panel">
        <button
          className="quote-modal__close"
          type="button"
          aria-label="Close quote request form"
          onClick={closeModal}
        >
          ×
        </button>

        {submitState === 'success' ? (
          <section className="quote-modal__success" aria-live="polite">
            <p className="quote-modal__eyebrow">(06) — REQUEST RECEIVED</p>
            <h2 id="quote-modal-title">Got it.</h2>
            <p>We&apos;ll reply within 24 hours.</p>
            <a href={QUOTE_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
              Need it faster? Message us on WhatsApp.
            </a>
          </section>
        ) : (
          <>
            <p className="quote-modal__eyebrow">(06) — START A PROJECT</p>
            <h2 id="quote-modal-title" className="quote-modal__title">
              Tell us what you&apos;re making.
            </h2>
            <form className="quote-form" noValidate onSubmit={handleSubmit}>
              <div className="quote-form__grid">
                <div className="quote-form__field">
                  <label htmlFor="quote-full-name">Full name <span>*</span></label>
                  <input
                    id="quote-full-name"
                    name="fullName"
                    autoComplete="name"
                    maxLength={fieldLengthLimits.fullName}
                    required
                    aria-invalid={Boolean(errors.fullName)}
                    aria-describedby={errors.fullName ? 'quote-full-name-error' : undefined}
                  />
                  {errors.fullName && <p className="quote-form__error" id="quote-full-name-error">{errors.fullName}</p>}
                </div>

                <div className="quote-form__field">
                  <label htmlFor="quote-brand-name">Brand / company name <span>*</span></label>
                  <input
                    id="quote-brand-name"
                    name="brandName"
                    autoComplete="organization"
                    maxLength={fieldLengthLimits.brandName}
                    required
                    aria-invalid={Boolean(errors.brandName)}
                    aria-describedby={errors.brandName ? 'quote-brand-name-error' : undefined}
                  />
                  {errors.brandName && <p className="quote-form__error" id="quote-brand-name-error">{errors.brandName}</p>}
                </div>

                <div className="quote-form__field">
                  <label htmlFor="quote-email">Email <span>*</span></label>
                  <input
                    id="quote-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={fieldLengthLimits.email}
                    required
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'quote-email-error' : undefined}
                  />
                  {errors.email && <p className="quote-form__error" id="quote-email-error">{errors.email}</p>}
                </div>

                <div className="quote-form__field">
                  <label htmlFor="quote-whatsapp">WhatsApp number <span>*</span></label>
                  <input
                    id="quote-whatsapp"
                    name="whatsapp"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={fieldLengthLimits.whatsapp}
                    placeholder="+92 300 1234567"
                    required
                    aria-invalid={Boolean(errors.whatsapp)}
                    aria-describedby={errors.whatsapp ? 'quote-whatsapp-error' : 'quote-whatsapp-hint'}
                  />
                  {errors.whatsapp
                    ? <p className="quote-form__error" id="quote-whatsapp-error">{errors.whatsapp}</p>
                    : <p className="quote-form__hint" id="quote-whatsapp-hint">Include your country code, e.g. +92.</p>}
                </div>

                <div className="quote-form__field">
                  <label htmlFor="quote-product">What do you want made? <span>*</span></label>
                  <select
                    id="quote-product"
                    name="product"
                    defaultValue={initialProduct ?? ''}
                    required
                    aria-invalid={Boolean(errors.product)}
                    aria-describedby={errors.product ? 'quote-product-error' : undefined}
                  >
                    <option value="" disabled>Select a product</option>
                    {initialProduct && !['T-shirts', 'Hoodies', 'Jerseys', 'Tracksuits', 'Shorts', 'Jackets', 'Other'].includes(initialProduct)
                      && <option value={initialProduct}>{initialProduct}</option>}
                    <option>T-shirts</option>
                    <option>Hoodies</option>
                    <option>Jerseys</option>
                    <option>Tracksuits</option>
                    <option>Shorts</option>
                    <option>Jackets</option>
                    <option>Other</option>
                  </select>
                  {errors.product && <p className="quote-form__error" id="quote-product-error">{errors.product}</p>}
                </div>

                <div className="quote-form__field">
                  <label htmlFor="quote-category">Category <span>*</span></label>
                  <select
                    id="quote-category"
                    name="category"
                    defaultValue={initialCategory ?? ''}
                    required
                    aria-invalid={Boolean(errors.category)}
                    aria-describedby={errors.category ? 'quote-category-error' : undefined}
                  >
                    <option value="" disabled>Select a category</option>
                    {initialCategory && !['Streetwear', 'Sportswear', 'Both'].includes(initialCategory)
                      && <option value={initialCategory}>{initialCategory}</option>}
                    <option>Streetwear</option>
                    <option>Sportswear</option>
                    <option>Both</option>
                  </select>
                  {errors.category && <p className="quote-form__error" id="quote-category-error">{errors.category}</p>}
                </div>

                <div className="quote-form__field">
                  <label htmlFor="quote-quantity">Approx. quantity per design <span>*</span></label>
                  <select
                    id="quote-quantity"
                    name="quantity"
                    defaultValue=""
                    required
                    aria-invalid={Boolean(errors.quantity)}
                    aria-describedby={errors.quantity ? 'quote-quantity-error' : undefined}
                  >
                    <option value="" disabled>Select a quantity</option>
                    <option>Under 100</option>
                    <option>100-300</option>
                    <option>300-500</option>
                    <option>500-1000</option>
                    <option>1000+</option>
                  </select>
                  {errors.quantity && <p className="quote-form__error" id="quote-quantity-error">{errors.quantity}</p>}
                </div>

                <div className="quote-form__field">
                  <label htmlFor="quote-date">Target delivery date</label>
                  <input id="quote-date" name="targetDate" type="date" />
                </div>

                <div className="quote-form__field quote-form__field--wide">
                  <label htmlFor="quote-design-file">Design or tech pack <span className="quote-form__optional">(optional)</span></label>
                  <input
                    id="quote-design-file"
                    name="designFile"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    aria-invalid={Boolean(errors.designFile)}
                    aria-describedby={errors.designFile ? 'quote-design-file-error' : 'quote-design-file-hint'}
                  />
                  {errors.designFile
                    ? <p className="quote-form__error" id="quote-design-file-error">{errors.designFile}</p>
                    : <p className="quote-form__hint" id="quote-design-file-hint">PDF, JPG or PNG · or paste a Google Drive / WeTransfer link below.</p>}
                </div>

                <div className="quote-form__field quote-form__field--wide">
                  <label htmlFor="quote-design-link">Design link <span className="quote-form__optional">(optional)</span></label>
                  <input
                    id="quote-design-link"
                    name="designLink"
                    type="url"
                    inputMode="url"
                    maxLength={fieldLengthLimits.designLink}
                    placeholder="https://drive.google.com/..."
                  />
                </div>

                <div className="quote-form__field quote-form__field--wide">
                  <label htmlFor="quote-notes">Extra notes <span className="quote-form__optional">(optional)</span></label>
                  <textarea
                    id="quote-notes"
                    name="notes"
                    rows={3}
                    maxLength={fieldLengthLimits.notes}
                  />
                </div>
              </div>

              <div className="quote-form__honeypot" aria-hidden="true">
                <label htmlFor="quote-website">Leave this field empty</label>
                <input id="quote-website" name="website" tabIndex={-1} autoComplete="off" />
              </div>

              {submitState === 'error' && (
                <p className="quote-form__submit-error" role="alert">
                  Something went wrong. Please email us at{' '}
                  <a href={CONTACT_MAILTO_LINK}>{CONTACT_EMAIL}</a>
                  {' '}or message us on{' '}
                  <a href={QUOTE_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">WhatsApp</a>.
                </p>
              )}

              <div className="quote-form__actions">
                <button
                  className="quote-form__submit"
                  type="submit"
                  disabled={submitState === 'sending'}
                >
                  {submitState === 'sending' ? 'Sending...' : 'Send request'}
                  {submitState !== 'sending' && <span aria-hidden="true">↗</span>}
                </button>
                <a
                  className="quote-form__whatsapp"
                  href={QUOTE_WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Prefer to chat? Message us on WhatsApp
                </a>
              </div>
            </form>
          </>
        )}
      </div>
    </dialog>
  );
}
