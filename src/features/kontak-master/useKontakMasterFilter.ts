import { useCallback, useMemo, useState } from "react";
import type { KontakMasterRow } from "@/data/kontakMaster";

/**
 * Hook search filter generik untuk daftar kontak master
 * (Pelanggan / Pemasok). Mencari case-insensitive di field:
 * kode, nama, kota, telepon, email, dan alamat (kalau ada).
 *
 * Parent meng-own state; hook ini mengembalikan controlled state
 * + filtered rows, siap dipasangkan dengan `ListFilterBar`.
 */
export function useKontakMasterFilter(items: KontakMasterRow[]) {
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const hay =
        `${row.kode} ${row.nama} ${row.kota ?? ""} ${row.telepon ?? ""} ${row.email ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const reset = useCallback(() => setQuery(""), []);
  const isDefault = query === "";

  return { query, setQuery, filteredItems, reset, isDefault };
}
