import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { JurnalKonfigurasiForm } from "@/features/keuangan/JurnalKonfigurasiForm";
import type { AkunKeuanganRow, JurnalKonfigurasi, JurnalKonfigurasiSetPayload } from "@/data/keuangan";
import { tauriErrorMessage } from "@/lib/tauriError";

export function KonfigurasiAkunJurnalPage() {
  const [akunList, setAkunList] = useState<AkunKeuanganRow[]>([]);
  const [config, setConfig] = useState<JurnalKonfigurasi | null>(null);
  const [akunLoading, setAkunLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setAkunLoading(true);
    setConfigLoading(true);
    try {
      const [list, cfg] = await Promise.all([
        invoke<AkunKeuanganRow[]>("akun_keuangan_list"),
        invoke<JurnalKonfigurasi>("jurnal_konfigurasi_get"),
      ]);
      setAkunList(list);
      setConfig(cfg);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setAkunList([]);
      setConfig(null);
    } finally {
      setAkunLoading(false);
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setError(null);
    setSavedHint(null);
    try {
      const payload: JurnalKonfigurasiSetPayload = {
        akunPiutang: config.akunPiutang,
        akunHutang: config.akunHutang,
        akunPendapatan: config.akunPendapatan,
        akunPembelian: config.akunPembelian,
        akunPenerimaanLainnya: config.akunPenerimaanLainnya,
        akunPengeluaranLainnya: config.akunPengeluaranLainnya,
      };
      await invoke("jurnal_konfigurasi_set", { payload });
      setSavedHint("Konfigurasi akun jurnal telah disimpan.");
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const loading = akunLoading || configLoading;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          to="/keuangan/daftar-akun"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke daftar akun
        </Link>
        <PageHeader
          title="Konfigurasi akun jurnal"
          description="Tentukan akun default untuk pasangan debit/kredit pada jurnal otomatis (pembelian, penjualan, pelunasan, dll.)."
        />
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {savedHint ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {savedHint}
        </p>
      ) : null}

      <Card className="p-6">
        {loading ? (
          <p className="text-sm text-zinc-500">Memuat daftar akun dan konfigurasi…</p>
        ) : (
          <JurnalKonfigurasiForm
            config={config}
            akunList={akunList}
            saving={saving}
            disabled={loading}
            onConfigChange={setConfig}
            onSubmit={handleSubmit}
          />
        )}
      </Card>
    </div>
  );
}
