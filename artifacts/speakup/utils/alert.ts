import { Alert, Platform } from "react-native";

export type AlertButton = {
  text: string;
  style?: "cancel" | "default" | "destructive";
  onPress?: () => void;
};

/**
 * Cross-platform alert / confirm dialog.
 *
 * On native (iOS/Android) this is just `Alert.alert`. On web it falls back to
 * the browser's `window.alert` / `window.confirm` so dialogs actually work in
 * the preview iframe (React Native's `Alert` is a no-op on web).
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
): void {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }

  const body = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length === 0) {
    if (typeof window !== "undefined") window.alert(body);
    return;
  }

  if (buttons.length === 1) {
    if (typeof window !== "undefined") window.alert(body);
    buttons[0].onPress?.();
    return;
  }

  const okButton =
    buttons.find((b) => b.style !== "cancel") ?? buttons[buttons.length - 1];
  const cancelButton = buttons.find((b) => b.style === "cancel");

  const accepted =
    typeof window !== "undefined" ? window.confirm(body) : true;
  if (accepted) {
    okButton.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}
