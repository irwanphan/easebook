import { convertFileSrc, invoke } from "@tauri-apps/api/core";

/** URL untuk menampilkan foto profil dari path absolut Tauri. */
export function fotoProfilDisplayUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;
  return convertFileSrc(path);
}

export async function loadPenggunaFotoPreviewUrl(username: string): Promise<string | null> {
  const path = await invoke<string | null>("pengguna_foto_path", { username });
  return fotoProfilDisplayUrl(path);
}

export async function savePenggunaFoto(username: string, webpBytes: number[]): Promise<void> {
  await invoke("pengguna_foto_save", { username, data: webpBytes });
}

export async function removePenggunaFoto(username: string): Promise<void> {
  await invoke("pengguna_foto_remove", { username });
}

export type PenggunaFotoFormState = {
  previewUrl: string | null;
  webpBytes: number[] | null;
  removed: boolean;
};

/** Terapkan perubahan foto setelah insert/update pengguna. */
export async function applyPenggunaFotoChanges(
  username: string,
  foto: PenggunaFotoFormState,
): Promise<void> {
  if (foto.webpBytes && foto.webpBytes.length > 0) {
    await savePenggunaFoto(username, foto.webpBytes);
  } else if (foto.removed) {
    await removePenggunaFoto(username);
  }
}
