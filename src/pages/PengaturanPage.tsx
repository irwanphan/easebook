import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabsBar } from "@/components/ui/TabsBar";
import { AktivasiSection } from "@/features/activation/AktivasiSection";
import { useLicenseGate } from "@/features/activation/useLicenseGate";
import { PosKonfigurasiForm } from "@/features/pengaturan/PosKonfigurasiForm";
import { OperasionalKonfigurasiForm } from "@/features/pengaturan/OperasionalKonfigurasiForm";
import type { InformasiPerusahaan } from "@/features/pengaturan/informasiPerusahaanStorage";
import {
  loadInformasiPerusahaan,
  persistInformasiPerusahaan,
} from "@/features/pengaturan/informasiPerusahaanStorage";
import type { PengaturanTransaksi } from "@/features/pengaturan/pengaturanTransaksiStorage";
import {
  loadPengaturanTransaksi,
  persistPengaturanTransaksi,
} from "@/features/pengaturan/pengaturanTransaksiStorage";
import { TokoInput } from "@/components/ui/TokoInput";

const PENGATURAN_TABS = [
  { id: "perusahaan", label: "Informasi perusahaan" },
  { id: "transaksi", label: "Transaksi" },
  { id: "aktivasi", label: "Aktivasi" },
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
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const initialTab =
    tabFromUrl && PENGATURAN_TABS.some((t) => t.id === tabFromUrl) ? tabFromUrl : PENGATURAN_TABS[0].id;
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const { license, refresh: refreshLicense } = useLicenseGate();
  const [perusahaan, setPerusahaan] = useState<InformasiPerusahaan>(() => loadInformasiPerusahaan());
  const [transaksi, setTransaksi] = useState<PengaturanTransaksi>(() => loadPengaturanTransaksi());
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tabFromUrl && PENGATURAN_TABS.some((t) => t.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    setSavedHint(null);
    setError(null);
  }, [activeTab]);

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

  function handleSimpanTransaksi(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const ppn = Number.parseFloat(String(transaksi.ppnPersen));
    if (!Number.isFinite(ppn) || ppn < 0 || ppn > 100) {
      setError("Nilai PPN harus antara 0 dan 100 (persen).");
      return;
    }
    const next = { ppnPersen: Math.round(ppn * 100) / 100 };
    setTransaksi(next);
    persistPengaturanTransaksi(next);
    setSavedHint("Pengaturan transaksi telah disimpan.");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Pengaturan"
        // description="Data perusahaan dan preferensi operasional aplikasi."
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
                <TokoInput
                  id="p-nama"
                  name="namaPerusahaan"
                  value={perusahaan.namaPerusahaan}
                  onChange={(e) => updatePerusahaan({ namaPerusahaan: e.target.value })}
                  placeholder="Nama legal atau nama dagang"
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

          {activeTab === "transaksi" ? (
            <div className="space-y-8">
              {/* Section: PPN */}
              <section className="space-y-5">
                <header>
                  <h2 className="text-base font-semibold text-zinc-900">Pajak</h2>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    Tarif default untuk faktur pembelian & penjualan.
                  </p>
                </header>

                <form onSubmit={handleSimpanTransaksi} className="space-y-5">
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
                    <FieldLabel htmlFor="p-ppn">Nilai PPN (%)</FieldLabel>
                    <p className="mt-1 text-sm text-zinc-500">
                      Tarif Pajak Pertambahan Nilai default untuk perhitungan pajak pada faktur pembelian
                      dan penjualan.
                    </p>
                    <div className="relative mt-2 max-w-xs">
                      <TokoInput
                        id="p-ppn"
                        name="ppnPersen"
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={transaksi.ppnPersen}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const n = raw === "" ? 0 : Number.parseFloat(raw);
                          setTransaksi({ ppnPersen: Number.isFinite(n) ? n : 0 });
                          setSavedHint(null);
                          setError(null);
                        }}
                        className="mt-0 pr-10"
                      />
                      <span
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-400"
                        aria-hidden
                      >
                        %
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit">Simpan PPN</Button>
                  </div>
                </form>
              </section>

              {/* Section: POS */}
              <section className="space-y-5 border-t border-zinc-100 pt-6">
                <header>
                  <h2 className="text-base font-semibold text-zinc-900">POS — Kas kasir</h2>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    Akun-akun kas yang dipakai untuk jurnal buka & tutup shift kasir.
                  </p>
                </header>
                <PosKonfigurasiForm />
              </section>
            </div>
          ) : null}

          {activeTab === "operasional" ? (
            <div className="space-y-8">
              {/* Section: Awal periode */}
              <section className="space-y-5">
                <header>
                  <h2 className="text-base font-semibold text-zinc-900">Periode pembukuan</h2>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    Tanggal awal yang dipakai sebagai acuan saldo awal stok, kas, dan laporan.
                  </p>
                </header>
                <OperasionalKonfigurasiForm />
              </section>

              {/* Placeholder untuk pengaturan operasional lain di masa depan */}
              <section className="space-y-3 border-t border-zinc-100 pt-6">
                <header>
                  <h2 className="text-base font-semibold text-zinc-900">Parameter operasi lain</h2>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    Default gudang, format nomor dokumen, dll. (akan diisi pada tahap berikutnya).
                  </p>
                </header>
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-500">
                  Belum ada pengaturan tambahan.
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "aktivasi" ? (
            <AktivasiSection license={license} onActivated={() => void refreshLicense()} />
          ) : null}
        </div>
      </Card>
    </div>
  );
}
