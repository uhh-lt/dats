import { createFileRoute } from "@tanstack/react-router";
import SentenceSimilaritySearch from "../../../../views/search/SentenceSearch/SentenceSimilaritySearch.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/sentencesearch")({
  component: SentenceSimilaritySearch,
});
