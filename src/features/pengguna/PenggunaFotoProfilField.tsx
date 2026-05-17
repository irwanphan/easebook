import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import happySvg from "@/assets/happy.svg";
import { Button } from "@/components/ui/Button";
import { processProfileImageFile } from "@/lib/processProfileImage";

export type PenggunaFotoState = {
  /** URL untuk pratinjau (blob: atau asset). */
  previewUrl: string | null;
  /** Byte WebP hasil proses; null = tidak ada perubahan upload baru. */
  webpBytes: number[] | null;
  /** true jika user menghapus foto yang sudah ada. */
  removed: boolean;
};

type PenggunaFotoProfilFieldProps = {
  value: PenggunaFotoState;
  onChange: (next: PenggunaFotoState) => void;
  disabled?: boolean;
};

export function PenggunaFotoProfilField({ value, onChange, disabled = false }: PenggunaFotoProfilFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displaySrc = value.removed ? happySvg : value.previewUrl ?? happySvg;

  async function handleFile(file: File | undefined) {
    if (!file || disabled) return;
    setLocalError(null);
    setProcessing(true);
    try {
      if (value.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(value.previewUrl);
      }
      const { previewUrl, webpBytes } = await processProfileImageFile(file);
      onChange({ previewUrl, webpBytes, removed: false });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Gagal memproses foto.");
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
      <p className="text-sm font-medium text-zinc-800">Foto profil</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        Maks. 160×160 px, disimpan sebagai WebP. Kosongkan untuk ikon default.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-zinc-200">
          <img
            src={displaySrc}
            alt=""
            className="h-full w-full object-cover"
            width={72}
            height={72}
          />
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
              {processing ? "Memproses…" : "Pilih foto"}
            </Button>
            {(value.previewUrl && !value.removed) || value.webpBytes ? (
              <Button
                type="button"
                variant="ghost"
                className="text-xs text-red-700 hover:bg-red-50"
                disabled={disabled || processing}
                onClick={handleRemove}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Hapus foto
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {localError ? (
        <p className="mt-2 text-xs text-red-600">{localError}</p>
      ) : null}
    </div>
  );
}
