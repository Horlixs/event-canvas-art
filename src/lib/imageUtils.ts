/**
 * Compresses an image file to a target max dimension and quality.
 * Returns a base64 data URL.
 * Reports progress via an optional callback.
 */
export async function compressImage(
  file: File,
  opts: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    onProgress?: (pct: number) => void;
  } = {}
): Promise<{ dataUrl: string; width: number; height: number }> {
  const { maxWidth = 2048, maxHeight = 2048, quality = 0.8, onProgress } = opts;

  onProgress?.(5);

  // 1. Read the file as a bitmap (off-main-thread when possible)
  const bitmap = await createImageBitmap(file);
  onProgress?.(30);

  // 2. Calculate target dimensions
  let { width, height } = bitmap;
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  onProgress?.(40);

  // 3. Draw to an OffscreenCanvas (or regular canvas as fallback)
  let dataUrl: string;

  if (typeof OffscreenCanvas !== 'undefined') {
    const oc = new OffscreenCanvas(width, height);
    const ctx = oc.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');
    ctx.drawImage(bitmap, 0, 0, width, height);
    onProgress?.(70);

    const blob = await oc.convertToBlob({ type: 'image/jpeg', quality });
    onProgress?.(90);

    dataUrl = await blobToDataUrl(blob);
  } else {
    // Fallback for browsers without OffscreenCanvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');
    ctx.drawImage(bitmap, 0, 0, width, height);
    onProgress?.(70);

    dataUrl = canvas.toDataURL('image/jpeg', quality);
    onProgress?.(90);
  }

  bitmap.close();
  onProgress?.(100);

  return { dataUrl, width, height };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
