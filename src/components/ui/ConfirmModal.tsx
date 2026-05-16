import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Ya, lanjutkan",
  cancelLabel = "Batal",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={() => {
        if (!loading) onCancel();
      }}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" disabled={loading} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "primary" : "primary"}
            className={variant === "danger" ? "bg-rose-600 hover:bg-rose-700 focus-visible:outline-rose-600" : ""}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Memproses…" : confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-zinc-600">{message}</p>
    </Modal>
  );
}
