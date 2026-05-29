import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  LayoutGrid,
  LogOut,
  Printer,
  Store,
  Warehouse,
  X,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { VerticalSeparator } from "@/components/ui/Separator";
import { useAuth } from "@/features/auth/AuthContext";
import { OpenShiftModal } from "@/features/pos/OpenShiftModal";
import { CloseShiftModal } from "@/features/pos/CloseShiftModal";
import { POSCatalog } from "@/features/pos/POSCatalog";
import { POSCart } from "@/features/pos/POSCart";
import { POSChangeGudangModal } from "@/features/pos/POSChangeGudangModal";
import { POSCustomerPicker } from "@/features/pos/POSCustomerPicker";
import { POSPaymentModal } from "@/features/pos/POSPaymentModal";
import {
  POSSettingsMenu,
  type POSSettingsSection,
} from "@/features/pos/POSSettingsMenu";
import { usePOS } from "@/features/pos/POSContext";
import type { PosTransaksiResult } from "@/data/pos";
import { formatJamMenit, formatRupiah } from "@/lib/format";

function POSTopBar({
  onCloseShift,
  onChangeGudang,
}: {
  onCloseShift: () => void;
  onChangeGudang: () => void;
}) {
  const { session, logout } = useAuth();
  const { shift, jumlahItem } = usePOS();

  // Menu pengaturan POS — deklaratif. Tambah pengaturan baru = tambah entry
  // di `sections` (Open/Closed Principle).
  const settingsSections = useMemo<POSSettingsSection[]>(() => {
    if (!shift) return [];
    const cartTidakKosong = jumlahItem > 0;
    return [
      {
        id: "sesi-shift",
        title: "Sesi shift",
        items: [
          {
            id: "ganti-gudang",
            icon: Warehouse,
            label: "Ganti gudang aktif",
            description: `Sekarang: ${shift.gudangNama || shift.gudangKode}`,
            onClick: onChangeGudang,
            disabled: cartTidakKosong,
            disabledReason: cartTidakKosong
              ? "Kosongkan keranjang dulu sebelum ganti gudang."
              : undefined,
          },
        ],
      },
      {
        id: "akan-datang",
        title: "Akan datang",
        items: [
          {
            id: "printer-multi",
            icon: Printer,
            label: "Printer multi-destinasi",
            description: "Cetak ke kasir, gudang, customer service",
            comingSoon: true,
          },
          {
            id: "layout-katalog",
            icon: LayoutGrid,
            label: "Tampilan katalog",
            description: "Layout grid/list, ukuran kartu",
            comingSoon: true,
          },
        ],
      },
    ];
  }, [shift, jumlahItem, onChangeGudang]);

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-6 py-2.5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-amber-600 border border-green-200">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-50 text-amber-600 ring-1 ring-inset ring-green-400">
          <Store className="h-4.5 w-4.5" aria-hidden />
        </span>
      </span>
      <div className="leading-tight">
        <p className="text-xs uppercase tracking-wider text-zinc-500">EasyBook</p>
        <p className="text-sm font-bold text-zinc-900">Kasir POS</p>
      </div>

      <VerticalSeparator />

      {shift ? (
        <div className="flex items-center gap-3 text-xs">
          {/* <span className="font-mono text-zinc-500">{shift.kode}</span> */}
          <span className="flex flex-col text-zinc-600">
            Gudang 
            <span className="font-semibold text-zinc-900">{shift.gudangNama || shift.gudangKode}</span>
          </span>
          <VerticalSeparator /> 
          <div className="flex flex-col">
            <span className="rounded-md font-semibold text-emerald-700">
              Shift terbuka
            </span>
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">sejak {formatJamMenit(shift.mulaiTs)}</span>
              <span className="text-zinc-500">• Modal {formatRupiah(shift.modalAwal)}</span>
            </div>
          </div>
        </div>
      ) : (
        <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
          Shift belum dibuka
        </span>
      )}

      <div className="ml-auto flex items-center gap-3 text-xs text-zinc-600">
        <span className="hidden md:inline">
          Kasir <span className="font-semibold text-zinc-900">{session?.namaLengkap ?? session?.username ?? "—"}</span>
        </span>
        {shift ? <POSSettingsMenu sections={settingsSections} /> : null}
        {shift ? (
          <Button
            type="button"
            variant="outline"
            className="h-8 text-xs"
            onClick={onCloseShift}
            disabled={jumlahItem > 0}
            title={jumlahItem > 0 ? "Selesaikan transaksi di keranjang dulu" : "Tutup shift kasir"}
          >
            Tutup shift
          </Button>
        ) : null}
        <Button
          type="button"
          variant="danger"
          className="h-8 text-xs"
          onClick={() => {
            void getCurrentWindow().close().catch(() => {
              logout();
            });
          }}
          title="Tutup window POS"
        >
          <LogOut className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </header>
  );
}

