import { useRef, useState } from "react";
import { Camera, Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { processBarangImageFile } from "@/lib/processProfileImage";
import type { BarangFotoState } from "@/lib/barangFoto";

type BarangFotoFieldProps = {
  value: BarangFotoState;
  onChange: (next: BarangFotoState) => void;
  disabled?: boolean;
};

export function BarangFotoField({ value, onChange, disabled = false }: BarangFotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const hasImage = !value.removed && (value.previewUrl != null || value.webpBytes != null);

  async function handleFile(file: File | undefined) {
    if (!file || disabled) return;
    setLocalError(null);
    setProcessing(true);
    try {
      if (value.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(value.previewUrl);
      }
      const { previewUrl, webpBytes } = await processBarangImageFile(file);
      onChange({ previewUrl, webpBytes, removed: false });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Gagal memproses gambar.");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove() {
    if (value.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(value.previewUrl);
    }
    onChange({ previewUrl: null, webpBytes: null, removed: true });
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
      <p className="text-sm font-medium text-zinc-800">Foto barang</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        Maks. 320×320 px, disimpan sebagai WebP. Opsional.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-2 ring-zinc-200">
          {hasImage && value.previewUrl ? (
            <img
              src={value.previewUrl}
              alt=""
              className="h-full w-full object-cover"
              width={96}
              height={96}
            />
          ) : (
            <Package className="h-10 w-10 text-zinc-300" strokeWidth={1.25} aria-hidden />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={disabled || processing}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              disabled={disabled || processing}
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="h-4 w-4" aria-hidden />
              {processing ? "Memproses…" : "Pilih gambar"}
            </Button>
            {hasImage ? (
              <Button
                type="button"
                variant="ghost"
                className="text-xs text-red-700 hover:bg-red-50"
                disabled={disabled || processing}
                onClick={handleRemove}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Hapus gambar
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {localError ? <p className="mt-2 text-xs text-red-600">{localError}</p> : null}
    </div>
  );
}
