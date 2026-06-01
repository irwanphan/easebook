import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertTriangle,
  ArrowLeft,
  BookText,
  CheckCircle2,
  Info,
  Lock,
  PiggyBank,
  ShieldAlert,
  Unlock,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OnboardingResumeBanner } from "@/features/onboarding/components/OnboardingResumeBanner";
import type { AkunKeuanganRow } from "@/data/keuangan";
import type { KasAwalSnapshot } from "@/data/kasAwal";
import { kasAwalGet, kasAwalSet } from "@/features/keuangan/kasAwalInvoke";
import { formatTanggalLokal } from "@/data/operasionalKonfigurasi";
import { formatRupiah, parseRupiahInput } from "@/lib/format";
import { tauriErrorMessage } from "@/lib/tauriError";
import { PasswordConfirmModal } from "@/features/auth/PasswordConfirmModal";
import { useAuth } from "@/features/auth/AuthContext";

/** Map kode akun → input string (raw teks user, belum di-parse). */
type InputMap = Record<string, string>;

/** Permission key untuk membuka kunci saldo kas awal yang sudah disetel. */
const AKSES_UBAH_KAS_AWAL = "pengaturan-ubah-kas-awal";

/**
 * Pengaturan saldo awal kas — antar-muka untuk membentuk jurnal pembuka
 * "Saldo awal kas" di tanggal awal periode operasional. Setiap baris akun
 * kas dipasangkan dengan input nilai. Saat disimpan, backend membuat satu
 * jurnal kompound:
 *
 *   D Kas A   nilai_A
 *   D Kas B   nilai_B
 *      K Historical Balance   (nilai_A + nilai_B)
 *
 * Idempoten: re-simpan akan mengganti jurnal yang sudah ada.
 */
