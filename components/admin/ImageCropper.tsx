'use client';

import Cropper, { type Area, type Point } from 'react-easy-crop';
import { useEffect, useState } from 'react';
import styles from './Admin.module.css';

type ImageCropperProps = {
  file: File;
  imageUrl: string;
  aspectRatio: number;
  outputWidth: number;
  outputHeight: number;
  onCancel: () => void;
  onDone: (image: Blob) => Promise<void>;
  onError: (error: unknown) => void;
};

async function createCroppedWebp(
  file: File,
  area: Area,
  width: number,
  height: number,
): Promise<Blob> {
  const image = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    image.close();
    throw new Error('Could not prepare the cropped image.');
  }
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    width,
    height,
  );
  image.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not export the cropped image.'));
    }, 'image/webp', 0.85);
  });
}

export function ImageCropper({
  file,
  imageUrl,
  aspectRatio,
  outputWidth,
  outputHeight,
  onCancel,
  onDone,
  onError,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [sourceSize, setSourceSize] = useState<{ width: number; height: number } | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !applying) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [applying, onCancel]);

  async function applyCrop() {
    if (!croppedArea || applying) return;
    setApplying(true);
    try {
      const image = await createCroppedWebp(file, croppedArea, outputWidth, outputHeight);
      await onDone(image);
      onCancel();
    } catch (error) {
      onError(error);
    } finally {
      setApplying(false);
    }
  }

  const lowResolution = sourceSize !== null && (
    aspectRatio < 1
      ? sourceSize.width < 720 || sourceSize.height < 1280
      : sourceSize.width < 1280 || sourceSize.height < 720
  );

  return (
    <div className={styles.cropperOverlay}>
      <section
        className={styles.cropperDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-cropper-title"
      >
        <header className={styles.cropperHeader}>
          <div>
            <h2 id="image-cropper-title">Adjust image</h2>
            <p>{outputWidth} × {outputHeight} WebP</p>
          </div>
          <button
            className={styles.iconButton}
            type="button"
            aria-label="Cancel crop"
            disabled={applying}
            onClick={onCancel}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className={styles.cropperViewport}>
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_area, pixels) => setCroppedArea(pixels)}
              onMediaLoaded={(media) => setSourceSize({
                width: media.naturalWidth,
                height: media.naturalHeight,
              })}
              restrictPosition
            />
          )}
        </div>
        {lowResolution && (
          <p className={styles.cropperWarning} role="status">
            This image is smaller than the recommended size and may look blurry after cropping.
          </p>
        )}
        <label className={styles.cropperZoom}>
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            aria-label="Zoom image"
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
        <footer className={styles.cropperFooter}>
          <button
            className={styles.button}
            type="button"
            disabled={applying}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className={`${styles.button} ${styles.redButton}`}
            type="button"
            disabled={applying || !croppedArea}
            onClick={() => void applyCrop()}
          >
            {applying ? 'Applying…' : 'Apply crop'}
          </button>
        </footer>
      </section>
    </div>
  );
}
