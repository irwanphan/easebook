import { useMemo } from "react";
import { halamanAksesGroups, allHalamanAksesKeys } from "@/config/halamanAkses";

type PenggunaHalamanAksesSectionProps = {
  selectedKeys: string[];
  isAdmin: boolean;
  onChange: (keys: string[]) => void;
};

export function PenggunaHalamanAksesSection({
  selectedKeys,
  isAdmin,
  onChange,
}: PenggunaHalamanAksesSectionProps) {
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  function toggleKey(key: string, checked: boolean) {
    if (isAdmin) return;
    const next = new Set(selectedSet);
    if (checked) next.add(key);
    else next.delete(key);
    onChange([...next]);
  }

  function toggleGroup(groupKeys: string[], checked: boolean) {
    if (isAdmin) return;
    const next = new Set(selectedSet);
    for (const key of groupKeys) {
      if (checked) next.add(key);
      else next.delete(key);
    }
    onChange([...next]);
  }

  function selectAll() {
    if (isAdmin) return;
    onChange([...allHalamanAksesKeys]);
  }

  function clearAll() {
    if (isAdmin) return;
    onChange(["dashboard"]);
  }

  const totalSelected = isAdmin ? allHalamanAksesKeys.length : selectedSet.size;

  return (
    <section className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Hak akses halaman</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Centang halaman yang boleh dibuka pengguna ini. Sub-halaman (tambah, ubah, detail) dikontrol
            terpisah.
          </p>
        </div>
        {!isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              onClick={selectAll}
            >
              Pilih semua
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              onClick={clearAll}
            >
              Hanya dashboard
            </button>
          </div>
        ) : null}
      </div>

      {isAdmin ? (
        <p className="mt-3 rounded-lg border border-brand-200/80 bg-brand-50 px-3 py-2 text-xs text-brand-900">
          Administrator memiliki akses penuh ke semua halaman ({allHalamanAksesKeys.length} halaman).
        </p>
      ) : (
        <p className="mt-2 text-xs text-zinc-600">
          {totalSelected} dari {allHalamanAksesKeys.length} halaman dipilih
        </p>
      )}

      <div className="mt-4 flex max-h-[min(420px,50vh)] flex-col gap-4 overflow-y-auto overscroll-y-contain pr-1">
        {halamanAksesGroups.map((group) => {
          const groupKeys = group.pages.map((p) => p.key);
          const allInGroup = groupKeys.every((k) => selectedSet.has(k) || isAdmin);
          const someInGroup = groupKeys.some((k) => selectedSet.has(k) || isAdmin);

          return (
            <fieldset key={group.id} className="rounded-lg border border-zinc-200/80 bg-white p-3">
              <legend className="sr-only">{group.label}</legend>
              <label className="mb-2 flex cursor-pointer items-center gap-2 border-b border-zinc-100 pb-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
                  checked={isAdmin ? true : allInGroup}
                  ref={(el) => {
                    if (el) el.indeterminate = !isAdmin && someInGroup && !allInGroup;
                  }}
                  disabled={isAdmin}
                  onChange={(e) => toggleGroup(groupKeys, e.target.checked)}
                />
                <span className="text-sm font-semibold text-zinc-800">{group.label}</span>
              </label>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {group.pages.map((page) => {
                  const checked = isAdmin || selectedSet.has(page.key);
                  return (
                    <li key={page.key}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
                          checked={checked}
                          disabled={isAdmin}
                          onChange={(e) => toggleKey(page.key, e.target.checked)}
                        />
                        <span className="min-w-0 leading-snug">{page.label}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}
      </div>
    </section>
  );
}