export function PengaturanKasAwalPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [snapshot, setSnapshot] = useState<KasAwalSnapshot | null>(null);
  const [akunKasList, setAkunKasList] = useState<AkunKeuanganRow[]>([]);
  const [inputs, setInputs] = useState<InputMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  /** True = form unlock untuk editing. False = read-only (terkunci). */
  const [editing, setEditing] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const isAdmin = session?.isAdmin ?? false;
  const allowedKeys = useMemo(
    () => new Set(session?.halamanAkses ?? []),
    [session?.halamanAkses],
  );
  const punyaHakUbah = isAdmin || allowedKeys.has(AKSES_UBAH_KAS_AWAL);

  /** Rebuild inputs map from a snapshot — single source of truth supaya
   *  "Batal" bisa mengembalikan state ke kondisi tersimpan. */
  const buildInputsFromSnapshot = useCallback(
    (snap: KasAwalSnapshot, kasOnly: AkunKeuanganRow[]): InputMap => {
      const next: InputMap = {};
      for (const a of kasOnly) {
        const existing = snap.entries.find(
          (e) => e.akunKode.toLowerCase() === a.kode.toLowerCase(),
        );
        next[a.kode] = existing ? String(existing.nilaiAwal) : "";
      }
      return next;
    },
    [],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [snap, akunList] = await Promise.all([
        kasAwalGet(),
        invoke<AkunKeuanganRow[]>("akun_keuangan_list"),
      ]);
      setSnapshot(snap);
      const kasOnly = akunList.filter((a) => a.isAkunKas);
      setAkunKasList(kasOnly);
      setInputs(buildInputsFromSnapshot(snap, kasOnly));
      // First-time setup: belum pernah disetel → langsung editing.
      // Kalau sudah pernah → kunci sampai user explicit unlock.
      setEditing(snap.entries.length === 0);
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [buildInputsFromSnapshot]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const total = useMemo(() => {
    let t = 0;
    for (const k of Object.keys(inputs)) {
      const v = parseRupiahInput(inputs[k] ?? "");
      if (v > 0) t += v;
    }
    return t;
  }, [inputs]);

  const adaPerubahan = useMemo(() => {
    if (!snapshot) return false;
    for (const a of akunKasList) {
      const cur = parseRupiahInput(inputs[a.kode] ?? "");
      const ori =
        snapshot.entries.find((e) => e.akunKode.toLowerCase() === a.kode.toLowerCase())
          ?.nilaiAwal ?? 0;
      if (cur !== ori) return true;
    }
    return false;
  }, [inputs, snapshot, akunKasList]);

  const awalPeriode = snapshot?.awalPeriode ?? null;
  const hbKode = snapshot?.akunHistoricalBalanceKode ?? null;
  const hbNama = snapshot?.akunHistoricalBalanceNama ?? null;
  const sudahPernahDiset = (snapshot?.entries.length ?? 0) > 0;

  const prasyaratSiap = Boolean(awalPeriode) && Boolean(hbKode);
  const adaInputNegatif = useMemo(
    () => Object.values(inputs).some((v) => parseRupiahInput(v) < 0),
    [inputs],
  );

  function patchInput(kode: string, value: string) {
    setInputs((prev) => ({ ...prev, [kode]: value }));
    setHint(null);
    setError(null);
  }

  function setSemuaNol() {
    const next: InputMap = {};
    for (const a of akunKasList) next[a.kode] = "";
    setInputs(next);
    setHint(null);
    setError(null);
  }

  function handleCancelEdit() {
    if (snapshot) {
      setInputs(buildInputsFromSnapshot(snapshot, akunKasList));
    }
    setEditing(false);
    setError(null);
    setHint(null);
  }

  function handleRequestUnlock() {
    if (!punyaHakUbah) {
      setError(
        "Anda tidak memiliki hak akses untuk mengubah saldo kas awal. Hubungi administrator.",
      );
      return;
    }
    setPasswordModalOpen(true);
  }

  function handlePasswordConfirmed() {
    setPasswordModalOpen(false);
    setEditing(true);
    setError(null);
    setHint("Kunci dibuka. Anda dapat mengubah saldo kas awal.");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setHint(null);
    if (!prasyaratSiap) {
      setError("Prasyarat belum lengkap (lihat banner di atas).");
      return;
    }
    if (adaInputNegatif) {
      setError("Nilai kas awal tidak boleh negatif.");
      return;
    }
    setSaving(true);
    try {
      const entries = akunKasList.map((a) => ({
        akunKode: a.kode,
        nilaiAwal: parseRupiahInput(inputs[a.kode] ?? ""),
      }));
      const updated = await kasAwalSet({ entries });
      setSnapshot(updated);
      setInputs(buildInputsFromSnapshot(updated, akunKasList));
      // Auto-kunci kembali setelah simpan sukses (kalau ada entry).
      setEditing(updated.entries.length === 0);
      setHint(
        updated.entries.length > 0
          ? `Saldo awal kas tersimpan sebagai jurnal pembuka per ${formatTanggalLokal(
              updated.tanggalJurnal,
            )}. Form dikunci kembali — gunakan tombol Ubah untuk membuka.`
          : "Semua nilai 0 — jurnal saldo awal kas dihapus.",
      );
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <OnboardingResumeBanner />
      <div>
        <Link
          to="/keuangan/akun-kas"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke akun kas
        </Link>
        <PageHeader
          title="Pengaturan kas awal"
          description="Tentukan saldo pembuka untuk setiap akun kas. Saat disimpan, sistem otomatis mencatat jurnal pembuka pada tanggal awal periode operasional dengan lawan akun Historical Balance."
        />
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </div>
      ) : null}
      {hint ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {hint}
        </div>
      ) : null}

      {loading ? (
        <Card className="p-6 text-sm text-zinc-500">Memuat pengaturan kas awal…</Card>
      ) : (
        <>
          {/* Prasyarat */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-zinc-900">Prasyarat</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Dua pengaturan ini harus terisi sebelum saldo awal kas bisa disimpan.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                {awalPeriode ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                )}
                <span className="flex-1">
                  <span className="font-medium text-zinc-900">Tanggal awal periode operasional:</span>{" "}
                  {awalPeriode ? (
                    <strong className="text-emerald-700">{formatTanggalLokal(awalPeriode)}</strong>
                  ) : (
                    <button
                      type="button"
                      className="font-semibold text-brand-700 hover:underline cursor-pointer"
                      onClick={() => navigate("/pengaturan?tab=operasional")}
                    >
                      Belum diset — atur di Pengaturan → Operasional
                    </button>
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2">
                {hbKode ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                )}
                <span className="flex-1">
                  <span className="font-medium text-zinc-900">Akun Historical Balance:</span>{" "}
                  {hbKode ? (
                    <strong className="text-emerald-700">
                      {hbKode} — {hbNama || "(nama tidak ditemukan)"}
                    </strong>
                  ) : (
                    <button
                      type="button"
                      className="font-semibold text-brand-700 hover:underline cursor-pointer"
                      onClick={() =>
                        navigate("/keuangan/konfigurasi-akun-jurnal", {
                          state: {
                            from: "/keuangan/kas-awal",
                            label: "Pengaturan kas awal",
                          },
                        })
                      }
                    >
                      Belum diset — atur di Konfigurasi akun jurnal
                    </button>
                  )}
                </span>
              </li>
            </ul>
          </Card>

          {/* Info jurnal yang akan terbentuk */}
          {prasyaratSiap ? (
            <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2.5 text-xs leading-relaxed text-sky-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Bagaimana jurnal terbentuk</p>
                <p className="mt-0.5">
                  Setiap akun kas dengan nilai &gt; 0 jadi baris <strong>D</strong> di jurnal kompound,
                  dengan lawan <strong>K {hbNama || hbKode}</strong> sebesar total semua kas. Tanggal jurnal{" "}
                  <strong>{formatTanggalLokal(awalPeriode)}</strong>. Re-simpan akan{" "}
                  <strong>menggantikan</strong> jurnal lama (saldo di-reverse otomatis).
                </p>
              </div>
            </div>
          ) : null}

          {/* Banner kunci — muncul saat sudah pernah disetel dan masih
              terkunci. */}
          {sudahPernahDiset && !editing ? (
            <div className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs leading-relaxed text-zinc-700">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
              <div className="flex-1">
                <p className="font-semibold text-zinc-800">Saldo kas awal dikunci</p>
                <p className="mt-0.5">
                  Untuk melindungi konsistensi pembukuan, perubahan setelah
                  ditetapkan butuh konfirmasi kata sandi.{" "}
                  {!punyaHakUbah ? (
                    <span className="font-medium text-rose-700">
                      Hak akses ini belum diberikan kepada Anda.
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          ) : null}

          {/* Form */}
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Saldo awal per akun kas</h2>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    Isi nilai sesuai saldo fisik / saldo bank per{" "}
                    <strong className="text-zinc-700">
                      {awalPeriode ? formatTanggalLokal(awalPeriode) : "—"}
                    </strong>
                    . Kosongkan atau isi 0 untuk akun yang belum punya saldo.
                  </p>
                </div>
                {akunKasList.length > 0 && editing ? (
                  <button
                    type="button"
                    className="self-start rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                    onClick={setSemuaNol}
                  >
                    Kosongkan semua
                  </button>
                ) : null}
              </div>

              {akunKasList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center text-sm text-zinc-500">
                  Belum ada akun yang ditandai sebagai akun kas. Buka{" "}
                  <button
                    type="button"
                    className="font-semibold text-brand-700 hover:underline cursor-pointer"
                    onClick={() => navigate("/keuangan/akun-kas")}
                  >
                    Akun kas
                  </button>{" "}
                  untuk menambahkannya.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-100">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        <th className="px-3 py-3">Kode</th>
                        <th className="px-3 py-3">Nama akun</th>
                        <th className="px-3 py-3 text-right">Saldo awal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {akunKasList.map((a) => {
                        const v = inputs[a.kode] ?? "";
                        const parsed = parseRupiahInput(v);
                        return (
                          <tr
                            key={a.kode}
                            className="border-t border-zinc-50 bg-white hover:bg-zinc-50/50"
                          >
                            <td className="px-3 py-2.5 font-mono text-xs font-semibold text-brand-700">
                              {a.kode}
                            </td>
                            <td className="px-3 py-2.5 font-medium text-zinc-900">
                              <div className="flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-zinc-400" aria-hidden />
                                <span>{a.nama}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-col items-end gap-0.5">
                                <div className="relative">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={v}
                                    onChange={(e) => patchInput(a.kode, e.target.value)}
                                    placeholder="0"
                                    disabled={saving || !prasyaratSiap || !editing}
                                    aria-readonly={!editing}
                                    className={`w-44 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-right text-sm tabular-nums text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-zinc-50 ${!editing ? "pr-8" : ""}`}
                                  />
                                  {!editing && sudahPernahDiset ? (
                                    <Lock
                                      className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                                      aria-hidden
                                    />
                                  ) : null}
                                </div>
                                <span
                                  className={`text-xs tabular-nums ${
                                    parsed < 0
                                      ? "text-rose-600"
                                      : parsed > 0
                                        ? "text-emerald-700"
                                        : "text-zinc-400"
                                  }`}
                                >
                                  {formatRupiah(parsed)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-zinc-200 bg-zinc-50/60 text-sm font-semibold text-zinc-900">
                        <td colSpan={2} className="px-3 py-2.5 text-right">
                          Total saldo awal
                          <span className="ml-1 text-xs font-normal text-zinc-500">
                            (akan jadi K {hbNama || hbKode || "Historical Balance"})
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatRupiah(total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {sudahPernahDiset ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      Kas awal sudah pernah disetel
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                      Belum pernah disetel
                    </span>
                  )}
                  {snapshot?.jurnalId ? (
                    <Link
                      to={`/keuangan/jurnal-umum?jurnal=${snapshot.jurnalId}`}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      <BookText className="h-3.5 w-3.5" aria-hidden />
                      Lihat jurnal aktif (#{snapshot.jurnalId})
                    </Link>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <Button
                        type="submit"
                        disabled={
                          saving ||
                          !prasyaratSiap ||
                          (!adaPerubahan && !sudahPernahDiset)
                        }
                      >
                        <PiggyBank className="h-4 w-4" aria-hidden />
                        {saving ? "Menyimpan…" : "Simpan saldo awal kas"}
                      </Button>
                      {sudahPernahDiset ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={saving}
                        >
                          Batal
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRequestUnlock}
                      disabled={!punyaHakUbah}
                      title={
                        punyaHakUbah
                          ? "Buka kunci untuk mengubah saldo awal kas"
                          : "Anda tidak punya hak akses untuk aksi ini"
                      }
                    >
                      <Unlock className="h-4 w-4" aria-hidden />
                      Ubah
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Card>
        </>
      )}

      <PasswordConfirmModal
        open={passwordModalOpen}
        title="Buka kunci saldo kas awal"
        description="Anda akan mengubah saldo kas awal yang sudah ditetapkan. Re-simpan akan mengganti jurnal pembuka. Masukkan kata sandi untuk membuka kunci."
        confirmLabel="Buka kunci"
        confirmVariant="danger"
        onClose={() => setPasswordModalOpen(false)}
        onConfirmed={handlePasswordConfirmed}
      />
    </div>
  );
}
