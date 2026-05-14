export type InformasiPerusahaan = {
  namaPerusahaan: string;
  alamat: string;
  nomorTelepon: string;
  emailPerusahaan: string;
};

export const defaultInformasiPerusahaan: InformasiPerusahaan = {
  namaPerusahaan: "",
  alamat: "",
  nomorTelepon: "",
  emailPerusahaan: "",
};

const STORAGE_KEY = "easybook-informasi-perusahaan";

export function loadInformasiPerusahaan(): InformasiPerusahaan {
  if (typeof window === "undefined") return { ...defaultInformasiPerusahaan };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultInformasiPerusahaan };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return { ...defaultInformasiPerusahaan };
    const o = parsed as Record<string, unknown>;
    return {
      namaPerusahaan: typeof o.namaPerusahaan === "string" ? o.namaPerusahaan : "",
      alamat: typeof o.alamat === "string" ? o.alamat : "",
      nomorTelepon: typeof o.nomorTelepon === "string" ? o.nomorTelepon : "",
      emailPerusahaan: typeof o.emailPerusahaan === "string" ? o.emailPerusahaan : "",
    };
  } catch {
    return { ...defaultInformasiPerusahaan };
  }
}

export function persistInformasiPerusahaan(data: InformasiPerusahaan) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
