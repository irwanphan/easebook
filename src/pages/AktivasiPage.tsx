import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Wifi, WifiOff } from "lucide-react";
import easebookIcon from "@/assets/icons/easebook-icon.svg";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TabsBar } from "@/components/ui/TabsBar";
import { ACTIVATION_API_URL } from "@/config/activation";
import {
  activateOffline,
  activateOnline,
  getActivationStatus,
  getDeviceCode,
} from "@/features/activation/activationApi";

const TABS = [
  { id: "online", label: "Aktivasi online" },
  { id: "offline", label: "Aktivasi offline" },
] as const;

const inputClass =
  "mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

export function AktivasiPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>(TABS[0].id);
  const [deviceCode, setDeviceCode] = useState("");
  const [invoice, setInvoice] = useState("");
  const [offlineCode, setOfflineCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    void getActivationStatus().then((s) => {
      if (s?.activated) navigate("/login", { replace: true });
    });
  }, [loadDevice, navigate]);

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
      setSuccess("Aplikasi berhasil diaktivasi. Silakan login.");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
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
      setSuccess("Aplikasi berhasil diaktivasi (offline). Silakan login.");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } finally {
      setLoading(false);
    }
  }

  const requestUrl = `${ACTIVATION_API_URL.replace(/\/$/, "")}/request`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={easebookIcon} alt="" className="h-14 w-14" />
          <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Aktivasi EasyBook</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Masukkan nomor invoice pembelian dan aktivasi lisensi untuk perangkat ini.
          </p>
        </div>

        <Card className="!p-0 overflow-hidden">
          <div className="border-b border-zinc-100 px-2 pt-2">
            <TabsBar tabs={[...TABS]} activeId={tab} onChange={setTab} />
          </div>

          <div className="p-6">
            <div className="rounded-xl bg-zinc-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Kode perangkat
              </p>
              <p className="mt-1 font-mono text-lg font-semibold tracking-wide text-zinc-900">
                {deviceCode || "…"}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Berdasarkan ID mesin OS (Windows / macOS / Linux). Kirimkan kode ini ke reseller
                jika aktivasi offline.
              </p>
            </div>

            {tab === "online" ? (
              <form onSubmit={handleOnline} className="mt-6 space-y-4">
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
                <Button type="submit" className="w-full" disabled={loading || !deviceCode}>
                  <Wifi className="h-4 w-4" aria-hidden />
                  {loading ? "Mengaktivasi…" : "Aktivasi online"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleOffline} className="mt-6 space-y-4">
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
                <Button type="submit" className="w-full" disabled={loading}>
                  <WifiOff className="h-4 w-4" aria-hidden />
                  {loading ? "Memverifikasi…" : "Aktivasi offline"}
                </Button>
                <p className="text-center text-xs text-zinc-500">
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

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            {success && (
              <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {success}
              </p>
            )}
          </div>
        </Card>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-zinc-400">
          <KeyRound className="h-3.5 w-3.5" aria-hidden />
          Server: {ACTIVATION_API_URL}
        </p>
      </div>
    </div>
  );
}
