import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Resizes and compresses an image file to WebP format (max 1200px longest side)
 */
export async function compressImageToWebP(
  file: File,
  maxDimension = 1200,
  quality = 0.85
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/webp', quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              reject(new Error('WebP blob creation failed'));
            }
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a food photo to Firebase Storage with WebP compression,
 * or returns local data URL if Firebase Storage is unavailable.
 */
export async function uploadRecipePhoto(
  file: File,
  householdId: string = 'demo_household',
  recipeId: string = 'recipe'
): Promise<string> {
  const { blob, dataUrl } = await compressImageToWebP(file);

  if (storage) {
    try {
      const filename = `food_photos/${householdId}/${recipeId}_${Date.now()}.webp`;
      const storageRef = ref(storage, filename);
      const snapshot = await uploadBytes(storageRef, blob, {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000',
      });
      return await getDownloadURL(snapshot.ref);
    } catch (err) {
      console.warn('[Storage] Upload failed, falling back to data URL:', err);
      return dataUrl;
    }
  }

  // Demo / local mode fallback
  return dataUrl;
}
