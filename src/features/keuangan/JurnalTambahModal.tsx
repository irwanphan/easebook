import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { AkunKeuanganRow, JurnalManualInsertPayload, JurnalManualLinePayload } from "@/data/keuangan";
import { tauriErrorMessage } from "@/lib/tauriError";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

const FORM_ID = "jurnal-tambah-form";

export type JurnalBarisDraft = {
  id: string;
  akunKode: string;
  catatan: string;
  nilai: number;
};

function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function newBaris(): JurnalBarisDraft {
  return { id: crypto.randomUUID(), akunKode: "", catatan: "", nilai: 0 };
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function sumNilai(baris: JurnalBarisDraft[]) {
  return baris.reduce((acc, b) => acc + (Number.isFinite(b.nilai) ? Math.round(b.nilai) : 0), 0);
}

export type JurnalTambahModalProps = {
  open: boolean;
  akunList: AkunKeuanganRow[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

type BarisSectionProps = {
  title: string;
  side: "debit" | "kredit";
  baris: JurnalBarisDraft[];
  akunList: AkunKeuanganRow[];
  disabled: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Partial<JurnalBarisDraft>) => void;
};

function BarisSection({
  title,
  side,
  baris,
  akunList,
  disabled,
  onAdd,
  onRemove,
  onChange,
}: BarisSectionProps) {
  const nilaiLabel = side === "debit" ? "Debit" : "Kredit";

  return (
    <section className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <Button type="button" variant="ghost" className="!px-2.5 !py-1.5 text-xs" disabled={disabled} onClick={onAdd}>
          <Plus className="h-4 w-4" aria-hidden />
          Tambah baris
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {baris.map((row, index) => (
          <div key={row.id} className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Baris {index + 1}</span>
              {baris.length > 1 ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                  disabled={disabled}
                  onClick={() => onRemove(row.id)}
                  aria-label={`Hapus baris ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Hapus
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-700">Akun</label>
                <select
                  value={row.akunKode}
                  onChange={(e) => onChange(row.id, { akunKode: e.target.value })}
                  className={inputClass}
                  disabled={disabled}
                  required
                >
                  <option value="">— Pilih akun —</option>
                  {akunList.map((a) => (
                    <option key={a.kode} value={a.kode}>
                      {a.kode} — {a.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">{nilaiLabel}</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={row.nilai || ""}
                  onChange={(e) => onChange(row.id, { nilai: Number.parseInt(e.target.value, 10) || 0 })}
                  className={inputClass}
                  disabled={disabled}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Catatan baris</label>
                <input
                  type="text"
                  value={row.catatan}
                  onChange={(e) => onChange(row.id, { catatan: e.target.value })}
                  className={inputClass}
                  disabled={disabled}
                  placeholder="opsional"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function JurnalTambahModal({ open, akunList, onClose, onSaved }: JurnalTambahModalProps) {
  const [tanggal, setTanggal] = useState(todayLocalISODate);
  const [referensi, setReferensi] = useState("");
  const [catatan, setCatatan] = useState("");
  const [barisDebit, setBarisDebit] = useState<JurnalBarisDraft[]>(() => [newBaris()]);
  const [barisKredit, setBarisKredit] = useState<JurnalBarisDraft[]>(() => [newBaris()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setTanggal(todayLocalISODate());
    setReferensi("");
    setCatatan("");
    setBarisDebit([newBaris()]);
    setBarisKredit([newBaris()]);
    setError(null);
  }, []);

  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  const totalDebit = useMemo(() => sumNilai(barisDebit), [barisDebit]);
  const totalKredit = useMemo(() => sumNilai(barisKredit), [barisKredit]);
  const balanced = totalDebit > 0 && totalDebit === totalKredit;

  const updateDebit = useCallback((id: string, patch: Partial<JurnalBarisDraft>) => {
    setBarisDebit((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const updateKredit = useCallback((id: string, patch: Partial<JurnalBarisDraft>) => {
    setBarisKredit((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const buildLines = useCallback((): JurnalManualLinePayload[] | null => {
    const lines: JurnalManualLinePayload[] = [];

    for (const b of barisDebit) {
      const nilai = Math.round(b.nilai);
      if (!b.akunKode.trim() && nilai === 0) continue;
      if (!b.akunKode.trim()) {
        setError("Setiap baris debit harus memilih akun.");
        return null;
      }
      if (nilai <= 0) {
        setError("Setiap baris debit harus memiliki nilai lebih dari 0.");
        return null;
      }
      lines.push({
        akunKode: b.akunKode.trim(),
        debit: nilai,
        kredit: 0,
        catatan: b.catatan.trim(),
      });
    }

    for (const b of barisKredit) {
      const nilai = Math.round(b.nilai);
      if (!b.akunKode.trim() && nilai === 0) continue;
      if (!b.akunKode.trim()) {
        setError("Setiap baris kredit harus memilih akun.");
        return null;
      }
      if (nilai <= 0) {
        setError("Setiap baris kredit harus memiliki nilai lebih dari 0.");
        return null;
      }
      lines.push({
        akunKode: b.akunKode.trim(),
        debit: 0,
        kredit: nilai,
        catatan: b.catatan.trim(),
      });
    }

    if (lines.length < 2) {
      setError("Minimal satu baris debit dan satu baris kredit.");
      return null;
    }

    return lines;
  }, [barisDebit, barisKredit]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!tanggal.trim()) {
      setError("Tanggal wajib diisi.");
      return;
    }
    if (!referensi.trim()) {
      setError("Referensi wajib diisi.");
      return;
    }
    if (!balanced) {
      setError("Total debit harus sama dengan total kredit dan lebih dari 0.");
      return;
    }

    const lines = buildLines();
    if (!lines) return;

    const payload: JurnalManualInsertPayload = {
      tanggal: tanggal.trim(),
      referensi: referensi.trim(),
      catatan: catatan.trim(),
      lines,
    };

    setSubmitting(true);
    try {
      await invoke("jurnal_umum_insert_manual", { payload });
      await onSaved();
      onClose();
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || akunList.length === 0;

  return (
    <Modal
      open={open}
      title="Tambah jurnal"
      panelClassName="max-w-3xl"
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" disabled={submitting} onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" form={FORM_ID} disabled={disabled || !balanced}>
            {submitting ? "Menyimpan…" : "Simpan jurnal"}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {akunList.length === 0 ? (
          <p className="text-sm text-amber-800">Belum ada akun keuangan. Tambahkan akun di Daftar akun terlebih dahulu.</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className={inputClass}
              disabled={disabled}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Referensi</label>
            <input
              value={referensi}
              onChange={(e) => setReferensi(e.target.value)}
              className={inputClass}
              disabled={disabled}
              placeholder="contoh: JU-2026-001"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Catatan jurnal</label>
          <input
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            className={inputClass}
            disabled={disabled}
            placeholder="opsional"
          />
        </div>

        <BarisSection
          title="Baris debit"
          side="debit"
          baris={barisDebit}
          akunList={akunList}
          disabled={disabled}
          onAdd={() => setBarisDebit((prev) => [...prev, newBaris()])}
          onRemove={(id) => setBarisDebit((prev) => (prev.length <= 1 ? prev : prev.filter((b) => b.id !== id)))}
          onChange={updateDebit}
        />

        <BarisSection
          title="Baris kredit"
          side="kredit"
          baris={barisKredit}
          akunList={akunList}
          disabled={disabled}
          onAdd={() => setBarisKredit((prev) => [...prev, newBaris()])}
          onRemove={(id) => setBarisKredit((prev) => (prev.length <= 1 ? prev : prev.filter((b) => b.id !== id)))}
          onChange={updateKredit}
        />

        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            balanced
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          <p>
            <span className="font-medium">Total debit:</span> {formatRupiah(totalDebit)}
            <span className="mx-2 text-zinc-400">·</span>
            <span className="font-medium">Total kredit:</span> {formatRupiah(totalKredit)}
          </p>
          {!balanced && totalDebit + totalKredit > 0 ? (
            <p className="mt-1 text-xs">Selisih: {formatRupiah(Math.abs(totalDebit - totalKredit))}</p>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
