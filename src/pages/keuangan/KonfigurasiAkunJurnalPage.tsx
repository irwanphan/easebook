import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { JurnalKonfigurasiForm } from "@/features/keuangan/JurnalKonfigurasiForm";
import type { AkunKeuanganRow, JurnalKonfigurasi, JurnalKonfigurasiSetPayload } from "@/data/keuangan";
import { tauriErrorMessage } from "@/lib/tauriError";

/**
 * State yang bisa dikirim oleh halaman pemanggil via
 * `navigate("/keuangan/konfigurasi-akun-jurnal", { state: { from, label } })`.
 * Bila ada, link "kembali" di halaman ini diganti ke `from` (bukan ke daftar
 * akun) dan banner sukses memperlihatkan shortcut langsung ke `label`.
 *
 * Path `from` harus path absolut react-router (mis. "/keuangan/kas-awal").
 */
type ReturnTo = {
  from: string;
  label: string;
};

function isReturnTo(value: unknown): value is ReturnTo {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.from === "string" && typeof v.label === "string";
}

export function KonfigurasiAkunJurnalPage() {
  const location = useLocation();
  const returnTo = useMemo<ReturnTo | null>(
    () => (isReturnTo(location.state) ? location.state : null),
    [location.state],
  );
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
        akunHistoricalBalance: config.akunHistoricalBalance,
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

  const backTo = returnTo?.from ?? "/keuangan/daftar-akun";
  const backLabel = returnTo
    ? `Kembali ke ${returnTo.label}`
    : "Kembali ke daftar akun";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <nav
          aria-label="Navigasi halaman"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-brand-600"
        >
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </Link>
        </nav>
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
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span>{savedHint}</span>
          {returnTo ? (
            <Link
              to={returnTo.from}
              className="inline-flex items-center gap-1.5 font-medium text-emerald-800 hover:text-emerald-900 hover:underline"
            >
              Lanjut ke {returnTo.label}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : null}
        </div>
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
