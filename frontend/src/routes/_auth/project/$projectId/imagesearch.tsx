import { createFileRoute } from "@tanstack/react-router";
import ImageSimilaritySearch from "../../../../views/search/ImageSearch/ImageSimilaritySearch.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/imagesearch")({
  component: ImageSimilaritySearch,
});
