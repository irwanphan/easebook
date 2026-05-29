import writeExcelFile from "write-excel-file/universal";
import { save as tauriSaveDialog } from "@tauri-apps/plugin-dialog";
import { writeFile as tauriWriteFile } from "@tauri-apps/plugin-fs";

/**
 * Tipe data cell yang dipahami oleh writer Excel.
 *
 *  - `text`      → string biasa.
 *  - `numeric`   → angka (default format: thousand separator tanpa desimal).
 *  - `currency`  → angka uang (format Rupiah: `Rp #,##0`).
 *  - `decimal`   → angka desimal (`#,##0.00`).
 *  - `integer`   → bilangan bulat tanpa desimal (`#,##0`).
 *  - `date`      → `Date` object yang ditampilkan dengan format tanggal lokal
 *                  Indonesia (`dd/mm/yyyy`). Boleh juga string ISO `YYYY-MM-DD`
 *                  yang akan otomatis di-parse.
 *  - `dateTime`  → seperti `date` tetapi sampai menit (`dd/mm/yyyy hh:mm`).
 *  - `boolean`   → TRUE / FALSE.
 */
export type XlsxCellType =
  | "text"
  | "numeric"
  | "currency"
  | "decimal"
  | "integer"
  | "date"
  | "dateTime"
  | "boolean";

/**
 * Definisi satu kolom untuk export. Accessor `value` mengambil nilai dari
 * row apa adanya (boleh sudah dalam bentuk `Date`, `number`, `boolean`,
 * atau `string` ISO). Helper akan otomatis mengonversi sesuai `type`.
 */
export type XlsxColumn<T> = {
  header: string;
  value: (row: T) => string | number | Date | boolean | null | undefined;
  /** Default: `"text"` */
  type?: XlsxCellType;
  /** Lebar kolom dalam karakter. Default mengikuti rule of thumb per tipe. */
  width?: number;
  /** Override format Excel untuk kasus khusus. Lebih jarang dipakai. */
  format?: string;
  /** Override alignment cell (header tetap kiri). */
  align?: "left" | "center" | "right";
};

/** Satu baris metadata yang dirender di atas tabel (label : value). */
export type XlsxMetaRow = {
  label: string;
  value: string | number;
};

export type XlsxExportOptions<T> = {
  /** Nama file TANPA ekstensi. Helper otomatis tambahkan timestamp + `.xlsx`. */
  fileName: string;
  /** Bila true, jangan tambahkan timestamp ke nama file. Default false. */
  noTimestamp?: boolean;
  /** Nama sheet. Default `"Sheet1"`. */
  sheetName?: string;
  /** Judul besar di baris pertama. Optional. */
  title?: string;
  /** Baris-baris metadata di antara title & header tabel. Optional. */
  meta?: XlsxMetaRow[];
  /** Definisi kolom. */
  columns: XlsxColumn<T>[];
  /** Data rows. */
  data: T[];
  /**
   * Footer total — kalau diberikan, dirender 1 baris di bawah tabel
   * dengan style bold + background subtle. Jumlah elemen harus =
   * jumlah `columns`. Pakai `null`/`undefined` untuk cell kosong.
   *
   * Contoh: `[null, null, "Total", { value: 1234567, type: "currency" }]`
   */
  footerRow?: Array<
    | string
    | number
    | Date
    | { value: string | number | Date; type?: XlsxCellType; format?: string }
    | null
    | undefined
  >;
};

/** ISO `YYYY-MM-DD` → Date (lokal, jam 12:00 supaya bebas DST). */
function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatForType(type: XlsxCellType): string | undefined {
  switch (type) {
    case "currency":
      return '"Rp"#,##0';
    case "decimal":
      return "#,##0.00";
    case "integer":
    case "numeric":
      return "#,##0";
    case "date":
      return "dd/mm/yyyy";
    case "dateTime":
      return "dd/mm/yyyy hh:mm";
    default:
      return undefined;
  }
}

