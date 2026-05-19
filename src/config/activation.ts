/** URL middleware aktivasi (easybook-activebook). Override lewat .env: VITE_ACTIVATION_API_URL */
export const ACTIVATION_API_URL =
  import.meta.env.VITE_ACTIVATION_API_URL ?? "http://localhost:3000";
