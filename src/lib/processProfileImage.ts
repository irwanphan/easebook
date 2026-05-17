const MAX_SIZE_PX = 160;
const WEBP_QUALITY = 0.88;

export type ProcessedProfileImage = {
  previewUrl: string;
  webpBytes: number[];
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal memuat gambar."));
    };
    img.src = url;
  });
}

/** Crop center square lalu resize ke 160×160, ekspor WebP. */
export async function processProfileImageFile(file: File): Promise<ProcessedProfileImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar (JPG, PNG, WebP, dll.).");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Ukuran file terlalu besar (maks. 8 MB sebelum diproses).");
  }

  const img = await loadImageFromFile(file);
  const size = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = Math.floor((img.naturalWidth - size) / 2);
  const sy = Math.floor((img.naturalHeight - size) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = MAX_SIZE_PX;
  canvas.height = MAX_SIZE_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas tidak didukung di perangkat ini.");
  }
  ctx.drawImage(img, sx, sy, size, size, 0, 0, MAX_SIZE_PX, MAX_SIZE_PX);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Konversi ke WebP gagal. Coba format gambar lain."));
      },
      "image/webp",
      WEBP_QUALITY,
    );
  });

  const buffer = await blob.arrayBuffer();
  const webpBytes = Array.from(new Uint8Array(buffer));
  const previewUrl = URL.createObjectURL(blob);

  return { previewUrl, webpBytes };
}