function defaultWidth(type: XlsxCellType): number | undefined {
  switch (type) {
    case "date":
      return 13;
    case "dateTime":
      return 18;
    case "currency":
    case "decimal":
    case "integer":
    case "numeric":
      return 16;
    default:
      return undefined;
  }
}

type CellPrimitive = string | number | Date | boolean;
type CellType = StringConstructor | NumberConstructor | DateConstructor | BooleanConstructor;

type Cell = {
  value?: CellPrimitive | null;
  type?: CellType;
  format?: string;
  fontWeight?: "bold";
  align?: "left" | "center" | "right";
  backgroundColor?: string;
  borderStyle?: string;
  borderColor?: string;
  columnSpan?: number;
};

/**
 * Konversi raw value + tipe ke pasangan `{ value, type, format }` yang
 * dimengerti oleh `write-excel-file`. String ISO `YYYY-MM-DD` otomatis
 * jadi `Date` saat type-nya `date`/`dateTime`.
 */
function toCellValue(
  raw: string | number | Date | boolean | null | undefined,
  type: XlsxCellType,
  format?: string,
): Cell {
  if (raw == null || raw === "") {
    return { value: null };
  }

  switch (type) {
    case "date":
    case "dateTime": {
      const d =
        raw instanceof Date
          ? raw
          : typeof raw === "string"
            ? parseIsoDate(raw)
            : null;
      if (!d) {
        // Bukan tanggal valid, fallback ke string apa adanya.
        return { value: String(raw), type: String };
      }
      return {
        value: d,
        type: Date,
        format: format ?? formatForType(type),
      };
    }
    case "currency":
    case "decimal":
    case "integer":
    case "numeric": {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) return { value: String(raw), type: String };
      return {
        value: n,
        type: Number,
        format: format ?? formatForType(type),
      };
    }
    case "boolean": {
      return { value: Boolean(raw), type: Boolean };
    }
    default: {
      return {
        value: typeof raw === "string" ? raw : String(raw),
        type: String,
        format,
      };
    }
  }
}

function buildSheetData<T>(opts: XlsxExportOptions<T>): Array<Array<Cell | null>> {
  const colCount = opts.columns.length;
  const rows: Array<Array<Cell | null>> = [];

  if (opts.title) {
    // Cell yang ditutupi `columnSpan` HARUS literal `null`/`undefined`,
    // bukan `{}` — write-excel-file akan throw saat validasi.
    const titleRow: Array<Cell | null> = [
      { value: opts.title, fontWeight: "bold", columnSpan: Math.max(colCount, 1) },
    ];
    for (let i = 1; i < colCount; i += 1) titleRow.push(null);
    rows.push(titleRow);
  }

  if (opts.meta && opts.meta.length > 0) {
    for (const m of opts.meta) {
      const r: Cell[] = [
        { value: m.label, fontWeight: "bold" },
        { value: String(m.value) },
      ];
      for (let i = 2; i < colCount; i += 1) r.push({});
      rows.push(r);
    }
    rows.push(Array.from({ length: colCount }, () => ({}))); // spacer
  }

  // Header row
  rows.push(
    opts.columns.map((col) => ({
      value: col.header,
      fontWeight: "bold",
      backgroundColor: "#f4f4f5",
      borderStyle: "thin",
      borderColor: "#e4e4e7",
      align: col.align,
    })),
  );

  // Body rows
  for (const row of opts.data) {
    rows.push(
      opts.columns.map((col) => {
        const cellSpec = toCellValue(col.value(row), col.type ?? "text", col.format);
        return { ...cellSpec, align: col.align };
      }),
    );
  }

  // Footer row
  if (opts.footerRow && opts.footerRow.length > 0) {
    const footer: Cell[] = opts.footerRow.slice(0, colCount).map((raw) => {
      if (raw == null) return { fontWeight: "bold", backgroundColor: "#fafafa" };
      if (
        typeof raw === "object" &&
        !(raw instanceof Date) &&
        "value" in raw
      ) {
        const spec = raw as {
          value: string | number | Date;
          type?: XlsxCellType;
          format?: string;
        };
        return {
          ...toCellValue(spec.value, spec.type ?? "text", spec.format),
          fontWeight: "bold",
          backgroundColor: "#fafafa",
        };
      }
      const inferredType: XlsxCellType =
        typeof raw === "number" ? "numeric" : raw instanceof Date ? "date" : "text";
      return {
        ...toCellValue(raw, inferredType),
        fontWeight: "bold",
        backgroundColor: "#fafafa",
      };
    });
    // Padding kalau footer lebih pendek dari jumlah kolom
    while (footer.length < colCount) {
      footer.push({ fontWeight: "bold", backgroundColor: "#fafafa" });
    }
    rows.push(footer);
  }

  return rows;
}

