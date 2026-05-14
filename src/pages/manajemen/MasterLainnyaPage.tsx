import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export function MasterLainnyaPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Master lainnya"
        description="Ruang untuk master data tambahan (satuan khusus, pajak, wilayah kirim, dll.)."
      />
      <Card>
        <p className="text-sm leading-relaxed text-zinc-600">
          Tambahkan entri submenu baru di <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">src/config/navigation.ts</code>{" "}
          pada grup Manajemen, lalu buat rute dan halaman di folder ini.
        </p>
      </Card>
    </div>
  );
}
