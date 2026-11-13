import { Language } from "@models/Language";
import type { ProcessingSettings } from "@models/ProcessingSettings";

/** The processing settings that upload, recompute and feature activation start with; users change them with the `ProcessingSettingsButton`. */
export const DEFAULT_PROCESSING_SETTINGS: ProcessingSettings = {
  model: "default",
  extract_images: true,
  pages_per_chunk: 10,
  keyword_deduplication_threshold: 0.5,
  keyword_max_ngram_size: 2,
  keyword_number: 5,
  language: Language.AUTO,
};
