'use client';

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import {
  CONTACT_EMAIL,
  CONTACT_MAILTO_LINK,
  QUOTE_WHATSAPP_LINK,
} from '@/lib/contactLinks';

const FORM_ENDPOINT = '';
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_NOTES_LENGTH = 600;
const CATEGORY_OPTIONS = ['Streetwear', 'Sportswear', 'Workwear', 'Uniforms', 'Loungewear', 'Both', 'Other'];
const QUANTITY_OPTIONS = ['50–100', '100–300', '300–500', '500–1,000', '1,000+'];
const PRODUCT_OPTIONS = [
  'T-shirts',
  'Hoodies & sweatshirts',
  'Jackets',
  'Trousers & shorts',
  'Activewear',
  'Jerseys',
  'Tracksuits',
  'Shorts',
  'Uniforms',
  'Other',
  'Something else',
];

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
  notes: MAX_NOTES_LENGTH,
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

const allowedFileTypes = ['application/pdf', 'image/jpeg', 'image/png'];
const allowedFileExtension = /\.(pdf|jpe?g|png)$/i;

function getFileError(file: File) {
  if (!allowedFileExtension.test(file.name)
    || (file.type !== '' && !allowedFileTypes.includes(file.type))) {
    return 'Use a PDF, JPG, or PNG file.';
  }
  if (file.size > MAX_UPLOAD_BYTES) return 'Files must be 20 MB or smaller.';
  return '';
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

  const fullName = String(formData.get('fullName') ?? '').trim();
  if (fullName && fullName.length < 2) errors.fullName = 'Add your name.';

  const brandName = String(formData.get('brandName') ?? '').trim();
  if (brandName && brandName.length < 2) errors.brandName = 'Add your brand name.';

  const email = String(formData.get('email') ?? '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  const whatsapp = String(formData.get('whatsapp') ?? '').trim();
  if (whatsapp && !/^\+\d[\d\s-]{8,}$/.test(whatsapp)) {
    errors.whatsapp = 'Start with your country code, e.g. +92.';
  }

  const file = formData.get('designFile');
  if (file instanceof File && file.size > 0) {
    const fileError = getFileError(file);
    if (fileError) errors.designFile = fileError;
  }

  return errors;
}

function getCompletedRequiredFields(form: HTMLFormElement) {
  const formData = new FormData(form);
  const name = String(formData.get('fullName') ?? '').trim();
  const brand = String(formData.get('brandName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const whatsapp = String(formData.get('whatsapp') ?? '').trim();

  return [
    name.length > 1,
    brand.length > 1,
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email),
    /^\+\d[\d\s-]{8,}$/.test(whatsapp),
    Boolean(String(formData.get('product') ?? '').trim()),
    Boolean(String(formData.get('category') ?? '').trim()),
    Boolean(String(formData.get('quantity') ?? '').trim()),
  ].filter(Boolean).length;
}

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
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [isClosing, setIsClosing] = useState(false);
  const [completedFields, setCompletedFields] = useState(
    Number(Boolean(initialProduct)) + Number(Boolean(initialCategory)),
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [notesLength, setNotesLength] = useState(0);
  const [requestReference, setRequestReference] = useState('');
  const [successName, setSuccessName] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    document.dispatchEvent(new Event('quote-modal:open'));
    window.requestAnimationFrame(() => firstFieldRef.current?.focus());

    return () => {
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

  function handleFormChange(event: ChangeEvent<HTMLFormElement>) {
    setCompletedFields(getCompletedRequiredFields(event.currentTarget));
  }

  function setDesignFile(file: File | undefined) {
    if (!file) return;
    const fileError = getFileError(file);
    if (fileError) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSelectedFile(null);
      setErrors((current) => ({ ...current, designFile: fileError }));
      return;
    }

    setSelectedFile(file);
    setErrors((current) => {
      const { designFile: _designFile, ...remainingErrors } = current;
      return remainingErrors;
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setDesignFile(event.currentTarget.files?.[0]);
  }

  function handleFileDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDraggingFile(false);
    const file = event.dataTransfer.files[0];
    if (!file) return;

    const fileError = getFileError(file);
    if (fileError) {
      setDesignFile(file);
      return;
    }

    const input = fileInputRef.current;
    if (!input) {
      console.error('Unable to access the quote form file input.');
      return;
    }

    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    setDesignFile(file);
  }

  function removeDesignFile() {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSelectedFile(null);
    setErrors((current) => {
      const { designFile: _designFile, ...remainingErrors } = current;
      return remainingErrors;
    });
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
      if (firstInvalidField === 'designFile') {
        fileInputRef.current?.focus();
      } else {
        form.querySelector<HTMLElement>(`[name="${firstInvalidField}"]`)?.focus();
      }
      return;
    }

    setSubmitState('sending');
    const firstName = String(formData.get('fullName') ?? '').trim().split(/\s+/)[0];

    void submitQuoteForm(formData)
      .then(() => {
        setSuccessName(firstName);
        setRequestReference(`REF · ${Math.random().toString(36).slice(2, 7).toUpperCase()}`);
        form.reset();
        setSelectedFile(null);
        setNotesLength(0);
        setCompletedFields(0);
        setSubmitState('success');
      })
      .catch((error: unknown) => {
        console.error('Unable to send quote request:', error);
        setSubmitState('error');
      });
  }

  function startAnotherProject() {
    setErrors({});
    setRequestReference('');
    setSuccessName('');
    setCompletedFields(Number(Boolean(initialProduct)) + Number(Boolean(initialCategory)));
    setSubmitState('idle');
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    window.requestAnimationFrame(() => firstFieldRef.current?.focus());
  }

  const categories = initialCategory && !CATEGORY_OPTIONS.includes(initialCategory)
    ? [...CATEGORY_OPTIONS, initialCategory]
    : CATEGORY_OPTIONS;
  const progress = (completedFields / requiredFields.length) * 100;

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
        <div
          className="quote-modal__progress"
          role="progressbar"
          aria-label="Required fields completed"
          aria-valuemin={0}
          aria-valuemax={requiredFields.length}
          aria-valuenow={completedFields}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <button
          className="quote-modal__close"
          type="button"
          aria-label="Close quote request form"
          onClick={closeModal}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M2 2l14 14M16 2 2 16" />
          </svg>
        </button>

        {submitState === 'success' ? (
          <section className="quote-modal__success" aria-live="polite">
            <p className="quote-modal__eyebrow">REQUEST RECEIVED</p>
            <h2 id="quote-modal-title">Thank you. We&apos;re on it.</h2>
            <p>
              {successName ? `Thanks, ${successName}. ` : ''}
              We&apos;ll reply on WhatsApp and email within one working day.
            </p>
            <span className="quote-modal__reference">{requestReference}</span>
            <a href={QUOTE_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
              Need it faster? Message us on WhatsApp.
            </a>
            <button type="button" className="quote-modal__again" onClick={startAnotherProject}>
              Send another project
            </button>
          </section>
        ) : (
          <form
            className="quote-form"
            noValidate
            onSubmit={handleSubmit}
            onChange={handleFormChange}
          >
            <div className="quote-modal__scroll" ref={scrollRef}>
              <p className="quote-modal__eyebrow">(06) START A PROJECT</p>
              <h2 id="quote-modal-title" className="quote-modal__title">
                Tell us what you&apos;re making.
              </h2>
              <p className="quote-modal__lead">
                Five minutes now saves a week of back-and-forth. We reply with a quote within one working day.
              </p>

              <fieldset className="quote-form__section">
                <legend>Who you are</legend>
                <div className="quote-form__grid">
                  <div className="quote-form__field">
                    <label htmlFor="quote-full-name">Full name <span>*</span></label>
                    <input
                      ref={firstFieldRef}
                      id="quote-full-name"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder="Your Name"
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
                      type="text"
                      autoComplete="organization"
                      placeholder="Your label"
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
                      placeholder="you@brand.com"
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
                      placeholder="+92 300 1234567"
                      maxLength={fieldLengthLimits.whatsapp}
                      required
                      aria-invalid={Boolean(errors.whatsapp)}
                      aria-describedby={errors.whatsapp ? 'quote-whatsapp-error' : 'quote-whatsapp-hint'}
                    />
                    {errors.whatsapp
                      ? <p className="quote-form__error" id="quote-whatsapp-error">{errors.whatsapp}</p>
                      : <p className="quote-form__hint" id="quote-whatsapp-hint">Include your country code, e.g. +92.</p>}
                  </div>
                </div>
              </fieldset>

              <fieldset className="quote-form__section">
                <legend>What you want made</legend>
                <div className="quote-form__grid">
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
                      {initialProduct && !PRODUCT_OPTIONS.includes(initialProduct)
                        && <option value={initialProduct}>{initialProduct}</option>}
                      {PRODUCT_OPTIONS.map((product) => <option key={product}>{product}</option>)}
                    </select>
                    {errors.product && <p className="quote-form__error" id="quote-product-error">{errors.product}</p>}
                  </div>

                  <div className="quote-form__field">
                    <label htmlFor="quote-date">
                      Target delivery date <span className="quote-form__optional">(optional)</span>
                    </label>
                    <input id="quote-date" name="targetDate" type="date" />
                  </div>

                  <div className="quote-form__field quote-form__field--wide">
                    <span className="quote-form__label" id="quote-category-label">Category <span>*</span></span>
                    <div
                      className="quote-form__chips"
                      role="radiogroup"
                      aria-labelledby="quote-category-label"
                      aria-describedby={errors.category ? 'quote-category-error' : undefined}
                      aria-invalid={Boolean(errors.category)}
                    >
                      {categories.map((category) => (
                        <label className="quote-form__chip" key={category}>
                          <input
                            type="radio"
                            name="category"
                            value={category}
                            defaultChecked={initialCategory === category}
                            required
                          />
                          <span>{category}</span>
                        </label>
                      ))}
                    </div>
                    {errors.category && <p className="quote-form__error" id="quote-category-error">{errors.category}</p>}
                  </div>

                  <div className="quote-form__field quote-form__field--wide">
                    <span className="quote-form__label" id="quote-quantity-label">
                      Approx. quantity per design <span>*</span>
                    </span>
                    <div
                      className="quote-form__chips"
                      role="radiogroup"
                      aria-labelledby="quote-quantity-label"
                      aria-describedby={errors.quantity ? 'quote-quantity-error' : undefined}
                      aria-invalid={Boolean(errors.quantity)}
                    >
                      {QUANTITY_OPTIONS.map((quantity) => (
                        <label className="quote-form__chip" key={quantity}>
                          <input type="radio" name="quantity" value={quantity} required />
                          <span>{quantity}</span>
                        </label>
                      ))}
                    </div>
                    {errors.quantity && <p className="quote-form__error" id="quote-quantity-error">{errors.quantity}</p>}
                  </div>
                </div>
              </fieldset>

              <fieldset className="quote-form__section">
                <legend>Your design</legend>
                <div className="quote-form__grid">
                  <div className="quote-form__field quote-form__field--wide">
                    <span className="quote-form__label" id="quote-file-label">
                      Design or tech pack <span className="quote-form__optional">(optional)</span>
                    </span>
                    <input
                      ref={fileInputRef}
                      className="quote-form__file-input"
                      id="quote-design-file"
                      name="designFile"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      aria-labelledby="quote-file-label"
                      aria-describedby={errors.designFile ? 'quote-design-file-error' : undefined}
                      aria-invalid={Boolean(errors.designFile)}
                      onChange={handleFileChange}
                    />
                    <label
                      className={`quote-form__drop${isDraggingFile ? ' is-over' : ''}`}
                      htmlFor="quote-design-file"
                      onDragEnter={(event) => {
                        event.preventDefault();
                        setIsDraggingFile(true);
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDragLeave={(event) => {
                        if (!(event.relatedTarget instanceof Node)
                          || !event.currentTarget.contains(event.relatedTarget)) {
                          setIsDraggingFile(false);
                        }
                      }}
                      onDrop={handleFileDrop}
                    >
                      <span className="quote-form__drop-icon" aria-hidden="true">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
                        </svg>
                      </span>
                      <span>
                        <strong>{selectedFile ? selectedFile.name : 'Drop a file here, or browse'}</strong>
                        <small>
                          {selectedFile
                            ? `${(selectedFile.size / 1048576).toFixed(1)} MB · Click to replace`
                            : 'PDF, JPG or PNG · up to 20 MB'}
                        </small>
                      </span>
                    </label>
                    {selectedFile && (
                      <button className="quote-form__file-remove" type="button" onClick={removeDesignFile}>
                        Remove file
                      </button>
                    )}
                    {errors.designFile && <p className="quote-form__error" id="quote-design-file-error">{errors.designFile}</p>}
                  </div>

                  <div className="quote-form__field quote-form__field--wide">
                    <div className="quote-form__or">OR PASTE A LINK</div>
                  </div>

                  <div className="quote-form__field quote-form__field--wide">
                    <label htmlFor="quote-design-link">
                      Design link <span className="quote-form__optional">(optional)</span>
                    </label>
                    <input
                      id="quote-design-link"
                      name="designLink"
                      type="url"
                      inputMode="url"
                      maxLength={fieldLengthLimits.designLink}
                      placeholder="https://drive.google.com/…"
                    />
                    <p className="quote-form__hint">Google Drive or WeTransfer. Make sure sharing is on.</p>
                  </div>

                  <div className="quote-form__field quote-form__field--wide">
                    <label htmlFor="quote-notes">
                      Extra notes <span className="quote-form__optional">(optional)</span>
                    </label>
                    <textarea
                      id="quote-notes"
                      name="notes"
                      rows={4}
                      maxLength={MAX_NOTES_LENGTH}
                      placeholder="Fabrics, GSM, colours, trims, packaging, anything we should know."
                      onChange={(event) => setNotesLength(event.currentTarget.value.length)}
                    />
                    <span className="quote-form__count">{notesLength} / {MAX_NOTES_LENGTH}</span>
                  </div>
                </div>
              </fieldset>

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
            </div>

            <footer className="quote-form__footer">
              <button
                className="quote-form__submit"
                type="submit"
                disabled={submitState === 'sending'}
              >
                {submitState === 'sending' ? 'Sending...' : 'Send request'}
                {submitState !== 'sending' && (
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M2 12 12 2M4 2h8v8" />
                  </svg>
                )}
              </button>
              <a className="quote-form__whatsapp" href={QUOTE_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                Prefer to chat? Message us on WhatsApp
              </a>
              <span className="quote-form__progress-count">
                {completedFields} of {requiredFields.length} required
              </span>
            </footer>
          </form>
        )}
      </div>
    </dialog>
  );
}
