import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export function PengaturanPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Pengaturan"
        description="Preferensi aplikasi dan perusahaan (lanjutan)."
      />
      <Card>
        <p className="text-sm leading-relaxed text-zinc-600">
          Modul ini siap dihubungkan ke penyimpanan lokal atau backend. Untuk MVP, fokus ke
          master data di halaman Barang & jasa serta transaksi Penjualan / Pembelian.
        </p>
      </Card>
    </div>
  );
}