function TransaksiSuksesDialog({
  open,
  result,
  onClose,
}: {
  open: boolean;
  result: PosTransaksiResult | null;
  onClose: () => void;
}) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Saat dialog terbuka:
  // - Auto-focus tombol "Transaksi baru" supaya Enter natural memicu klik.
  // - Listener Enter sebagai safety bila fokus berpindah (mis. user klik di
  //   panel dialog). Escape sudah ditangani oleh Modal.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => confirmBtnRef.current?.focus(), 0);
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <Modal
      open={open}
      title="Transaksi berhasil"
      onClose={onClose}
      panelClassName="max-w-sm"
      footer={
        <div className="flex items-center justify-end">
          <Button ref={confirmBtnRef} type="button" onClick={onClose}>
            Transaksi baru (Tekan Enter)
          </Button>
        </div>
      }
    >
      {result ? (
        <div className="text-center">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <p className="mt-3 font-mono text-sm text-zinc-500">{result.nomor}</p>
          <p className="mt-1 text-2xl font-extrabold text-zinc-900">{formatRupiah(result.total)}</p>
          <div className="mt-3 rounded-xl bg-zinc-50/60 p-3 text-left text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Total bayar</span>
              <span className="font-medium text-zinc-900">{formatRupiah(result.totalDibayar)}</span>
            </div>
            <div className="mt-1 flex justify-between text-zinc-600">
              <span>Kembalian</span>
              <span className="font-bold text-emerald-700">{formatRupiah(result.kembalian)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

export function POSPage() {
  const { shift, shiftLoading } = usePOS();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [closeShiftOpen, setCloseShiftOpen] = useState(false);
  const [changeGudangOpen, setChangeGudangOpen] = useState(false);
  const [sukses, setSukses] = useState<PosTransaksiResult | null>(null);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <POSTopBar
        onCloseShift={() => setCloseShiftOpen(true)}
        onChangeGudang={() => setChangeGudangOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        {shift ? (
          <POSCatalog gudangKode={shift.gudangKode} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-10 text-center">
            <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
              <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <X className="h-5 w-5" />
              </span>
              <h2 className="mt-3 text-lg font-bold text-zinc-900">Buka shift untuk mulai</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Anda perlu membuka shift kasir terlebih dahulu sebelum menerima transaksi.
              </p>
            </div>
          </div>
        )}
        <POSCart
          onProcessPayment={() => setPaymentOpen(true)}
          onOpenCustomerPicker={() => setPickerOpen(true)}
        />
      </div>

      {/* Modal Buka Shift — wajib bila belum ada shift aktif */}
      <OpenShiftModal open={!shiftLoading && !shift} forceOpen />

      {/* Modal Tutup Shift */}
      <CloseShiftModal open={closeShiftOpen} onClose={() => setCloseShiftOpen(false)} />

      {/* Modal Ganti Gudang */}
      <POSChangeGudangModal
        open={changeGudangOpen}
        onClose={() => setChangeGudangOpen(false)}
      />

      {/* Modal pilih pelanggan */}
      <POSCustomerPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />

      {/* Modal pembayaran */}
      <POSPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onSuccess={(r) => {
          setPaymentOpen(false);
          setSukses(r);
        }}
      />

      {/* Dialog sukses transaksi */}
      <TransaksiSuksesDialog
        open={sukses !== null}
        result={sukses}
        onClose={() => setSukses(null)}
      />
    </div>
  );
}
