// Compresses an image file into a small data: URL so it can be stored directly as a Firestore
// field -- no Cloud Storage (and therefore no paid Blaze plan) required. A face-sized thumbnail
// comfortably fits a Firestore document's 1 MiB limit with huge headroom to spare.
const MAX_DATA_URL_LENGTH = 400_000; // ~300KB of actual image data once base64 overhead is backed out

export function compressImageFile(file, { maxDim = 240, quality = 0.72 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);

      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      // One more pass at a lower quality if a very busy/high-res photo still came out large.
      if (dataUrl.length > MAX_DATA_URL_LENGTH) {
        dataUrl = canvas.toDataURL("image/jpeg", 0.5);
      }
      if (dataUrl.length > MAX_DATA_URL_LENGTH) {
        reject(new Error("That photo is too large even after compression. Please try a simpler image."));
        return;
      }
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Couldn't read that image file."));
    };
    img.src = objectUrl;
  });
}
