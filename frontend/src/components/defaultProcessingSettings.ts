import { Language } from "@models/Language";
import type { ProcessingSettings } from "@models/ProcessingSettings";

/** The processing settings of upload and recompute, which users change with the `ProcessingSettingsButton`, and of enabling or completing a feature, which has no settings button. */
export const DEFAULT_PROCESSING_SETTINGS: ProcessingSettings = {
  model: "default",
  extract_images: true,
  pages_per_chunk: 10,
  language: Language.AUTO,
};
