import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabsBar } from "@/components/ui/TabsBar";
import type { InformasiPerusahaan } from "@/features/pengaturan/informasiPerusahaanStorage";
import {
  loadInformasiPerusahaan,
  persistInformasiPerusahaan,
} from "@/features/pengaturan/informasiPerusahaanStorage";

const PENGATURAN_TABS = [
  { id: "perusahaan", label: "Informasi perusahaan" },
  { id: "operasional", label: "Operasional" },
] as const;

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-700">
      {children}
    </label>
  );
}

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

const textareaClass =
  "mt-1 min-h-[100px] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function isValidEmail(s: string): boolean {
  const t = s.trim();
  if (t === "") return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export function PengaturanPage() {
  const [activeTab, setActiveTab] = useState<string>(PENGATURAN_TABS[0].id);
  const [perusahaan, setPerusahaan] = useState<InformasiPerusahaan>(() => loadInformasiPerusahaan());
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updatePerusahaan = useCallback((patch: Partial<InformasiPerusahaan>) => {
    setPerusahaan((prev) => ({ ...prev, ...patch }));
    setSavedHint(null);
    setError(null);
  }, []);

  function handleSimpanPerusahaan(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(perusahaan.emailPerusahaan)) {
      setError("Format email tidak valid.");
      return;
    }
    persistInformasiPerusahaan(perusahaan);
    setSavedHint("Perubahan informasi perusahaan telah disimpan.");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Pengaturan"
        description="Data perusahaan dan preferensi operasional aplikasi."
      />

      <Card className="overflow-hidden p-0">
        <div className="border-b border-zinc-100 bg-zinc-50/50 px-4 pt-2">
          <TabsBar
            tabs={[...PENGATURAN_TABS]}
            activeId={activeTab}
            onChange={setActiveTab}
          />
        </div>

        <div className="p-5 sm:p-6" role="tabpanel">
          {activeTab === "perusahaan" ? (
            <form onSubmit={handleSimpanPerusahaan} className="space-y-5">
              {error ? (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
                >
                  {error}
                </div>
              ) : null}
              {savedHint ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  {savedHint}
                </p>
              ) : null}

              <div>
                <FieldLabel htmlFor="p-nama">Nama perusahaan</FieldLabel>
                <input
                  id="p-nama"
                  name="namaPerusahaan"
                  value={perusahaan.namaPerusahaan}
                  onChange={(e) => updatePerusahaan({ namaPerusahaan: e.target.value })}
                  placeholder="Nama legal atau nama dagang"
                  className={inputClass}
                  autoComplete="organization"
                />
              </div>

              <div>
                <FieldLabel htmlFor="p-alamat">Alamat</FieldLabel>
                <textarea
                  id="p-alamat"
                  name="alamat"
                  value={perusahaan.alamat}
                  onChange={(e) => updatePerusahaan({ alamat: e.target.value })}
                  placeholder="Alamat kantor pusat lengkap"
                  className={textareaClass}
                  rows={4}
                />
              </div>

              <div>
                <FieldLabel htmlFor="p-telp">Nomor telepon perusahaan</FieldLabel>
                <input
                  id="p-telp"
                  name="nomorTelepon"
                  type="tel"
                  value={perusahaan.nomorTelepon}
                  onChange={(e) => updatePerusahaan({ nomorTelepon: e.target.value })}
                  placeholder="Contoh: 021-1234567"
                  className={inputClass}
                  autoComplete="tel"
                />
              </div>

              <div>
                <FieldLabel htmlFor="p-email">Email perusahaan</FieldLabel>
                <input
                  id="p-email"
                  name="emailPerusahaan"
                  type="email"
                  value={perusahaan.emailPerusahaan}
                  onChange={(e) => updatePerusahaan({ emailPerusahaan: e.target.value })}
                  placeholder="admin@perusahaan.co.id"
                  className={inputClass}
                  autoComplete="email"
                />
              </div>

              <div className="flex justify-end border-t border-zinc-100 pt-5">
                <Button type="submit">Simpan</Button>
              </div>
            </form>
          ) : null}

          {activeTab === "operasional" ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center">
              <p className="text-sm font-medium text-zinc-700">Operasional</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Bagian ini akan diisi pada tahap berikutnya (parameter operasi, default gudang, format
                nomor dokumen, dll.).
              </p>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
