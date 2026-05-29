import { useCallback, useEffect, useMemo, useState } from "react";
import { openPath } from "@tauri-apps/plugin-opener";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  DatabaseBackup,
  FolderOpen,
  HardDriveDownload,
  HardDriveUpload,
  History,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PasswordConfirmModal } from "@/features/auth/PasswordConfirmModal";
import type { BackupRow, BackupStatus } from "@/data/backup";
import {
  backupCreate,
  backupDelete,
  backupList,
  backupRestoreCancel,
  backupRestoreStage,
  backupStatus,
} from "@/features/pengaturan/backupInvoke";
import { tauriErrorMessage } from "@/lib/tauriError";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : n >= 10 ? 1 : 2)} ${units[i]}`;
}

function formatTanggalLengkap(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelatif(unixSec: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSec;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

type RestoreCandidate = { id: number; fileName: string };

/**
 * Section "Data" — backup & restore database, lengkap dengan log riwayat.
 *
 * Alur backup:
 *  1. Klik "Buat backup sekarang" → backend menjalankan `VACUUM INTO` ke
 *     `<app_data>/backups/easybook_YYYYMMDD_HHMMSS.db`.
 *  2. Hasilnya muncul di tabel + tercatat di backup_log.
 *
 * Alur restore (aman):
 *  1. Klik "Restore" pada baris backup → konfirmasi password.
 *  2. Backend copy file backup → staging `easybook.db.pending-restore`.
 *  3. UI menampilkan banner "tutup & buka kembali aplikasi" untuk
 *     menyelesaikan restore. File DB lama di-snapshot ke
 *     `easybook.db.before-restore_<ts>.db` saat startup berikutnya
 *     (safety net).
 *  4. Saat startup, DB hasil restore dipromosikan & event RESTORE
 *     dicatat ke backup_log secara otomatis.
 */
export function DataBackupRestoreSection() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [rows, setRows] = useState<BackupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  // Restore confirmation flow
  const [restoreCandidate, setRestoreCandidate] = useState<RestoreCandidate | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  // Delete confirmation
  const [deleteCandidate, setDeleteCandidate] = useState<BackupRow | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [st, list] = await Promise.all([backupStatus(), backupList()]);
      setStatus(st);
      setRows(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const backupRows = useMemo(() => rows.filter((r) => r.jenis === "BACKUP"), [rows]);
  const restoreRows = useMemo(() => rows.filter((r) => r.jenis === "RESTORE"), [rows]);

  async function handleCreateBackup() {
    setCreating(true);
    setError(null);
    setHint(null);
    try {
      const row = await backupCreate();
      setHint(`Backup berhasil dibuat: ${row.fileName}`);
      await refresh();
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleOpenFolder() {
    if (!status?.backupFolderPath) return;
    setError(null);
    try {
      await openPath(status.backupFolderPath);
    } catch (e) {
      setError(tauriErrorMessage(e));
    }
  }

  function handleRequestRestore(row: BackupRow) {
    setError(null);
    setHint(null);
    setRestoreCandidate({ id: row.id, fileName: row.fileName });
    setPasswordOpen(true);
  }

  async function handleRestoreConfirmed() {
    if (!restoreCandidate) {
      setPasswordOpen(false);
      return;
    }
    const cand = restoreCandidate;
    setPasswordOpen(false);
    setBusyId(cand.id);
    setError(null);
    setHint(null);
    try {
      await backupRestoreStage(cand.id);
      setHint(
        `Restore disiapkan dari "${cand.fileName}". Tutup dan buka kembali aplikasi untuk menyelesaikan.`,
      );
      await refresh();
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setBusyId(null);
      setRestoreCandidate(null);
    }
  }

  async function handleCancelPendingRestore() {
    setError(null);
    setHint(null);
    try {
      await backupRestoreCancel();
      setHint("Restore yang tertunda dibatalkan.");
      await refresh();
    } catch (e) {
      setError(tauriErrorMessage(e));
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteCandidate) return;
    const target = deleteCandidate;
    setDeleteCandidate(null);
    setBusyId(target.id);
    setError(null);
    setHint(null);
    try {
      await backupDelete(target.id);
      setHint(`Backup "${target.fileName}" dihapus.`);
      await refresh();
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !status) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Memuat status backup…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      {hint ? (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{hint}</span>
        </div>
      ) : null}

      {status?.restorePending ? (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2">
            <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            <div>
              <p className="font-semibold">Restore tertunda menunggu restart</p>
              <p className="mt-0.5 text-xs leading-relaxed">
                Backup{" "}
                <span className="font-mono">
                  {status.restorePendingSource || "(tidak dikenali)"}
                </span>{" "}
                akan dipulihkan saat aplikasi dibuka berikutnya. Tutup &amp; buka kembali
                aplikasi untuk menyelesaikan.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="px-3 py-1.5 text-xs"
            onClick={handleCancelPendingRestore}
          >
            <XCircle className="h-3.5 w-3.5" aria-hidden />
            Batalkan
          </Button>
        </div>
      ) : null}

      {/* --- Status ringkas --- */}
      <section className="space-y-4">
        <header>
          <h2 className="text-base font-semibold text-zinc-900">Backup database</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Salinan utuh database yang bisa dipakai untuk pemulihan jika file utama
            rusak atau hilang.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="flex flex-col gap-1 p-4">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Backup terakhir
            </span>
            {status?.lastBackupAt ? (
              <>
                <span className="text-sm font-semibold text-zinc-900">
                  {formatTanggalLengkap(status.lastBackupAt)}
                </span>
                <span className="text-xs text-zinc-500">
                  {formatRelatif(status.lastBackupAt)} ·{" "}
                  <span className="font-mono">
                    {status.lastBackupFileName ?? "—"}
                  </span>
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-semibold text-amber-700">
                  Belum pernah dibackup
                </span>
                <span className="text-xs text-zinc-500">
                  Disarankan membuat backup pertama sekarang.
                </span>
              </>
            )}
          </Card>

          <Card className="flex flex-col gap-1 p-4">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Database aktif
            </span>
            <span className="text-sm font-semibold text-zinc-900">
              {formatBytes(status?.dbFileSizeBytes ?? 0)}
            </span>
            <span
              className="truncate font-mono text-xs text-zinc-500"
              title={status?.dbFilePath}
            >
              {status?.dbFilePath ?? "—"}
            </span>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={handleCreateBackup}
            disabled={creating || status?.restorePending}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <DatabaseBackup className="h-4 w-4" aria-hidden />
            )}
            {creating ? "Membuat backup…" : "Buat backup sekarang"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenFolder}
            disabled={!status?.backupFolderPath}
            title={status?.backupFolderPath}
          >
            <FolderOpen className="h-4 w-4" aria-hidden />
            Buka folder backup
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            onClick={() => void refresh()}
          >
            <RefreshCcw className="h-4 w-4" aria-hidden />
            {loading ? "Memuat…" : "Refresh"}
          </Button>
        </div>

        <p
          className="truncate text-xs text-zinc-500"
          title={status?.backupFolderPath}
        >
          Folder backup:{" "}
          <span className="font-mono">{status?.backupFolderPath ?? "—"}</span>
        </p>
      </section>

      {/* --- Daftar backup file --- */}
      <section className="space-y-3">
        <header className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Daftar backup</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Restore akan mengganti seluruh isi database aktif dengan file backup yang dipilih.
            </p>
          </div>
        </header>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5">Nama file</th>
                  <th className="px-4 py-2.5 text-right">Ukuran</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {backupRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-zinc-500"
                    >
                      Belum ada backup. Klik &ldquo;Buat backup sekarang&rdquo; untuk membuat yang pertama.
                    </td>
                  </tr>
                ) : (
                  backupRows.map((r) => (
                    <tr key={r.id} className="bg-white hover:bg-zinc-50/50">
                      <td className="px-4 py-2.5 text-zinc-700">
                        {formatTanggalLengkap(r.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-700">
                        {r.fileName}
                        {r.catatan ? (
                          <div className="mt-0.5 font-sans text-[11px] text-zinc-500">
                            {r.catatan}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">
                        {formatBytes(r.fileSizeBytes)}
                      </td>
                      <td className="px-4 py-2.5">
                        {r.fileExists ? (
                          <Badge variant="success">Tersedia</Badge>
                        ) : (
                          <Badge variant="delayed">File hilang</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRequestRestore(r)}
                            disabled={
                              !r.fileExists ||
                              busyId === r.id ||
                              status?.restorePending
                            }
                            title={
                              r.fileExists
                                ? "Restore database dari file ini"
                                : "File backup tidak ditemukan"
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <HardDriveUpload className="h-3.5 w-3.5" aria-hidden />
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(r)}
                            disabled={busyId === r.id}
                            title="Hapus file backup ini"
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* --- Riwayat restore (audit) --- */}
      <section className="space-y-3">
        <header>
          <h3 className="text-sm font-semibold text-zinc-900">
            <History className="mr-1 inline-block h-4 w-4 align-text-bottom" aria-hidden />
            Riwayat restore
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Jejak audit setiap kali database dipulihkan dari backup. Tidak bisa dihapus.
          </p>
        </header>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-2.5">Tanggal restore</th>
                  <th className="px-4 py-2.5">Sumber backup</th>
                  <th className="px-4 py-2.5">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {restoreRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-sm text-zinc-500"
                    >
                      Belum ada riwayat restore.
                    </td>
                  </tr>
                ) : (
                  restoreRows.map((r) => (
                    <tr key={r.id} className="bg-white">
                      <td className="px-4 py-2.5 text-zinc-700">
                        {formatTanggalLengkap(r.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-700">
                        {r.fileName || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-600">
                        {r.catatan || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* --- Tip --- */}
      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2.5 text-xs leading-relaxed text-sky-900">
        <Database className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">Tip menjaga keamanan data</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>
              Salin file backup ke USB / cloud storage secara berkala dari folder backup di
              atas.
            </li>
            <li>
              Sebelum melakukan perubahan besar (mis. restore atau setup ulang awal periode),
              buat backup terlebih dahulu.
            </li>
            <li>
              Setelah restore selesai, file DB sebelumnya disimpan otomatis sebagai{" "}
              <span className="font-mono">easybook.db.before-restore_…</span> di folder data
              aplikasi sebagai jaring pengaman.
            </li>
          </ul>
        </div>
      </div>

      <PasswordConfirmModal
        open={passwordOpen}
        title="Konfirmasi restore database"
        description={
          restoreCandidate
            ? `Anda akan mengganti SELURUH database aktif dengan isi backup "${restoreCandidate.fileName}". Aksi ini tidak bisa dibatalkan setelah restart aplikasi.`
            : "Konfirmasi restore database."
        }
        confirmLabel="Lanjutkan restore"
        confirmVariant="danger"
        onClose={() => {
          setPasswordOpen(false);
          setRestoreCandidate(null);
        }}
        onConfirmed={() => void handleRestoreConfirmed()}
      />

      <Modal
        open={deleteCandidate !== null}
        title="Hapus backup?"
        onClose={() => setDeleteCandidate(null)}
        panelClassName="max-w-md"
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteCandidate(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => void handleDeleteConfirmed()}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Hapus permanen
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-zinc-700">
          <p>
            File backup &ldquo;
            <span className="font-mono">{deleteCandidate?.fileName}</span>&rdquo; akan
            dihapus dari disk dan log. Tindakan ini tidak bisa dibatalkan.
          </p>
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <HardDriveDownload className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Pastikan Anda sudah memiliki salinan lain (USB / cloud) bila backup ini
              penting.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
