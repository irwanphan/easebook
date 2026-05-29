import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";

export const POS_WINDOW_LABEL = "pos";

const POS_URL = "/index.html#/pos";

type OpenPOSResult = {
  reused: boolean;
};

/**
 * Buka atau aktifkan window POS. Hanya boleh ada satu window POS aktif —
 * panggilan kedua akan mem-focus window yang sudah ada.
 */
export async function openPOSWindow(): Promise<OpenPOSResult> {
  const existing = await WebviewWindow.getByLabel(POS_WINDOW_LABEL);
  if (existing) {
    try {
      await existing.unminimize();
    } catch {
      // window mungkin tidak minimized; abaikan
    }
    await existing.show();
    await existing.setFocus();
    return { reused: true };
  }

  const win = new WebviewWindow(POS_WINDOW_LABEL, {
    url: POS_URL,
    title: "Kasir POS — EasyBook",
    width: 1366,
    height: 820,
    minWidth: 1100,
    minHeight: 680,
    resizable: true,
    maximized: true,
    center: true,
    decorations: true,
  });

  await new Promise<void>((resolve, reject) => {
    const offCreated = win.once("tauri://created", () => {
      offCreated.then((un) => un());
      offError.then((un) => un());
      resolve();
    });
    const offError = win.once("tauri://error", (e) => {
      offCreated.then((un) => un());
      offError.then((un) => un());
      reject(new Error(String((e as { payload?: unknown }).payload ?? "Gagal membuka window POS.")));
    });
  });

  return { reused: false };
}

/** True jika kode sedang berjalan di window POS. */
export function isPOSWindow(): boolean {
  try {
    return getCurrentWindow().label === POS_WINDOW_LABEL;
  } catch {
    return false;
  }
}

/** Label window aktif (mis. "main" / "pos"). null bila tidak berjalan di Tauri. */
export function currentWindowLabel(): string | null {
  try {
    return getCurrentWindow().label;
  } catch {
    return null;
  }
}
