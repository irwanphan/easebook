import happySvg from "@/assets/happy.svg";
import { fotoProfilDisplayUrl } from "@/lib/penggunaFoto";

type UserAvatarProps = {
  fotoProfilPath?: string | null;
  nama?: string;
  className?: string;
  size?: number;
};

export function UserAvatar({ fotoProfilPath, nama, className = "", size = 36 }: UserAvatarProps) {
  const src = fotoProfilDisplayUrl(fotoProfilPath) ?? happySvg;

  return (
    <img
      src={src}
      alt={nama ? `Foto ${nama}` : ""}
      width={size}
      height={size}
      className={`object-cover ${className}`}
    />
  );
}
