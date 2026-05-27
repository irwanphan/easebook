import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowDownUp,
  ArrowUpDown,
  BookText,
  Pencil,
  PiggyBank,
  Plus,
  Search,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AkunKeuanganFormModal } from "@/features/keuangan/AkunKeuanganFormModal";
import type { AkunKeuanganRow } from "@/data/keuangan";
import { labelKelompokAkun } from "@/data/keuangan";
import { formatRupiah } from "@/lib/format";
import { tauriErrorMessage } from "@/lib/tauriError";
import { VerticalSeparator } from "@/components/ui/Separator";

type SortKey = "kode" | "saldo";
type SortDir = "asc" | "desc";

/**
 * Halaman daftar akun kas — hanya menampilkan akun dengan `isAkunKas = true`
 * beserta saldo terkininya. Saldo dihitung backend lewat
 * `akun_kas_apply_saldo_delta` setiap kali ada jurnal yang menyentuh akun
 * kas, jadi nilai di sini selalu konsisten dengan jurnal umum.
 */
export function AkunKasPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AkunKeuanganRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("kode");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Form modal — create / edit akun kas
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] = useState<AkunKeuanganRow | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<AkunKeuanganRow[]>("akun_keuangan_list");
      setRows(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const kasRows = useMemo(
    () => rows.filter((r) => r.isAkunKas),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return kasRows;
    return kasRows.filter(
      (r) =>
        r.kode.toLowerCase().includes(q) ||
        r.nama.toLowerCase().includes(q) ||
        labelKelompokAkun(r.kelompok).toLowerCase().includes(q),
    );
  }, [kasRows, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "saldo") {
        cmp = a.saldo - b.saldo;
      } else {
        cmp = a.kode.localeCompare(b.kode);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // Statistik ringkas
  const totalSaldo = useMemo(
    () => kasRows.reduce((acc, r) => acc + (r.saldo || 0), 0),
    [kasRows],
  );
  const akunPositif = kasRows.filter((r) => r.saldo > 0).length;
  const akunKosong = kasRows.filter((r) => r.saldo === 0).length;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "saldo" ? "desc" : "asc");
    }
  }

  function openCreate() {
    setEditingRow(null);
    setFormMode("create");
    setFormOpen(true);
  }

  function openEdit(row: AkunKeuanganRow) {
    setEditingRow(row);
    setFormMode("edit");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingRow(null);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Akun kas"
        description="Saldo terkini untuk semua akun yang ditandai sebagai akun kas (kas tunai, bank, e-wallet, dll.)."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => navigate("/keuangan/kas-awal")}>
              <PiggyBank className="h-4 w-4" aria-hidden />
              Atur kas awal
            </Button>
            <VerticalSeparator />
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              Tambah akun kas
            </Button>
          </>
        }
      />

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </div>
      ) : null}

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryStat
          icon={<Wallet className="h-5 w-5" aria-hidden />}
          label="Total saldo akun kas"
          value={formatRupiah(totalSaldo)}
          accent="brand"
        />
        <SummaryStat
          icon={<BookText className="h-5 w-5" aria-hidden />}
          label="Jumlah akun kas"
          value={`${kasRows.length} akun`}
          subtle={`${akunPositif} bersaldo • ${akunKosong} kosong`}
        />
        <SummaryStat
          icon={<ArrowDownUp className="h-5 w-5" aria-hidden />}
          label="Akun aktif (saldo > 0)"
          value={`${akunPositif} akun`}
          subtle={
            kasRows.length > 0
              ? `${Math.round((akunPositif / kasRows.length) * 100)}% dari total akun kas`
              : "—"
          }
        />
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Daftar akun kas</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Saldo otomatis terupdate setiap ada jurnal yang menyentuh akun kas terkait.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kode, nama, atau kelompok…"
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-100">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-3 py-3">
                  <SortHeader
                    label="Kode"
                    active={sortKey === "kode"}
                    dir={sortDir}
                    onClick={() => toggleSort("kode")}
                  />
                </th>
                <th className="px-3 py-3">Nama akun</th>
                <th className="px-3 py-3">Kelompok</th>
                <th className="px-3 py-3 text-center">Norm</th>
                <th className="px-3 py-3 text-right">
                  <SortHeader
                    label="Saldo"
                    active={sortKey === "saldo"}
                    dir={sortDir}
                    onClick={() => toggleSort("saldo")}
                    align="right"
                  />
                </th>
                <th className="px-3 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-zinc-500">
                    Memuat akun kas…
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-500">
                    {kasRows.length === 0 ? (
                      <>
                        Belum ada akun yang ditandai sebagai akun kas.
                        <br />
                        Gunakan tombol <strong>&quot;Tambah akun kas&quot;</strong> di pojok kanan
                        atas, atau tandai akun yang sudah ada lewat{" "}
                        <button
                          type="button"
                          className="font-semibold text-brand-700 hover:underline cursor-pointer"
                          onClick={() => navigate("/keuangan/daftar-akun")}
                        >
                          Daftar akun
                        </button>
                        .
                      </>
                    ) : (
                      <>Tidak ada akun kas yang cocok dengan pencarian &quot;{query}&quot;.</>
                    )}
                  </td>
                </tr>
              ) : (
                sorted.map((r) => (
                  <tr
                    key={r.kode}
                    className="border-t border-zinc-50 bg-white hover:bg-zinc-50/50"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold text-brand-700">
                      {r.kode}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-zinc-900">{r.nama}</td>
                    <td className="px-3 py-2.5 text-zinc-600">
                      <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                        {labelKelompokAkun(r.kelompok)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {r.kolomNorm ? (
                        <span
                          className={`inline-flex min-w-[1.75rem] justify-center rounded-md px-1.5 py-0.5 text-xs font-bold ${
                            r.kolomNorm === "D"
                              ? "bg-sky-50 text-sky-800"
                              : "bg-violet-50 text-violet-800"
                          }`}
                        >
                          {r.kolomNorm}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-semibold tabular-nums ${
                        r.saldo > 0
                          ? "text-emerald-700"
                          : r.saldo < 0
                            ? "text-rose-700"
                            : "text-zinc-400"
                      }`}
                    >
                      {formatRupiah(r.saldo)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/keuangan/jurnal-umum?akun=${encodeURIComponent(r.kode)}`)}
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                          title="Lihat jurnal terkait akun ini"
                        >
                          <BookText className="h-3.5 w-3.5" aria-hidden />
                          Jurnal
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                          title="Ubah akun"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Ubah
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {sorted.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-zinc-200 bg-zinc-50/60 text-sm font-semibold text-zinc-900">
                  <td colSpan={4} className="px-3 py-2.5 text-right">
                    Total saldo
                    {query ? (
                      <span className="ml-1 text-xs font-normal text-zinc-500">
                        (hasil filter: {sorted.length} akun)
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatRupiah(sorted.reduce((acc, r) => acc + (r.saldo || 0), 0))}
                  </td>
                  <td className="px-3 py-2.5" />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </Card>

      <AkunKeuanganFormModal
        open={formOpen}
        mode={formMode}
        editingRow={editingRow}
        rows={rows}
        defaultIsAkunKas
        onClose={closeForm}
        onSaved={refresh}
      />
    </div>
  );
}

// ----- subkomponen lokal kecil (SRP) -----

type SortHeaderProps = {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
};

function SortHeader({ label, active, dir, onClick, align = "left" }: SortHeaderProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 hover:text-zinc-800 cursor-pointer ${
        align === "right" ? "justify-end" : ""
      } ${active ? "text-zinc-800" : ""}`}
    >
      <span>{label}</span>
      <ArrowUpDown
        className={`h-3 w-3 ${active ? "opacity-100" : "opacity-30"} ${
          active && dir === "desc" ? "rotate-180" : ""
        } transition`}
        aria-hidden
      />
    </button>
  );
}

type SummaryStatProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtle?: string;
  accent?: "brand" | "default";
};

function SummaryStat({ icon, label, value, subtle, accent = "default" }: SummaryStatProps) {
  const accentClass =
    accent === "brand"
      ? "border-brand-200 bg-gradient-to-br from-brand-50 to-white"
      : "border-zinc-200 bg-white";
  const iconClass =
    accent === "brand"
      ? "bg-brand-600 text-white"
      : "bg-zinc-100 text-zinc-700";

  return (
    <div className={`rounded-2xl border ${accentClass} p-4 shadow-sm`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-500">{label}</p>
          <p className="mt-0.5 truncate text-lg font-bold tabular-nums text-zinc-900">
            {value}
          </p>
          {subtle ? <p className="mt-0.5 text-xs text-zinc-500">{subtle}</p> : null}
        </div>
      </div>
    </div>
  );
}
