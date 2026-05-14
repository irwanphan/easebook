/** Pesan error dari `invoke` Tauri (string atau objek). */
export function tauriErrorMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Terjadi kesalahan.";
}
