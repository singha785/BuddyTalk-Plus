import { useApp } from "@/context/AppContext";
import { translate, type TranslationKey } from "@/lib/i18n";

export function useTranslation() {
  const { state } = useApp();

  const t = (key: TranslationKey) => translate(state.language, key);

  return { t, language: state.language };
}
