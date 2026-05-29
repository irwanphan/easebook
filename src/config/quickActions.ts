import {
  ArrowLeftRight,
  BookOpen,
  BookOpenCheck,
  ClipboardList,
  CreditCard,
  Factory,
  FileText,
  LineChart,
  MinusCircle,
  Package,
  PackagePlus,
  PlusCircle,
  SendToBack,
  Settings,
  ShoppingCart,
  Store,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Daftar aksi cepat yang **boleh ditampilkan** di FAB. Setiap aksi terikat ke
 * satu halaman/aksi konkrit. User bisa memilih sub-himpunan & mengurutkan
 * lewat halaman Pengaturan akses cepat. Ditampilkan di FAB hanya bila user
 * juga punya akses ke halaman target (lewat `accessKey`).
 */

export type QuickActionKind = "navigate" | "open-pos";

export type QuickAction = {
  /** Identifier stabil — disimpan di localStorage. */
  id: string;
  /** Label yang muncul di pill FAB & daftar pengaturan. */
  label: string;
  /** Kalimat pendek di halaman pengaturan. */
  hint: string;
  /** Ikon Lucide. */
  icon: LucideIcon;
  /** Tone visual pill (warna aksen). */
  tone: "brand" | "emerald" | "amber" | "rose" | "violet" | "sky" | "zinc";
  /** Jenis aksi: navigate ke path, atau special (mis. buka POS window). */
  kind: QuickActionKind;
  /** Untuk `navigate`: path tujuan. */
  path?: string;
  /** Key halamanAkses yang diperlukan agar muncul/aktif untuk non-admin. */
  accessKey: string;
};

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "penjualan-tambah",
    label: "Faktur jual baru",
    hint: "Buat faktur penjualan langsung.",
    icon: ShoppingCart,
    tone: "brand",
    kind: "navigate",
    path: "/penjualan/tambah",
    accessKey: "penjualan-tambah",
  },
  {
    id: "pesanan-penjualan-tambah",
    label: "Pesanan jual baru",
    hint: "Buat sales order / pesanan dari pelanggan.",
    icon: ClipboardList,
    tone: "brand",
    kind: "navigate",
    path: "/penjualan/pesanan/tambah",
    accessKey: "penjualan-tambah",
  },
  {
    id: "pembelian-tambah",
    label: "Pembelian baru",
    hint: "Catat faktur pembelian dari pemasok.",
    icon: Package,
    tone: "violet",
    kind: "navigate",
    path: "/pembelian/tambah",
    accessKey: "pembelian-tambah",
  },
  {
    id: "pesanan-pembelian-tambah",
    label: "PO baru",
    hint: "Buat purchase order ke pemasok.",
    icon: ClipboardList,
    tone: "violet",
    kind: "navigate",
    path: "/pembelian/pesanan/tambah",
    accessKey: "pembelian-tambah",
  },
  {
    id: "produksi-tambah",
    label: "Produksi baru",
    hint: "Konversi bahan baku menjadi barang jadi.",
    icon: Factory,
    tone: "amber",
    kind: "navigate",
    path: "/barang-jasa/produksi/tambah",
    accessKey: "produksi-tambah",
  },
  {
    id: "koreksi-stok",
    label: "Koreksi stok",
    hint: "Catat penyesuaian stok manual.",
    icon: BookOpenCheck,
    tone: "amber",
    kind: "navigate",
    path: "/barang-jasa/koreksi-stok",
    accessKey: "barang-jasa",
  },
  {
    id: "mutasi-antar-gudang",
    label: "Mutasi gudang",
    hint: "Pindahkan stok antar gudang.",
    icon: SendToBack,
    tone: "sky",
    kind: "navigate",
    path: "/barang-jasa/mutasi-antar-gudang",
    accessKey: "barang-jasa-mutasi",
  },
  {
    id: "barang-jasa-tambah",
    label: "Tambah item",
    hint: "Tambah barang / jasa ke katalog.",
    icon: PackagePlus,
    tone: "zinc",
    kind: "navigate",
    path: "/barang-jasa/tambah",
    accessKey: "barang-jasa-tambah",
  },
  {
    id: "pengeluaran-tambah",
    label: "Pengeluaran",
    hint: "Catat pembayaran biaya dari kas/bank.",
    icon: MinusCircle,
    tone: "rose",
    kind: "navigate",
    path: "/keuangan/pengeluaran/tambah",
    accessKey: "ke-pengeluaran-tambah",
  },
  {
    id: "penerimaan-tambah",
    label: "Penerimaan",
    hint: "Catat penerimaan lain-lain ke kas/bank.",
    icon: PlusCircle,
    tone: "emerald",
    kind: "navigate",
    path: "/keuangan/penerimaan/tambah",
    accessKey: "ke-penerimaan-tambah",
  },
  {
    id: "pelunasan-piutang-buat",
    label: "Lunasi piutang",
    hint: "Catat pembayaran piutang dari pelanggan.",
    icon: Wallet,
    tone: "emerald",
    kind: "navigate",
    path: "/keuangan/pelunasan-piutang/buat",
    accessKey: "ke-piutang-buat",
  },
  {
    id: "pelunasan-hutang-buat",
    label: "Lunasi hutang",
    hint: "Catat pembayaran hutang ke pemasok.",
    icon: CreditCard,
    tone: "rose",
    kind: "navigate",
    path: "/keuangan/pelunasan-hutang/buat",
    accessKey: "ke-hutang-buat",
  },
  {
    id: "transfer-kas",
    label: "Transfer kas",
    hint: "Pindah dana antar akun kas / bank.",
    icon: ArrowLeftRight,
    tone: "sky",
    kind: "navigate",
    path: "/keuangan/transfer",
    accessKey: "ke-transfer",
  },
  {
    id: "buka-pos",
    label: "Buka POS",
    hint: "Buka kasir POS di window baru.",
    icon: Store,
    tone: "brand",
    kind: "open-pos",
    accessKey: "pos",
  },
  {
    id: "jurnal-umum",
    label: "Jurnal umum",
    hint: "Lihat buku jurnal umum.",
    icon: BookOpen,
    tone: "zinc",
    kind: "navigate",
    path: "/keuangan/jurnal-umum",
    accessKey: "ke-jurnal-umum",
  },
  {
    id: "laporan-hpp",
    label: "Laporan HPP",
    hint: "Lihat HPP barang & timeline pergerakannya.",
    icon: LineChart,
    tone: "violet",
    kind: "navigate",
    path: "/laporan/hpp",
    accessKey: "barang-jasa",
  },
  {
    id: "pergerakan-stok",
    label: "Pergerakan stok",
    hint: "Riwayat mutasi stok per periode.",
    icon: FileText,
    tone: "sky",
    kind: "navigate",
    path: "/laporan/pergerakan-stok",
    accessKey: "lap-stok",
  },
  {
    id: "pengaturan",
    label: "Pengaturan",
    hint: "Buka halaman pengaturan aplikasi.",
    icon: Settings,
    tone: "zinc",
    kind: "navigate",
    path: "/pengaturan",
    accessKey: "pengaturan",
  },
];

