import { Outlet } from "react-router-dom";

/**
 * Shell minimal untuk window POS. Tidak menampilkan sidebar utama agar
 * kasir punya layar penuh untuk transaksi. Sub-halaman POS (katalog, retur,
 * shift) di-render via <Outlet />.
 */
export function POSShell() {
  return (
    <div className="fixed inset-0 flex min-h-0 w-full flex-col overflow-hidden bg-zinc-50 text-zinc-900 print:static print:inset-auto print:h-auto print:min-h-0 print:bg-white">
      <Outlet />
    </div>
  );
}
