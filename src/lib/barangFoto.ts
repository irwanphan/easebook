import { convertFileSrc, invoke } from "@tauri-apps/api/core";

export function fotoBarangDisplayUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;
  return convertFileSrc(path);
}

export async function loadBarangFotoPreviewUrl(kode: string): Promise<string | null> {
  const path = await invoke<string | null>("barang_foto_path", { kode });
  return fotoBarangDisplayUrl(path);
}

export async function saveBarangFoto(kode: string, webpBytes: number[]): Promise<void> {
  await invoke("barang_foto_save", { kode, data: webpBytes });
}

export async function removeBarangFoto(kode: string): Promise<void> {
  await invoke("barang_foto_remove", { kode });
}

export type BarangFotoState = {
  previewUrl: string | null;
  webpBytes: number[] | null;
  removed: boolean;
};

export function emptyBarangFotoState(): BarangFotoState {
  return { previewUrl: null, webpBytes: null, removed: false };
}

export async function applyBarangFotoChanges(kode: string, foto: BarangFotoState): Promise<void> {
  if (foto.webpBytes && foto.webpBytes.length > 0) {
    await saveBarangFoto(kode, foto.webpBytes);
  } else if (foto.removed) {
    await removeBarangFoto(kode);
  }
}
