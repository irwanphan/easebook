/**
 * Modal CRUD ringkas untuk mengelola gudang dari dalam wizard.
 *
 * Dirancang sebagai pengganti link `target="_blank"` ke halaman
 * `GudangPage` — di environment Tauri, link target-blank dirender oleh
 * browser sistem (out of process), yang memutus konteks wizard. Modal ini
 * memberi user kemampuan dasar (lihat, tambah, ubah, hapus) tanpa harus
 * keluar dari `/onboarding`.
 *
 * Tidak meng-embed `GudangPage` karena page tersebut menggunakan routing
 * internal (`navigate('/manajemen/gudang/tambah')` dll) yang akan
 * membongkar modal saat di-klik. Komponen ini berdiri sendiri dan
 * berbagi sumber data (Tauri command) yang sama lewat `useGudang`
 * sehingga semua perubahan tetap konsisten dengan halaman manajemen
 * Gudang penuh di luar wizard.
 *
 * Catatan: panel sengaja dibuat lebar (`max-w-3xl`) dan tinggi penuh
 * (`max-h-[85vh]`) supaya tabel & form bisa hidup berdampingan tanpa
 * scroll berlapis.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertTriangle,
  ArrowLeft,
  Pencil,
  Plus,
  Save,
  Trash,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { TokoInput } from "@/components/ui/TokoInput";
import type { GudangRow } from "@/data/gudang";
import { tauriErrorMessage } from "@/lib/tauriError";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Dipanggil setelah ada perubahan data (tambah/ubah/hapus). */
  onChanged?: () => void;
};

type ViewMode = { kind: "list" } | { kind: "form"; kode: string | null };

type FormState = {
  kode: string;
  nama: string;
  alamat: string;
  lokasi: string;
  pic: string;
  nomorKontak: string;
  luasM2: number;
  kapasitasPenyimpanan: string;
};

const EMPTY_FORM: FormState = {
  kode: "",
  nama: "",
  alamat: "",
  lokasi: "",
  pic: "",
  nomorKontak: "",
  luasM2: 50,
  kapasitasPenyimpanan: "Standar",
};

function rowToForm(row: GudangRow): FormState {
  return {
    kode: row.kode,
    nama: row.nama,
    alamat: row.alamat,
    lokasi: row.lokasi,
    pic: row.pic,
    nomorKontak: row.nomorKontak,
    luasM2: row.luasM2,
    kapasitasPenyimpanan: row.kapasitasPenyimpanan,
  };
}

export function KelolaGudangModal({ open, onClose, onChanged }: Props) {
  const [items, setItems] = useState<GudangRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>({ kind: "list" });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<GudangRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await invoke<GudangRow[]>("gudang_list");
      setItems(rows);
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset view & error tiap modal dibuka kembali, dan refresh list
  // supaya selalu menampilkan data terbaru.
  useEffect(() => {
    if (open) {
      setView({ kind: "list" });
      setForm(EMPTY_FORM);
      setError(null);
      setPendingDelete(null);
      void refreshList();
    }
  }, [open, refreshList]);

  const isEditing = view.kind === "form" && view.kode !== null;

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  const handleOpenAdd = useCallback(() => {
    setForm({ ...EMPTY_FORM, kode: `GD-${String(items.length + 1).padStart(3, "0")}` });
    setError(null);
    setView({ kind: "form", kode: null });
  }, [items.length]);

  const handleOpenEdit = useCallback((row: GudangRow) => {
    setForm(rowToForm(row));
    setError(null);
    setView({ kind: "form", kode: row.kode });
  }, []);

  const handleBackToList = useCallback(() => {
    setError(null);
    setView({ kind: "list" });
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      const kode = form.kode.trim().toUpperCase();
      if (!kode) return setError("Kode gudang wajib diisi.");
      if (!form.nama.trim()) return setError("Nama gudang wajib diisi.");
      if (!form.alamat.trim()) return setError("Alamat wajib diisi.");
      if (!form.pic.trim()) return setError("Nama PIC wajib diisi.");
      if (!form.nomorKontak.trim()) return setError("Nomor kontak wajib diisi.");
      if (!Number.isFinite(form.luasM2) || form.luasM2 <= 0) {
        return setError("Luas harus lebih dari 0.");
      }

      setSubmitting(true);
      try {
        const payload = {
          nama: form.nama.trim(),
          alamat: form.alamat.trim(),
          lokasi: form.lokasi.trim(),
          pic: form.pic.trim(),
          nomorKontak: form.nomorKontak.trim(),
          luasM2: form.luasM2,
          kapasitasPenyimpanan: form.kapasitasPenyimpanan.trim() || "Standar",
        };
        if (view.kind === "form" && view.kode) {
          await invoke("gudang_update", { kode: view.kode, row: payload });
        } else {
          await invoke("gudang_insert", { row: { kode, ...payload } });
        }
        await refreshList();
        onChanged?.();
        setView({ kind: "list" });
      } catch (err) {
        setError(tauriErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    },
    [form, view, refreshList, onChanged],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await invoke("gudang_delete", { kode: pendingDelete.kode });
      await refreshList();
      setPendingDelete(null);
      onChanged?.();
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, refreshList, onChanged]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.kode.localeCompare(b.kode)),
    [items],
  );

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Kelola gudang"
        panelClassName="max-w-3xl"
        footer={
          view.kind === "list" ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-zinc-500">
                {loading
                  ? "Memuat data…"
                  : `${items.length} gudang tersimpan.`}
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Tutup
                </Button>
                <Button type="button" onClick={handleOpenAdd}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Tambah gudang
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBackToList}
                disabled={submitting}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Kembali ke daftar
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToList}
                  disabled={submitting}
                >
                  <X className="h-4 w-4" aria-hidden />
                  Batal
                </Button>
                <Button
                  type="submit"
                  form="kelola-gudang-form"
                  disabled={submitting}
                >
                  <Save className="h-4 w-4" aria-hidden />
                  {submitting
                    ? "Menyimpan…"
                    : isEditing
                      ? "Simpan perubahan"
                      : "Simpan gudang"}
                </Button>
              </div>
            </div>
          )
        }
      >
        {view.kind === "list" ? (
          <ListView
            loading={loading}
            items={sortedItems}
            onAdd={handleOpenAdd}
            onEdit={handleOpenEdit}
            onDelete={setPendingDelete}
          />
        ) : (
          <FormView
            form={form}
            isEditing={isEditing}
            error={error}
            update={update}
            onSubmit={handleSubmit}
          />
        )}
      </Modal>

      <ConfirmModal
        open={pendingDelete !== null}
        variant="danger"
        title="Hapus gudang"
        message={
          pendingDelete
            ? error
              ? error
              : `Hapus gudang "${pendingDelete.kode} — ${pendingDelete.nama}"? Tindakan ini tidak dapat dibatalkan. Gudang yang masih memiliki stok atau histori transaksi tidak akan terhapus.`
            : ""
        }
        confirmLabel="Hapus"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          if (deleting) return;
          setPendingDelete(null);
          setError(null);
        }}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Sub-view: daftar gudang
