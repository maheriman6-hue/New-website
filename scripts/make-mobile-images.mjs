import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const outputDirectory = path.join(root, 'public', 'media', 'mobile');
const images = [
  {
    input: 'sportswear-hero.jpg',
    output: 'sportswear-m.jpg',
    posX: 0.5,
  },
  {
    input: 'streetwear-hero.jpg',
    output: 'streetwear-m.jpg',
    posX: 0.5,
  },
  {
    input: 'stiching.webp',
    output: 'stitching-m.jpg',
    posX: 0.5,
  },
  {
    input: 'zateef-delivery.webp',
    output: 'delivery-m.jpg',
    posX: 0.58,
  },
];

await mkdir(outputDirectory, { recursive: true });

for (const { input, output, posX } of images) {
  const inputPath = path.join(root, 'public', 'media', input);
  const outputPath = path.join(outputDirectory, output);
  const source = sharp(inputPath);
  const { width, height } = await source.metadata();

  if (!width || !height) {
    throw new Error(`Could not read image dimensions for ${inputPath}`);
  }

  const cropWidth = Math.round(height * 0.56);
  const left = Math.round((width - cropWidth) * posX);

  await source
    .extract({ left, top: 0, width: cropWidth, height })
    .resize(1200, 2143, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 1.2, m1: 0.4, m2: 1.2 })
    .jpeg({ quality: 90, mozjpeg: true, progressive: true })
    .toFile(outputPath);

  console.log(
    `${input} ${width}x${height} crop=${left},0 ${cropWidth}x${height} posX=${posX} -> ${output}`,
  );
}
