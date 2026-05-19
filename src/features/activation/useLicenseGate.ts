import { useCallback, useEffect, useState } from "react";
import { getLicenseInfo, type LicenseInfo } from "./activationApi";

export function useLicenseGate() {
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const info = await getLicenseInfo();
      setLicense(info);
    } catch {
      setLicense(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const blocked = license?.blocked ?? false;
  const activated = license?.activated ?? false;

  return {
    license,
    loading,
    blocked,
    activated,
    refresh,
    canCreateTransaction: !blocked,
  };
}
