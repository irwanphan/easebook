import { ACTIVATION_API_URL, EASYBOOK_APP_ID } from "@/config/activation";
import { invoke } from "@tauri-apps/api/core";

export type ActivationStatus = {
  activated: boolean;
  productId: string;
  invoiceNumber: string;
  deviceCode: string;
  method: string;
  activatedAt: number;
};

export type LicenseInfo = {
  transactionCount: number;
  trialLimit: number;
  activated: boolean;
  blocked: boolean;
  remaining: number;
};

export async function getLicenseInfo(): Promise<LicenseInfo> {
  return invoke<LicenseInfo>("activation_get_license_info");
}

export async function getDeviceCode(): Promise<string> {
  return invoke<string>("activation_get_device_code");
}

export async function getActivationStatus(): Promise<ActivationStatus | null> {
  return invoke<ActivationStatus | null>("activation_get_status");
}

export async function saveActivationLocal(
  invoiceNumber: string,
  deviceCode: string,
  method: "online" | "offline",
  activatedAt: number,
): Promise<ActivationStatus> {
  return invoke<ActivationStatus>("activation_save", {
    invoiceNumber,
    deviceCode,
    method,
    activatedAt,
  });
}

export async function activateOnline(
  invoiceNumber: string,
  deviceCode: string,
): Promise<{ ok: true; activatedAt: number } | { ok: false; message: string }> {
  const res = await fetch(`${ACTIVATION_API_URL}/api/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appId: EASYBOOK_APP_ID,
      invoiceNumber,
      deviceCode,
    }),
  });
  const json = (await res.json()) as {
    ok?: boolean;
    message?: string;
    activatedAt?: number;
  };
  if (!res.ok || !json.ok) {
    return { ok: false, message: json.message ?? "Aktivasi gagal." };
  }
  const activatedAt = json.activatedAt ?? Date.now();
  await saveActivationLocal(invoiceNumber, deviceCode, "online", activatedAt);
  return { ok: true, activatedAt };
}

export async function activateOffline(
  invoiceNumber: string,
  activationCode: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await invoke<ActivationStatus>("activation_apply_offline_code", {
      invoiceNumber,
      activationCode,
    });
    const deviceCode = await getDeviceCode();
    try {
      await fetch(`${ACTIVATION_API_URL}/api/activate/offline/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: EASYBOOK_APP_ID,
          invoiceNumber,
          deviceCode,
        }),
      });
    } catch {
      /* sinkron histori opsional saat offline total */
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message };
  }
}
