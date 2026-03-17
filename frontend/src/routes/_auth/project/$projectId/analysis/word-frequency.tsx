import { WordFrequencyView } from "@features/word-frequency-analysis";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/word-frequency")({
  staticData: {
    tab: true,
    icon: Icon.WORD_FREQUENCY,
    getTitle: () => "Word Frequency",
  },
  component: WordFrequencyView,
});