/** Daftar id aksi default yang aktif untuk user baru. */
export const QUICK_ACTIONS_DEFAULT_IDS: string[] = [
  "penjualan-tambah",
  "pembelian-tambah",
  "produksi-tambah",
  "pengeluaran-tambah",
];

/** Max item yang dapat aktif di FAB sekaligus (UI tetap nyaman dibaca). */
export const QUICK_ACTIONS_MAX_ACTIVE = 6;

const ACTION_BY_ID = new Map(QUICK_ACTIONS.map((a) => [a.id, a]));

export function getQuickAction(id: string): QuickAction | undefined {
  return ACTION_BY_ID.get(id);
}

export const TONE_PILL_CLASS: Record<QuickAction["tone"], string> = {
  brand: "bg-brand-600 text-white hover:bg-brand-700",
  emerald: "bg-emerald-600 text-white hover:bg-emerald-700",
  amber: "bg-amber-500 text-white hover:bg-amber-600",
  rose: "bg-rose-600 text-white hover:bg-rose-700",
  violet: "bg-violet-600 text-white hover:bg-violet-700",
  sky: "bg-sky-600 text-white hover:bg-sky-700",
  zinc: "bg-zinc-700 text-white hover:bg-zinc-800",
};

export const TONE_RING_CLASS: Record<QuickAction["tone"], string> = {
  brand: "ring-brand-200",
  emerald: "ring-emerald-200",
  amber: "ring-amber-200",
  rose: "ring-rose-200",
  violet: "ring-violet-200",
  sky: "ring-sky-200",
  zinc: "ring-zinc-200",
};