function appendTimestampToFilename(base: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${base}_${stamp}`;
}

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Beri waktu browser untuk memulai download sebelum revoke.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isTauriRuntime(): boolean {
  // Tauri 2 expose `__TAURI_INTERNALS__` di window saat runtime.
  return typeof window !== "undefined" && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

/** Hasil operasi export. */
export type XlsxExportResult = {
  /** True kalau user membatalkan save dialog (hanya relevan di Tauri). */
  cancelled: boolean;
  /** Path absolut tempat file disimpan (Tauri). Null untuk browser fallback. */
  filePath: string | null;
  /** Nama file final (dengan ekstensi `.xlsx`). */
  fileName: string;
};

/**
 * Export sekumpulan objek ke file `.xlsx`. Helper generic — tidak
 * terikat pada modul tertentu. Penyusunan kolom, footer total, dan
 * metadata di-handle lewat opsi (lihat {@link XlsxExportOptions}).
 *
 * Perilaku save:
 * - **Di Tauri**: tampilkan native save dialog. User pilih folder &
 *   nama file, lalu file ditulis via `plugin-fs`. Mengembalikan
 *   `filePath` absolut. Kalau user batal, `cancelled = true`.
 * - **Di browser biasa**: fallback ke anchor `<a download>` (file
 *   masuk ke folder Downloads default browser).
 */
export async function exportToXlsx<T>(
  opts: XlsxExportOptions<T>,
): Promise<XlsxExportResult> {
  const sheetData = buildSheetData(opts);

  // Lebar kolom: pakai eksplisit `width` kalau ada, fallback ke default per tipe.
  const columns = opts.columns.map((c) => {
    const w = c.width ?? defaultWidth(c.type ?? "text");
    return w != null ? { width: w } : {};
  });

  const fileBase = opts.noTimestamp
    ? opts.fileName
    : appendTimestampToFilename(opts.fileName);
  const fileFull = `${fileBase}.xlsx`;

  // Generate workbook ke Blob (universal — bekerja di browser & Node).
  const blob: Blob = await writeExcelFile(
    sheetData as unknown as Parameters<typeof writeExcelFile>[0],
    {
      columns,
      sheet: opts.sheetName ?? "Sheet1",
    } as unknown as Parameters<typeof writeExcelFile>[1],
  ).toBlob();

  if (isTauriRuntime()) {
    // 1. Tampilkan native save dialog
    const targetPath = await tauriSaveDialog({
      title: "Simpan file Excel",
      defaultPath: fileFull,
      filters: [
        { name: "Excel Workbook", extensions: ["xlsx"] },
      ],
    });

    if (!targetPath) {
      return { cancelled: true, filePath: null, fileName: fileFull };
    }

    // 2. Tulis bytes ke disk via plugin-fs
    const bytes = new Uint8Array(await blob.arrayBuffer());
    await tauriWriteFile(targetPath, bytes);

    // Cari kembali nama file dari path (dukung pemisah / dan \).
    const savedName = targetPath.split(/[\\/]/).pop() ?? fileFull;

    return { cancelled: false, filePath: targetPath, fileName: savedName };
  }

  // Browser fallback (mis. saat dev mode di tab Chrome biasa).
  triggerBrowserDownload(blob, fileFull);
  return { cancelled: false, filePath: null, fileName: fileFull };
}
