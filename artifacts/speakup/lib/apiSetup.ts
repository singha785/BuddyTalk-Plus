import {
  setBaseUrl,
  setAuthTokenGetter,
} from "@workspace/api-client-react";
import { Platform } from "react-native";

import { getAuthToken } from "@/context/AuthContext";

let configured = false;

/**
 * Configure the shared OpenAPI client at module load.
 * - On web, the app is served from the same proxy host so `/api` works as-is.
 * - On native (Expo Go), point absolute URLs at the Replit dev domain so
 *   bearer-tokenized requests resolve correctly.
 */
export function configureApiClient(): void {
  if (configured) return;
  configured = true;

  if (Platform.OS !== "web") {
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    if (domain) {
      setBaseUrl(`https://${domain}`);
    }
  }

  setAuthTokenGetter(() => getAuthToken());
}
