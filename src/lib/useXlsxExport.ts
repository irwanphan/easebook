import { useCallback, useState } from "react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { exportToXlsx, type XlsxExportOptions, type XlsxExportResult } from "./exportXlsx";
import { notify } from "./notify";
import { tauriErrorMessage } from "./tauriError";

/**
 * Hook tipis yang membungkus pola standar export → toast.
 *
 * Bertanggung jawab khusus:
 * - State `exporting` (untuk disable tombol / label spinner).
 * - Memanggil `exportToXlsx` dengan opsi yang diberikan.
 * - Menampilkan toast standar:
 *   - **Sukses** → "File Excel berhasil disimpan" + tombol "Buka folder"
 *     (highlight file via `revealItemInDir`).
 *   - **Dibatalkan** → info "Export dibatalkan."
 *   - **Gagal**     → error "Gagal export Excel" dengan pesan exception.
 *
 * Halaman fokus mendefinisikan **apa** yang di-export (kolom + data),
 * hook ini mengurus **bagaimana** mempresentasikan hasilnya.
 *
 * @example
 * ```tsx
 * const { exporting, exportNow } = useXlsxExport();
 *
 * const handleExport = useCallback(async () => {
 *   if (rows.length === 0) return;
 *   await exportNow<MyRow>({
 *     fileName: "laporan_xyz",
 *     columns: [...],
 *     data: rows,
 *   });
 * }, [rows, exportNow]);
 * ```
 */
export function useXlsxExport() {
  const [exporting, setExporting] = useState(false);

  const exportNow = useCallback(async <T>(
    opts: XlsxExportOptions<T>,
  ): Promise<XlsxExportResult | null> => {
    setExporting(true);
    try {
      const result = await exportToXlsx<T>(opts);

      if (result.cancelled) {
        notify.info("Export dibatalkan.");
        return result;
      }

      notify.success("File Excel berhasil disimpan", {
        description: result.filePath ?? result.fileName,
        duration: 6000,
        action: result.filePath
          ? {
              label: "Buka folder",
              onClick: () => {
                void revealItemInDir(result.filePath as string).catch((e) => {
                  notify.error("Gagal membuka folder", {
                    description: tauriErrorMessage(e),
                  });
                });
              },
            }
          : undefined,
      });
      return result;
    } catch (e) {
      notify.error("Gagal export Excel", { description: tauriErrorMessage(e) });
      return null;
    } finally {
      setExporting(false);
    }
  }, []);

  return { exporting, exportNow };
}
