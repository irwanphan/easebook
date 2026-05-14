import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

type ManajemenPlaceholderPageProps = {
  title: string;
  description: string;
};

export function ManajemenPlaceholderPage({ title, description }: ManajemenPlaceholderPageProps) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title={title} description={description} />
      <Card>
        <p className="text-sm leading-relaxed text-zinc-600">
          Master ini akan dihubungkan ke database lokal (SQLite) bersama penjualan dan pembelian pada
          pengembangan berikutnya.
        </p>
      </Card>
    </div>
  );
}
