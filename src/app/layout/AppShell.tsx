import { Outlet } from "react-router-dom";
import { SidebarNav } from "@/app/layout/SidebarNav";
import { primaryNavEntries } from "@/config/navigation";
import { BarangJasaProvider } from "@/features/barang-jasa/BarangJasaContext";
import { KategoriGrupProvider } from "@/features/kategori-grup/KategoriGrupContext";
import { MerekProvider } from "@/features/merek/MerekContext";
import { GudangProvider } from "@/features/gudang/GudangContext";

export function AppShell() {
  return (
    <BarangJasaProvider>
      <KategoriGrupProvider>
        <MerekProvider>
          <GudangProvider>
            <div className="flex h-full min-h-0 bg-zinc-100">
              <SidebarNav items={primaryNavEntries} />
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <main className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8">
                  <Outlet />
                </main>
              </div>
            </div>
          </GudangProvider>
        </MerekProvider>
      </KategoriGrupProvider>
    </BarangJasaProvider>
  );
}
