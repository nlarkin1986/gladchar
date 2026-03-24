import * as settings from "~/store/tinybase/store/settings";

type SettingsStore = NonNullable<ReturnType<typeof settings.UI.useStore>>;

export function configureProSettings(store: SettingsStore): void {
  const currentSttProvider = store.getValue("current_stt_provider");
  const currentLlmProvider = store.getValue("current_llm_provider");

  if (!currentSttProvider || currentSttProvider === "hyprnote") {
    store.setValue("current_stt_provider", "hyprnote");
    store.setValue("current_stt_model", "cactus-v0.3-whisper-large-v3-turbo");
  }

  if (!currentLlmProvider || currentLlmProvider === "hyprnote") {
    store.setValue("current_llm_provider", "ollama");
    store.setValue("current_llm_model", "");
  }
}
