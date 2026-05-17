import {
  allHalamanAksesKeys,
  halamanAksesGroups,
  type HalamanAksesPage,
} from "@/config/halamanAkses";
import type { NavGroupEntry, NavSubItem, PrimaryNavEntry } from "@/config/navigation";

function splitPath(path: string): string[] {
  return path.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
}

/** Cocokkan path aktual dengan pola (segmen `:param` = wildcard). */
export function pathMatchesPattern(actualPath: string, pattern: string): boolean {
  const a = splitPath(actualPath);
  const p = splitPath(pattern);
  if (a.length !== p.length) return false;
  return p.every((seg, i) => seg.startsWith(":") || seg.toLowerCase() === a[i]!.toLowerCase());
}

export function resolveHalamanKeyFromPath(pathname: string): string | null {
  const normalized = splitPath(pathname).join("/");
  for (const group of halamanAksesGroups) {
    for (const page of group.pages) {
      if (pathMatchesPattern(normalized, page.pathPattern)) {
        return page.key;
      }
    }
  }
  return null;
}

export function canAccessHalaman(
  halamanKey: string | null,
  isAdmin: boolean,
  allowedKeys: Set<string>,
): boolean {
  if (isAdmin) return true;
  if (!halamanKey) return true;
  return allowedKeys.has(halamanKey);
}

/** Halaman yang boleh diakses semua pengguna login tanpa entri hak akses. */
const PUBLIC_AUTHENTICATED_PATHS = new Set(["profil"]);

export function canAccessPath(pathname: string, isAdmin: boolean, allowedKeys: Set<string>): boolean {
  const segments = splitPath(pathname);
  if (segments.length === 1 && PUBLIC_AUTHENTICATED_PATHS.has(segments[0]!.toLowerCase())) {
    return true;
  }
  const key = resolveHalamanKeyFromPath(pathname);
  return canAccessHalaman(key, isAdmin, allowedKeys);
}

export function filterPrimaryNavEntries(
  entries: PrimaryNavEntry[],
  isAdmin: boolean,
  allowedKeys: Set<string>,
): PrimaryNavEntry[] {
  if (isAdmin) return entries;

  return entries
    .map((entry) => {
      if (entry.kind === "link") {
        return canAccessHalaman(entry.id, false, allowedKeys) ? entry : null;
      }
      const children = entry.children.filter((child: NavSubItem) =>
        canAccessHalaman(child.id, false, allowedKeys),
      );
      if (children.length === 0) return null;
      return { ...entry, children } satisfies NavGroupEntry;
    })
    .filter((e): e is PrimaryNavEntry => e != null);
}

export function defaultHalamanAksesForUser(isAdmin: boolean): string[] {
  return isAdmin ? [...allHalamanAksesKeys] : ["dashboard"];
}

export function allHalamanPages(): HalamanAksesPage[] {
  return halamanAksesGroups.flatMap((g) => g.pages);
}
