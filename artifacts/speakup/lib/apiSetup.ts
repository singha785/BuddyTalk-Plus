import {
  setBaseUrl,
  setAuthTokenGetter,
} from "@workspace/api-client-react";
import { Platform } from "react-native";

import { getAuthToken } from "@/context/AuthContext";

let configured = false;

/**
 * Configure the shared OpenAPI client at module load.
 *
 * - On web: served from the same proxy host, so `/api` works as-is.
 * - On native (Android/iOS APK): must point at the deployed backend.
 *   Set EXPO_PUBLIC_DOMAIN to your deployed Replit domain, e.g.
 *   `your-api.replit.app` (without https:// or trailing slash).
 *   This value is baked into the APK at EAS build time.
 */
export function configureApiClient(): void {
  if (configured) return;
  configured = true;

  if (Platform.OS !== "web") {
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    if (domain) {
      setBaseUrl(`https://${domain}/api`);
    } else if (__DEV__) {
      console.warn(
        "[BuddyTalk+] EXPO_PUBLIC_DOMAIN is not set. " +
          "API calls from native will fail. " +
          "Set EXPO_PUBLIC_DOMAIN=<your-deployed-domain> in eas.json before building.",
      );
      setBaseUrl(null);
    } else {
      setBaseUrl(null);
    }
  } else {
    setBaseUrl("/api");
  }

  setAuthTokenGetter(() => getAuthToken());
}
