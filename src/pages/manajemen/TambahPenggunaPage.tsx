import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { PenggunaInsert, PenggunaRow } from "@/data/pengguna";
import {
  PenggunaFields,
  type PenggunaFormValues,
} from "@/features/pengguna/PenggunaFields";
import {
  duplicatePenggunaFormFromRow,
  emptyPenggunaForm,
} from "@/features/pengguna/penggunaFormFromRow";
import { applyPenggunaFotoChanges } from "@/lib/penggunaFoto";
import { tauriErrorMessage } from "@/lib/tauriError";

export function TambahPenggunaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const duplikatDari = searchParams.get("duplikat")?.trim() ?? "";

  const [values, setValues] = useState<PenggunaFormValues>(emptyPenggunaForm);
  const [loadingTemplate, setLoadingTemplate] = useState(Boolean(duplikatDari));
  const [sumberDuplikat, setSumberDuplikat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!duplikatDari) {
      setValues(emptyPenggunaForm());
      setSumberDuplikat(null);
      setLoadingTemplate(false);
      return;
    }

    let cancelled = false;
    async function loadTemplate() {
      setLoadingTemplate(true);
      setError(null);
      try {
        const list = await invoke<PenggunaRow[]>("pengguna_list");
        if (cancelled) return;
        const row = list.find((r) => r.username.toLowerCase() === duplikatDari.toLowerCase());
        if (!row) {
          setError(`Pengguna sumber "${duplikatDari}" tidak ditemukan.`);
          setValues(emptyPenggunaForm());
          setSumberDuplikat(null);
          return;
        }
        const halamanAkses = row.isAdmin
          ? []
          : await invoke<string[]>("pengguna_halaman_akses_get", { username: row.username });
        if (cancelled) return;
        setValues(duplicatePenggunaFormFromRow(row, halamanAkses));
        setSumberDuplikat(row.username);
      } catch (e) {
        if (!cancelled) {
          setError(tauriErrorMessage(e));
          setValues(emptyPenggunaForm());
          setSumberDuplikat(null);
        }
      } finally {
        if (!cancelled) setLoadingTemplate(false);
      }
    }
    void loadTemplate();
    return () => {
      cancelled = true;
    };
  }, [duplikatDari]);

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
    if (!values.isAdmin && values.halamanAkses.length === 0) {
      setError("Pilih minimal satu halaman yang boleh diakses.");
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
        halamanAkses: values.isAdmin ? [] : values.halamanAkses,
      };
      await invoke("pengguna_insert", { row: payload });
      await applyPenggunaFotoChanges(username, values.foto);
      navigate("/manajemen/pengguna");
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const judul = sumberDuplikat ? "Duplikat pengguna" : "Tambah pengguna";
  const deskripsi = sumberDuplikat
    ? `Pengaturan hak akses disalin dari "${sumberDuplikat}". Isi username, nama, dan password untuk akun baru.`
    : "Buat akun baru untuk mengakses aplikasi.";

  if (loadingTemplate) {
    return <p className="text-sm text-zinc-500">Memuat template hak akses…</p>;
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link
          to="/manajemen/pengguna"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke daftar
        </Link>
        <PageHeader 
          title={judul} 
          description={deskripsi} 
        />
      </div>

      {sumberDuplikat ? (
        <p className="rounded-xl border border-brand-200/80 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          Hak akses halaman, departemen, status aktif, dan peran admin mengikuti pengguna{" "}
          <span className="font-mono font-medium">{sumberDuplikat}</span>. Anda masih bisa mengubahnya
          sebelum menyimpan.
        </p>
      ) : null}

      <Card>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
          <PenggunaFields values={values} onChange={patch} />

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/manajemen/pengguna")}>
              <X className="h-4 w-4" aria-hidden />
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4" aria-hidden />
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
