import { Outlet } from "react-router-dom";
import { PageAccessGuard } from "@/features/auth/PageAccessGuard";
import { KategoriGrupProvider } from "@/features/kategori-grup/KategoriGrupContext";
import { GudangProvider } from "@/features/gudang/GudangContext";
import { PelangganProvider } from "@/features/pelanggan/PelangganContext";
import { POSProvider } from "@/features/pos/POSContext";

/**
 * Shell untuk window POS. Hanya memuat context yang relevan untuk transaksi
 * kasir (master barang/jasa di-fetch lewat command POS-specific, jadi
 * BarangJasaProvider tidak perlu). Tidak menampilkan sidebar — kasir punya
 * layar penuh.
 */
export function POSShell() {
  return (
    <KategoriGrupProvider>
      <GudangProvider>
        <PelangganProvider>
          <POSProvider>
            <div className="fixed inset-0 flex min-h-0 w-full overflow-hidden bg-zinc-50 text-zinc-900 print:static print:inset-auto print:h-auto print:min-h-0 print:bg-white">
              <PageAccessGuard>
                <Outlet />
              </PageAccessGuard>
            </div>
          </POSProvider>
        </PelangganProvider>
      </GudangProvider>
    </KategoriGrupProvider>
  );
}
