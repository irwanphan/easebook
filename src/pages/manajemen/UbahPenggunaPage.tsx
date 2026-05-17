import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { PenggunaRow, PenggunaUpdate } from "@/data/pengguna";
import {
  PenggunaFields,
  type PenggunaFormValues,
} from "@/features/pengguna/PenggunaFields";
import { tauriErrorMessage } from "@/lib/tauriError";

function rowToForm(row: PenggunaRow): PenggunaFormValues {
  return {
    username: row.username,
    namaLengkap: row.namaLengkap,
    email: row.email,
    password: "",
    passwordConfirm: "",
    departemen: row.departemen,
    nomorHp: row.nomorHp,
    aktif: row.aktif,
    isAdmin: row.isAdmin,
    catatan: row.catatan,
  };
}

export function UbahPenggunaPage() {
  const { username: usernameParam } = useParams();
  const username = usernameParam ? decodeURIComponent(usernameParam) : "";
  const navigate = useNavigate();

  const [values, setValues] = useState<PenggunaFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await invoke<PenggunaRow[]>("pengguna_list");
        if (cancelled) return;
        const row = list.find((r) => r.username.toLowerCase() === username.toLowerCase());
        if (row) {
          setValues(rowToForm(row));
        } else {
          setValues(null);
        }
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
  }, [username]);

  function patch(p: Partial<PenggunaFormValues>) {
    setValues((prev) => (prev ? { ...prev, ...p } : prev));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values) return;
    setError(null);

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
        aktif: values.aktif,
        isAdmin: values.isAdmin,
        catatan: values.catatan.trim(),
      };
      await invoke("pengguna_update", { username: values.username, row: payload });
      navigate("/manajemen/pengguna");
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Memuat data pengguna…</p>;
  }

  if (!values) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <PageHeader title="Pengguna tidak ditemukan" description="Username tidak ada di daftar." />
        <Button type="button" variant="ghost" className="self-start" onClick={() => navigate("/manajemen/pengguna")}>
          Kembali ke daftar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          to="/manajemen/pengguna"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke daftar
        </Link>
        <PageHeader title="Ubah pengguna" description={`Akun: ${values.username}`} />
      </div>

      <Card>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
          <PenggunaFields values={values} onChange={patch} isEdit />

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan perubahan"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/manajemen/pengguna")}>
              Batal
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
