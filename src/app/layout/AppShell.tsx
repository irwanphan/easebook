import { Outlet } from "react-router-dom";
import { SidebarNav } from "@/app/layout/SidebarNav";
import { primaryNavEntries } from "@/config/navigation";
import { BarangJasaProvider } from "@/features/barang-jasa/BarangJasaContext";
import { KategoriGrupProvider } from "@/features/kategori-grup/KategoriGrupContext";
import { MerekProvider } from "@/features/merek/MerekContext";
import { GudangProvider } from "@/features/gudang/GudangContext";
import { PelangganProvider } from "@/features/pelanggan/PelangganContext";
import { PemasokProvider } from "@/features/pemasok/PemasokContext";

export function AppShell() {
  return (
    <BarangJasaProvider>
      <KategoriGrupProvider>
        <MerekProvider>
          <GudangProvider>
            <PelangganProvider>
              <PemasokProvider>
                <div className="flex min-h-0 flex-1 bg-zinc-100">
                  <SidebarNav items={primaryNavEntries} />
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <main className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8">
                      <Outlet />
                    </main>
                  </div>
                </div>
              </PemasokProvider>
            </PelangganProvider>
          </GudangProvider>
        </MerekProvider>
      </KategoriGrupProvider>
    </BarangJasaProvider>
  );
}
