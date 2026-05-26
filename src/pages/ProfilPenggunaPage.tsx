import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { ChevronRight, Zap } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { PenggunaRow, PenggunaUpdate } from "@/data/pengguna";
import { useAuth } from "@/features/auth/AuthContext";
import {
  ProfilPenggunaFields,
  type ProfilPenggunaFormValues,
} from "@/features/pengguna/ProfilPenggunaFields";
import happySvg from "@/assets/happy.svg";
import { applyPenggunaFotoChanges, fotoProfilDisplayUrl, loadPenggunaFotoPreviewUrl } from "@/lib/penggunaFoto";
import { tauriErrorMessage } from "@/lib/tauriError";

type ProfilMeta = {
  aktif: boolean;
  isAdmin: boolean;
  halamanAkses: string[];
};

export function ProfilPenggunaPage() {
  const { session, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<ProfilPenggunaFormValues | null>(null);
  const [meta, setMeta] = useState<ProfilMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.username) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await invoke<PenggunaRow[]>("pengguna_list");
        if (cancelled) return;
        const row = list.find((r) => r.username.toLowerCase() === session!.username.toLowerCase());
        if (!row) {
          setValues(null);
          setMeta(null);
          return;
        }
        const halamanAkses = row.isAdmin
          ? []
          : await invoke<string[]>("pengguna_halaman_akses_get", { username: row.username });
        const previewUrl = await loadPenggunaFotoPreviewUrl(row.username);
        if (cancelled) return;

        setMeta({
          aktif: row.aktif,
          isAdmin: row.isAdmin,
          halamanAkses: halamanAkses.length > 0 ? halamanAkses : ["dashboard"],
        });
        setValues({
          username: row.username,
          namaLengkap: row.namaLengkap,
          email: row.email,
          departemen: row.departemen,
          nomorHp: row.nomorHp,
          catatan: row.catatan,
          password: "",
          passwordConfirm: "",
          foto: { previewUrl, webpBytes: null, removed: false },
        });
      } catch (e) {
        if (!cancelled) setError(tauriErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [session?.username]);

  function patch(p: Partial<ProfilPenggunaFormValues>) {
    setValues((prev) => (prev ? { ...prev, ...p } : prev));
    setSuccess(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values || !meta || !session) return;
    setError(null);
    setSuccess(null);

    if (!values.namaLengkap.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }
    if (values.password || values.passwordConfirm) {
      if (values.password.length < 6) {
        setError("Password minimal 6 karakter.");
        return;
      }
      if (values.password !== values.passwordConfirm) {
        setError("Konfirmasi password tidak cocok.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: PenggunaUpdate = {
        namaLengkap: values.namaLengkap.trim(),
        email: values.email.trim(),
        password: values.password,
        departemen: values.departemen.trim(),
        nomorHp: values.nomorHp.trim(),
        aktif: meta.aktif,
        isAdmin: meta.isAdmin,
        catatan: values.catatan.trim(),
        halamanAkses: meta.isAdmin ? [] : meta.halamanAkses,
      };
      await invoke("pengguna_update", { username: values.username, row: payload });
      await applyPenggunaFotoChanges(values.username, values.foto);
      await refreshSession();
      setValues((prev) =>
        prev
          ? {
              ...prev,
              password: "",
              passwordConfirm: "",
              foto: { ...prev.foto, webpBytes: null, removed: false },
            }
          : prev,
      );
      setSuccess("Profil berhasil diperbarui.");
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Memuat profil…</p>;
  }

  if (!session || !values) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Profil tidak tersedia" description="Sesi tidak valid atau data pengguna hilang." />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Profil saya"
        description="Perbarui data pribadi dan password akun Anda."
      />

      <button
        type="button"
        onClick={() => navigate("/profil/akses-cepat")}
        className="group flex w-full items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-300 hover:bg-brand-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <Zap className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900">Pengaturan akses cepat</p>
          <p className="mt-0.5 text-sm text-zinc-500">
            Atur tombol melayang (FAB) di pojok kanan bawah — pilih menu pintas atau matikan
            kalau tidak diperlukan.
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden />
      </button>

      <Card className="flex items-center gap-4 p-5">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-brand-200">
          <img
            src={
              values.foto.removed
                ? happySvg
                : values.foto.previewUrl ??
                  fotoProfilDisplayUrl(session.fotoProfilPath) ??
                  happySvg
            }
            alt={values.namaLengkap ? `Foto ${values.namaLengkap}` : ""}
            width={80}
            height={80}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-zinc-900">{values.namaLengkap}</p>
          <p className="font-mono text-sm text-zinc-500">@{values.username}</p>
          <p className="mt-1 text-sm text-zinc-600">
            {session.isAdmin ? "Administrator" : values.departemen || "Pengguna"}
          </p>
        </div>
      </Card>

      <Card>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
          <ProfilPenggunaFields values={values} onChange={patch} isAdmin={session.isAdmin} />

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          ) : null}
          {success ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {success}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan perubahan"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
