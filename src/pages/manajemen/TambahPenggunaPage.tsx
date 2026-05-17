import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { PenggunaInsert } from "@/data/pengguna";
import {
  PenggunaFields,
  type PenggunaFormValues,
} from "@/features/pengguna/PenggunaFields";
import { tauriErrorMessage } from "@/lib/tauriError";

const emptyForm = (): PenggunaFormValues => ({
  username: "",
  namaLengkap: "",
  email: "",
  password: "",
  passwordConfirm: "",
  departemen: "",
  nomorHp: "",
  aktif: true,
  isAdmin: false,
  catatan: "",
});

export function TambahPenggunaPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<PenggunaFormValues>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function patch(p: Partial<PenggunaFormValues>) {
    setValues((prev) => ({ ...prev, ...p }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const username = values.username.trim().toLowerCase();
    if (!username) {
      setError("Username wajib diisi.");
      return;
    }
    if (!values.namaLengkap.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }
    if (!values.password) {
      setError("Password wajib diisi.");
      return;
    }
    if (values.password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (values.password !== values.passwordConfirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setSaving(true);
    try {
      const exists = await invoke<boolean>("pengguna_username_exists", { username });
      if (exists) {
        setError("Username sudah dipakai.");
        return;
      }

      const payload: PenggunaInsert = {
        username,
        namaLengkap: values.namaLengkap.trim(),
        email: values.email.trim(),
        password: values.password,
        departemen: values.departemen.trim(),
        nomorHp: values.nomorHp.trim(),
        aktif: values.aktif,
        isAdmin: values.isAdmin,
        catatan: values.catatan.trim(),
      };
      await invoke("pengguna_insert", { row: payload });
      navigate("/manajemen/pengguna");
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSaving(false);
    }
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
        <PageHeader title="Tambah pengguna" description="Buat akun baru untuk mengakses aplikasi." />
      </div>

      <Card>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
          <PenggunaFields values={values} onChange={patch} />

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan pengguna"}
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
