import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export function KategoriGrupPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Kategori / grup barang"
        description="Master pengelompokan SKU untuk laporan dan filter katalog."
      />
      <Card>
        <p className="text-sm leading-relaxed text-zinc-600">
          Modul ini siap diisi dengan tabel kategori, hierarki grup, dan integrasi ke master barang & jasa.
        </p>
      </Card>
    </div>
  );
}
