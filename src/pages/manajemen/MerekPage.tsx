import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export function MerekPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Merek"
        description="Master merek untuk produk dan pemetaan ke katalog."
      />
      <Card>
        <p className="text-sm leading-relaxed text-zinc-600">
          Modul ini siap diisi dengan daftar merek dan relasi ke barang.
        </p>
      </Card>
    </div>
  );
}
