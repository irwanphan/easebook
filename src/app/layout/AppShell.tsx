import { useMemo } from "react";
import { Outlet } from "react-router-dom";
import { SidebarNav } from "@/app/layout/SidebarNav";
import { primaryNavEntries } from "@/config/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { PageAccessGuard } from "@/features/auth/PageAccessGuard";
import { BarangJasaProvider } from "@/features/barang-jasa/BarangJasaContext";
import { KategoriGrupProvider } from "@/features/kategori-grup/KategoriGrupContext";
import { MerekProvider } from "@/features/merek/MerekContext";
import { GudangProvider } from "@/features/gudang/GudangContext";
import { PelangganProvider } from "@/features/pelanggan/PelangganContext";
import { PemasokProvider } from "@/features/pemasok/PemasokContext";
import { QuickAccessProvider } from "@/features/quick-access/QuickAccessContext";
import { QuickAccessFab } from "@/features/quick-access/QuickAccessFab";
import { filterNavByModul } from "@/features/modul-bisnis/navFilter";
import { useModulAktif } from "@/features/modul-bisnis/useModulAktif";

function AppShellInner() {
  const { filterNav } = useAuth();
  const modulAktif = useModulAktif();
  // Urutan filter: modul dulu (preferensi tampilan), lalu hak akses
  // halaman (auth). Hasil akhir: sidebar hanya menampilkan menu yang
  // (a) modul-nya diaktifkan user, (b) user punya hak akses.
  const navItems = useMemo(
    () => filterNav(filterNavByModul(primaryNavEntries, modulAktif)),
    [filterNav, modulAktif],
  );

  return (
    <div
      className="fixed inset-0 flex min-h-0 w-full bg-zinc-100 print:static print:inset-auto print:h-auto print:min-h-0 print:bg-white"
    >
      <SidebarNav items={navItems} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden print:overflow-visible">
        <main className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8 print:overflow-visible print:p-0">
          <PageAccessGuard>
            <Outlet />
          </PageAccessGuard>
        </main>
      </div>
      <QuickAccessFab />
    </div>
  );
}

export function AppShell() {
  return (
    <BarangJasaProvider>
      <KategoriGrupProvider>
        <MerekProvider>
          <GudangProvider>
            <PelangganProvider>
              <PemasokProvider>
                <QuickAccessProvider>
                  <AppShellInner />
                </QuickAccessProvider>
              </PemasokProvider>
            </PelangganProvider>
          </GudangProvider>
        </MerekProvider>
      </KategoriGrupProvider>
    </BarangJasaProvider>
  );
}
