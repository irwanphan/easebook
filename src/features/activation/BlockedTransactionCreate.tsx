import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { useLicenseGate } from "./useLicenseGate";

type Props = {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
};

export function BlockedTransactionCreate({ title, description, backHref, backLabel }: Props) {
  const { license, loading } = useLicenseGate();

  if (loading) {
    return <p className="text-sm text-zinc-500">Memeriksa lisensi…</p>;
  }

  if (!license?.blocked) {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader 
        title={title} 
        // description={description} 
      />
      <Card className="text-center">
        <p className="text-sm font-semibold text-zinc-900">Batas uji coba tercapai</p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Anda telah mencatat {license.transactionCount} transaksi. Aktifkan lisensi untuk
          menambah faktur baru.
        </p>
        <Link
          to="/pengaturan?tab=aktivasi"
          className="mt-4 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Aktivasi lisensi
        </Link>
        <Link to={backHref} className="mt-3 block text-sm text-zinc-500 underline">
          {backLabel}
        </Link>
      </Card>
    </div>
  );
}