// ────────────────────────────────────────────────────────────────────────

type ListProps = {
  loading: boolean;
  items: GudangRow[];
  onAdd: () => void;
  onEdit: (row: GudangRow) => void;
  onDelete: (row: GudangRow) => void;
};

function ListView({ loading, items, onAdd, onEdit, onDelete }: ListProps) {
  if (loading) {
    return <p className="py-10 text-center text-sm text-zinc-500">Memuat data gudang…</p>;
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-zinc-500">Belum ada gudang yang tersimpan.</p>
        <Button type="button" onClick={onAdd}>
          <Plus className="h-4 w-4" aria-hidden />
          Tambah gudang pertama
        </Button>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/80 bg-white">
      {items.map((row) => (
        <li key={row.kode} className="flex items-start gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900">
              {row.nama}
              <span className="ml-2 font-mono text-xs font-medium text-zinc-400">
                {row.kode}
              </span>
            </p>
            <p className="mt-0.5 truncate text-xs text-zinc-500" title={row.alamat}>
              {row.alamat || "—"}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              PIC: <span className="text-zinc-700">{row.pic || "—"}</span>
              <span className="mx-1.5 text-zinc-300">•</span>
              <span className="text-zinc-700">{row.nomorKontak || "—"}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => onEdit(row)}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Ubah
            </Button>
            <Button
              type="button"
              variant="danger"
              className="h-8 text-xs"
              onClick={() => onDelete(row)}
            >
              <Trash className="h-3.5 w-3.5" aria-hidden />
              Hapus
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Sub-view: form tambah/ubah
// ────────────────────────────────────────────────────────────────────────

type FormProps = {
  form: FormState;
  isEditing: boolean;
  error: string | null;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSubmit: (e: FormEvent) => void;
};

function FormView({ form, isEditing, error, update, onSubmit }: FormProps) {
  return (
    <form id="kelola-gudang-form" onSubmit={onSubmit} className="flex flex-col gap-5">
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <TokoInput
          label={
            <span>
              Kode <span className="text-rose-600">*</span>
            </span>
          }
          value={form.kode}
          onChange={(e) => update("kode", e.target.value.toUpperCase())}
          autoCapitalize="characters"
          disabled={isEditing}
          hint={isEditing ? "Kode tidak dapat diubah." : undefined}
        />
        <TokoInput
          label={
            <span>
              Nama <span className="text-rose-600">*</span>
            </span>
          }
          value={form.nama}
          onChange={(e) => update("nama", e.target.value)}
        />
      </div>

      <TokoInput
        label={
          <span>
            Alamat <span className="text-rose-600">*</span>
          </span>
        }
        value={form.alamat}
        onChange={(e) => update("alamat", e.target.value)}
        placeholder="Jl. Contoh No. 1"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TokoInput
          label={
            <span>
              Penanggung jawab (PIC) <span className="text-rose-600">*</span>
            </span>
          }
          value={form.pic}
          onChange={(e) => update("pic", e.target.value)}
        />
        <TokoInput
          label={
            <span>
              Nomor kontak <span className="text-rose-600">*</span>
            </span>
          }
          type="tel"
          value={form.nomorKontak}
          onChange={(e) => update("nomorKontak", e.target.value)}
          placeholder="+62 812-0000-0000"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TokoInput
          label="Luas (m²)"
          type="number"
          min={0.1}
          step={0.1}
          value={form.luasM2}
          onChange={(e) => update("luasM2", Number.parseFloat(e.target.value) || 0)}
        />
        <TokoInput
          label="Kapasitas penyimpanan"
          value={form.kapasitasPenyimpanan}
          onChange={(e) => update("kapasitasPenyimpanan", e.target.value)}
          placeholder="Standar / 50 palet / 100 m³"
        />
      </div>

      <TokoInput
        label="Koordinat (latitude, longitude)"
        value={form.lokasi}
        onChange={(e) => update("lokasi", e.target.value)}
        placeholder="-6.9175, 107.6191"
        hint="Opsional. Format: lat, lng (mis. -6.9175, 107.6191)."
      />
    </form>
  );
}
