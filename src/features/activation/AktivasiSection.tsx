import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, KeyRound, Wifi, WifiOff } from "lucide-react";
import { ACTIVATION_API_URL } from "@/config/activation";
import { Button } from "@/components/ui/Button";
import { TabsBar } from "@/components/ui/TabsBar";
import {
  activateOffline,
  activateOnline,
  getActivationStatus,
  getDeviceCode,
  type ActivationStatus,
  type LicenseInfo,
} from "./activationApi";

const TABS = [
  { id: "online", label: "Aktivasi online" },
  { id: "offline", label: "Aktivasi offline" },
] as const;

const inputClass =
  "mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

type Props = {
  license: LicenseInfo | null;
  onActivated?: () => void;
};

export function AktivasiSection({ license, onActivated }: Props) {
  const [tab, setTab] = useState<string>(TABS[0].id);
  const [deviceCode, setDeviceCode] = useState("");
  const [invoice, setInvoice] = useState("");
  const [offlineCode, setOfflineCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ActivationStatus | null>(null);

  const loadDevice = useCallback(async () => {
    try {
      const code = await getDeviceCode();
      setDeviceCode(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membaca kode perangkat.");
    }
  }, []);

  useEffect(() => {
    void loadDevice();
    void getActivationStatus().then(setStatus);
  }, [loadDevice]);

  async function handleOnline(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!invoice.trim()) {
      setError("Nomor invoice wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      const result = await activateOnline(invoice.trim(), deviceCode);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const next = await getActivationStatus();
      setStatus(next);
      setSuccess("Lisensi berhasil diaktivasi.");
      onActivated?.();
    } catch {
      setError("Tidak dapat terhubung ke server aktivasi. Coba aktivasi offline.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOffline(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!invoice.trim() || !offlineCode.trim()) {
      setError("Invoice dan kode aktivasi wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      const result = await activateOffline(invoice.trim(), offlineCode.trim());
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const next = await getActivationStatus();
      setStatus(next);
      setSuccess("Lisensi berhasil diaktivasi (offline).");
      onActivated?.();
    } finally {
      setLoading(false);
    }
  }

  const requestUrl = `${ACTIVATION_API_URL.replace(/\/$/, "")}/request`;
  const activated = status?.activated ?? license?.activated ?? false;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-zinc-600">
          EasyBook dapat digunakan gratis hingga{" "}
          <strong>{license?.trialLimit ?? 100} transaksi</strong> (pembelian + penjualan).
          Setelah itu, tambah faktur baru memerlukan aktivasi lisensi.
        </p>
        {license ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-zinc-50 px-4 py-3">
              <p className="text-xs font-medium text-zinc-500">Transaksi terpakai</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">
                {license.transactionCount}
                <span className="text-sm font-normal text-zinc-500">
                  {" "}
                  / {license.trialLimit}
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-zinc-50 px-4 py-3">
              <p className="text-xs font-medium text-zinc-500">Sisa uji coba</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">
                {activated ? "—" : license.remaining}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-50 px-4 py-3">
              <p className="text-xs font-medium text-zinc-500">Status lisensi</p>
              <p
                className={`mt-1 text-sm font-semibold ${activated ? "text-emerald-700" : license.blocked ? "text-amber-700" : "text-zinc-700"}`}
              >
                {activated ? "Aktif" : license.blocked ? "Perlu aktivasi" : "Uji coba"}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {activated ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Lisensi aktif</p>
            {status ? (
              <p className="mt-1 text-emerald-800/90">
                Invoice: <span className="font-mono">{status.invoiceNumber}</span>
                {" · "}
                Perangkat: <span className="font-mono">{status.deviceCode}</span>
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Kode perangkat
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tracking-wide text-zinc-900">
              {deviceCode || "…"}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Kirimkan kode ini ke reseller/CS bersama nomor invoice untuk aktivasi offline.
            </p>
          </div>

          <div className="border-b border-zinc-100">
            <TabsBar tabs={[...TABS]} activeId={tab} onChange={setTab} />
          </div>

          {tab === "online" ? (
            <form onSubmit={handleOnline} className="space-y-4">
              <div>
                <label htmlFor="invoice-online" className="text-sm font-medium text-zinc-700">
                  Nomor invoice
                </label>
                <input
                  id="invoice-online"
                  className={inputClass}
                  value={invoice}
                  onChange={(e) => setInvoice(e.target.value)}
                  placeholder="INV-2026-001"
                  autoComplete="off"
                />
              </div>
              <Button type="submit" disabled={loading || !deviceCode}>
                <Wifi className="h-4 w-4" aria-hidden />
                {loading ? "Mengaktivasi…" : "Aktivasi online"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOffline} className="space-y-4">
              <div>
                <label htmlFor="invoice-offline" className="text-sm font-medium text-zinc-700">
                  Nomor invoice
                </label>
                <input
                  id="invoice-offline"
                  className={inputClass}
                  value={invoice}
                  onChange={(e) => setInvoice(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="offline-code" className="text-sm font-medium text-zinc-700">
                  Kode aktivasi dari CS / reseller
                </label>
                <input
                  id="offline-code"
                  className={`${inputClass} font-mono text-xs`}
                  value={offlineCode}
                  onChange={(e) => setOfflineCode(e.target.value)}
                  placeholder="EB1.…"
                  autoComplete="off"
                />
              </div>
              <Button type="submit" disabled={loading}>
                <WifiOff className="h-4 w-4" aria-hidden />
                {loading ? "Memverifikasi…" : "Aktivasi offline"}
              </Button>
              <p className="text-xs text-zinc-500">
                Belum punya kode?{" "}
                <a
                  href={requestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-600 underline"
                >
                  Ajukan via formulir
                </a>{" "}
                atau WhatsApp reseller.
              </p>
            </form>
          )}

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}
          {success ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>
          ) : null}
        </>
      )}

      <p className="flex items-center gap-1.5 text-xs text-zinc-400">
        <KeyRound className="h-3.5 w-3.5" aria-hidden />
        Server aktivasi: {ACTIVATION_API_URL}
      </p>
    </div>
  );
}
