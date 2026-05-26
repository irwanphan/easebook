/**
 * Production hardening: cegah user (atau pihak iseng) membuka context menu
 * dan shortcut DevTools pada build production.
 *
 * Catatan akuntansi keamanan:
 * - Ini hanya safety net di sisi UI. Tauri release build sendiri sudah
 *   mematikan fitur `devtools` secara default (tidak ada `features = ["devtools"]`
 *   pada `Cargo.toml`), jadi "Inspect Element" memang sudah tidak muncul.
 * - Modul ini menambah lapisan agar:
 *     1. Context menu OS (Reload / Back / Look up / dll) tidak muncul.
 *     2. Shortcut DevTools (F12, Cmd+Opt+I, Ctrl+Shift+I, dll) tidak
 *        memunculkan jendela inspector seandainya user mengaktifkan
 *        flag sistem (mis. `defaults write -g WebKitDeveloperExtras -bool YES`
 *        di macOS) atau menjalankan build debug secara tidak sengaja.
 *
 * Tidak diblok:
 * - Cmd+R / Ctrl+R (reload) — masih dianggap shortcut wajar untuk recovery
 *   apabila UI hang. Kalau ingin lebih ketat, tambahkan di `BLOCKED_KEYS`.
 */

const ALREADY_INSTALLED = "__easybookProductionHardeningInstalled__";

type BlockedKey = {
  key: string;
  withCtrl?: boolean;
  withMeta?: boolean;
  withShift?: boolean;
  withAlt?: boolean;
};

const BLOCKED_KEYS: BlockedKey[] = [
  { key: "F12" },
  { key: "i", withCtrl: true, withShift: true },
  { key: "I", withCtrl: true, withShift: true },
  { key: "i", withMeta: true, withAlt: true },
  { key: "I", withMeta: true, withAlt: true },
  { key: "j", withCtrl: true, withShift: true },
  { key: "J", withCtrl: true, withShift: true },
  { key: "j", withMeta: true, withAlt: true },
  { key: "J", withMeta: true, withAlt: true },
  { key: "c", withCtrl: true, withShift: true },
  { key: "C", withCtrl: true, withShift: true },
  { key: "c", withMeta: true, withAlt: true },
  { key: "C", withMeta: true, withAlt: true },
  { key: "u", withCtrl: true },
  { key: "U", withCtrl: true },
  { key: "u", withMeta: true, withAlt: true },
  { key: "U", withMeta: true, withAlt: true },
];

function matchesBlocked(event: KeyboardEvent): boolean {
  for (const rule of BLOCKED_KEYS) {
    if (event.key !== rule.key) continue;
    if ((rule.withCtrl ?? false) !== event.ctrlKey) continue;
    if ((rule.withMeta ?? false) !== event.metaKey) continue;
    if ((rule.withShift ?? false) !== event.shiftKey) continue;
    if ((rule.withAlt ?? false) !== event.altKey) continue;
    return true;
  }
  return false;
}

export function installProductionHardening(): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as Record<string, unknown>;
  if (w[ALREADY_INSTALLED]) return;
  w[ALREADY_INSTALLED] = true;

  window.addEventListener(
    "contextmenu",
    (event) => {
      event.preventDefault();
    },
    { capture: true },
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (matchesBlocked(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    { capture: true },
  );
}
