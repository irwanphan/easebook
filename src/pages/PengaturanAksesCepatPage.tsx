import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Lock,
  RotateCcw,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useQuickAccess } from "@/features/quick-access/QuickAccessContext";
import { QUICK_ACTIONS, TONE_PILL_CLASS } from "@/config/quickActions";
import { useAuth } from "@/features/auth/AuthContext";

/**
 * Pengaturan tombol Akses cepat (FAB) per-user.
 *
 * Layout: dua kartu vertikal.
 *  1. Toggle global aktif/nonaktif + tombol reset default.
 *  2. Daftar aksi terpilih (urut) — tiap baris bisa naik/turun/hapus.
 *  3. Daftar aksi tersedia — klik "Tambahkan" untuk menambahkan.
 */
export function PengaturanAksesCepatPage() {
  const navigate = useNavigate();
  const { session, allowedKeys } = useAuth();
  const { settings, setEnabled, setItemIds, resetToDefault, maxItems } = useQuickAccess();

  const isAdmin = !!session?.isAdmin;
  const [savedNote, setSavedNote] = useState<string | null>(null);

  // Helper untuk hitung apakah user punya izin ke aksi tertentu.
  const hasAccess = (accessKey: string) => isAdmin || allowedKeys.has(accessKey);

  const selectedIds = settings.itemIds;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedActions = useMemo(
    () =>
      selectedIds
        .map((id) => QUICK_ACTIONS.find((a) => a.id === id))
        .filter((a): a is (typeof QUICK_ACTIONS)[number] => a != null),
    [selectedIds],
  );

  const availableActions = useMemo(
    () => QUICK_ACTIONS.filter((a) => !selectedSet.has(a.id)),
    [selectedSet],
  );

  function flash(msg: string) {
    setSavedNote(msg);
    window.setTimeout(() => setSavedNote((s) => (s === msg ? null : s)), 1800);
  }

  function move(id: string, dir: -1 | 1) {
    const idx = selectedIds.indexOf(id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    setItemIds(next);
    flash("Urutan diperbarui");
  }

  function remove(id: string) {
    setItemIds(selectedIds.filter((x) => x !== id));
    flash("Aksi dihapus dari menu");
  }

  function add(id: string) {
    if (selectedIds.length >= maxItems) return;
    setItemIds([...selectedIds, id]);
    flash("Aksi ditambahkan");
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="Akses cepat"
          description="Atur tombol melayang (FAB) di pojok kanan bawah untuk membuka halaman favorit Anda."
        />
        <Button type="button" variant="outline" className="bg-white" onClick={() => navigate("/profil")}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke profil
        </Button>
      </div>

      {savedNote ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800"
        >
          {savedNote}
        </div>
      ) : null}

      <Card className="">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <Zap className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Tombol melayang</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Saat aktif, sebuah tombol bulat di pojok kanan bawah akan menampilkan menu pintas
                Anda.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SwitchToggle
              checked={settings.enabled}
              onChange={(v) => {
                setEnabled(v);
                flash(v ? "FAB akses cepat diaktifkan" : "FAB akses cepat dinonaktifkan");
              }}
              labelOn="Aktif"
              labelOff="Nonaktif"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetToDefault();
                flash("Pengaturan dikembalikan ke default");
              }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reset default
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-zinc-100">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-zinc-900">Menu akses cepat saya</h2>
            <span className="text-xs text-zinc-500">
              {selectedActions.length} dari maksimum {maxItems}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Urutkan dari atas (muncul paling bawah di menu, dekat tombol) ke bawah (paling atas).
            Aksi yang tidak Anda akses akan tetap tersimpan namun disembunyikan otomatis di FAB.
          </p>
        </div>
        {selectedActions.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">
            Belum ada aksi terpilih. Tambahkan dari daftar di bawah.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {selectedActions.map((action, idx) => {
              const Icon = action.icon;
              const granted = hasAccess(action.accessKey);
              const isFirst = idx === 0;
              const isLast = idx === selectedActions.length - 1;
              return (
                <li key={action.id} className="flex items-center gap-3 py-3">
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-white ${TONE_PILL_CLASS[action.tone]}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900">{action.label}</p>
                    <p className="truncate text-xs text-zinc-500">{action.hint}</p>
                  </div>
                  {!granted ? (
                    <Badge variant="delayed">
                      <Lock className="mr-1 h-3 w-3" aria-hidden />
                      Tanpa akses
                    </Badge>
                  ) : null}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(action.id, -1)}
                      disabled={isFirst}
                      aria-label="Pindah ke atas"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(action.id, 1)}
                      disabled={isLast}
                      aria-label="Pindah ke bawah"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden />
                    </button>
                    <Button
                      type="button"
                      variant="outline"
                      className="ml-1 px-3 py-1.5 text-xs"
                      onClick={() => remove(action.id)}
                    >
                      Hapus
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-zinc-100 mb-3">
          <h2 className="text-sm font-semibold text-zinc-900">Aksi tersedia</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Klik "Tambahkan" untuk memasukkannya ke menu akses cepat Anda.
          </p>
        </div>
        {availableActions.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">
            Semua aksi sudah ditambahkan ke menu Anda.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {availableActions.map((action) => {
              const Icon = action.icon;
              const granted = hasAccess(action.accessKey);
              const isFull = selectedIds.length >= maxItems;
              return (
                <li key={action.id} className="flex items-center gap-3 py-3">
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-white ${TONE_PILL_CLASS[action.tone]}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900">{action.label}</p>
                    <p className="truncate text-xs text-zinc-500">{action.hint}</p>
                  </div>
                  {!granted ? (
                    <Badge variant="delayed">
                      <Lock className="mr-1 h-3 w-3" aria-hidden />
                      Tanpa akses
                    </Badge>
                  ) : null}
                  <Button
                    type="button"
                    variant={isFull ? "outline" : "primary"}
                    className="px-3 py-1.5 text-xs"
                    onClick={() => add(action.id)}
                    disabled={isFull}
                    title={
                      isFull
                        ? `Maksimum ${maxItems} aksi — hapus salah satu dulu.`
                        : "Tambahkan ke menu akses cepat"
                    }
                  >
                    Tambahkan
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function SwitchToggle({
  checked,
  onChange,
  labelOn,
  labelOff,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  labelOn: string;
  labelOff: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-9 min-w-[7.5rem] items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${
        checked
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-zinc-200 bg-zinc-50 text-zinc-600"
      }`}
    >
      <span
        className={`inline-flex h-5 w-9 items-center rounded-full border transition ${
          checked
            ? "justify-end border-emerald-500 bg-emerald-500"
            : "justify-start border-zinc-300 bg-white"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full shadow ${
            checked ? "bg-white" : "bg-zinc-400"
          } mx-0.5`}
        />
      </span>
      <span>{checked ? labelOn : labelOff}</span>
    </button>
  );
}
