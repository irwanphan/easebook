import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

type KeuanganSectionPageProps = {
  title: string;
  description: string;
};

export function KeuanganSectionPage({ title, description }: KeuanganSectionPageProps) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title={title} description={description} />
      <Card>
        <p className="text-sm leading-relaxed text-zinc-600">
          Modul keuangan ini akan diisi pada tahap berikutnya (daftar transaksi, filter periode, ekspor,
          dll.).
        </p>
      </Card>
    </div>
  );
}
