import { createFileRoute } from "@tanstack/react-router";
import SentenceSimilaritySearch from "../../../../features/search/SentenceSearch/SentenceSimilaritySearch.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/sentencesearch")({
  component: SentenceSimilaritySearch,
});
