import { Outlet } from "react-router-dom";
import { SidebarNav } from "@/app/layout/SidebarNav";
import { primaryNavEntries } from "@/config/navigation";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import { PageAccessGuard } from "@/features/auth/PageAccessGuard";
import { BarangJasaProvider } from "@/features/barang-jasa/BarangJasaContext";
import { KategoriGrupProvider } from "@/features/kategori-grup/KategoriGrupContext";
import { MerekProvider } from "@/features/merek/MerekContext";
import { GudangProvider } from "@/features/gudang/GudangContext";
import { PelangganProvider } from "@/features/pelanggan/PelangganContext";
import { PemasokProvider } from "@/features/pemasok/PemasokContext";

function AppShellInner() {
  const { filterNav } = useAuth();
  const navItems = filterNav(primaryNavEntries);

  return (
    <div className="flex min-h-0 flex-1 bg-zinc-100">
      <SidebarNav items={navItems} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <main className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8">
          <PageAccessGuard>
            <Outlet />
          </PageAccessGuard>
        </main>
      </div>
    </div>
  );
}

export function AppShell() {
  return (
    <AuthProvider>
    <BarangJasaProvider>
      <KategoriGrupProvider>
        <MerekProvider>
          <GudangProvider>
            <PelangganProvider>
              <PemasokProvider>
                <AppShellInner />
              </PemasokProvider>
            </PelangganProvider>
          </GudangProvider>
        </MerekProvider>
      </KategoriGrupProvider>
    </BarangJasaProvider>
    </AuthProvider>
  );
}
