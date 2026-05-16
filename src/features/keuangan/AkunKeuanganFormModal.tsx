import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type {
  AkunKeuanganInsertPayload,
  AkunKeuanganRow,
  AkunKeuanganUpdatePayload,
} from "@/data/keuangan";
import { KELOMPOK_LABA_RUGI } from "@/data/keuangan";
import { tauriErrorMessage } from "@/lib/tauriError";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

const FORM_ID = "akun-keuangan-form";

function normKode(s: string) {
  return s.trim().toUpperCase();
}

/** Akun yang tidak boleh dipilih sebagai induk saat mengubah `editingKode`: diri sendiri + semua turunan. */
function indukExcludedCodes(rows: AkunKeuanganRow[], editingKode: string): Set<string> {
  const edit = normKode(editingKode);
  const childrenByParent = new Map<string, string[]>();
  for (const r of rows) {
    const p = r.indukKode?.trim() ? normKode(r.indukKode) : "";
    const k = normKode(r.kode);
    if (!childrenByParent.has(p)) childrenByParent.set(p, []);
    childrenByParent.get(p)!.push(k);
  }
  const descendants = new Set<string>();
  const stack = [...(childrenByParent.get(edit) ?? [])];
  while (stack.length) {
    const k = stack.pop()!;
    if (descendants.has(k)) continue;
    descendants.add(k);
    stack.push(...(childrenByParent.get(k) ?? []));
  }
  descendants.add(edit);
  return descendants;
}

export type AkunKeuanganFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  editingRow: AkunKeuanganRow | null;
  rows: AkunKeuanganRow[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export function AkunKeuanganFormModal({
  open,
  mode,
  editingRow,
  rows,
  onClose,
  onSaved,
}: AkunKeuanganFormModalProps) {
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [indukKode, setIndukKode] = useState("");
  const [kelompokLr, setKelompokLr] = useState("");
  const [isAkunKas, setIsAkunKas] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && editingRow) {
      setKode(editingRow.kode);
      setNama(editingRow.nama);
      setIndukKode(editingRow.indukKode?.trim() ?? "");
      setKelompokLr(editingRow.kelompokLr?.trim() ?? "");
      setIsAkunKas(editingRow.isAkunKas);
    } else {
      setKode("");
      setNama("");
      setIndukKode("");
      setKelompokLr("");
      setIsAkunKas(false);
    }
  }, [open, mode, editingRow]);

  const indukOptions = useMemo(() => {
    if (mode === "edit" && editingRow) {
      const excl = indukExcludedCodes(rows, editingRow.kode);
      return rows.filter((r) => !excl.has(normKode(r.kode)));
    }
    const draft = normKode(kode);
    return rows.filter((r) => !draft || normKode(r.kode) !== draft);
  }, [rows, mode, editingRow, kode]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      setError(null);

      const trimmedKode = kode.trim();
      const payloadInsert: AkunKeuanganInsertPayload = {
        kode: trimmedKode,
        nama: nama.trim(),
        indukKode: indukKode.trim() ? indukKode.trim() : null,
        kelompokLr: kelompokLr.trim() || null,
        isAkunKas,
      };

      if (!payloadInsert.kode) {
        setError("Kode akun wajib diisi.");
        return;
      }
      if (!payloadInsert.nama) {
        setError("Nama akun wajib diisi.");
        return;
      }

      setSubmitting(true);
      try {
        if (mode === "create") {
          await invoke("akun_keuangan_insert", { payload: payloadInsert });
        } else {
          const payloadUpdate: AkunKeuanganUpdatePayload = {
            kode: trimmedKode,
            nama: payloadInsert.nama,
            indukKode: payloadInsert.indukKode,
            kelompokLr: payloadInsert.kelompokLr,
            isAkunKas: payloadInsert.isAkunKas,
          };
          await invoke("akun_keuangan_update", { payload: payloadUpdate });
        }
        await onSaved();
        onClose();
      } catch (err) {
        setError(tauriErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, kode, nama, indukKode, kelompokLr, isAkunKas, mode, onSaved, onClose],
  );

  const title = mode === "create" ? "Tambah akun" : "Ubah akun";

  return (
    <Modal
      open={open}
      title={title}
      onClose={() => {
        if (!submitting) onClose();
      }}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" disabled={submitting} onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" form={FORM_ID} disabled={submitting}>
            {submitting ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-zinc-500">
        Contoh: 1-100 Kas Toko, 1-110 Bank BCA (centang akun kas), 4-100 Pendapatan penjualan.
      </p>

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {error}
        </div>
      ) : null}

      <form id={FORM_ID} onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <div>
          <label htmlFor="ak-form-kode" className="block text-sm font-medium text-zinc-700">
            Kode akun
          </label>
          <input
            id="ak-form-kode"
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            className={`${inputClass} disabled:bg-zinc-50 disabled:text-zinc-500`}
            placeholder="1-100"
            disabled={submitting || mode === "edit"}
            required
          />
          {mode === "edit" ? (
            <p className="mt-1 text-xs text-zinc-500">Kode tidak dapat diubah.</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="ak-form-nama" className="block text-sm font-medium text-zinc-700">
            Nama akun
          </label>
          <input
            id="ak-form-nama"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className={inputClass}
            placeholder="Kas Toko"
            disabled={submitting}
            required
          />
        </div>
        <div>
          <label htmlFor="ak-form-induk" className="block text-sm font-medium text-zinc-700">
            Induk akun (opsional)
          </label>
          <select
            id="ak-form-induk"
            value={indukKode}
            onChange={(e) => setIndukKode(e.target.value)}
            className={inputClass}
            disabled={submitting}
          >
            <option value="">— Tanpa induk —</option>
            {indukOptions.map((a) => (
              <option key={a.kode} value={a.kode}>
                {a.kode} — {a.nama}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ak-form-lr" className="block text-sm font-medium text-zinc-700">
            Kelompok laba rugi (opsional)
          </label>
          <select
            id="ak-form-lr"
            value={kelompokLr}
            onChange={(e) => setKelompokLr(e.target.value)}
            className={inputClass}
            disabled={submitting}
          >
            {KELOMPOK_LABA_RUGI.map((o) => (
              <option key={o.value || "none"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3">
          <input
            type="checkbox"
            checked={isAkunKas}
            onChange={(e) => setIsAkunKas(e.target.checked)}
            disabled={submitting}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            <span className="block text-sm font-medium text-zinc-900">Sebagai akun kas</span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              Hanya akun yang dicentang yang muncul di pilihan kas jurnal dan saldonya dilacak.
            </span>
          </span>
        </label>
      </form>
    </Modal>
  );
}
